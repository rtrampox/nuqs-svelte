<script lang="ts">
  import { browser } from "$app/environment";
  import { goto, pushState, replaceState } from "$app/navigation";
  import { page } from "$app/state";
  import type { Snippet } from "svelte";
  import type { AdapterInterface } from "../types";
  import NuqsContext from "../NuqsContext.svelte";
  import { renderQueryString } from "$lib/url-encoding";

  type Props = {
    children?: Snippet;
  };

  const adapter: AdapterInterface = {
    updateUrl: (search, options) => {
      const { history, scroll, shallow } = options;

      if (browser) {
        const url = new URL(location.href);
        url.search = renderQueryString(search);

        if (shallow) {
          const fn = history === "replace" ? replaceState : pushState;

          fn(url, {
            invalidateAll: false,
            replaceState: history === "replace",
            keepFocus: true,
          });
        } else {
          goto(url, {
            invalidateAll: true,
            replaceState: history === "replace",
            keepFocus: true,
          });
        }

        if (scroll) {
          window.scrollTo(0, 0);
        }
      }
    },

    searchParams: () => page.url.searchParams,
    getSearchParamsSnapshot: () => page.url.searchParams,
  };

  let { children }: Props = $props();
</script>

<NuqsContext {adapter}>
  {@render children?.()}
</NuqsContext>
