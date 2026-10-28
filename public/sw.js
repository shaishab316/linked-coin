const CACHE_NAME = "linked-coin-v2";

const PRECACHE_URLS = [
  "/",
  "/offline",
  "/manifest.json",
  "/icon.svg",
  "/en/dashboard",
  "/en/transactions",
  "/en/transactions/new",
  "/en/accounts",
  "/en/people",
  "/en/tags",
  "/en/query",
  "/en/data",
  "/bn/dashboard",
  "/bn/transactions",
  "/bn/transactions/new",
  "/bn/accounts",
  "/bn/people",
  "/bn/tags",
  "/bn/query",
  "/bn/data",
];

// Helper: fetch with strict timeout to prevent browser hanging on dead/flaky network
function timeoutFetch(request, ms = 1800) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Network timeout")), ms);
    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Install Event: Pre-cache core shell pages and static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { redirect: "follow" });
            if (response && response.status === 200) {
              await cache.put(url, response);
            }
          } catch (err) {
            console.warn("[SW] Precache skipped for:", url);
          }
        })
      );
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up outdated caches and claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Optimized routing, Stale-While-Revalidate for static assets, fast timeout for pages
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ignore non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Handle API and Sync Requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      timeoutFetch(event.request, 4000).catch(() => {
        return new Response(
          JSON.stringify({ offline: true, error: "Network offline or timed out" }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );
    return;
  }

  // 1. Static Assets (Scripts, CSS, Images, Fonts) -> Stale-While-Revalidate (0ms Cache-First)
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/static/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname === "/manifest.json";

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Fetch in background to keep cache fresh
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const toCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
            }
            return networkResponse;
          })
          .catch(() => {});

        // Return cached immediately if present, otherwise wait for network
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 2. Next.js Client-Side RSC Payloads (?_rsc=... or Header RSC: 1)
  const isRscRequest =
    url.searchParams.has("_rsc") ||
    event.request.headers.get("RSC") === "1";

  if (isRscRequest) {
    event.respondWith(
      timeoutFetch(event.request, 1500)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const toCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Look for cached RSC response
          const cached = await caches.match(event.request);
          if (cached) return cached;

          // Strip _rsc query and match base path
          const cleanUrl = new URL(event.request.url);
          cleanUrl.searchParams.delete("_rsc");
          const fallbackCached = await caches.match(cleanUrl.pathname);
          if (fallbackCached) return fallbackCached;

          return new Response("", { status: 200, headers: { "Content-Type": "text/x-component" } });
        })
    );
    return;
  }

  // 3. Full Page Navigation Requests (mode === "navigate")
  if (event.request.mode === "navigate") {
    event.respondWith(
      timeoutFetch(event.request, 1800)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const toCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Exact URL match from cache
          const cached = await caches.match(event.request);
          if (cached) return cached;

          // Match normalized path (e.g. /en/transactions without search)
          const pathCached = await caches.match(url.pathname);
          if (pathCached) return pathCached;

          // Fallback to cached dashboard or offline page
          const fallbackLocale = url.pathname.startsWith("/bn") ? "bn" : "en";
          const dashboardCached = await caches.match(`/${fallbackLocale}/dashboard`);
          if (dashboardCached) return dashboardCached;

          const offlineCached = await caches.match("/offline");
          if (offlineCached) return offlineCached;

          return caches.match("/");
        })
    );
    return;
  }

  // 4. Default handler: Cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        timeoutFetch(event.request, 2000)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const toCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
            }
            return networkResponse;
          })
          .catch(() => cached)
      );
    })
  );
});
