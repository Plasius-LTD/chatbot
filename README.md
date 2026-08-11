# @plasius/chatbot

[![npm version](https://img.shields.io/npm/v/@plasius/chatbot.svg)](https://www.npmjs.com/package/@plasius/chatbot)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Plasius-LTD/chatbot/ci.yml?branch=main&label=build&style=flat)](https://github.com/Plasius-LTD/chatbot/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/codecov/c/github/Plasius-LTD/chatbot)](https://codecov.io/gh/Plasius-LTD/chatbot)
[![License](https://img.shields.io/github/license/Plasius-LTD/chatbot)](./LICENSE)
[![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-yes-blue.svg)](./CODE_OF_CONDUCT.md)
[![Security Policy](https://img.shields.io/badge/security%20policy-yes-orange.svg)](./SECURITY.md)
[![Changelog](https://img.shields.io/badge/changelog-md-blue.svg)](./CHANGELOG.md)

Public package for chatbot UI/state integrations used in Plasius applications.


## Install

```bash
npm install @plasius/chatbot
```

## Module formats

This package publishes dual ESM and CJS artifacts.
When CJS output is emitted under `dist-cjs/*.js` with `type: module`, `dist-cjs/package.json` is generated with `{ "type": "commonjs" }` to ensure Node `require(...)` compatibility.


## Usage

```ts
import { ChatBot } from "@plasius/chatbot";
```

### Translations

The chatbot ships `en-GB` UI and client-error defaults resolved through
`@plasius/translations`. `title` and `placeholder` remain direct component
overrides; pass `translate` when a host application wants to resolve the stable
chatbot keys with its own locale bundle.

```tsx
import { ChatBot, type ChatbotTranslate } from "@plasius/chatbot";

const translate: ChatbotTranslate = (key, args) => i18n.t(key, args);

<ChatBot
  endpoint="/ai/chatbot"
  title="Support"
  placeholder="Ask a question"
  translate={translate}
/>;
```

## Development

```bash
npm install
npm run build
npm test
npm run demo:run
```

## Demo Sanity Check

```bash
npm run demo:run
```

## Publishing

This package is published via GitHub CD only.

Before dispatch, bind the npm trusted publisher to this repository, workflow
`cd.yml`, and environment `production`. Once verified, run the token-free
workflow from `main` and select the requested version bump. Publication requires
the prepared SHA to remain the exact `main` head, successful push-triggered CI,
Node 24, and npm 11.5.1 or newer. Never publish from a local machine.

## Governance

- Security policy: [SECURITY.md](./SECURITY.md)
- Code of conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- ADRs: [docs/adrs](./docs/adrs)
- Legal docs: [legal](./legal)

## License

MIT

<!-- BEGIN PLASIUS RELEASE INTEGRITY -->
## Release integrity

CI keeps the administrative contributor registry outside Git and npm package
artifacts using exact, case-normalised path checks. CI runs on approved
self-hosted runners for same-repository pull requests and `main`; fork PR code
is denied. Release preparation and npm publication use the GitHub-hosted
`production` job and the exact-main admission described above.
<!-- END PLASIUS RELEASE INTEGRITY -->
