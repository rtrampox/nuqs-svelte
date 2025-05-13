<script lang="ts">
  import type { Snippet } from "svelte";
  import type { AdapterInterface } from "../types";
  import NuqsContext from "../NuqsContext.svelte";
  import { renderQueryString } from "$lib/url-encoding";

  type Props = {
    children?: Snippet;
  };

  const adapter: AdapterInterface = {
    updateUrl: (search, options) => {
      const { history, scroll } = options;

      const url = new URL(location.href);
      url.search = renderQueryString(search);

      const method = history === "replace" ? "replaceState" : "pushState";

      window.history[method](null, "", url);
      if (scroll) window.scrollTo(0, 0);

      // Dispatch a popstate event to trigger route updates
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    searchParams: () => new URLSearchParams(location.search),
  };

  let { children }: Props = $props();
</script>

<NuqsContext {adapter}>
  {@render children?.()}
</NuqsContext>
