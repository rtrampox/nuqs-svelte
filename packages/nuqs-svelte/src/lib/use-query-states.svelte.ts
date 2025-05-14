// reactive values are required to be declared as let in Svelte
/* eslint-disable prefer-const */
import { useAdapter } from './adapters/index.svelte';
import { debug } from './debug';
import { effectDeps } from './effect.svelte';
import type { Parser } from './parsers';
import { emitter, type CrossHookSyncPayload } from './sync';
import type { Nullable, Options, UrlKeys } from './types';
import {
  enqueueQueryStringUpdate,
  FLUSH_RATE_LIMIT_MS,
  getQueuedValue,
  scheduleFlushToURL,
} from './update-queue';
import { safeParse } from './utils';

type KeyMapValue<Type> = Parser<Type> &
  Options & {
    defaultValue?: Type;
  };

export type UseQueryStatesKeysMap<Map = any> = {
  [Key in keyof Map]: KeyMapValue<Map[Key]>;
} & {};

export type UseQueryStatesOptions<KeyMap extends UseQueryStatesKeysMap> = Options & {
  urlKeys: UrlKeys<KeyMap>;
};

export type Values<T extends UseQueryStatesKeysMap> = {
  readonly [K in keyof T]: T[K]['defaultValue'] extends NonNullable<ReturnType<T[K]['parse']>>
    ? NonNullable<ReturnType<T[K]['parse']>>
    : ReturnType<T[K]['parse']> | null;
};
type NullableValues<T extends UseQueryStatesKeysMap> = Nullable<Values<T>>;

type UpdaterFn<T extends UseQueryStatesKeysMap> = (
  old: Values<T>,
) => Partial<Nullable<Values<T>>> | null;

export type SetValues<T extends UseQueryStatesKeysMap> = (
  values: Partial<Nullable<Values<T>>> | UpdaterFn<T> | null,
  options?: Options,
) => Promise<URLSearchParams>;

export type UseQueryStatesReturn<T extends UseQueryStatesKeysMap> = {
  set: SetValues<T>;
} & {
  /**
   * A helper object that can be used to bind the current value of a query state to a Svelte component.
   *
   * @example
   * ```svelte
   * <script lang="ts">
   * import { useQueryStates } from 'nuqs';
   * import { parseAsFloat } from 'nuqs/parsers';
   * import { parseAsString } from 'nuqs/parsers';
   * import { parseAsBoolean } from 'nuqs/parsers';
   *
   * const { name, isActive } = useQueryStates({
   *  name: parseAsString.withDefault(''),
   *  isActive: parseAsBoolean.withDefault(false),
   * });
   * </script>
   *
   * <input type="text" bind:value={name.current} />
   * <input type="checkbox" bind:checked={isActive.current} />
   * ```
   */
  [K in keyof T]: {
    get current(): Values<T>[K];
    set current(value: Nullable<Values<T>[K]>);
  };
};

// Ensure referential consistency for the default value of urlKeys
// by hoisting it out of the function scope.
// Otherwise useEffect loops go brrrr
const defaultUrlKeys = {};

/**
 * Synchronise multiple query string arguments to Svelte state
 *
 * @param keys - An object describing the keys to synchronise and how to
 *               serialise and parse them.
 *               Use `parseAs(String|Integer|Float|...)` for quick shorthands.
 *
 * @param options - Optional history mode, shallow routing and scroll restoration options.
 */
