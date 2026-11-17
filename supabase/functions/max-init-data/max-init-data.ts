export type MaxLaunchUser = {
  id: number | string;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type MaxLaunchResult =
  | { ok: true; user: MaxLaunchUser; authDate: number; chat?: { id: number | string; type: string } }
  | { ok: false; reason: string };

type ValidationOptions = { now?: number; maxAgeSeconds?: number };

async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function validateMaxInitData(
  raw: string,
  botToken: string,
  options: ValidationOptions = {},
): Promise<MaxLaunchResult> {
  if (!raw || raw.length > 16_384 || !botToken) return { ok: false, reason: 'missing_input' };

  const params = new URLSearchParams(raw);
  const entries = [...params.entries()];
  const keys = entries.map(([key]) => key);
  if (new Set(keys).size !== keys.length) return { ok: false, reason: 'duplicate_parameter' };

  const receivedHash = params.get('hash');
  if (!receivedHash) return { ok: false, reason: 'missing_hash' };

  const authDateRaw = params.get('auth_date');
  const authDate = authDateRaw ? Number(authDateRaw) : NaN;
  if (!Number.isSafeInteger(authDate) || authDate <= 0) return { ok: false, reason: 'invalid_auth_date' };

  const now = options.now ?? Math.floor(Date.now() / 1000);
  const maxAge = options.maxAgeSeconds ?? 86_400;
  if (authDate > now + 60 || now - authDate > maxAge) return { ok: false, reason: 'expired' };

  const userRaw = params.get('user');
  if (!userRaw) return { ok: false, reason: 'missing_user' };

  let user: unknown;
  try {
    user = JSON.parse(userRaw);
  } catch {
    return { ok: false, reason: 'invalid_user' };
  }
  if (!user || typeof user !== 'object' || !('id' in user) ||
      !(['string', 'number'].includes(typeof (user as { id: unknown }).id)) ||
      !('first_name' in user) || typeof (user as { first_name: unknown }).first_name !== 'string') {
    return { ok: false, reason: 'invalid_user' };
  }

  const canonical = entries
    .filter(([key]) => key !== 'hash')
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => key + '=' + value)
    .join('\n');

  const secretKey = await hmacSha256(new TextEncoder().encode('WebAppData'), botToken);
  const expectedHash = toHex(await hmacSha256(secretKey, canonical));
  if (!safeEqualHex(expectedHash, receivedHash)) return { ok: false, reason: 'invalid_signature' };

  const chatRaw = params.get('chat');
  let chat: { id: number | string; type: string } | undefined;
  if (chatRaw) {
    try {
      const parsed = JSON.parse(chatRaw) as { id?: unknown; type?: unknown };
      if ((typeof parsed.id === 'number' || typeof parsed.id === 'string') && typeof parsed.type === 'string') {
        chat = { id: parsed.id, type: parsed.type };
      }
    } catch {
      return { ok: false, reason: 'invalid_chat' };
    }
  }

  return { ok: true, user: user as MaxLaunchUser, authDate, ...(chat ? { chat } : {}) };
}
