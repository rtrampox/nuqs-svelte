<script lang="ts">
  import { NuqsAdapter } from "$lib/adapters/svelte-kit";
  import "../app.css";

  let { children } = $props();
</script>

<main class="flex min-h-screen flex-col items-center justify-center bg-neutral-900 text-white">
  <NuqsAdapter>
    {@render children()}
  </NuqsAdapter>
</main>
