# @vision/shared

Code shared by the Vision website (`frontend/`) and mobile app (`mobile/`).

| Module | Contents |
|--------|----------|
| `tokens.ts` | Colour palette, radii, spacing, fonts, type scale. Tailwind reads the palette from here; React Native styles use the same hex values. |
| `types.ts` | Every API request/response type. |
| `client.ts` | `createApiClient({ baseUrl, getToken })` — one HTTP client for both platforms. |
| `domain.ts` | Status mapping, LSU/ha, grazing days, metric thresholds, formatting, nav items, prompts. |

Both apps import it with the `@vision/shared` alias:

- Website — `frontend/tsconfig.json` path + `experimental.externalDir` in `next.config.mjs`
- Mobile — `mobile/tsconfig.json` path + `watchFolders`/`extraNodeModules` in `mobile/metro.config.js`

There is no build step; the source `.ts` files are consumed directly.
