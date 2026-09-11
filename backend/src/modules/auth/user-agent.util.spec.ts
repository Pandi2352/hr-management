import { describeAddress, parseUserAgent } from './user-agent.util';

const UA = {
  chromeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  androidTablet:
    'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ipad:
    'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/604.1',
  opera:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 OPR/105.0.0.0',
  curl: 'curl/8.4.0',
};

describe('parseUserAgent', () => {
  it('names the common desktop browsers', () => {
    expect(parseUserAgent(UA.chromeWindows).label).toBe('Chrome on Windows');
    expect(parseUserAgent(UA.safariMac).label).toBe('Safari on macOS');
    expect(parseUserAgent(UA.firefoxLinux).label).toBe('Firefox on Linux');
  });

  it('does not mistake Edge or Opera for Chrome, which both claim to be', () => {
    expect(parseUserAgent(UA.edgeWindows).browser).toBe('Edge');
    expect(parseUserAgent(UA.opera).browser).toBe('Opera');
  });

  it('does not mistake Chrome for Safari, which it also claims to be', () => {
    expect(parseUserAgent(UA.chromeWindows).browser).toBe('Chrome');
  });

  it('names phones and tablets', () => {
    expect(parseUserAgent(UA.safariIphone).label).toBe('Safari on iPhone');
    expect(parseUserAgent(UA.chromeAndroid).label).toBe('Chrome on Android');
    expect(parseUserAgent(UA.ipad).os).toBe('iPad');
  });

  it('tells a phone from a tablet', () => {
    expect(parseUserAgent(UA.safariIphone).deviceType).toBe('Mobile');
    expect(parseUserAgent(UA.chromeAndroid).deviceType).toBe('Mobile');
    expect(parseUserAgent(UA.androidTablet).deviceType).toBe('Tablet');
    expect(parseUserAgent(UA.ipad).deviceType).toBe('Tablet');
    expect(parseUserAgent(UA.chromeWindows).deviceType).toBe('Desktop');
  });

  it('recognises something that is not a browser at all', () => {
    expect(parseUserAgent(UA.curl).browser).toBe('API client');
  });

  it('says it does not know rather than guessing', () => {
    expect(parseUserAgent('').label).toBe('Unknown device');
    expect(parseUserAgent(undefined).label).toBe('Unknown device');
    expect(parseUserAgent('something entirely made up').label).toBe('Unknown device');
  });

  it('still names the half it can identify', () => {
    expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0)').label).toBe('Windows');
  });
});

describe('describeAddress', () => {
  it('unwraps an IPv4 address mapped into IPv6 space', () => {
    expect(describeAddress('::ffff:203.0.113.4')).toBe('203.0.113.4');
  });

  it('recognises the machine it is running on', () => {
    expect(describeAddress('::1')).toBe('This computer');
    expect(describeAddress('127.0.0.1')).toBe('This computer');
  });

  it('recognises a private network without pretending to know where it is', () => {
    expect(describeAddress('192.168.1.20')).toContain('Local network');
    expect(describeAddress('10.0.0.5')).toContain('Local network');
    expect(describeAddress('172.16.4.4')).toContain('Local network');
  });

  it('does not mistake a public address in a similar range for a private one', () => {
    expect(describeAddress('172.32.0.1')).toBe('172.32.0.1');
    expect(describeAddress('11.0.0.1')).toBe('11.0.0.1');
  });

  it('says nothing it does not know', () => {
    expect(describeAddress('')).toBe('Unknown address');
    expect(describeAddress(null)).toBe('Unknown address');
  });
});
