<script lang="ts">
  import type { AdapterInterface } from "./types";
  import type { Snippet } from "svelte";
  import { createAdapterContext } from "./index.svelte";

  type Props = {
    adapter: AdapterInterface;
    children?: Snippet;
  };

  let { adapter, children }: Props = $props();

  createAdapterContext({ adapter });
</script>

{@render children?.()}
