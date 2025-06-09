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

  let { children }: Props = $props();

  const adapter: AdapterInterface = {
    updateUrl: (search, options) => {
      const { history, scroll, shallow } = options;

      if (browser) {
        const url = new URL(location.href);
        url.search = renderQueryString(search);

        if (shallow) {
          const fn = history === "replace" ? replaceState : pushState;

          fn(url, {
            replaceState: history === "replace",
            keepFocus: true,
          });
        } else {
          goto(url, {
            replaceState: history === "replace",
            keepFocus: true,
            invalidateAll: true,
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
</script>

<NuqsContext {adapter}>
  {@render children?.()}
</NuqsContext>
