<script lang="ts">
  import { parseAsBoolean, parseAsString } from "$lib/parsers";
    import { useQueryStates } from "$lib/use-query-states.svelte";

  const queries = useQueryStates({
    q: parseAsString.withDefault("string-value"),
    switch: parseAsBoolean.withDefault(false).withOptions({
      history: "push"
    }),
  });
</script>

<div class="flex flex-col gap-2">
  <input
    type="text"
    bind:value={queries.q.current}
    placeholder="Search..."
    class="w-full rounded-md bg-neutral-900 p-2 text-white ring ring-neutral-600"
  />

  <button
    type="button"
    class="rounded-md p-2 text-white ring ring-neutral-600 {queries.switch.current
      ? 'bg-green-500'
      : 'bg-neutral-900'}"
    onclick={() => queries.switch.current = !queries.switch.current}>
    Toggle Switch
  </button>

  <button
    type="button"
    class="rounded-md p-2 text-white ring ring-neutral-600 bg-red-500"
    onclick={() => queries.set((prev) => ({ ...prev, q: null, switch: false }))}
  >
    Reset
  </button>
</div>
