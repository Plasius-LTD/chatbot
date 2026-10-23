# ADR-0005: Fail-closed CSS build and package admission

Status: Accepted

Date: 2026-10-23

## Context

The chatbot runtime imports `styles/chatbot.module.css`. Its ESM and CommonJS
build scripts used `rsync ... || true`, which could mask a failed TypeScript
compile or copy and report success with missing runtime assets. The package
verifier checked CommonJS metadata but did not require the stylesheets.
Project Task [chatbot#16](https://github.com/Plasius-LTD/chatbot/issues/16)
requires failures to propagate and admission of the actual packed assets.

## Decision

Use a repository-local Node.js script to collect module CSS under `src/` and
copy it to the corresponding path under `dist/` or `dist-cjs/`. Require the
chatbot stylesheet as a regular source file before copying; reject symlinks in
the source tree. Accept only the two named output directories. Let compiler,
source-read, directory-creation and copy errors fail the build. Stale outputs
never substitute for a missing source asset.

Require both `dist/styles/chatbot.module.css` and
`dist-cjs/styles/chatbot.module.css`, plus existing CommonJS metadata, in the
`npm pack --dry-run --json --ignore-scripts` file list. Invoke npm with an
argument array and explicit working directory. Keep package validation
importable for isolated fixture tests while retaining the existing CLI.
Preserve all private-path and private-code admission checks. Add `pack:check`
after CI build; CD already runs build and package admission before publication.

Node built-ins suffice. Existing `@plasius/*` packages provide runtime product
contracts, not this repository's build asset operation; no shared package,
public API or runtime dependency is needed. Strict test checking requires the
previously absent `@types/node` (24.19.2, with `undici-types` 7.24.6) and
`@types/react-dom` (19.3.0). Pin these development-only declarations and extend
`typecheck` to the complete test suite through `tsconfig.tests.json`; retain
the existing source check and Vitest globals. No existing dependency is upgraded. This Task is
explicitly repository-operational maintenance with no product Feature, remote
flag, or capability. Asset integrity is unconditional.

## Alternatives

Removing `|| true` would propagate shell failures but retain an external
`rsync` requirement and would not detect missing source CSS with stale outputs.
A copy dependency would add unnecessary installation and maintenance costs.
Checking only files on disk would miss npm inclusion/exclusion mistakes.

## Consequences and verification

Consumers receive the same CSS bytes, module paths and CommonJS metadata.
Builds now fail when required assets cannot be produced. Regression fixtures
exercise missing source with stale outputs, each destination failure, compiler
failure, successful byte identity, package-file omission, metadata rejection
and preserved private admission. Tests import the changed scripts for LCOV;
CLI build/pack tests also assert actual nonzero process status. Coverage
thresholds remain unchanged.

Security/privacy: no secrets, runtime data, remote calls, or new entitlement
paths. Reliability: failure stops downstream build/publication. Performance:
only local build-time work; no browser cost. Portability: supported Node replaces
the shell copy utility. Accessibility, SEO and backend environment mapping are
unaffected because runtime components and deployment configuration are unchanged.

Release through the existing PR, exact-main CI and `cd.yml` on `main`, using
the `production` environment and npm OIDC. Verify actual registry assets and
provenance. A bad release is handled by the existing approved corrective-release
process or consumer pinning; do not bypass asset checks or rewrite versions.
The separate public-restoration Task #29 keeps its own completion prerequisites.
