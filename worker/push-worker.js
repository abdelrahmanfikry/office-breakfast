// فطار المكتب — Worker الإشعارات (Cloudflare Workers، مجاني)
// الموقع يبعتله: { subs:[PushSubscription...], title, body, hash }
// وهو يبعت Web Push لكل اشتراك (VAPID + تشفير aes128gcm حسب RFC 8291).
// المتغيرات: VAPID_PUBLIC (عادي) · VAPID_PRIVATE (Secret) · VAPID_SUBJECT (mailto:...)
const ALLOWED = ['https://office-breakfast.pages.dev', 'https://abdelrahmanfikry.github.io'];
const okOrigin = o => !!o && (ALLOWED.includes(o) || /^https:\/\/[a-z0-9-]+\.office-breakfast\.pages\.dev$/.test(o));

const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const enc = new TextEncoder();
const concat = (...a) => { const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let o = 0; for (const x of a) { out.set(x, o); o += x.length; } return out; };

async function hkdf(salt, ikm, info, len) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8));
}

// تشفير الرسالة للاشتراك (RFC 8291 / 8188)
export async function encrypt(sub, payload) {
  const uaPub = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(auth, shared, concat(enc.encode('WebPush: info\0'), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const plain = concat(enc.encode(payload), new Uint8Array([2]));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, plain));
  const rs = new Uint8Array(4); new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}

// توقيع VAPID (JWT ES256)
export async function vapidAuth(endpoint, env) {
  const pub = unb64u(env.VAPID_PUBLIC);
  const jwk = { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), d: env.VAPID_PRIVATE, ext: true };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:admin@example.com' })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${head}.${body}`));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${env.VAPID_PUBLIC}`;
}

async function sendOne(sub, payload, env) {
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: await vapidAuth(sub.endpoint, env), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'high' },
    body: await encrypt(sub, payload),
  });
  return r.status;
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin');
    const cors = { 'Access-Control-Allow-Origin': okOrigin(origin) ? origin : ALLOWED[0], 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method === 'GET') return new Response('ok', { headers: cors });
    if (req.method !== 'POST' || !okOrigin(origin)) return new Response('forbidden', { status: 403, headers: cors });
    if (!env.VAPID_PRIVATE || !env.VAPID_PUBLIC) return new Response('missing VAPID keys', { status: 500, headers: cors });
    let data; try { data = await req.json(); } catch { return new Response('bad json', { status: 400, headers: cors }); }
    const subs = (Array.isArray(data.subs) ? data.subs : []).filter(s => s && /^https:\/\//.test(s.endpoint) && s.keys?.p256dh && s.keys?.auth).slice(0, 60);
    const payload = JSON.stringify({ title: String(data.title || 'فطار المكتب').slice(0, 80), body: String(data.body || '').slice(0, 240), hash: String(data.hash || '#home').slice(0, 80) });
    const res = await Promise.allSettled(subs.map(s => sendOne(s, payload, env)));
    // الاشتراكات المنتهية (404/410) بترجع علشان الموقع يشيلها
    const dead = subs.filter((s, i) => res[i].status === 'fulfilled' && (res[i].value === 404 || res[i].value === 410)).map(s => s.endpoint);
    return new Response(JSON.stringify({ sent: res.filter(r => r.status === 'fulfilled' && r.value < 300).length, dead }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  },
};
