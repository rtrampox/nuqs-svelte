<script lang="ts">
  import { parseAsBoolean, parseAsString } from "$lib/parsers";
  import { useQueryState } from "$lib/use-query-state.svelte";

  const query = useQueryState("q", parseAsString.withDefault("string-value"));

  const switchState = useQueryState("switch", parseAsBoolean.withDefault(false));
</script>

<div class="flex flex-col gap-2">
  <input
    type="text"
    bind:value={query.current}
    placeholder="Search..."
    class="w-full rounded-md bg-neutral-900 p-2 text-white ring ring-neutral-600"
  />

  <button
    type="button"
    class="rounded-md p-2 text-white ring ring-neutral-600 {switchState.current
      ? 'bg-green-500'
      : 'bg-neutral-900'}"
    onclick={() => switchState.set((prev) => !prev)}
  >
    Toggle Switch
  </button>
</div>
