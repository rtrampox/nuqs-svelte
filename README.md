<!-- commented sections of the readme means that some of those examples are not yet implemented by nuqs-svelte, but exist on the original nuqs readme -->

# nuqs-svelte

### `nuqs-svelte` is an unnoficial Svelte port of [nuqs](https://github.com/47ng/nuqs) library.

[![NPM](https://img.shields.io/npm/v/nuqs-svelte?color=red)](https://www.npmjs.com/package/nuqs-svelte)
[![MIT License](https://img.shields.io/github/license/rtrampox/nuqs-svelte.svg?color=blue)](https://github.com/rtrampox/nuqs-svelte/blob/main/LICENSE)
[![CI/CD](https://github.com/rtrampox/nuqs-svelte/actions/workflows/ci-cd.yaml/badge.svg?branch=next)](https://github.com/rtrampox/nuqs-svelte/actions/workflows/ci-cd.yaml)
![dependabot](https://img.shields.io/badge/dependabot-active-brightgreen?style=flat-square&logo=dependabot)

Type-safe search params state manager for Svelte. Like `$state()`, but stored in the URL query string.

## Features

- 🔀 **new:** Supports SvelteKit, and custom routers via [adapters](#adapters)
- 🧘‍♀️ Simple: the URL is the source of truth
- 🕰 Replace history or [append](#history) to use the Back button to navigate state updates
- ⚡️ Built-in [parsers](#parsing) for common state types (integer, float, boolean, Date, and more). Create your own parsers for custom types & pretty URLs
- ♊️ Related querystrings with [`useQueryStates`](#usequerystates)
- 📡 [Shallow mode](#shallow) by default for URL query updates

<!-- ## Documentation

Read the complete documentation at [nuqs.47ng.com](https://nuqs.47ng.com). -->

## Installation

```shell
pnpm add nuqs-svelte
```

```shell
yarn add nuqs-svelte
```

```shell
npm install nuqs-svelte
```

## Adapters

You will need to wrap your Svelte component tree with an adapter. _(expand the appropriate section below)_

<details>
  <summary>
    <img src="https://avatars.githubusercontent.com/u/23617963?s=20&v=4" alt="SvelteKit" style="vertical-align: middle;" />
  SvelteKit
  </summary>

> Supported Svelte versions: `>=5.0.0`.

```svelte filename="src/routes/+layout.svelte"
// src/routes/+layout.svelte
<script lang="ts">
  import { NuqsAdapter } from "nuqs-svelte/adapters/svelte-kit";
  import "../app.css";

  let { children } = $props();
</script>

<NuqsAdapter>
  {@render children()}
</NuqsAdapter>
```

</details>

## Usage

```svelte filename="src/routes/+page.svelte"
// src/routes/+page.svelte
<script lang="ts">
  import { useQueryState } from "nuqs-svelte";
  import "../app.css";

  const name = useQueryState("name");
</script>

<h1>Hello, {name.current || "anonymous visitor"}!</h1>
  <input bind:value={name} />
<button onClick={() => setName(null)}>Clear</button>
```

`useQueryState` takes one required argument: the key to use in the query string.

It returns an object with the value present in the query
string as a string (or `null` if none was found).

Example outputs for our hello world example:

| URL          | name value | Notes                                                             |
| ------------ | ---------- | ----------------------------------------------------------------- |
| `/`          | `null`     | No `name` key in URL                                              |
| `/?name=`    | `''`       | Empty string                                                      |
| `/?name=foo` | `'foo'`    |
| `/?name=2`   | `'2'`      | Always returns a string by default, see [Parsing](#parsing) below |

## Parsing

If your state type is not a string, you must pass a parsing function in the
second argument object.

We provide parsers for common and more advanced object types:

```ts
import {
  parseAsString,
  parseAsInteger,
  parseAsFloat,
  parseAsBoolean,
  parseAsTimestamp,
  parseAsIsoDateTime,
  parseAsArrayOf,
  parseAsJson,
  parseAsStringEnum,
  parseAsStringLiteral,
  parseAsNumberLiteral,
} from "nuqs-svelte";

useQueryState("tag"); // defaults to string
useQueryState("count", parseAsInteger);
useQueryState("brightness", parseAsFloat);
useQueryState("darkMode", parseAsBoolean);
useQueryState("after", parseAsTimestamp); // state is a Date
useQueryState("date", parseAsIsoDateTime); // state is a Date
useQueryState("array", parseAsArrayOf(parseAsInteger)); // state is number[]
useQueryState("json", parseAsJson<Point>()); // state is a Point

// Enums (string-based only)
enum Direction {
  up = "UP",
  down = "DOWN",
  left = "LEFT",
  right = "RIGHT",
}

const direction = useQueryState(
  "direction",
  parseAsStringEnum<Direction>(Object.values(Direction)) // pass a list of allowed values
    .withDefault(Direction.up),
);

// Literals (string-based only)
const colors = ["red", "green", "blue"] as const;

const color = useQueryState(
  "color",
  parseAsStringLiteral(colors) // pass a readonly list of allowed values
    .withDefault("red"),
);

// Literals (number-based only)
const diceSides = [1, 2, 3, 4, 5, 6] as const;

const side = useQueryState(
  "side",
  parseAsNumberLiteral(diceSides) // pass a readonly list of allowed values
    .withDefault(4),
);
```

You may pass a custom set of `parse` and `serialize` functions:

```svelte
<script lang="ts">
  import { useQueryState } from "nuqs-svelte";

  const hex = useQueryState("hex", {
    // TypeScript will automatically infer it's a number
    // based on what `parse` returns.
    parse: (query: string) => parseInt(query, 16),
    serialize: (value) => value.toString(16),
  });
</script>
```

> Note: parsers **don't validate** your data. If you expect positive integers
> or JSON-encoded objects of a particular shape, you'll need to feed the result
> of the parser to a schema validation library, like [Zod](https://zod.dev).

## Default value

When the query string is not present in the URL, the default behaviour is to
return `null` as state.

It can make state updating and UI rendering tedious. Take this example of a simple counter stored in the URL:

```svelte
<script lang="ts">
  import { useQueryState, parseAsInteger } from "nuqs-svelte";

  const count = useQueryState("count", parseAsInteger);
</script>

<pre>count: {count.current}</pre>
<button onclick={() => count.current = 0}>Reset</button>
<!-- handling null values in setCount is annoying: -->
<button onclick={() => count.set((c) => c ?? 0 + 1)}>+</button>
<button onclick={() => count.set((c) => c ?? 0 - 1)}>-</button>
<button onclick={() => count.set(null)}>Clear</button>

```

You can specify a default value to be returned in this case:

```ts
<script lang="ts">
  import { useQueryState, parseAsInteger } from "nuqs-svelte";

  const count = useQueryState("count", parseAsInteger.withDefault(0));
  const increment = () => count.set((c) => c + 1); // c will never be null
  const decrement = () => count.set((c) => c - 1); // c will never be null
  const clearCount = () => count.set(null); // Remove query from the URL
</script>

```

Note: the default value is internal to Svelte, it will **not** be written to the
URL.

Setting the state to `null` will remove the key in the query string and set the
state to the default value.

## Options

### History

By default, state updates are done by replacing the current history entry with
the updated query when state changes.

You can see this as a sort of `git squash`, where all state-changing
operations are merged into a single history value.

You can also opt-in to push a new history item for each state change,
per key, which will let you use the Back button to navigate state
updates:

```ts
// Default: replace current history with new state
useQueryState("foo", { history: "replace" });

// Append state changes to history:
useQueryState("foo", { history: "push" });
```

Any other value for the `history` option will fallback to the default.

You can also override the history mode when calling the state updater function:

```ts
const query = useQueryState("q", { history: "push" });

// This overrides the hook declaration setting:
query.set(null, { history: "replace" });
```

### Shallow

> Note: this feature only applies to the SvelteKit adapter

By default, query state updates are done in a _client-first_ manner: there are
no network calls to the server.

To opt-in to query updates notifying the server (re-fetch data from loaders),
you can set `shallow` to `false`:

```ts
const state = useQueryState("foo", { shallow: false });

// You can also pass the option on calls to setState:
state.set("bar", { shallow: false });
```

### Throttling URL updates

Because of browsers rate-limiting the History API, internal updates to the
URL are queued and throttled to a default of 50ms, which seems to satisfy
most browsers even when sending high-frequency query updates, like binding
to a text input or a slider.

Safari's rate limits are much higher and would require a throttle of around 340ms.
If you end up needing a longer time between updates, you can specify it in the
options:

```ts
useQueryState("foo", {
  // Send updates to the server maximum once every second
  shallow: false,
  throttleMs: 1000,
});

// You can also pass the option on calls to setState:
state.set("bar", { throttleMs: 1000 });
```

> Note: the state returned by the hook is always updated instantly, to keep UI responsive.
> Only changes to the URL, and server requests when using `shallow: false`, are throttled.

If multiple hooks set different throttle values on the same event loop tick,
the highest value will be used. Also, values lower than 50ms will be ignored,
to avoid rate-limiting issues. [Read more](https://francoisbest.com/posts/2023/storing-react-state-in-the-url-with-nextjs#batching--throttling).

## Configuring parsers, default value & options

You can use a builder pattern to facilitate specifying all of those things:

```ts
useQueryState(
  "counter",
  parseAsInteger.withDefault(0).withOptions({
    history: "push",
    shallow: false,
  }),
);
```

You can get this pattern for your custom parsers too, and compose them
with others:

```ts
import { createParser, parseAsHex } from "nuqs-svelte";

// Wrapping your parser/serializer in `createParser`
// gives it access to the builder pattern & server-side
// parsing capabilities:
const hexColorSchema = createParser({
  parse(query) {
    if (query.length !== 6) {
      return null; // always return null for invalid inputs
    }
    return {
      // When composing other parsers, they may return null too.
      r: parseAsHex.parse(query.slice(0, 2)) ?? 0x00,
      g: parseAsHex.parse(query.slice(2, 4)) ?? 0x00,
      b: parseAsHex.parse(query.slice(4)) ?? 0x00,
    };
  },
  serialize({ r, g, b }) {
    return parseAsHex.serialize(r) + parseAsHex.serialize(g) + parseAsHex.serialize(b);
  },
})
  // Eg: set common options directly
  .withOptions({ history: "push" });

// Or on usage:
useQueryState(
  "tribute",
  hexColorSchema.withDefault({
    r: 0x66,
    g: 0x33,
    b: 0x99,
  }),
);
```

<!-- Note: see this example running in the [hex-colors demo](<./packages/docs/src/app/playground/(demos)/hex-colors/page.tsx>). -->

## Multiple Queries (batching)

You can call as many state update function as needed in a single event loop
tick, and they will be applied to the URL asynchronously:

```ts
<script lang="ts">
  const lat = useQueryState("lat", parseAsFloat);
  const lng = useQueryState("lng", parseAsFloat);

  const randomCoordinates = () => {
    lat.set(Math.random() * 180 - 90);
    lng.set(Math.random() * 360 - 180);
  }
</script>
```

If you wish to know when the URL has been updated, and what it contains, you can
await the Promise returned by the state updater function, which gives you the
updated URLSearchParameters object:

```ts
const randomCoordinates = () => {
  setLat(42);
  return setLng(12);
};

randomCoordinates().then((search: URLSearchParams) => {
  search.get("lat"); // 42
  search.get("lng"); // 12, has been queued and batch-updated
});
```

<details>
<summary><em>Implementation details (Promise caching)</em></summary>

The returned Promise is cached until the next flush to the URL occurs,
so all calls to a `state.set` (of any hook) in the same event loop tick will
return the same Promise reference.

Due to throttling of calls to the Web History API, the Promise may be cached
for several ticks. Batched updates will be merged and flushed once to the URL.
This means not every `state.set` will reflect to the URL, if another one comes
overriding it before flush occurs.

The returned Svelte state will reflect all set values instantly,
to keep UI responsive.

---

</details>

## `useQueryStates`

For query keys that should always move together, you can use `useQueryStates`
with an object containing each key's type:

```ts
import { useQueryStates, parseAsFloat } from "nuqs-svelte";

const coordinates = useQueryStates(
  {
    lat: parseAsFloat.withDefault(45.18),
    lng: parseAsFloat.withDefault(5.72),
  },
  {
    history: "push",
  },
);

const { lat, lng } = coordinates;

// Set all (or a subset of) the keys in one go:
const search = await coordinates.set({
  lat: Math.random() * 180 - 90,
  lng: Math.random() * 360 - 180,
});
```

<!--
## Loaders

To parse search params as a one-off operation, you can use a **loader function**:

```tsx
import { createLoader } from "nuqs"; // or 'nuqs/server'

const searchParams = {
  q: parseAsString,
  page: parseAsInteger.withDefault(1),
};

const loadSearchParams = createLoader(searchParams);

const { q, page } = loadSearchParams("?q=hello&page=2");
```

It accepts various types of inputs (strings, URL, URLSearchParams, Request, Promises, etc.). [Read more](https://nuqs.47ng.com/docs/server-side#loaders)

## Accessing searchParams in Server Components

If you wish to access the searchParams in a deeply nested Server Component
(ie: not in the Page component), you can use `createSearchParamsCache`
to do so in a type-safe manner.

> Note: parsers **don't validate** your data. If you expect positive integers
> or JSON-encoded objects of a particular shape, you'll need to feed the result
> of the parser to a schema validation library, like [Zod](https://zod.dev).

```tsx
// searchParams.ts
import { createSearchParamsCache, parseAsInteger, parseAsString } from "nuqs/server";
// Note: import from 'nuqs/server' to avoid the "use client" directive

export const searchParamsCache = createSearchParamsCache({
  // List your search param keys and associated parsers here:
  q: parseAsString.withDefault(""),
  maxResults: parseAsInteger.withDefault(10),
});

// page.tsx
import { searchParamsCache } from "./searchParams";

export default function Page({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // ⚠️ Don't forget to call `parse` here.
  // You can access type-safe values from the returned object:
  const { q: query } = searchParamsCache.parse(searchParams);
  return (
    <div>
      <h1>Search Results for {query}</h1>
      <Results />
    </div>
  );
}

function Results() {
  // Access type-safe search params in children server components:
  const maxResults = searchParamsCache.get("maxResults");
  return <span>Showing up to {maxResults} results</span>;
}
```

The cache will only be valid for the current page render
(see React's [`cache`](https://react.dev/reference/react/cache) function).

Note: the cache only works for **server components**, but you may share your
parser declaration with `useQueryStates` for type-safety in client components:

```tsx
// searchParams.ts
import { parseAsFloat, createSearchParamsCache } from "nuqs/server";

export const coordinatesParsers = {
  lat: parseAsFloat.withDefault(45.18),
  lng: parseAsFloat.withDefault(5.72),
};
export const coordinatesCache = createSearchParamsCache(coordinatesParsers);

// page.tsx
import { coordinatesCache } from "./searchParams";
import { Server } from "./server";
import { Client } from "./client";

export default async function Page({ searchParams }) {
  await coordinatesCache.parse(searchParams);
  return (
    <>
      <Server />
      <Suspense>
        <Client />
      </Suspense>
    </>
  );
}

// server.tsx
import { coordinatesCache } from "./searchParams";

export function Server() {
  const { lat, lng } = coordinatesCache.all();
  // or access keys individually:
  const lat = coordinatesCache.get("lat");
  const lng = coordinatesCache.get("lng");
  return (
    <span>
      Latitude: {lat} - Longitude: {lng}
    </span>
  );
}

// client.tsx
// prettier-ignore
'use client'

import { useQueryStates } from "nuqs";
import { coordinatesParsers } from "./searchParams";

export function Client() {
  const [{ lat, lng }, setCoordinates] = useQueryStates(coordinatesParsers);
  // ...
}
```

## Serializer helper

To populate `<Link>` components with state values, you can use the `createSerializer`
helper.

Pass it an object describing your search params, and it will give you a function
to call with values, that generates a query string serialized as the hooks would do.

Example:

```ts
import {
  createSerializer,
  parseAsInteger,
  parseAsIsoDateTime,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

const searchParams = {
  search: parseAsString,
  limit: parseAsInteger,
  from: parseAsIsoDateTime,
  to: parseAsIsoDateTime,
  sortBy: parseAsStringLiteral(["asc", "desc"] as const),
};

// Create a serializer function by passing the description of the search params to accept
const serialize = createSerializer(searchParams);

// Then later, pass it some values (a subset) and render them to a query string
serialize({
  search: "foo bar",
  limit: 10,
  from: new Date("2024-01-01"),
  // here, we omit `to`, which won't be added
  sortBy: null, // null values are also not rendered
});
// ?search=foo+bar&limit=10&from=2024-01-01T00:00:00.000Z
```

### Base parameter

The returned `serialize` function can take a base parameter over which to
append/amend the search params:

```ts
serialize("/path?baz=qux", { foo: "bar" }); // /path?baz=qux&foo=bar

const search = new URLSearchParams("?baz=qux");
serialize(search, { foo: "bar" }); // ?baz=qux&foo=bar

const url = new URL("https://example.com/path?baz=qux");
serialize(url, { foo: "bar" }); // https://example.com/path?baz=qux&foo=bar

// Passing null removes existing values
serialize("?remove=me", { foo: "bar", remove: null }); // ?foo=bar
```

## Parser type inference

To access the underlying type returned by a parser, you can use the
`inferParserType` type helper:

```ts
import { parseAsInteger, type inferParserType } from "nuqs"; // or 'nuqs/server'

const intNullable = parseAsInteger;
const intNonNull = parseAsInteger.withDefault(0);

inferParserType<typeof intNullable>; // number | null
inferParserType<typeof intNonNull>; // number
```

For an object describing parsers (that you'd pass to `createSearchParamsCache`
or to `useQueryStates`, `inferParserType` will
return the type of the object with the parsers replaced by their inferred types:

```ts
import { parseAsBoolean, parseAsInteger, type inferParserType } from "nuqs"; // or 'nuqs/server'

const parsers = {
  a: parseAsInteger,
  b: parseAsBoolean.withDefault(false),
};

inferParserType<typeof parsers>;
// { a: number | null, b: boolean }
```

## Testing

Since nuqs v2, you can use a testing adapter to unit-test components using
`useQueryState` and `useQueryStates` in isolation, without needing to mock
your framework or router.

Here's an example using Testing Library and Vitest:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";
import { CounterButton } from "./counter-button";

it("should increment the count when clicked", async () => {
  const user = userEvent.setup();
  const onUrlUpdate = vi.fn<[UrlUpdateEvent]>();
  render(<CounterButton />, {
    // Setup the test by passing initial search params / querystring,
    // and give it a function to call on URL updates
    wrapper: ({ children }) => (
      <NuqsTestingAdapter searchParams="?count=42" onUrlUpdate={onUrlUpdate}>
        {children}
      </NuqsTestingAdapter>
    ),
  });
  // Initial state assertions: there's a clickable button displaying the count
  const button = screen.getByRole("button");
  expect(button).toHaveTextContent("count is 42");
  // Act
  await user.click(button);
  // Assert changes in the state and in the (mocked) URL
  expect(button).toHaveTextContent("count is 43");
  expect(onUrlUpdate).toHaveBeenCalledOnce();
  expect(onUrlUpdate.mock.calls[0][0].queryString).toBe("?count=43");
  expect(onUrlUpdate.mock.calls[0][0].searchParams.get("count")).toBe("43");
  expect(onUrlUpdate.mock.calls[0][0].options.history).toBe("push");
});
```

See [#259](https://github.com/47ng/nuqs/issues/259) for more testing-related discussions.

## Debugging

You can enable debug logs in the browser by setting the `debug` item in localStorage
to `nuqs`, and reload the page.

```js
// In your devtools:
localStorage.setItem("debug", "nuqs");
```

> Note: unlike the `debug` package, this will not work with wildcards, but
> you can combine it: `localStorage.setItem('debug', '*,nuqs')`

Log lines will be prefixed with `[nuqs]` for `useQueryState` and `[nuq+]` for
`useQueryStates`, along with other internal debug logs.

User timings markers are also recorded, for advanced performance analysis using
your browser's devtools.

Providing debug logs when opening an [issue](https://github.com/47ng/nuqs/issues)
is always appreciated. 🙏

### SEO

If your page uses query strings for local-only state, you should add a
canonical URL to your page, to tell SEO crawlers to ignore the query string
and index the page without it.

In the app router, this is done via the metadata object:

```ts
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/url/path/without/querystring",
  },
};
```

If however the query string is defining what content the page is displaying
(eg: YouTube's watch URLs, like `https://www.youtube.com/watch?v=dQw4w9WgXcQ`),
your canonical URL should contain relevant query strings, and you can still
use `useQueryState` to read it:

```ts
// page.tsx
import type { Metadata, ResolvingMetadata } from "next";
import { useQueryState } from "nuqs";
import { parseAsString } from "nuqs/server";

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const videoId = parseAsString.parseServerSide(searchParams.v);
  return {
    alternates: {
      canonical: `/watch?v=${videoId}`,
    },
  };
}
```

### Lossy serialization

If your serializer loses precision or doesn't accurately represent
the underlying state value, you will lose this precision when
reloading the page or restoring state from the URL (eg: on navigation).

Example:

```ts
const geoCoordParser = {
  parse: parseFloat,
  serialize: (v) => v.toFixed(4), // Loses precision
};

const [lat, setLat] = useQueryState("lat", geoCoordParser);
```

Here, setting a latitude of 1.23456789 will render a URL query string
of `lat=1.2345`, while the internal `lat` state will be correctly
set to 1.23456789.

Upon reloading the page, the state will be incorrectly set to 1.2345. -->

## License

[MIT](https://github.com/rtrampox/nuqs-svelte/blob/main/LICENSE)

![Project analytics and stats](https://repobeats.axiom.co/api/embed/94319c1c6d9da034e470c6340e0cc1b76f421e3b.svg "Repobeats analytics image")
