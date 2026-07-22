// sw.js — 오프라인 캐시 (설치 후 인터넷 없이도 동작)
const CACHE = "saju-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./js/jeolgi_data.js",
  "./js/interpretation_db.js",
  "./js/saju_engine.js",
  "./js/nameology.js",
  "./js/hanja_db.js",
  "./js/interpret.js",
  "./js/models_embedded.js",
  "./js/face-api.min.js",
  "./js/gwansang_photo.js",
  "./js/app.js",
  "./models/tiny_face_detector_model-weights_manifest.json",
  "./models/tiny_face_detector_model-shard1",
  "./models/face_landmark_68_model-weights_manifest.json",
  "./models/face_landmark_68_model-shard1",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 캐시 우선, 없으면 네트워크 (오프라인 대비)
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => hit))
  );
});
