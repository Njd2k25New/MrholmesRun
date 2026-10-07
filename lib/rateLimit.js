const REGISTRATION_LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;
// Development-only: this process-local Map is not reliable across serverless
// or multiple instances. Replace it with shared storage for production.
const attemptsByIp = new Map();

// Keep this list aligned with the trusted proxy/platform used in deployment.
// Do not use client-supplied forwarding headers unless the proxy overwrites them.
const PLATFORM_IP_HEADERS = [
  "x-vercel-forwarded-for",
  "cf-connecting-ip",
];

export function getClientIp(headers) {
  for (const headerName of PLATFORM_IP_HEADERS) {
    const platformIp = headers
      .get(headerName)
      ?.split(",")[0]
      .trim();

    if (platformIp) {
      return platformIp;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();

  if (realIp) {
    return realIp;
  }

  // X-Forwarded-For is a proxy chain; its leftmost value is the originating IP
  // when the trusted edge proxy correctly manages this header.
  const forwardedIp = headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim();

  return forwardedIp || "unknown";
}

export function checkRegistrationRateLimit(ip, now = Date.now()) {
  const windowStart = now - WINDOW_MS;

  // Keep expired client keys from accumulating in this process-local store.
  for (const [storedIp, timestamps] of attemptsByIp) {
    if (timestamps[timestamps.length - 1] <= windowStart) {
      attemptsByIp.delete(storedIp);
    }
  }

  const attempts = (attemptsByIp.get(ip) || []).filter(
    (timestamp) => timestamp > windowStart
  );

  if (attempts.length >= REGISTRATION_LIMIT) {
    attemptsByIp.set(ip, attempts);

    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((attempts[0] + WINDOW_MS - now) / 1000)
      ),
    };
  }

  attempts.push(now);
  attemptsByIp.set(ip, attempts);

  return { allowed: true, retryAfterSeconds: 0 };
}