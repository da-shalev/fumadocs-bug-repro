import { source } from './source';
import { createRelativeLink } from 'fumadocs-ui/mdx';

const page = source.getPage([])!;

// TS2345: Argument of type 'LoaderOutput<specific>' is not assignable to 'LoaderOutput<LoaderConfig>'
// Caused by fumadocs-core being duplicated: fumadocs-ui resolves its own copy,
// while user code resolves a different copy. TypeScript can't unify generics
// across different declaration file paths.
createRelativeLink(source, page);
