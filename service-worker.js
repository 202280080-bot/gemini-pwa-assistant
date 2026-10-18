
const CACHE_NAME = "gemini-assistant-v2";

const APP_SHELL = [
    "/",
    "/manifest.webmanifest",
    "/static/css/styles.css",
    "/static/js/app.js",
    "/static/icons/icon-192.png",
    "/static/icons/icon-512.png"
];

// Install: i-cache ang mga pangunahing file ng app.
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

// Activate: alisin ang lumang cache.
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // GET requests lang ang hahawakan ng cache.
    if (request.method !== "GET") return;

    // Huwag i-cache ang API requests o external websites.
    if (
        url.origin !== self.location.origin ||
        url.pathname.startsWith("/api/")
    ) {
        return;
    }

    // Network-first para sa page, cached page kapag offline.
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();

                        event.waitUntil(
                            caches.open(CACHE_NAME)
                                .then((cache) => cache.put("/", copy))
                        );
                    }

                    return response;
                })
                .catch(async () => {
                    const cached = await caches.match("/");
                    if (cached) return cached;

                    return new Response(
                        "Hindi available ang app page offline. Buksan muna ito habang online.",
                        {
                            status: 503,
                            headers: {
                                "Content-Type": "text/plain; charset=utf-8"
                            }
                        }
                    );
                })
        );

        return;
    }

    // Cache-first para sa CSS, JavaScript, manifest, at icons.
    event.respondWith(
        caches.match(request)
            .then(async (cached) => {
                if (cached) return cached;

                try {
                    const response = await fetch(request);

                    if (response.ok) {
                        const copy = response.clone();

                        event.waitUntil(
                            caches.open(CACHE_NAME)
                                .then((cache) => cache.put(request, copy))
                        );
                    }

                    return response;
                } catch {
                    return new Response("Resource unavailable offline.", {
                        status: 503,
                        headers: {
                            "Content-Type": "text/plain; charset=utf-8"
                        }
                    });
                }
            })
    );
});
