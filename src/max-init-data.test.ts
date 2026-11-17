import { describe, expect, it } from 'vitest';
import { validateMaxInitData } from './max-init-data';

async function hmac(key: Uint8Array, message: string) {
  const imported = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', imported, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function makeInitData(botToken: string, authDate: number) {
  const values = new URLSearchParams({
    auth_date: String(authDate),
    query_id: 'query-123',
    user: JSON.stringify({ id: 987654321, first_name: 'Test', last_name: 'Resident' }),
  });
  const secret = await hmac(new TextEncoder().encode('WebAppData'), botToken);
  const keyBytes = new Uint8Array(secret.match(/.{2}/g)!.map((part) => Number.parseInt(part, 16)));
  const canonical = [...values.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, value]) => key + '=' + value).join('\n');
  values.set('hash', await hmac(keyBytes, canonical));
  return values.toString();
}

describe('validateMaxInitData', () => {
  const token = 'test-bot-token';

  it('accepts a valid signed MAX launch payload', async () => {
    const raw = await makeInitData(token, 1_800_000_000);
    const result = await validateMaxInitData(raw, token, { now: 1_800_000_010, maxAgeSeconds: 300 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.id).toBe(987654321);
  });

  it('rejects payloads whose signed data was modified', async () => {
    const raw = await makeInitData(token, 1_800_000_000);
    const modified = raw.replace('Test', 'Evil');
    expect((await validateMaxInitData(modified, token, { now: 1_800_000_010 })).ok).toBe(false);
  });

  it('rejects expired launch data', async () => {
    const raw = await makeInitData(token, 1_799_000_000);
    expect((await validateMaxInitData(raw, token, { now: 1_800_000_000, maxAgeSeconds: 300 })).ok).toBe(false);
  });

  it('rejects duplicate keys and missing signatures', async () => {
    const raw = await makeInitData(token, 1_800_000_000);
    expect((await validateMaxInitData(raw + '&auth_date=1800000000', token, { now: 1_800_000_010 })).ok).toBe(false);
    expect((await validateMaxInitData(raw.replace(/&hash=[^&]+/, ''), token, { now: 1_800_000_010 })).ok).toBe(false);
  });

  it('rejects invalid user JSON and future timestamps', async () => {
    const invalidUser = new URLSearchParams({ auth_date: '1800000000', user: 'not-json', hash: '00' });
    expect((await validateMaxInitData(invalidUser.toString(), token, { now: 1_800_000_010 })).ok).toBe(false);
    const future = await makeInitData(token, 1_800_000_100);
    expect((await validateMaxInitData(future, token, { now: 1_800_000_010 })).ok).toBe(false);
  });
});
