# ADR-0003: Dual ESM and CJS Runtime Compatibility

- Date: 2026-03-01
- Status: Accepted

## Context

`@plasius/chatbot` publishes dual ESM and CJS entry points. This package currently emits CJS output under `dist-cjs/*.js` while the repository root uses `type: module`. Without an explicit CommonJS boundary for `dist-cjs`, Node can interpret those files as ESM and fail at runtime for `require(...)` consumers.

## Decision

Keep dual output and enforce a runtime-compatible CJS boundary by:

- generating `dist-cjs/package.json` with `{ "type": "commonjs" }` as part of `build:cjs`;
- validating this metadata in `pack:check`;
- ensuring the packed artifact includes `dist-cjs/package.json`.

## Consequences

- Node CommonJS consumers can reliably load `@plasius/chatbot` via `require(...)`.
- ESM consumers remain unchanged.
- CD publish checks fail fast if CJS runtime compatibility metadata is missing.
