const ALLOWED_ORIGINS = new Set([
  "https://dh-sandbox-web.quintype.io",
  "https://www.prajavani.net",
  "https://prajavani-web.qtstage.io",
  "https://www.deccanherald.com",
  "https://product-tpml.github.io",
]);

function isJsonAsset(pathname) {
  return pathname === "/translations.json" || /^\/data\/[^/]+\.json$/.test(pathname);
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function rejectedOriginResponse() {
  return new Response("CORS origin not allowed", {
    status: 403,
    headers: {
      "Cache-Control": "no-store",
      Vary: "Origin",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    // Leave non-JSON assets and non-browser requests on the normal Pages
    // asset path. This keeps scraper and Apps Script requests working.
    if (!isJsonAsset(url.pathname) || !origin) {
      return env.ASSETS.fetch(request);
    }

    if (!ALLOWED_ORIGINS.has(origin)) {
      return rejectedOriginResponse();
    }

    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { ...headers, Allow: "GET, HEAD, OPTIONS" },
      });
    }

    const response = await env.ASSETS.fetch(request);
    const responseHeaders = new Headers(response.headers);
    Object.entries(headers).forEach(([name, value]) => responseHeaders.set(name, value));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};
