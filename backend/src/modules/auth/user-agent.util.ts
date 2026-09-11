/**
 * Reading a user agent string well enough to name a device.
 *
 * No library. The parsers that do this properly carry a database of thousands
 * of strings and are updated weekly, which is the right choice when you are
 * doing analytics. Here the string is shown to one person so they can answer a
 * single question — "is that me?" — and for that, "Chrome on Windows" is as
 * useful as a version number and far easier to read.
 *
 * Order matters throughout: Edge claims to be Chrome, Chrome claims to be
 * Safari, and almost everything claims to be Mozilla. The checks below run
 * most-specific first for that reason.
 */

export interface DeviceInfo {
  browser: string;
  os: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown';
  /** What the list shows: "Chrome on Windows". */
  label: string;
}

const UNKNOWN: DeviceInfo = {
  browser: 'Unknown browser',
  os: 'Unknown system',
  deviceType: 'Unknown',
  label: 'Unknown device',
};

function detectBrowser(ua: string): string {
  // Edge and Opera both embed "Chrome", so they are checked first.
  if (/\bEdgA?\//i.test(ua) || /\bEdge\//i.test(ua)) return 'Edge';
  if (/\bOPR\//i.test(ua) || /\bOpera\//i.test(ua)) return 'Opera';
  if (/\bSamsungBrowser\//i.test(ua)) return 'Samsung Internet';
  if (/\bFirefox\//i.test(ua) || /\bFxiOS\//i.test(ua)) return 'Firefox';
  if (/\bCriOS\//i.test(ua)) return 'Chrome';
  if (/\bChrome\//i.test(ua)) return 'Chrome';
  // Safari is last: every WebKit browser carries the token.
  if (/\bSafari\//i.test(ua) && /\bVersion\//i.test(ua)) return 'Safari';

  // Not a browser at all — a script, a health check, or an API client.
  if (/\b(curl|wget|python-requests|axios|postman|insomnia|node-fetch|okhttp)\b/i.test(ua)) {
    return 'API client';
  }

  return UNKNOWN.browser;
}

function detectOs(ua: string): string {
  // iPadOS reports itself as a Mac, so iOS-family checks come first.
  if (/\biPhone\b/i.test(ua)) return 'iPhone';
  if (/\biPad\b/i.test(ua)) return 'iPad';
  if (/\bAndroid\b/i.test(ua)) return 'Android';
  if (/\bWindows NT\b/i.test(ua)) return 'Windows';
  if (/\bMac OS X\b|\bMacintosh\b/i.test(ua)) return 'macOS';
  if (/\bCrOS\b/i.test(ua)) return 'ChromeOS';
  if (/\bLinux\b/i.test(ua)) return 'Linux';
  return UNKNOWN.os;
}

function detectType(ua: string, os: string): DeviceInfo['deviceType'] {
  if (os === 'iPad' || /\bTablet\b/i.test(ua)) return 'Tablet';
  if (os === 'iPhone' || /\bMobile\b/i.test(ua)) return 'Mobile';
  if (os === 'Android') return /\bMobile\b/i.test(ua) ? 'Mobile' : 'Tablet';
  if (os === UNKNOWN.os) return 'Unknown';
  return 'Desktop';
}

export function parseUserAgent(userAgent?: string | null): DeviceInfo {
  const ua = String(userAgent || '').trim();
  if (!ua) return { ...UNKNOWN };

  const browser = detectBrowser(ua);
  const os = detectOs(ua);
  const deviceType = detectType(ua, os);

  const label =
    browser === UNKNOWN.browser && os === UNKNOWN.os
      ? UNKNOWN.label
      : browser === UNKNOWN.browser
        ? os
        : os === UNKNOWN.os
          ? browser
          : `${browser} on ${os}`;

  return { browser, os, deviceType, label };
}

/**
 * What to show where a city would normally go.
 *
 * There is no geolocation database in this deployment and no call is made to
 * one, so this shows where the connection came from rather than inventing a
 * place. A wrong city on a security screen is worse than no city: it is the
 * exact thing somebody would use to decide a session is not theirs.
 */
export function describeAddress(ipAddress?: string | null): string {
  const raw = String(ipAddress || '').trim();
  if (!raw) return 'Unknown address';

  // Express hands back IPv4 addresses mapped into IPv6 space.
  const ip = raw.replace(/^::ffff:/i, '');

  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('127.')) return 'This computer';

  const isPrivate =
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    /^fe80:/i.test(ip) ||
    /^f[cd][0-9a-f]{2}:/i.test(ip);

  return isPrivate ? `Local network (${ip})` : ip;
}
