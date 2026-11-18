/* =========================================================
   DevOpsPath API - Cloudflare Worker
   The course content served as JSON from Cloudflare's edge.

   GET /                     -> landing page listing the endpoints
   GET /api/topics           -> all topics (short)
   GET /api/topics/:slug     -> one topic (full)
   GET /api/quiz/random      -> a random quiz question
   GET /api/health           -> status + which Cloudflare data centre answered

   TOPICS and SUMMARIES are injected above this code by scripts/build-worker.js
   ========================================================= */

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*", // the Pages site (or anyone) may call this API
  "cache-control": "public, max-age=300",
};

const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), { status, headers: JSON_HEADERS });

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") return new Response(null, { headers: JSON_HEADERS });
    if (request.method !== "GET") return json({ error: "Only GET is supported" }, 405);

    if (path === "/") return landing(url, request);

    if (path === "/api/health") {
      return json({
        status: "ok",
        service: "devops-path-api",
        time: new Date().toISOString(),
        // request.cf is filled in by Cloudflare (undefined when testing locally)
        edge: {
          colo: request.cf?.colo ?? "local",
          country: request.cf?.country ?? "unknown",
          city: request.cf?.city ?? "unknown",
        },
      });
    }

    if (path === "/api/topics") return json(SUMMARIES);

    const m = path.match(/^\/api\/topics\/([\w-]+?)(?:\.json)?$/);
    if (m) {
      const topic = TOPICS.find((t) => t.slug === m[1]);
      return topic ? json(topic) : json({ error: `Topic "${m[1]}" not found`, available: TOPICS.map((t) => t.slug) }, 404);
    }

    if (path === "/api/quiz/random") {
      const pool = url.searchParams.get("topic")
        ? TOPICS.filter((t) => t.slug === url.searchParams.get("topic"))
        : TOPICS;
      if (!pool.length) return json({ error: "Unknown topic" }, 404);
      const topic = pool[Math.floor(Math.random() * pool.length)];
      const q = topic.quiz[Math.floor(Math.random() * topic.quiz.length)];
      return new Response(
        JSON.stringify({ topic: topic.slug, question: q.q, options: q.o, answer: q.a, explanation: q.e }, null, 2),
        { headers: { ...JSON_HEADERS, "cache-control": "no-store" } }
      );
    }

    return json({ error: "Not found", try: ["/api/topics", "/api/topics/docker", "/api/quiz/random", "/api/health"] }, 404);
  },
};

function landing(url, request) {
  const colo = request.cf?.colo ?? "local";
  const endpoints = [
    ["/api/topics", "All 9 topics (short version)"],
    ["/api/topics/kubernetes", "One full topic: concepts, lab, cheat sheet, quiz"],
    ["/api/quiz/random", "A random quiz question (add ?topic=docker)"],
    ["/api/health", "Health check + which Cloudflare data centre answered"],
  ];
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DevOpsPath API / Cloudflare Worker</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0c0f0a; color: #d9f2d0;
    font: 16px/1.6 ui-monospace, "JetBrains Mono", Consolas, monospace; }
  main { width: min(720px, 100% - 32px); padding: 32px 0; }
  .bar { display: flex; gap: 8px; padding: 12px 16px; background: #141a12; border: 1px solid #26321f; border-bottom: 0; border-radius: 12px 12px 0 0; }
  .bar i { width: 12px; height: 12px; border-radius: 50%; background: #ff5f57; } .bar i:nth-child(2) { background: #febc2e; } .bar i:nth-child(3) { background: #28c840; }
  .box { padding: 24px; background: #070906; border: 1px solid #26321f; border-radius: 0 0 12px 12px; }
  h1 { font-size: 1.6rem; margin: 0 0 4px; } h1 span { color: #39d353; }
  .muted { color: #8fa886; } .amber { color: #f5a524; } .g { color: #39d353; }
  a { color: #39d353; } ul { list-style: none; padding: 0; margin: 20px 0; }
  li { padding: 10px 0; border-top: 1px solid #1a2217; } li small { display: block; color: #8fa886; }
</style></head>
<body><main>
  <div class="bar"><i></i><i></i><i></i></div>
  <div class="box">
    <p class="muted">$ curl ${url.host}</p>
    <h1>DevOpsPath <span>API</span></h1>
    <p class="muted">A Cloudflare Worker serving the DevOps course content as JSON.<br>
      This response came from the <span class="amber">${colo}</span> edge location.</p>
    <ul>${endpoints.map(([p, d]) => `<li><span class="g">GET</span> <a href="${p}">${p}</a><small>${d}</small></li>`).join("")}</ul>
    <p class="muted">Try it: <span class="g">curl ${url.origin}/api/quiz/random</span></p>
  </div>
</main></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
