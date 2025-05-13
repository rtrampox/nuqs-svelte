import type { AdapterInterface, UseAdapterHook } from "./types";
import { getContext, setContext } from "svelte";
import type { AdapterContext } from "./types";

const ADAPTER_CONTEXT_KEY = Symbol.for("nuqs-svelte-adapter");

declare global {
  interface Window {
    __NuqsAdapterContext?: ReturnType<typeof createAdapterContext>;
  }
}

export const createAdapterContext = ({ adapter }: { adapter: AdapterInterface }) => {
  setContext<AdapterContext>(ADAPTER_CONTEXT_KEY, {
    useAdapter: () => adapter,
  });
};

export const useAdapter: UseAdapterHook = () => {
  const context = getContext(ADAPTER_CONTEXT_KEY) as AdapterContext | null;
  if (!context) {
    throw new Error(
      "No adapter context found. Make sure to wrap your component with NuqsAdapter, imported from nuqs-svelte/adapters/{adapter-name}",
    );
  }

  return context.useAdapter();
};
