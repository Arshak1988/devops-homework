/* =========================================================
   npm run build  ->  creates dist/ : a static copy of the site
   for Cloudflare Pages (or any static host). No Node server needed.

   dist/
   |-- index.html, style.css, script.js, journey.js, hero-tsl.js, games.js, favicon.svg
   |-- vendor/three/build/   three.core.js, three.webgpu.js, three.tsl.js
   |-- vendor/three/addons/  tsl/display/BloomNode.js
   |-- api/topics.json + api/topics/<slug>.json   (what server.js would return)
   |-- topics/index.html, journey/..., topic/docker/index.html ...  (one per route)
   `-- 404.html

   Why a page per route? Cloudflare Pages only falls back to index.html when
   there is NO 404.html. Since we ship a 404.html (so unknown URLs get a real
   404 status), every valid URL needs its own file. They are all copies of
   index.html - the router in script.js renders the right page from the URL.
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

// 2. Three.js WebGPU + TSL (only the files the import map in index.html needs)
const THREE_DIR = path.join(ROOT, "node_modules", "three");
const threeFiles = [
  ["build/three.core.js", "vendor/three/build/three.core.js"],
  ["build/three.webgpu.js", "vendor/three/build/three.webgpu.js"],
  ["build/three.tsl.js", "vendor/three/build/three.tsl.js"],
  ["examples/jsm/tsl/display/BloomNode.js", "vendor/three/addons/tsl/display/BloomNode.js"],
];
for (const [from, to] of threeFiles) {
  const src = path.join(THREE_DIR, from);
  if (!fs.existsSync(src)) {
    console.error(`x ${from} not found - run "npm install" first.`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(path.join(DIST, to)), { recursive: true });
  fs.copyFileSync(src, path.join(DIST, to));
}

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
console.log(`\u2713 built dist/ - ${count} files, ${(bytes / 1024).toFixed(0)} KB`);
console.log("  Cloudflare Pages runs this build automatically on every git push to main.");
