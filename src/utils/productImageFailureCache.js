/**
 * Session-scoped cache of product-image URLs that failed to load.
 *
 * The purchase orders board virtualizes rows: scrolling a row out of view and
 * back in unmounts and remounts its cells. Without this cache, a product
 * image that is known to be unreachable (e.g. the media backend is down)
 * would trigger a brand new failing fetch every single time the row
 * remounts, adding avoidable network/proxy load while scrolling.
 *
 * The cache lives for the lifetime of the page (cleared on reload) — once
 * the backend becomes reachable again, a full reload picks that up.
 */
const failedImageUrls = new Set();

/** Whether this image URL is already known to have failed to load. */
export function hasFailedProductImage(imageUrl) {
  return Boolean(imageUrl) && failedImageUrls.has(imageUrl);
}

/** Marks an image URL as failed so future mounts skip retrying it. */
export function markProductImageFailed(imageUrl) {
  if (imageUrl) failedImageUrls.add(imageUrl);
}

/** Test-only: clears the cache so test cases don't leak state into each other. */
export function resetProductImageFailureCache() {
  failedImageUrls.clear();
}
