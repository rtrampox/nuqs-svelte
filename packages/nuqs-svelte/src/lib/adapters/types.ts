import type { Options } from "$lib/types";

export type AdapterOptions = Pick<Options, "history" | "scroll" | "shallow">;

export type UpdateUrlFunction = (
  search: URLSearchParams,
  options: Required<AdapterOptions>,
) => void;

export type UseAdapterHook = () => AdapterInterface;

export type AdapterContext = {
  useAdapter: UseAdapterHook;
};

export type AdapterInterface = {
  searchParams: () => URLSearchParams;
  updateUrl: UpdateUrlFunction;
  getSearchParamsSnapshot?: () => URLSearchParams;
  /**
   * A function that is called by the adapter when a navigation occurs.
   * This is used to sync any changes made to the URL with nuqs internal state.
   *
   * @default
   * ```ts
   * const adapter = {
   *  onNavigate: (cb) => {
   *   window.addEventListener("popstate", cb);
   * }
   * ```
   */
  onNavigate?: (cb: () => void) => void;
  rateLimitFactor?: number;
};
