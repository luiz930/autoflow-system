const CACHE_VERSION = "wagen-pwa-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const STATIC_ASSETS = [
    "/offline",
    "/static/responsive.css",
    "/static/photo_upload.js",
    "/static/pwa_install.js",
    "/static/favicon.jpg",
    "/static/icon-192.jpg",
    "/static/icon-512.jpg",
];

function isSafeStaticRequest(requestUrl) {
    return requestUrl.origin === self.location.origin
        && requestUrl.pathname.startsWith("/static/")
        && !requestUrl.pathname.startsWith("/static/uploads/");
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .catch(() => undefined)
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys
                .filter((key) => key.startsWith("wagen-pwa-") && key !== STATIC_CACHE)
                .map((key) => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const requestUrl = new URL(request.url);

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.ok) {
                        const copy = response.clone();
                        caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(request).then((cached) => cached || caches.match("/offline")))
        );
        return;
    }

    if (!isSafeStaticRequest(requestUrl)) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => {
            const fresh = fetch(request)
                .then((response) => {
                    if (response && response.ok) {
                        const copy = response.clone();
                        caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => cached);

            return cached || fresh;
        })
    );
});
