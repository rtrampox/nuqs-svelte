export type HistoryOptions = "replace" | "push";

export type SearchParams = Record<string, string | string[] | undefined>;

export type Options = {
  /**
   * How the query update affects page history
   *
   * `push` will create a new history entry, allowing to use the back/forward
   * buttons to navigate state updates.
   * `replace` (default) will keep the current history point and only replace
   * the query string.
   *
   * @default "replace"
   */
  history?: HistoryOptions;

  /**
   * Scroll to top after a query state update
   *
   * Defaults to `false`, unlike the Next.js router page navigation methods.
   *
   * @default false
   */
  scroll?: boolean;

  /**
   * Shallow mode (true by default) keeps query states update client-side only,
   * meaning there won't be calls to the server.
   *
   * Setting it to `false` will trigger a network request to the server with
   * the updated querystring.
   *
   * @default true
   */
  shallow?: boolean;

  /**
   * Maximum amount of time (ms) to wait between updates of the URL query string.
   *
   * This is to alleviate rate-limiting of the Web History API in browsers,
   * and defaults to 50ms. Safari requires a much higher value of around 340ms.
   *
   * Note: the value will be limited to a minimum of 50ms, anything lower
   * will not have any effect.
   *
   * @default 50
   * @minimum 50
   */
  throttleMs?: number;

  /**
   * Clear the key-value pair from the URL query string when setting the state
   * to the default value.
   *
   * Defaults to `true` to keep URLs clean.
   *
   * Set it to `false` to keep backwards-compatiblity when the default value
   * changes (prefer explicit URLs whose meaning don't change).
   *
   * @default true
   */
  clearOnDefault?: boolean;

  /**
   * Clear the key-value pair from the URL query string when setting the state
   * to the default value.
   *
   * Defaults to `false` as it would destroy the empty state of the query.
   *
   * Set it to `true` to clear the URL when the state is empty.
   *
   * @default false
   */
  clearOnEmpty?: boolean;
};

export type Nullable<T> = {
  [K in keyof T]: T[K] | null;
} & {};

/**
 * Helper type to define and reuse urlKey options to rename search params keys
 *
 * Usage:
 * ```ts
 * import { type UrlKeys } from 'nuqs' // or 'nuqs/server'
 *
 * export const coordinatesSearchParams = {
 *   latitude: parseAsFloat.withDefault(0),
 *   longitude: parseAsFloat.withDefault(0),
 * }
 * export const coordinatesUrlKeys: UrlKeys<typeof coordinatesSearchParams> = {
 *   latitude: 'lat',
 *   longitude: 'lng',
 * }
 *
 * // Later in the code:
 * useQueryStates(coordinatesSearchParams, {
 *   urlKeys: coordinatesUrlKeys
 * })
 * createSerializer(coordinatesSearchParams, {
 *   urlKeys: coordinatesUrlKeys
 * })
 * createSearchParamsCache(coordinatesSearchParams, {
 *   urlKeys: coordinatesUrlKeys
 * })
 * ```
 */
export type UrlKeys<Parsers extends Record<string, any>> = Partial<Record<keyof Parsers, string>>;
