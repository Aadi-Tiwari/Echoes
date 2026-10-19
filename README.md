# Echoes

Explore historical documents through archive search, narration, and questions grounded in the text you select.

Echoes combines a Next.js interface with Library of Congress search, OCR, object recognition, and optional speech and language services. Archive mode accepts pasted or uploaded material; Discover searches public collections; Heirloom explores the history of an object.

## Run locally

Use Node.js 22.17 or newer and npm.

```sh
npm ci
```

Copy `.env.example` to `.env.local`, then run:

```sh
npm run dev
```

Open <http://localhost:3000>. The interface starts without provider keys. Some features need network access or downloaded model assets.

| Setting | Purpose |
| --- | --- |
| `GROQ_API_KEY` | Document questions, OCR cleanup, and timeline narration |
| `ELEVENLABS_API_KEY` | Server-generated speech |
| `NEXT_PUBLIC_BROWSER_TTS` | Set to `true` to use the browser speech path |

Keep provider keys on the server. Only the browser speech switch belongs in a `NEXT_PUBLIC_` variable.

## Behavior

- Questions are answered from the supplied document. Missing credentials or provider failures return an explicit unavailable response.
- Questions send the supplied document excerpt in full, up to 50,000 characters. Longer excerpts are rejected rather than silently cut off. The prompt asks for supporting passages and an explicit statement when the text does not support an answer; provider output still needs review.
- OCR cleanup preserves the extracted text when the language service is unavailable.
- Narration falls back to the browser voice when cloud speech is unavailable. Browser voice availability and autoplay permissions depend on the device.
- Archive outages appear as search errors, separately from searches with no matches.
- Search results come from external archives. Generated narration, answers, and object histories still need checking against primary sources.
- Uploads, selected document text, and speech text may be sent to the services used by the selected feature. This is not an offline document vault.

## Source map

- `src/app/`: pages and API routes.
- `src/components/`: upload, playback, archive, and visualization interfaces.
- `src/lib/`: shared browser and data helpers.
- `tests/routes.test.mjs`: route tests with provider responses mocked.

## Checks

```sh
npm test
npm run build
```

The tests exercise input validation, missing credentials, successful provider responses, and failure fallbacks. A production build checks compilation and types. Neither check proves that external archive APIs, downloaded models, or paid providers are available in a deployment.

## License

Original project source is available under the [MIT License](LICENSE). Third-party dependencies, model weights, fonts, documents, and datasets retain their own licenses. This license does not grant rights to third-party assets.
