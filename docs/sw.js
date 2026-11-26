// فطار المكتب — Service Worker: يخلّي الموقع يتسطّب ويفتح من غير نت
// زوّد رقم النسخة مع أي تعديل في الملفات علشان الكاش القديم يتمسح
const VER = 'ob-v49';
const SHELL = ['./', './index.html', './icon.png', './icon-192.png', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER && k !== 'ob-meta').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // بيانات Firebase نفسها (Firestore/Auth) متتكاشش هنا — Firestore عنده كاش خاص بيه
  if (url.host.endsWith('googleapis.com') && url.host !== 'fonts.googleapis.com') return;

  // الصفحة نفسها: من النت الأول (علشان التحديثات توصل) ولو مفيش نت من الكاش
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('/index.html'))) {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VER).then(x => x.put('./index.html', c)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // مكتبة Firebase والخطوط والأيقونات: من الكاش الأول
  if (url.origin === location.origin || /gstatic\.com|fonts\.googleapis\.com/.test(url.host)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(VER).then(x => x.put(req, c)); }
      return r;
    })));
  }
});

// الضغط على الإشعار يفتح الموقع على الصفحة المطلوبة
self.addEventListener('notificationclick', e => {
  e.notification.close();
  let hash = e.notification.data?.hash || '#home';
  if (e.action === 'skip' && /^#order\//.test(hash)) hash = hash.replace('#order/', '#skip/');
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.postMessage({ hash }); return c.focus(); } }
    return self.clients.openWindow(new URL('./' + hash, self.registration.scope).href);
  }));
});

// إشعار جاي من الـWorker (Web Push) — بيوصل حتى لو الموقع مقفول
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data?.text() }; }
  const hash = d.hash || '#home';
  // نسجّل إن الإشعار وصل للجهاز (للتشخيص من صفحة «حسابي»)
  caches.open('ob-meta').then(c => c.put('./__last-push', new Response(JSON.stringify({ title: d.title, at: Date.now() })))).catch(() => {});
  const t = d.title || '', BN = [['🎡','wheel'],['🍳','order'],['🍲','lunch'],['✅','closed'],['⏰','remind'],['💸','money'],['📢','announce'],['📣','announce'],['🗳','poll']];
  const banner = 'nb/' + ((BN.find(([em]) => t.includes(em)) || [,'default'])[1]) + '.jpg';
  e.waitUntil(self.registration.showNotification(d.title || 'فطار المكتب', {
    body: d.body || '', icon: 'icon-192.png', badge: 'badge.png', image: banner, tag: /^#order\//.test(hash) ? hash : hash + ':' + Date.now(), renotify: true,
    data: { hash }, lang: 'ar', dir: 'rtl', vibrate: [120, 60, 120],
    actions: /^#order\//.test(hash) ? [{ action: 'open', title: 'افتح' }, { action: 'skip', title: 'مش النهارده' }] : [],
  }));
});