export function useQueryStates<KeyMap extends UseQueryStatesKeysMap>(
  keyMap: KeyMap,
  {
    history = 'replace',
    scroll = false,
    shallow = true,
    throttleMs = FLUSH_RATE_LIMIT_MS,
    clearOnDefault = true,
    urlKeys = defaultUrlKeys,
  }: Partial<UseQueryStatesOptions<KeyMap>> = {},
): UseQueryStatesReturn<KeyMap> {
  type V = NullableValues<KeyMap>;
  const adapter = useAdapter();

  const stateKeys = Object.keys(keyMap).join(',');
  const resolvedUrlKeys = Object.fromEntries(
    Object.keys(keyMap).map((key) => [key, urlKeys[key] ?? key]),
  );

  let initialSearchParams = $derived(adapter.searchParams());

  let defaultValues = $derived(
    Object.fromEntries(Object.keys(keyMap).map((key) => [key, keyMap[key]!.defaultValue ?? null])),
  ) as Values<KeyMap>;

  let internalState = $state<V>(parseMap(keyMap, urlKeys, initialSearchParams).state);

  let queryRef = $state<Record<string, string | null>>({});
  let stateRef = $state(internalState);

  if (Object.keys(queryRef).join('&') !== Object.values(resolvedUrlKeys).join('&')) {
    const { state, hasChanged } = parseMap(
      keyMap,
      urlKeys,
      initialSearchParams,
      queryRef,
      stateRef,
    );
    if (hasChanged) {
      stateRef = state;
      internalState = state;
    }
    queryRef = Object.fromEntries(
      Object.values(resolvedUrlKeys).map((urlKey) => [
        urlKey,
        initialSearchParams.get(urlKey) ?? null,
      ]),
    );
  }

  effectDeps(() => {
    const { state, hasChanged } = parseMap(
      keyMap,
      urlKeys,
      initialSearchParams,
      queryRef,
      stateRef,
    );
    if (hasChanged) {
      stateRef = state;
      internalState = state;
    }
  }, [
    () =>
      Object.values(resolvedUrlKeys)
        .map((key) => `${key}=${initialSearchParams.get(key)}`)
        .join('&'),
  ]);

  // Sync all hooks together & with external URL changes
  effectDeps(() => {
    const updateInternalState = (state: V) => {
      debug('[nuq+ `%s`] updateInternalState %O', stateKeys, state);
      stateRef = state;
      internalState = state;
    };

    const handlers = Object.keys(keyMap).reduce(
      (handlers, stateKey) => {
        handlers[stateKey as keyof KeyMap] = ({ state, query }: CrossHookSyncPayload) => {
          const { defaultValue } = keyMap[stateKey]!;
          const urlKey = resolvedUrlKeys[stateKey]!;
          // Note: cannot mutate in-place, the object ref must change
          // for the subsequent setState to pick it up.
          stateRef = {
            ...stateRef,
            [stateKey as keyof KeyMap]: state ?? defaultValue ?? null,
          };
          queryRef[urlKey] = query;
          debug(
            '[nuq+ `%s`] Cross-hook key sync %s: %O (default: %O). Resolved: %O',
            stateKeys,
            urlKey,
            state,
            defaultValue,
            stateRef,
          );
          updateInternalState(stateRef);
        };
        return handlers;
      },
      {} as Record<keyof KeyMap, (payload: CrossHookSyncPayload) => void>,
    );

    for (const stateKey of Object.keys(keyMap)) {
      const urlKey = resolvedUrlKeys[stateKey]!;
      debug('[nuq+ `%s`] Subscribing to sync for `%s`', stateKeys, urlKey);
      emitter.on(urlKey, handlers[stateKey]!);
    }

    return () => {
      for (const stateKey of Object.keys(keyMap)) {
        const urlKey = resolvedUrlKeys[stateKey]!;
        debug('[nuq+ `%s`] Unsubscribing to sync for `%s`', stateKeys, urlKey);
        emitter.off(urlKey, handlers[stateKey]);
      }
    };
  }, [() => stateKeys, () => resolvedUrlKeys]);

  const update: SetValues<KeyMap> = (stateUpdater, callOptions = {}) => {
    const nullMap = Object.fromEntries(
      Object.keys(keyMap).map((key) => [key, null]),
    ) as Nullable<KeyMap>;

    const newState: Partial<Nullable<KeyMap>> =
      typeof stateUpdater === 'function'
        ? (stateUpdater(applyDefaultValues(stateRef, defaultValues)) ?? nullMap)
        : (stateUpdater ?? nullMap);

    debug('[nuq+ `%s`] setState: %O', stateKeys, newState);

    for (let [stateKey, value] of Object.entries(newState)) {
      const parser = keyMap[stateKey];
      const urlKey = resolvedUrlKeys[stateKey]!;
      if (!parser) {
        continue;
      }
      if (
        (callOptions.clearOnDefault ?? parser.clearOnDefault ?? clearOnDefault) &&
        value !== null &&
        parser.defaultValue !== undefined &&
        (parser.eq ?? ((a, b) => a === b))(value, parser.defaultValue)
      ) {
        value = null;
      }
      const query = enqueueQueryStringUpdate(urlKey, value, parser.serialize ?? String, {
        // Call-level options take precedence over individual parser options
        // which take precedence over global options
        history: callOptions.history ?? parser.history ?? history,
        shallow: callOptions.shallow ?? parser.shallow ?? shallow,
        scroll: callOptions.scroll ?? parser.scroll ?? scroll,
        throttleMs: callOptions.throttleMs ?? parser.throttleMs ?? throttleMs,
      });
      emitter.emit(urlKey, { state: value, query });
    }

    return scheduleFlushToURL(adapter);
  };

  const outputState = $derived(applyDefaultValues(stateRef, defaultValues));
  return {
    ...(Object.fromEntries(
      Object.keys(keyMap).map((key: keyof KeyMap) => [
        key,
        {
          get current() {
            return outputState[key];
          },
          set current(value: Values<KeyMap>[typeof key]) {
            update((prev) => ({ ...prev, [key]: value }));
          },
        },
      ]),
    ) as UseQueryStatesReturn<KeyMap>),

    set: update,
  };
}

