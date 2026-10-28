const CACHE_NAME = "linked-coin-v3";

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
  "/en/sign-in",
  "/bn/dashboard",
  "/bn/transactions",
  "/bn/transactions/new",
  "/bn/accounts",
  "/bn/people",
  "/bn/tags",
  "/bn/query",
  "/bn/data",
  "/bn/sign-in",
];

// Guaranteed standalone offline fallback HTML page (zero external CSS/JS dependencies)
const OFFLINE_FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <meta name="theme-color" content="#059669" />
  <title>Linked Coin — Offline Mode</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #090d16;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .card {
      width: 100%;
      max-width: 480px;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 1.5rem;
      padding: 1.75rem 1.5rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .icon-box {
      width: 4rem;
      height: 4rem;
      margin: 0 auto 1.25rem;
      border-radius: 1rem;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fbbf24;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fde68a;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
    }
    h1 {
      font-size: 1.35rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 0.5rem;
      letter-spacing: -0.025em;
    }
    p {
      color: #94a3b8;
      font-size: 0.875rem;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .nav-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.6rem;
      margin-bottom: 1.5rem;
      text-align: left;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.65rem 0.75rem;
      border-radius: 0.75rem;
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #e2e8f0;
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 600;
      transition: all 0.15s ease;
    }
    .nav-item:hover, .nav-item:active {
      background: rgba(51, 65, 85, 0.8);
      border-color: rgba(16, 185, 129, 0.4);
      color: #34d399;
      transform: translateY(-1px);
    }
    .retry-btn {
      width: 100%;
      padding: 0.75rem;
      border-radius: 0.75rem;
      background: #059669;
      border: none;
      color: #ffffff;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: background 0.15s ease;
    }
    .retry-btn:hover { background: #10b981; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-box">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="1" y1="1" x2="23" y2="23"></line>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
        <line x1="12" y1="20" x2="12.01" y2="20"></line>
      </svg>
    </div>

    <div class="badge">Offline Mode Active</div>
    <h1>Linked Coin is Ready Offline</h1>
    <p>
      You are currently offline. Your financial ledger data is stored securely in this browser.
      You can open cached sections below or retry when connection returns.
    </p>

    <div class="nav-grid">
      <a class="nav-item" href="/en/dashboard">📊 Dashboard</a>
      <a class="nav-item" href="/en/transactions">📝 Transactions</a>
      <a class="nav-item" href="/en/transactions/new">➕ New Entry</a>
      <a class="nav-item" href="/en/accounts">👛 Accounts</a>
      <a class="nav-item" href="/en/people">👥 People / Loans</a>
      <a class="nav-item" href="/en/tags">🏷️ Tags</a>
    </div>

    <button class="retry-btn" onclick="window.location.reload()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
      </svg>
      <span>Retry Connection</span>
    </button>
  </div>

  <script>
    // Automatically reload as soon as device is back online
    window.addEventListener('online', function() {
      window.location.reload();
    });
  </script>
</body>
</html>`;

// Helper: fetch with strict timeout to prevent browser hanging on dead/flaky network
function timeoutFetch(request, ms = 1800) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return Promise.reject(new Error("Offline"));
  }
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
      // 1. Immediately cache the embedded offline fallback page
      const offlineBlob = new Blob([OFFLINE_FALLBACK_HTML], { type: "text/html; charset=utf-8" });
      await cache.put(
        "/offline",
        new Response(offlineBlob, {
          status: 200,
          statusText: "OK",
          headers: { "Content-Type": "text/html; charset=utf-8" },
        })
      );

      // 2. Fetch and cache all app shell URLs
      await Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { redirect: "follow", credentials: "same-origin" });
            if (response && response.status === 200) {
              const body = await response.blob();
              const cleanResponse = new Response(body, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              });
              await cache.put(url, cleanResponse);
              // Also map dashboard to root "/" for direct PWA start_url access
              if (url === "/en/dashboard") {
                await cache.put("/", cleanResponse.clone());
              }
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

// Fetch Event: Complete resilience against ERR_FAILED
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ignore non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // 1. Handle API and Sync Requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      timeoutFetch(event.request, 3000).catch(() => {
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

  // 2. Static Assets (Scripts, CSS, Images, Fonts, Manifest) -> Cache-First with Background Refresh
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/static/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname === "/manifest.json";

  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);

        if (cachedResponse) {
          // If online, update cache in background
          if (navigator.onLine) {
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  cache.put(event.request, networkResponse);
                }
              })
              .catch(() => {});
          }
          return cachedResponse;
        }

        // Not in cache, try network
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // Return a safe dummy response instead of undefined to prevent ERR_FAILED
          return new Response("", { status: 408, statusText: "Offline Asset Unavailable" });
        }
      })()
    );
    return;
  }

  // 3. Next.js Client-Side RSC Payloads (?_rsc=... or Header RSC: 1)
  const isRscRequest =
    url.searchParams.has("_rsc") ||
    event.request.headers.get("RSC") === "1";

  if (isRscRequest) {
    event.respondWith(
      (async () => {
        if (navigator.onLine) {
          try {
            const networkResponse = await timeoutFetch(event.request, 1500);
            if (networkResponse && networkResponse.status === 200) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          } catch (err) {
            // Network failed, fall through to cache
          }
        }

        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request);
        if (cached) return cached;

        // Return a clean 503 so Next.js falls back to hard navigation which SW serves from cache
        return new Response("", {
          status: 503,
          headers: { "Content-Type": "text/x-component" },
        });
      })()
    );
    return;
  }

  // 4. Full Page Navigation Requests (mode === "navigate")
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        // Try network first if device reports online
        if (navigator.onLine) {
          try {
            const networkResponse = await timeoutFetch(event.request, 2000);
            if (networkResponse && networkResponse.status === 200) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(event.request, networkResponse.clone());
              cache.put(url.pathname, networkResponse.clone());
              if (url.pathname.includes("/dashboard")) {
                cache.put("/", networkResponse.clone());
              }
              return networkResponse;
            }
          } catch (err) {
            // Network failed or timed out, proceed to offline cache fallbacks
          }
        }

        // Offline: Search cache hierarchically
        const cache = await caches.open(CACHE_NAME);

        // A. Match exact request (e.g. /en/transactions)
        let cached = await cache.match(event.request, { ignoreSearch: true });
        if (cached) return cached;

        // B. Match pathname
        cached = await cache.match(url.pathname, { ignoreSearch: true });
        if (cached) return cached;

        // C. If root "/" or unknown path, check dashboard
        if (url.pathname === "/") {
          cached = await cache.match("/en/dashboard", { ignoreSearch: true });
          if (cached) return cached;
          cached = await cache.match("/bn/dashboard", { ignoreSearch: true });
          if (cached) return cached;
        }

        // D. Try locale dashboard
        const fallbackLocale = url.pathname.startsWith("/bn") ? "bn" : "en";
        cached = await cache.match(`/${fallbackLocale}/dashboard`, { ignoreSearch: true });
        if (cached) return cached;

        // E. Try cached /offline page
        cached = await cache.match("/offline", { ignoreSearch: true });
        if (cached) return cached;

        // F. Try cached "/"
        cached = await cache.match("/", { ignoreSearch: true });
        if (cached) return cached;

        // G. Try any cached HTML page in the cache
        const keys = await cache.keys();
        for (const req of keys) {
          const reqUrl = new URL(req.url);
          if (
            reqUrl.pathname.includes("/dashboard") ||
            reqUrl.pathname.includes("/transactions") ||
            reqUrl.pathname === "/offline"
          ) {
            const match = await cache.match(req);
            if (match) return match;
          }
        }

        // H. GUARANTEED ZERO-FAIL FALLBACK: Embedded offline page
        // Never return undefined to prevent ERR_FAILED
        return new Response(OFFLINE_FALLBACK_HTML, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      })()
    );
    return;
  }

  // 5. Default handler: Cache-first with safe response fallback
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) return cached;

      try {
        const networkResponse = await timeoutFetch(event.request, 2000);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // Return 503 instead of undefined so browser never throws ERR_FAILED
        return new Response("Offline resource unavailable", {
          status: 503,
          statusText: "Offline",
        });
      }
    })()
  );
});
