import { untrack } from "svelte";

/**
 * An version of Svelte's {@link $effect} that allows you to pass dependencies.
 *
 * Runs code when a component is mounted to the DOM, and then whenever its dependencies change, i.e. `$state` or `$derived` values.
 * The timing of the execution is after the DOM has been updated.
 *
 * Example:
 * ```ts
 * $effect(() => console.log('The count is now ' + count));
 * ```
 *
 * If you return a function from the effect, it will be called right before the effect is run again, or when the component is unmounted.
 *
 * Does not run during server side rendering.
 *
 * https://svelte.dev/docs/svelte/$effect
 * @param fn The function to execute
 * @param deps The dependencies to watch for changes, these dependencies need to be functions that return a value of a state
 * @param lazy If true, the effect will not run immediately, but only when the dependencies change
 */
function effectDeps(fn: () => void | (() => void), deps: (() => any)[] = [], lazy = false) {
  let initialRun = lazy;

  $effect(() => {
    // add effect to signal subscribers
    deps.forEach((dep) => dep());

    // don't immediately run
    if (initialRun) {
      initialRun = false;
      return;
    }

    // untrack deps and return cleanup
    return untrack(() => fn());
  });
}

export { effectDeps };
