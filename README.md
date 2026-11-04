# Sendwell

Sendwell lets customers in the US send money to people abroad. Customers get a live quote, pick a saved recipient and a delivery method, and follow each transfer until it arrives.

This repo holds the web app and a mock API that runs inside the Vite dev server, so there is no separate backend to start.

## Getting started

```sh
npm install
npm run dev     # app and mock API on http://localhost:5173
npm test        # unit tests (vitest)
npm run build   # type check, then production build
```

## Layout

| Path | What lives there |
|---|---|
| `src/App.tsx` | App shell and navigation between screens |
| `src/features/send/` | Send money screen, live quote hook and quote summary |
| `src/features/recipients/` | Recipient list, add form and its validation rules |
| `src/features/history/` | Activity list with status filter, transfer detail |
| `src/state/AppData.tsx` | Context with corridors and saved recipients, loaded once at startup |
| `src/api/client.ts` | `apiGet` and `apiPost`, which throw `ApiError` on a non-2xx response |
| `src/lib/money.ts` | Currency table, parsing and formatting of amounts |
| `src/types.ts` | Types shared by the app and the mock API |
| `mock-server/` | The mock API (see below) |

Navigation and state use plain React state and context. There is no router or state library.

## Money

Every amount is an integer in the currency's minor unit: cents for USD, whole yen for JPY. Use `parseAmount` to read user input and `formatMoney` to display a value. Do not do math on formatted strings or on floats in major units.

## Mock API

`mock-server/plugin.ts` is a Vite plugin that serves `/api/*` during `npm run dev`. It loads `routes.ts` and `config.ts` on every request, so edits to the mock server apply on the next request without a restart. Requests show up in the browser's network tab like calls to a real backend.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/corridors` | Countries we send to and their delivery methods |
| POST | `/api/quotes` | Body `{ corridorId, deliveryMethod, sendAmount }`, amount in USD cents |
| GET | `/api/recipients` | Saved recipients |
| POST | `/api/recipients` | Validated with the same rules as the add form |
| GET | `/api/transfers?status=` | Newest first, optional status filter |
| GET | `/api/transfers/:id` | One transfer with its status timeline |
| POST | `/api/transfers` | Body `{ quoteId, recipientId }` |

Errors come back as `{ "error": "message" }` with a 4xx or 5xx status.

- **Data** lives in memory (`db.ts`), seeded with 6 recipients and 12 transfers when the server starts. Data you create survives edits to the mock server files. Restart `npm run dev` to reset it.
- **Pricing** (`pricing.ts`) holds the rate and fee for each corridor and delivery method. A method missing from a corridor's fee table is not offered there.
- **First-transfer offer:** the fee is waived on a customer's first transfer to each country. Cancelled and failed transfers do not count.
- **Quotes** are valid for 30 minutes and can be used for one transfer.
- **Latency and failures** are set in `config.ts`. Every response waits 200 to 700 ms. Set `FAIL_RATE` above 0 to make some requests fail with a 503.

## Hosted dev environments

When `PROJECTS_BASE_HOST` is set, `vite.config.ts` listens on `0.0.0.0:3000`, allows that host, and points HMR at `WEBSOCKET_PORT`. Locally neither is set and Vite's defaults apply.
