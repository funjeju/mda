// In-memory rate limiter — works per-instance (serverless cold-start resets state).
// For production multi-instance deployments, replace with Upstash Redis.

const windows = new Map<string, number[]>();

/**
 * Returns true if the request should be allowed through.
 * @param key      Typically `uid:route`
 * @param limit    Max requests per window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (windows.get(key) ?? []).filter((t) => t > cutoff);
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  windows.set(key, timestamps);
  return true;
}
