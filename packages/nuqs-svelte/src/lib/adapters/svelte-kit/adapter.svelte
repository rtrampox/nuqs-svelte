<script lang="ts">
  import { browser } from "$app/environment";
  import { goto, pushState, replaceState } from "$app/navigation";
  import { page } from "$app/state";
  import type { Snippet } from "svelte";
  import type { AdapterInterface, AdapterOptions } from "../types";
  import NuqsContext from "../NuqsContext.svelte";
  import { renderQueryString } from "$lib/url-encoding";
  import { SvelteURL } from "svelte/reactivity";

  type Props = {
    children?: Snippet;
    /**
     * Options defined at adapter level take precedence over options setted at hook (`useQueryState`) level.
     */
    options?: AdapterOptions;
  };

  let { children, options }: Props = $props();

  // Using page.url directly will update the URL without invalidating the loaders dependent on it.
  let url = $derived(new SvelteURL(page.url));

  const adapter: AdapterInterface = {
    options,
    updateUrl: (search, options) => {
      const { history, scroll, shallow } = options;

      if (browser) {
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
          });
        }

        if (scroll) {
          window.scrollTo(0, 0);
        }
      }
    },

    searchParams: () => new URLSearchParams(url.searchParams),
    getSearchParamsSnapshot: () => new URLSearchParams(url.searchParams),
  };
</script>

<NuqsContext {adapter}>
  {@render children?.()}
</NuqsContext>
