// Knobs for the mock API. Edits apply on the next request, no restart needed.

/** Each response waits a random time in this range, in milliseconds. */
export const LATENCY_MS: [number, number] = [200, 700]

/** Share of requests that fail with a 503, from 0 to 1. */
export const FAIL_RATE = 0

/** How long a quote can be used to create a transfer. */
export const QUOTE_TTL_MS = 30 * 60 * 1000
