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

    /**
     * A function that determines whether a navigation should trigger
     * a full invalidation of all `load` functions.
     *
     * - `'deps'` (default): Relies on SvelteKit's built-in dependency tracking.
     * - `'always'`: Always invalidates all load functions.
     * - `(url: URL) => boolean`: A custom predicate function.
     */
    invalidation?: "deps" | "always" | ((url: URL) => boolean);
  };

  let { children, invalidation = "deps" }: Props = $props();

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
          let shouldInvalidate = false;
          if (invalidation === "always") {
            shouldInvalidate = true;
          } else if (typeof invalidation === "function") {
            shouldInvalidate = invalidation(url);
          }

          goto(url, {
            replaceState: history === "replace",
            keepFocus: true,
            invalidateAll: shouldInvalidate,
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
