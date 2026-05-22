/**
 * Thin re-export of the preload bridge, named so callers don't reach for
 * `window.delta` directly. Keeps swapping the transport (e.g. for testing)
 * to a single edit site.
 */
export const api = window.delta
