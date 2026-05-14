/**
 * sessionStorage-backed API cache for the farmer dashboard.
 *
 * Why: Supabase free tier has 2-5s latency per request.
 * Caching in sessionStorage means navigating between pages
 * within the same browser session is instant.
 *
 * TTLs:
 *   STATIC  (5 min) — modules list, lesson content (never changes)
 *   FARMER  (30 sec) — per-farmer stats and daily feed
 */

const TTL_STATIC = 5 * 60 * 1000;   // 5 minutes in ms
const TTL_FARMER = 30 * 1000;        // 30 seconds in ms

function cacheKey(url) {
  return `c4a_cache:${url}`;
}

function getFromCache(url) {
  try {
    const raw = sessionStorage.getItem(cacheKey(url));
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      sessionStorage.removeItem(cacheKey(url));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setInCache(url, data, ttl) {
  try {
    sessionStorage.setItem(cacheKey(url), JSON.stringify({
      data,
      expiresAt: Date.now() + ttl,
    }));
  } catch {
    // sessionStorage full or unavailable — silently skip
  }
}

export function invalidateFarmerCache(farmerId) {
  try {
    const prefix = `c4a_cache:`;
    const farmerPrefix = `/farmers/${farmerId}`;
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(prefix) && key.includes(farmerPrefix)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {}
}

/**
 * Fetch with sessionStorage caching.
 * @param {string} url - Full URL to fetch
 * @param {'static'|'farmer'} ttlType - Cache duration type
 * @returns {Promise<any>} - Parsed JSON response
 */
export async function cachedFetch(url, ttlType = 'static') {
  const cached = getFromCache(url);
  if (cached !== null) return cached;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const ttl = ttlType === 'farmer' ? TTL_FARMER : TTL_STATIC;
  setInCache(url, data, ttl);
  return data;
}
