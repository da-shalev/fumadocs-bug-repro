# `createRelativeLink` type error reproduction

## Requirements

- **bun** (tested with 1.3.9)
- This MUST be run with bun in a workspace or turborepo monorepo -- npm/yarn/pnpm may not reproduce the issue

## Reproduce

```bash
bun install
cd app
./node_modules/.bin/tsc --noEmit
```

Expected error:

```
repro.ts: error TS2345: Argument of type 'LoaderOutput<{ source: { pageData: DocCollectionEntry<...> ... }>
  is not assignable to parameter of type 'LoaderOutput<LoaderConfig>'.
  Types of property 'resolveHref' are incompatible.
```

## Root cause

Bun creates **two separate copies** of `fumadocs-core` in a bun workspace or turborepo monorepo because the app has `lucide-react@^0.575.0` while `@fumadocs/base-ui` depends on `lucide-react@^0.570.0`. Since `lucide-react` is an optional peer dep of `fumadocs-core`, the different versions cause bun to create two `fumadocs-core` instances with different dependency resolution hashes.

TypeScript cannot unify generic types (`LoaderOutput`, `LoaderConfig`) across different declaration file paths, even when the type definitions are byte-for-byte identical. So `createRelativeLink` (from fumadocs-ui's copy) and `loader()` (from the app's copy) use incompatible `LoaderOutput` types.

## Verify the duplication

```bash
find node_modules/.bun -maxdepth 1 -name "fumadocs-core*" -type d
# Shows two entries with different hashes

readlink -f app/node_modules/fumadocs-core
readlink -f node_modules/.bun/@fumadocs+base-ui@*/node_modules/fumadocs-core
# Shows different paths
```

## Fix

`@fumadocs/base-ui` should declare `fumadocs-core` as a `peerDependency` (it's currently only a devDependency). This would make bun use the host project's copy instead of installing a separate one.
