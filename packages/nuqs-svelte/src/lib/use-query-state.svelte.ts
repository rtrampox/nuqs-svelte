import { useAdapter } from "./adapters/index.svelte";
import { debug } from "./debug";
import type { Parser } from "./parsers";
import { emitter, type CrossHookSyncPayload } from "./sync";
import type { Options } from "./types";
import {
  enqueueQueryStringUpdate,
  FLUSH_RATE_LIMIT_MS,
  getQueuedValue,
  scheduleFlushToURL,
} from "./update-queue";
import { safeParse } from "./utils";

export interface UseQueryStateOptions<T> extends Parser<T>, Options {}

export type UseQueryStateReturn<Parsed, Default> = {
  current: Default extends undefined
    ? Parsed | null // value can't be null if default is specified
    : Parsed;

  set: (
    value:
      | null
      | Parsed
      | ((old: Default extends Parsed ? Parsed : Parsed | null) => Parsed | null),
    options?: Options,
  ) => Promise<URLSearchParams>;
};

// Overload type signatures ----------------------------------------------------
// Note: the order of declaration matters (from the most specific to the least).

/**
 * Svelte state hook synchronized with a URL query string in SvelteKit
 *
 * This variant is used when providing a default value. This will make
 * the returned state non-nullable when the query is not present in the URL.
 * (the default value will be returned instead).
 *
 * _Note: the URL will **not** be updated with the default value if the query
 * is missing._
 *
 * Setting the value to `null` will clear the query in the URL, and return
 * the default value as state.
 *
 * Example usage:
 * ```svelte
 * <script lang="ts">
 *   const count = useQueryState(
 *     'count',
 *     parseAsInteger.defaultValue(0)
 *   )
 *
 *   const increment = () => count.current = (count.current ?? 0) + 1
 *   const decrement = () => count.current = (count.current ?? 0) - 1
 *   // Clears the query key from the URL and `count` equals 0
 *   const clearCountQuery = () => count.current = null
 * </script>
 * ```
 * @param key The URL query string key to bind to
 * @param options - Parser (defines the state data type), default value and optional history mode.
 */
export function useQueryState<T>(
  key: string,
  options: UseQueryStateOptions<T> & { defaultValue: T },
): UseQueryStateReturn<NonNullable<ReturnType<typeof options.parse>>, typeof options.defaultValue>;

/**
 * Svelte state hook synchronized with a URL query string in SvelteKit
 *
 * If the query is missing in the URL, the state will be `null`.
 *
 * Example usage:
 * ```svete
 * <script lang="ts">
 *   // Blog posts filtering by tag
 *   const tag = useQueryState('tag')
 *   const filteredPosts = posts.filter(post => tag ? post.tag === tag.current : true)
 *   const clearTag = () => tag.current = null
 * </script>
 * ```
 * @param key The URL query string key to bind to
 * @param options - Parser (defines the state data type), and optional history mode.
 */
export function useQueryState<T>(
  key: string,
  options: UseQueryStateOptions<T>,
): UseQueryStateReturn<NonNullable<ReturnType<typeof options.parse>>, undefined>;

/**
 * Default type string, limited options & default value
 */
export function useQueryState(
  key: string,
  options: Options & {
    defaultValue: string;
  },
): UseQueryStateReturn<string, typeof options.defaultValue>;

/**
 * Svelte state hook synchronized with a URL query string in SvelteKit
 *
 * If the query is missing in the URL, the state will be `null`.
 *
 * Note: by default the state type is a `string`. To use different types,
 * check out the `parseAsXYZ` helpers:
 * ```svelte
 * <script lang="ts">
 *   const date = useQueryState(
 *     'date',
 *     parseAsIsoDateTime.withDefault(new Date('2021-01-01'))
 *   )
 *
 *   const setToNow = () => date.current = new Date();
 *   const addOneHour = () => {
 *     date.current = new Date(date.current.valueOf() + 3600_000));
 *   }
 * </script>
 * ```
 * @param key The URL query string key to bind to
 * @param options - Parser (defines the state data type), and optional history mode.
 */
export function useQueryState(
  key: string,
  options: Pick<UseQueryStateOptions<string>, keyof Options>,
): UseQueryStateReturn<string, undefined>;

/**
 * Svelte state hook synchronized with a URL query string in SvelteKit
 *
 * If the query is missing in the URL, the state will be `null`.
 *
 * Note: by default the state type is a `string`. To use different types,
 * check out the `parseAsXYZ` helpers:
 * ```svelte
 * <script lang="ts">
 *   const date = useQueryState(
 *     'date',
 *     parseAsIsoDateTime.withDefault(new Date('2021-01-01'))
 *   )
 *
 *   const setToNow = () => date.current = new Date();
 *   const addOneHour = () => {
 *     date.current = new Date(date.current.valueOf() + 3600_000);
 *   }
 * </script>
 * ```
 * @param key The URL query string key to bind to
 */
export function useQueryState(key: string): UseQueryStateReturn<string, undefined>;

