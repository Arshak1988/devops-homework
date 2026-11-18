/* =========================================================
   DevOpsPath — Node.js + Express server
   - Serves the website from /public
   - JSON API with the course content from /data/topics.js
   - Clean page URLs (/topics, /topic/docker, /progress)
   ========================================================= */
const path = require("path");
const express = require("express");
const topics = require("./data/topics");
const toSummary = require("./data/summary");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const INDEX = path.join(PUBLIC_DIR, "index.html");

// Small request logger: "GET /topic/docker 200 3ms"
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`));
  next();
});

// Static files: style.css, script.js, ...
app.use(express.static(PUBLIC_DIR, { index: false }));

// Three.js from node_modules (used by public/journey.js) — no CDN needed
app.use("/vendor/three", express.static(path.join(__dirname, "node_modules", "three", "build"), { maxAge: "7d" }));

/* ---------------- API ---------------- */

// Short list of all topics (for cards, roadmap, progress)
// (".json" URLs are the same data — they match the static files `npm run build` creates for Cloudflare Pages)
app.get(["/api/topics", "/api/topics.json"], (req, res) => {
  res.json(topics.map(toSummary));
});

// Full content of one topic
app.get("/api/topics/:slug", (req, res) => {
  const slug = req.params.slug.replace(/\.json$/, "");
  const topic = topics.find((t) => t.slug === slug);
  if (!topic) return res.status(404).json({ error: `Topic "${slug}" not found` });
  res.json(topic);
});

// Health check (handy for Docker / Kubernetes probes later in the course!)
app.get("/api/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.use("/api", (req, res) => res.status(404).json({ error: "Unknown API route" }));

/* ---------------- Pages ---------------- */

// These URLs are rendered in the browser by public/script.js
app.get(["/", "/topics", "/progress", "/journey", "/play"], (req, res) => res.sendFile(INDEX));

app.get("/topic/:slug", (req, res) => {
  const exists = topics.some((t) => t.slug === req.params.slug);
  res.status(exists ? 200 : 404).sendFile(INDEX);
});

// Anything else: the app shows its own 404 page
app.use((req, res) => res.status(404).sendFile(INDEX));

app.listen(PORT, () => {
  console.log(`DevOpsPath running at http://localhost:${PORT}`);
});
