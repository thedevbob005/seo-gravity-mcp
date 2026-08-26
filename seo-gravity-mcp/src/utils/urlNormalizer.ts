import * as crypto from 'crypto';

export function normalizeUrl(rawUrl: string, baseUrl?: string): string {
  if (!rawUrl) return '/';

  try {
    let resolved: URL;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      resolved = new URL(rawUrl);
    } else if (baseUrl) {
      resolved = new URL(rawUrl, baseUrl);
    } else {
      resolved = new URL(rawUrl, 'http://localhost');
    }

    // Lowercase hostname
    resolved.hostname = resolved.hostname.toLowerCase();

    // Strip default ports
    if ((resolved.protocol === 'http:' && resolved.port === '80') ||
        (resolved.protocol === 'https:' && resolved.port === '443')) {
      resolved.port = '';
    }

    // Normalize path (remove duplicate slashes, keep root or trim trailing slash)
    let pathname = resolved.pathname.replace(/\/+/g, '/');
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    resolved.pathname = pathname;

    // Sort query parameters deterministically
    const params = Array.from(resolved.searchParams.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    resolved.search = '';
    for (const [k, v] of params) {
      resolved.searchParams.append(k, v);
    }

    // Remove hash/fragment for canonical logical page identity
    resolved.hash = '';

    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || baseUrl) {
      return resolved.toString();
    }
    return resolved.pathname + resolved.search;
  } catch {
    return rawUrl.trim().replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }
}

export function computeNormalizedLogicalPageId(urlOrPath: string, baseUrl?: string): string {
  const norm = normalizeUrl(urlOrPath, baseUrl);
  let origin = 'default';
  let pathOnly = norm;

  try {
    if (norm.startsWith('http')) {
      const u = new URL(norm);
      origin = u.origin;
      pathOnly = u.pathname + u.search;
    }
  } catch {}

  const payload = `${origin}:${pathOnly}`;
  return 'page_' + crypto.createHash('sha256').update(payload).digest('hex').substring(0, 12);
}