/**
 * Svelte state hook synchronized with a URL query string in SvelteKit
 *
 * If used without a `defaultValue` supplied in the options, and the query is
 * missing in the URL, the state will be `null`.
 *
 * ### Behaviour with default values:
 *
 * _Note: the URL will **not** be updated with the default value if the query
 * is missing._
 *
 * Setting the value to `null` will clear the query in the URL, and return
 * the default value as state.
 *
 * Example usage:
 * ```svelte
 * <script lang="ts">
 *   // Blog posts filtering by tag
 *   const tag = useQueryState('tag')
 *   const filteredPosts = posts.filter(post => tag ? post.tag === tag.current : true)
 *   const clearTag = () => tag.current = null
 *
 *   // With default values
 *
 *   const count = useQueryState(
 *     'count',
 *     parseAsInteger.defaultValue(0)
 *   )
 *
 *   const increment = () => count.current = (count.current ?? 0) + 1
 *   const decrement = () => count.current = (count.current ?? 0) - 1
 *   const clearCountQuery = () => count.current = null
 *
 *   // --
 *
 *   const date = useQueryState(
 *     'date',
 *     parseAsIsoDateTime.withDefault(new Date('2021-01-01'))
 *   )
 *
 *   const setToNow = () => date.current = new Date();
 *   const addOneHour = () => {
 *     date.current = new Date(date.current.valueOf() + 3600_000);
 *   }
 * </script>
 * ```
 * @param key The URL query string key to bind to
 * @param options - Parser (defines the state data type), optional default value and history mode.
 */
export function useQueryState<T = string>(
  key: string,
  {
    history,
    shallow,
    scroll,
    throttleMs,
    parse = (x) => x as unknown as T,
    serialize = String,
    eq = (a, b) => a === b,
    defaultValue = undefined,
    clearOnDefault = true,
  }: Partial<UseQueryStateOptions<T>> & {
    defaultValue?: T;
  } = {
    parse: (x) => x as unknown as T,
    serialize: String,
    eq: (a, b) => a === b,
    clearOnDefault: true,
    defaultValue: undefined,
  },
): UseQueryStateReturn<NonNullable<ReturnType<typeof parse>>, typeof defaultValue> {
  const adapter = useAdapter();
  let initialSearchParams = $derived(adapter.searchParams());

  let internalState = $state<T | null>(
    (() => {
      const queuedQuery = getQueuedValue(key);
      const query =
        queuedQuery === undefined ? (initialSearchParams.get(key) ?? null) : queuedQuery;

      return query === null ? null : safeParse(parse, query, key);
    })(),
  );

  // this state should represent the previous query string value
  // so that we can compare it with the current value
  let queryState = initialSearchParams.get(key) ?? null;

  $effect(() => {
    const query = initialSearchParams.get(key) ?? null;

    // parse the query string before comparing, as these values can be boolean, and any string would return true
    const state = query === null ? null : safeParse(parse, query, key);
    if (state === queryState) {
      debug(
        "[nuqs `%s`] syncFromUseSearchParams, no change, prev: %O, new: %O",
        key,
        queryState,
        state,
      );
      return;
    }

    debug("[nuqs `%s`] syncFromUseSearchParams %O", key, state);

    internalState = state;
    queryState = query;
  });

  $effect(() => {
    const updateInternalState = ({ state, query }: CrossHookSyncPayload) => {
      debug("[nuqs `%s`] updateInternalState %O", key, state);

      internalState = state;
      queryState = query;
    };

    debug("[nuqs `%s`] subscribing to sync", key);
    emitter.on(key, updateInternalState);
    return () => {
      debug("[nuqs `%s`] unsubscribing from sync", key);
      emitter.off(key, updateInternalState);
    };
  });

  const update = (
    updater: Parameters<
      UseQueryStateReturn<NonNullable<ReturnType<typeof parse>>, typeof defaultValue>["set"]
    >[0],
    options: Options = {},
  ) => {
    let newValue: T | null =
      typeof updater === "function"
        ? (updater as CallableFunction)((internalState ?? defaultValue ?? null) as T)
        : updater;

    if (
      (options.clearOnDefault ?? clearOnDefault) &&
      newValue !== null &&
      defaultValue !== undefined &&
      eq(newValue, defaultValue)
    ) {
      debug(
        "[nuqs `%s`] clearing query string because the value is equal to the default value",
        key,
      );

      newValue = null;
    }

    const adapterOptions = adapter.options;

    const query = enqueueQueryStringUpdate(key, newValue, serialize, {
      // Call-level options take precedence over hook declaration options that take precedence over adapter-level options
      history: options.history ?? history ?? adapterOptions?.history ?? "replace",
      shallow: options.shallow ?? shallow ?? adapterOptions?.shallow ?? true,
      scroll: options.scroll ?? scroll ?? adapterOptions?.scroll ?? false,
      throttleMs:
        options.throttleMs ?? throttleMs ?? adapterOptions?.throttleMs ?? FLUSH_RATE_LIMIT_MS,
    });

    emitter.emit(key, { state: newValue, query });

    return scheduleFlushToURL(adapter);
  };

  return {
    get current() {
      return (internalState ?? defaultValue ?? null) as NonNullable<T>;
    },

    set current(newValue: T & {}) {
      update(newValue);
    },

    set: update,
  };
}
