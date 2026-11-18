/* =========================================================
   npm run build  →  creates dist/ : a static copy of the site
   for Cloudflare Pages (or any static host). No Node server needed.

   dist/
   ├── index.html, style.css, script.js, journey.js, games.js, favicon.svg
   ├── vendor/three/three.module.min.js
   └── api/topics.json + api/topics/<slug>.json   (what server.js would return)

   ├── topics/index.html, journey/…, topic/docker/index.html …  (one per route)
   └── 404.html

   Why a page per route? Cloudflare Pages only falls back to index.html when
   there is NO 404.html. Since we ship a 404.html (so unknown URLs get a real
   404 status), every valid URL needs its own file. They are all copies of
   index.html — the router in script.js renders the right page from the URL.
   ========================================================= */
const fs = require("fs");
const path = require("path");
const topics = require("../data/topics");
const toSummary = require("../data/summary");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");

fs.rmSync(DIST, { recursive: true, force: true });

// 1. the website itself
fs.cpSync(path.join(ROOT, "public"), DIST, { recursive: true });

// 2. Three.js (only the one file the journey page imports)
const threeSrc = path.join(ROOT, "node_modules", "three", "build", "three.module.min.js");
if (!fs.existsSync(threeSrc)) {
  console.error("✗ three.js not found — run `npm install` first.");
  process.exit(1);
}
fs.mkdirSync(path.join(DIST, "vendor", "three"), { recursive: true });
fs.copyFileSync(threeSrc, path.join(DIST, "vendor", "three", "three.module.min.js"));

// 3. the API as static JSON files
fs.mkdirSync(path.join(DIST, "api", "topics"), { recursive: true });
fs.writeFileSync(path.join(DIST, "api", "topics.json"), JSON.stringify(topics.map(toSummary)));
for (const t of topics) {
  fs.writeFileSync(path.join(DIST, "api", "topics", `${t.slug}.json`), JSON.stringify(t));
}

// 4. one page per route (all copies of index.html) + 404.html
//    Keep this list in sync with the routes in public/script.js and server.js
const indexHtml = fs.readFileSync(path.join(DIST, "index.html"));
const routes = ["topics", "progress", "journey", "play", ...topics.map((t) => `topic/${t.slug}`)];
for (const route of routes) {
  fs.mkdirSync(path.join(DIST, route), { recursive: true });
  fs.writeFileSync(path.join(DIST, route, "index.html"), indexHtml);
}
// Unknown URLs: Cloudflare serves this with status 404; the router shows the terminal 404 page
fs.writeFileSync(path.join(DIST, "404.html"), indexHtml);

// summary
let count = 0, bytes = 0;
(function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else { count++; bytes += fs.statSync(p).size; }
  }
})(DIST);
console.log(`✓ built dist/ — ${count} files, ${(bytes / 1024).toFixed(0)} KB`);
console.log("  Upload the dist folder to Cloudflare Pages, or run: npm run deploy");