// --

function parseMap<KeyMap extends UseQueryStatesKeysMap>(
  keyMap: KeyMap,
  urlKeys: Partial<Record<keyof KeyMap, string>>,
  searchParams: URLSearchParams,
  cachedQuery?: Record<string, string | null>,
  cachedState?: NullableValues<KeyMap>,
): {
  state: NullableValues<KeyMap>;
  hasChanged: boolean;
} {
  let hasChanged = false;
  const state = Object.keys(keyMap).reduce((out, stateKey) => {
    const urlKey = urlKeys?.[stateKey] ?? stateKey;
    const { parse } = keyMap[stateKey]!;
    const queuedQuery = getQueuedValue(urlKey);
    const query = queuedQuery === undefined ? (searchParams?.get(urlKey) ?? null) : queuedQuery;
    if (cachedQuery && cachedState && (cachedQuery[urlKey] ?? null) === query) {
      // Cache hit
      out[stateKey as keyof KeyMap] = cachedState[stateKey] ?? null;
      return out;
    }
    // Cache miss
    hasChanged = true;
    const value = query === null ? null : safeParse(parse, query, stateKey);
    out[stateKey as keyof KeyMap] = value ?? null;
    if (cachedQuery) {
      cachedQuery[urlKey] = query;
    }
    return out;
  }, {} as NullableValues<KeyMap>);

  if (!hasChanged) {
    // check that keyMap keys have not changed
    const keyMapKeys = Object.keys(keyMap);
    const cachedStateKeys = Object.keys(cachedState ?? {});
    hasChanged =
      keyMapKeys.length !== cachedStateKeys.length ||
      keyMapKeys.some((key) => !cachedStateKeys.includes(key));
  }

  return { state, hasChanged };
}

function applyDefaultValues<KeyMap extends UseQueryStatesKeysMap>(
  state: NullableValues<KeyMap>,
  defaults: Partial<Values<KeyMap>>,
) {
  return Object.fromEntries(
    Object.keys(state).map((key) => [key, state[key] ?? defaults[key] ?? null]),
  ) as Values<KeyMap>;
}
