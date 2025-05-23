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
  rateLimitFactor?: number;
};
