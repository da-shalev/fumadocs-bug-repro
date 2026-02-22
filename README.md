# `createRelativeLink` type error reproduction

## Requirements

- **bun** (tested with 1.3.9)
- This MUST be run with bun in a workspace or turborepo monorepo -- npm/yarn don't reproduce the issue because they hoist flat

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

This is a **bun dependency resolution bug**. `@fumadocs/base-ui` correctly declares `fumadocs-core` as a peerDependency, but bun still creates two separate copies because of an unrelated version mismatch in `lucide-react`:

- `@fumadocs/base-ui` has `lucide-react: "^0.570.0"` as a regular dependency
- The consuming app (or a sibling workspace package) has `lucide-react: "^0.575.0"`
- `fumadocs-core` lists `lucide-react` as an **optional** peer dep
- Bun treats these two different `lucide-react` resolutions as different peer contexts, and creates two `fumadocs-core` instances with different dependency resolution hashes -- even though `fumadocs-core` is a non-optional peer dep that should always deduplicate

The two copies are byte-for-byte identical, but TypeScript uses declaration file path identity for generic type resolution. Since `LoaderOutput` and `LoaderConfig` come from two different filesystem paths, TypeScript cannot unify the generic `C` in `createRelativeLink<C extends LoaderConfig>(source: LoaderOutput<C>, ...)`, and the call fails.

npm/yarn don't have this problem because they hoist everything into a single flat `node_modules`.

## Verify the duplication

```bash
find node_modules/.bun -maxdepth 1 -name "fumadocs-core*" -type d
# Shows two entries with different hashes

readlink -f app/node_modules/fumadocs-core
readlink -f node_modules/.bun/@fumadocs+base-ui@*/node_modules/fumadocs-core
# Shows different paths
```

## Workaround

Add a `lucide-react` override in the root `package.json` to force a single version:

```json
{
  "overrides": {
    "lucide-react": "^0.575.0"
  }
}
```

Then clean install (`rm -rf node_modules && bun install`). This forces bun to use one `fumadocs-core` copy.

## Upstream bun issue

This is tracked in [oven-sh/bun#23615](https://github.com/oven-sh/bun/issues/23615) -- "Two Critical Bugs Making Bun 1.3 Isolated Installs + Catalog Unusable for Monorepos".
