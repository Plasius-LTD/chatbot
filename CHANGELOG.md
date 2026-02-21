# Changelog

All notable changes to this project will be documented in this file.

The format is based on **[Keep a Changelog](https://keepachangelog.com/en/1.1.0/)**, and this project adheres to **[Semantic Versioning](https://semver.org/spec/v2.0.0.html)**.

---

## [Unreleased]

- **Added**
  - (placeholder)

- **Changed**
  - Hardened GitHub CD publish flow to publish only after successful install, test, and build, then push tags/releases post-publish.
  - Standardized npm publish path on workflow-dispatched `.github/workflows/cd.yml` using provenance and production environment secrets.
  - Replaced `audit:deps` from `depcheck` to `npm ls --all --omit=optional --omit=peer > /dev/null 2>&1 || true` to avoid deprecated dependency-chain risk.

- **Fixed**
  - (placeholder)

- **Security**
  - Removed `depcheck` (and its `multimatch`/`minimatch` chain) from devDependencies to resolve reported high-severity audit findings.

## [1.0.1] - 2026-02-21

- **Added**
  - Added `npm run demo:run` for one-command local package/demo verification.

- **Changed**
  - Aligned OpenAI requirement to `^5.23.2` to match current `plasius-ltd-site` resolved baseline.
  - Updated React Router and toolchain dependency minimums to current `plasius-ltd-site` requirements.

- **Fixed**
  - Updated demo docs to run via the package script instead of manual multi-step commands.
  - Updated demo script to use a Node-safe build export so demo execution no longer fails on CSS module imports.

- **Security**
  - (placeholder)

## [1.0.1] - 2026-02-21

- **Added**
  - Add chatbot API client helpers (`getChatbotUsage`, `sendChatbotMessage`) and typed `ChatbotClientError`.
  - Add signed-in gating UX and demo usage-limit messaging in the `ChatBot` component.
  - Add usage/auth/client tests for chatbot API integration behavior.

- **Changed**
  - Refactor `ChatBot` to call backend `/ai/chatbot` instead of browser-side OpenAI keys.
  - Simplify package peer requirements by removing direct `openai` dependency from `@plasius/chatbot`.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.0] - 2026-02-12

- **Added**
  - Standalone public package scaffold at repository root with independent CI/CD, ADRs, and legal governance assets.

- **Changed**
  - Add dual ESM + CJS build outputs with `exports` entries and CJS artifacts in `dist-cjs/`.

- **Fixed**
  - Removed monorepo-relative TypeScript configuration coupling for standalone builds.

- **Security**
  - Added baseline public package governance and CLA documentation.

---

## Release process (maintainers)

1. Update `CHANGELOG.md` under **Unreleased** with user-visible changes.
2. Bump version in `package.json` following SemVer (major/minor/patch).
3. Move entries from **Unreleased** to a new version section with the current date.
4. Tag the release in Git (`vX.Y.Z`) and push tags.
5. Publish to npm (via CI/CD or `npm publish`).

> Tip: Use Conventional Commits in PR titles/bodies to make changelog updates easier.

---

[Unreleased]: https://github.com/Plasius-LTD/chatbot/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/Plasius-LTD/chatbot/releases/tag/v1.0.1

## [1.0.0] - 2026-02-11

- **Added**
  - Initial release.

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)
[1.0.0]: https://github.com/Plasius-LTD/chatbot/releases/tag/v1.0.0
[1.0.1]: https://github.com/Plasius-LTD/chatbot/releases/tag/v1.0.1
