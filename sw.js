// sw.js — 오프라인 캐시 v3
// 코드(HTML/JS)는 네트워크 우선(업데이트 즉시 반영, 오프라인 시 캐시),
// 모델·아이콘은 캐시 우선(한 번 받으면 다시 안 받음).
const CACHE = "saju-v4";
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
  "./js/palm.js",
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

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = e.request.url;
  const cacheFirst = url.includes("/models/") || url.includes("/icons/");
  if (cacheFirst) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }))
    );
  } else {
    // 코드·데이터: 네트워크 우선, 실패 시 캐시(오프라인)
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request))
    );
  }
});
