/* =========================================================
   DevOpsPath - single-page app with hash routing
   Routes:
     /                 -> home
     /topics           -> all topics (search + level filter)
     /topic/<slug>     -> one topic page (content from /api/topics/<slug>)
     /progress         -> progress overview
   Content comes from the Node.js server (server.js).
   ========================================================= */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const app = $("#app");
let TOPICS = []; // topic summaries, loaded from /api/topics at startup

/* ---------- storage (safe if localStorage is blocked) ---------- */
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};
let completed = store.get("devops-progress", {});
const isDone = (slug) => !!completed[slug];
const doneCount = () => TOPICS.filter((t) => isDone(t.slug)).length;
function setDone(slug, value) {
  completed[slug] = value;
  store.set("devops-progress", completed);
}

/* ---------- small helpers ---------- */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const levelClass = (l) => ({ Beginner: "lvl-1", Intermediate: "lvl-2", Advanced: "lvl-3" }[l]);
const pad = (n) => String(n).padStart(2, "0");

// Line icons (inherit the text color, so they follow the theme)
const svg = (paths) =>
  `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ICONS = {
  clock: svg(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`),
  flask: svg(`<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/>`),
  question: svg(`<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6"/><path d="M12 17h.01"/>`),
  book: svg(`<path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2z"/><path d="M22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/>`),
  list: svg(`<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>`),
  checkCircle: svg(`<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>`),
  flag: svg(`<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>`),
  // topic icons (data/topics.js stores the name, e.g. icon: "lock")
  lock: svg(`<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><path d="M12 15v2"/>`),
  monitor: svg(`<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>`),
  gear: svg(`<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>`),
  container: svg(`<path d="M3 13h18v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/><path d="M6 9h3v4H6zM10 9h3v4h-3zM14 9h3v4h-3zM10 5h3v4h-3z"/>`),
  loop: svg(`<path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>`),
  cloud: svg(`<path d="M17.5 19H7a5 5 0 1 1 1.1-9.9A6 6 0 0 1 19.5 11a4 4 0 0 1-2 8z"/>`),
  blocks: svg(`<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>`),
  helm: svg(`<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3v6.5M12 14.5V21M3.5 9.2l6.1 2M14.4 12.8l6.1 2M6.4 19.3l4-5.2M13.6 9.9l4-5.2"/>`),
  external: svg(`<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>`),
  chart: svg(`<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/>`),
};
const topicIcon = (name) => ICONS[name] || "";

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("show"), 1800);
}

// Code block with a copy button and dimmed comments
function codeBlock(lang, src) {
  const lines = esc(src).split("\n").map((line) =>
    /^\s*(#|\/\/)/.test(line) ? `<span class="cm">${line}</span>` : line
  );
  return `<div class="code-block">
    <div class="code-head"><span>${esc(lang)}</span><button class="copy-btn" type="button">copy</button></div>
    <pre><code>${lines.join("\n")}</code></pre>
  </div>`;
}

function ring(pct, size = 140) {
  const C = 2 * Math.PI * 52;
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="ring-bg"/>
    <circle cx="60" cy="60" r="52" class="ring-fg" style="stroke-dasharray:${C};stroke-dashoffset:${C}" data-offset="${C * (1 - pct / 100)}"/></svg>
    <span>${pct}%</span></div>`;
}

/* =========================================================
   VIEWS
   ========================================================= */

function viewHome() {
  const pct = Math.round((doneCount() / TOPICS.length) * 100);
  const next = TOPICS.find((t) => !isDone(t.slug));
  return `
  <section class="hero">
    <div class="hero-grid-bg"></div>
    <div class="container hero-grid">
      <div class="hero-text reveal">
        <span class="pill"><span class="dot"></span> 9 modules / hands-on labs / quizzes</span>
        <h1>Become a<br/><span class="hl" id="typed">DevOps Engineer</span><span class="caret">_</span></h1>
        <p class="lead">Go from your first SSH login to running production workloads on Kubernetes - with automation, infrastructure as code, CI/CD pipelines and full observability.</p>
        <div class="hero-cta">
          <a href="/topic/${next ? next.slug : "ssh"}" class="btn btn-primary">${doneCount() ? "Continue learning" : "Start learning"} \u2192</a>
          <a href="/topics" class="btn btn-ghost">Browse topics</a>
        </div>
        <div class="stats">
          <div><strong data-count="9">0</strong><span>modules</span></div>
          <div><strong data-count="${TOPICS.reduce((n, t) => n + t.lessons, 0)}">0</strong><span>lessons</span></div>
          <div><strong data-count="${TOPICS.reduce((n, t) => n + t.questions, 0)}">0</strong><span>quiz questions</span></div>
        </div>
      </div>
      <div class="terminal reveal" aria-hidden="true">
        <div class="terminal-bar"><span></span><span></span><span></span><em>student@devops:~</em></div>
        <pre class="terminal-body" id="terminalBody"></pre>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head reveal">
        <span class="kicker">// the roadmap</span>
        <h2>Nine steps, one path</h2>
        <p>Each module builds on the previous one. Click any step to open it.</p>
      </div>
      <ol class="roadmap reveal">
        ${TOPICS.map((t, i) => `
          <li><a href="/topic/${t.slug}" class="${isDone(t.slug) ? "completed" : ""}">
            <span class="step-num">${isDone(t.slug) ? "\u2713" : pad(i + 1)}</span>
            <span class="step-icon">${topicIcon(t.icon)}</span>${t.short}
          </a></li>`).join("")}
      </ol>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head reveal">
        <span class="kicker">// new</span>
        <h2>Explore &amp; play</h2>
      </div>
      <div class="promo-grid">
        <a href="/journey" class="promo promo-journey reveal">
          <div class="promo-art" aria-hidden="true">${Array.from({ length: 7 }, (_, i) => `<span style="--i:${i}"></span>`).join("")}</div>
          <span class="kicker">// 3D / three.js WebGPU + TSL</span>
          <h3>Journey to the depths</h3>
          <p>Scroll down a 3D shaft and follow one app through all 12 steps - from <code>node server.js</code> on your laptop to live on the internet.</p>
          <span class="promo-cta mono">dive in \u2192</span>
        </a>
        <a href="/play" class="promo promo-play reveal">
          <div class="promo-pods" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<span style="--i:${i}"></span>`).join("")}</div>
          <span class="kicker">// arcade</span>
          <h3>Pod Panic &amp; Terminal Typer</h3>
          <p>Keep a Kubernetes cluster alive under fire, then race the clock typing real DevOps commands. Beat your best score.</p>
          <span class="promo-cta mono">play now \u2192</span>
        </a>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head reveal">
        <span class="kicker">// what you'll get</span>
        <h2>Every module includes</h2>
      </div>
      <div class="features reveal">
        <div class="feature"><b>${ICONS.book} Deep explanations</b><p>Key concepts, how things work under the hood, comparison tables.</p></div>
        <div class="feature"><b>${ICONS.flask} Hands-on lab</b><p>Step-by-step exercises with copy-ready commands.</p></div>
        <div class="feature"><b>${ICONS.list} Cheat sheet</b><p>The commands you'll use every day, in one table.</p></div>
        <div class="feature"><b>${ICONS.checkCircle} Quiz</b><p>Check your understanding with instant feedback.</p></div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <a href="/progress" class="progress-card reveal">
        ${ring(pct, 120)}
        <div>
          <span class="kicker">// your progress</span>
          <h3>${doneCount()} of ${TOPICS.length} modules completed</h3>
          <p class="muted">${next ? `Up next: <b>${next.title}</b>` : "You've finished the whole course!"}</p>
        </div>
      </a>
    </div>
  </section>`;
}

function topicCard(t, i) {
  return `<a href="/topic/${t.slug}" class="topic-card reveal ${isDone(t.slug) ? "is-done" : ""}"
      data-level="${t.level}" data-search="${esc((t.title + " " + t.tagline + " " + t.concepts.join(" ")).toLowerCase())}">
    <div class="topic-card-top">
      <span class="topic-icon">${topicIcon(t.icon)}</span>
      <span class="badge ${levelClass(t.level)}">${t.level}</span>
    </div>
    <small class="mono">module ${pad(i + 1)} / ${t.time}</small>
    <h3>${t.title}</h3>
    <p>${t.tagline}</p>
    <span class="topic-card-foot">${isDone(t.slug) ? "\u2713 completed" : "open module \u2192"}</span>
  </a>`;
}

function viewTopics() {
  return `
  <section class="section page-top">
    <div class="container">
      <div class="section-head reveal">
        <span class="kicker">// ls ~/topics</span>
        <h2>All topics</h2>
        <p>Search by tool or concept, or filter by level.</p>
      </div>
      <div class="toolbar reveal">
        <label class="search">
          <span class="mono accent">$ grep</span>
          <input type="search" id="searchInput" placeholder="playbook, pod, S3, PromQL..." autocomplete="off" />
        </label>
        <div class="chips" id="levelChips">
          <button class="chip active" data-level="all">All</button>
          <button class="chip" data-level="Beginner">Beginner</button>
          <button class="chip" data-level="Intermediate">Intermediate</button>
          <button class="chip" data-level="Advanced">Advanced</button>
        </div>
      </div>
      <div class="topic-grid" id="topicGrid">${TOPICS.map(topicCard).join("")}</div>
      <p class="no-results" id="noResults" hidden>No topics match. Try another word.</p>
    </div>
  </section>`;
}

// t = full topic object fetched from /api/topics/:slug
function viewTopic(t) {
  const i = TOPICS.findIndex((x) => x.slug === t.slug);
  const prev = TOPICS[i - 1];
  const next = TOPICS[i + 1];

  const toc = [
    ["overview", "Overview"],
    ["concepts", "Key concepts"],
    ...t.sections.map((s, n) => [`s${n}`, s.h]),
    ["lab", "Hands-on lab"],
    ["cheatsheet", "Cheat sheet"],
    ["best", "Best practices"],
    ["quiz", "Quiz"],
    ["resources", "Resources"],
  ];

  return `
  <section class="topic-hero page-top">
    <div class="container">
      <nav class="crumbs mono"><a href="/">~</a> / <a href="/topics">topics</a> / <span>${t.slug}</span></nav>
      <div class="topic-hero-inner">
        <span class="topic-icon big">${topicIcon(t.icon)}</span>
        <div>
          <small class="mono muted">module ${pad(i + 1)} of ${TOPICS.length}</small>
          <h1>${t.title}</h1>
          <p class="lead">${t.tagline}</p>
          <div class="meta">
            <span class="badge ${levelClass(t.level)}">${t.level}</span>
            <span class="meta-item">${ICONS.clock} ${t.time}</span>
            <span class="meta-item">${ICONS.flask} ${t.lab.steps.length}-step lab</span>
            <span class="meta-item">${ICONS.question} ${t.quiz.length} questions</span>
            ${isDone(t.slug) ? `<span class="meta-item done-tag">\u2713 completed</span>` : ""}
          </div>
        </div>
      </div>
    </div>
  </section>

  <div class="container topic-layout">
    <aside class="toc">
      <p class="mono muted toc-title">on this page</p>
      <ul>${toc.map(([id, label]) => `<li><a href="#" data-target="${id}">${label}</a></li>`).join("")}</ul>
    </aside>

    <article class="topic-content">
      <section id="overview" class="block">
        <h2><span class="hash">#</span> Overview</h2>
        <p class="intro">${t.intro}</p>
        <div class="why">
          <h4>Why it matters</h4>
          <ul class="bullets">${t.why.map((w) => `<li>${w}</li>`).join("")}</ul>
        </div>
      </section>

      <section id="concepts" class="block">
        <h2><span class="hash">#</span> Key concepts</h2>
        <div class="concepts">${t.concepts.map((c) => `<div class="concept"><h4>${c.t}</h4><p>${c.d}</p></div>`).join("")}</div>
      </section>

      ${t.sections.map((s, n) => `
      <section id="s${n}" class="block">
        <h2><span class="hash">#</span> ${s.h}</h2>
        ${s.html || ""}
        ${s.code ? codeBlock(s.code.lang, s.code.src) : ""}
      </section>`).join("")}

      <section id="lab" class="block lab">
        <h2><span class="hash">#</span> Hands-on lab</h2>
        <p class="lab-title">${ICONS.flask} ${t.lab.title}</p>
        <ol class="lab-steps">
          ${t.lab.steps.map((s, n) => `
            <li>
              <label class="step-check"><input type="checkbox" data-step="${t.slug}-${n}" ${store.get("lab-" + t.slug + "-" + n, false) ? "checked" : ""}/><span>${pad(n + 1)}</span></label>
              <div class="step-body"><p>${s.t}</p>${s.code ? codeBlock("bash", s.code) : ""}</div>
            </li>`).join("")}
        </ol>
      </section>

      <section id="cheatsheet" class="block">
        <h2><span class="hash">#</span> Cheat sheet</h2>
        <table class="tbl cheat"><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody>
          ${t.cheats.map(([c, d]) => `<tr><td><code>${esc(c)}</code></td><td>${d}</td></tr>`).join("")}
        </tbody></table>
      </section>

      <section id="best" class="block">
        <h2><span class="hash">#</span> Best practices</h2>
        <ul class="best">${t.best.map((b) => `<li>${b}</li>`).join("")}</ul>
      </section>

      <section id="quiz" class="block">
        <h2><span class="hash">#</span> Quiz</h2>
        <div class="quiz" data-slug="${t.slug}">
          ${t.quiz.map((q, n) => `
            <div class="question" data-answer="${q.a}">
              <p class="q"><span class="mono accent">Q${n + 1}.</span> ${q.q}</p>
              <div class="options">${q.o.map((o, k) => `<button class="option" data-k="${k}">${esc(o)}</button>`).join("")}</div>
              <p class="explain" hidden>${q.e}</p>
            </div>`).join("")}
          <p class="quiz-score mono" id="quizScore">Answer all ${t.quiz.length} questions to see your score.</p>
        </div>
      </section>

      <section id="resources" class="block">
        <h2><span class="hash">#</span> Resources</h2>
        <ul class="links">${t.links.map(([l, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${l} ${ICONS.external}</a></li>`).join("")}</ul>
      </section>

      <div class="complete-box">
        <button class="btn ${isDone(t.slug) ? "btn-ghost" : "btn-primary"}" id="completeBtn" data-slug="${t.slug}">
          ${isDone(t.slug) ? "\u2713 Completed - mark as not done" : "Mark module as completed"}
        </button>
      </div>

      <nav class="pager">
        ${prev ? `<a href="/topic/${prev.slug}" class="pager-link"><small>\u2190 previous</small><b>${topicIcon(prev.icon)} ${prev.short}</b></a>` : "<span></span>"}
        ${next ? `<a href="/topic/${next.slug}" class="pager-link right"><small>next \u2192</small><b>${topicIcon(next.icon)} ${next.short}</b></a>` : `<a href="/progress" class="pager-link right"><small>finish \u2192</small><b>${ICONS.flag} Your progress</b></a>`}
      </nav>
    </article>
  </div>`;
}

function viewProgress() {
  const n = doneCount();
  const pct = Math.round((n / TOPICS.length) * 100);
  const msg =
    n === 0 ? "No modules completed yet - start with SSH!" :
    n === TOPICS.length ? "All modules done - you're ready to build real infrastructure!" :
    `${n} of ${TOPICS.length} modules done. Keep going!`;
  return `
  <section class="section page-top">
    <div class="container">
      <div class="section-head reveal">
        <span class="kicker">// cat progress.log</span>
        <h2>Your progress</h2>
      </div>
      <div class="progress-card big reveal">
        ${ring(pct)}
        <div>
          <h3>${msg}</h3>
          <p class="muted">Progress is saved in this browser.</p>
          <button class="btn btn-ghost btn-small" id="resetProgress">Reset progress</button>
        </div>
      </div>
      <ul class="progress-list reveal">
        ${TOPICS.map((t, i) => `
          <li class="${isDone(t.slug) ? "is-done" : ""}">
            <a href="/topic/${t.slug}">
              <span class="status">${isDone(t.slug) ? "[\u2713]" : "[ ]"}</span>
              <span class="mono muted">${pad(i + 1)}</span>
              <span>${topicIcon(t.icon)} ${t.title}</span>
              <span class="badge ${levelClass(t.level)}">${t.level}</span>
            </a>
          </li>`).join("")}
      </ul>
    </div>
  </section>`;
}

function viewPlay() {
  return `
  <section class="section page-top">
    <div class="container">
      <div class="section-head reveal">
        <span class="kicker">// ./arcade</span>
        <h2>Take a break, stay sharp</h2>
        <p>Two quick games built on what you learn in the course. Best scores are saved in your browser.</p>
      </div>
      <div class="arcade">
        <article class="game-card reveal">
          <header><span class="kicker">// game 01 / kubernetes</span><h3>Pod Panic</h3></header>
          <details class="howto" open>
            <summary><span class="mono">$ man pod-panic</span> - how to play</summary>
            <p><b>Goal:</b> keep your Kubernetes cluster alive as long as possible. You lose when the <b>error budget</b> bar reaches 0%.</p>
            <ul class="legend">
              <li><span class="swatch ok"></span><div><b>Running</b> - healthy pod. Nothing to do.</div></li>
              <li><span class="swatch leak"></span><div><b>Mem 64%</b> - memory leak. The bar fills up; at 100% the pod crashes (OOMKilled). <b>Click it to patch</b> before that happens.</div></li>
              <li><span class="swatch crash"></span><div><b>CrashLoopBackOff / OOMKilled</b> - the pod is down and drains your error budget every moment. <b>Click it to restart</b>.</div></li>
              <li><span class="swatch restarting"></span><div><b>Restarting...</b> - coming back up. Wait a moment.</div></li>
            </ul>
            <table class="tbl score-tbl"><tbody>
              <tr><td>Restart a crashed pod</td><td class="good">+10</td></tr>
              <tr><td>Patch a leaking pod</td><td class="good">+5</td></tr>
              <tr><td>Every second you survive</td><td class="good">+1</td></tr>
            </tbody></table>
            <p class="tip"><b>Tip:</b> Pods fail faster the longer you play. Patch leaks early - a crashed pod costs far more than a leaking one.</p>
          </details>
          <div class="game" id="podPanic"></div>
        </article>
        <article class="game-card reveal">
          <header><span class="kicker">// game 02 / all topics</span><h3>Terminal Typer</h3></header>
          <details class="howto" open>
            <summary><span class="mono">$ man terminal-typer</span> - how to play</summary>
            <p><b>Goal:</b> type as many correct commands as you can in <b>60 seconds</b>.</p>
            <ol class="howto-steps">
              <li>Press <b>./start.sh</b> to begin.</li>
              <li>Read the task, e.g. <i>"List the running containers"</i>, and its topic tag.</li>
              <li>Type the command (e.g. <code>docker ps</code>) and press <kbd>Enter</kbd>.</li>
              <li>Wrong? The box shakes - fix it and try again. Stuck? Press <kbd>Tab</kbd> (or <b>skip</b>) to see the answer and move on.</li>
            </ol>
            <table class="tbl score-tbl"><tbody>
              <tr><td>Correct command</td><td class="good">+10</td></tr>
              <tr><td>Streak bonus (each correct answer in a row)</td><td class="good">+2 ... +10</td></tr>
              <tr><td>Wrong answer or skip</td><td class="bad">streak resets</td></tr>
            </tbody></table>
            <p class="tip"><b>Tip:</b> Upper/lower case and extra spaces don't matter, and common variants are accepted (<code>-A</code> or <code>--all-namespaces</code>). Questions come from every module - check the cheat sheets!</p>
          </details>
          <div class="game" id="typer"></div>
        </article>
      </div>
    </div>
  </section>`;
}

// Load an ES module on demand, mount it, and register its cleanup.
// If the user navigates away before it loads, nothing is mounted.
let mountToken = 0;
function mountModule(url, mountFn) {
  const token = ++mountToken;
  import(url)
    .then((m) => {
      if (token !== mountToken) return;
      const dispose = mountFn(m);
      if (typeof dispose === "function") cleanup.push(dispose);
    })
    .catch((err) => {
      console.error(err);
      toast("Couldn't load this page's scripts");
    });
}

function viewError() {
  return `
  <section class="section page-top">
    <div class="container notfound">
      <pre class="mono">$ curl /api/topics
curl: (7) Failed to connect to the server</pre>
      <h2>Couldn't load the course content</h2>
      <p class="muted" style="margin-bottom:20px">Make sure the Node.js server is running (<code>npm start</code>), then reload.</p>
      <a href="/" class="btn btn-primary">Try again</a>
    </div>
  </section>`;
}

function viewNotFound() {
  return `
  <section class="section page-top">
    <div class="container notfound">
      <pre class="mono">$ cd ${esc(location.pathname)}
bash: cd: No such file or directory</pre>
      <h2>404 - page not found</h2>
      <a href="/" class="btn btn-primary">cd ~/home</a>
    </div>
  </section>`;
}

/* =========================================================
   ROUTER
   ========================================================= */
/* ---------- API (served by server.js) ---------- */
async function api(url) {
  const res = await fetch(url);
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.json();
}
const topicCache = {};
async function loadTopic(slug) {
  if (!topicCache[slug]) topicCache[slug] = await api(`/api/topics/${encodeURIComponent(slug)}.json`);
  return topicCache[slug];
}

const routes = [
  { re: /^\/$/, name: "home", render: () => [viewHome(), "DevOpsPath - From SSH to Kubernetes"] },
  { re: /^\/topics\/?$/, name: "topics", render: () => [viewTopics(), "Topics / DevOpsPath"] },
  { re: /^\/topic\/([\w-]+)\/?$/, name: "topics",
    render: async (slug) => { const t = await loadTopic(slug); return [viewTopic(t), `${t.short} / DevOpsPath`]; } },
  { re: /^\/progress\/?$/, name: "progress", render: () => [viewProgress(), "Progress / DevOpsPath"] },
  { re: /^\/journey\/?$/, name: "journey", render: () => [`<div id="journey" class="journey"></div>`, "Journey / DevOpsPath"] },
  { re: /^\/play\/?$/, name: "play", render: () => [viewPlay(), "Arcade / DevOpsPath"] },
];

let cleanup = [];

async function router() {
  cleanup.forEach((fn) => fn());
  cleanup = [];
  mountToken++; // cancel any module that's still loading for the previous page

  const path = location.pathname;
  let match = null, route = null;
  for (const r of routes) {
    match = path.match(r.re);
    if (match) { route = r; break; }
  }

  let html, title;
  try {
    if (!route) throw { status: 404 };
    [html, title] = await route.render(match[1]);
  } catch (err) {
    route = null;
    html = err.status === 404 ? viewNotFound() : viewError();
    title = "Not found / DevOpsPath";
  }

  app.classList.remove("page-in");
  app.innerHTML = html;
  document.title = title;
  void app.offsetWidth; // restart the page transition
  app.classList.add("page-in");

  // highlight active nav link
  $$("#navLinks a").forEach((a) => a.classList.toggle("active", route && a.dataset.route === route.name));
  $("#navLinks").classList.remove("open");

  window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
  initPage(route ? route.name : null);
}

// Clean URLs: catch clicks on internal links and update the address bar ourselves
function navigate(url) {
  if (url !== location.pathname) history.pushState(null, "", url);
  router();
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href^='/']");
  if (!a || a.target || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  navigate(a.getAttribute("href"));
});
window.addEventListener("popstate", router); // browser Back / Forward

/* =========================================================
   PAGE BEHAVIOUR (runs after each render)
   ========================================================= */
function initPage(name) {
  // wrap tables so wide ones scroll sideways on phones
  $$(".tbl").forEach((t) => {
    const wrap = document.createElement("div");
    wrap.className = "tbl-wrap";
    t.replaceWith(wrap);
    wrap.appendChild(t);
  });
  initReveal();
  initCopyButtons();
  animateRings();

  if ($("#terminalBody")) initTerminal();
  if ($("#typed")) initTyping();
  if ($("#topicGrid")) initTopicFilter();
  if ($(".toc")) initToc();
  if ($(".quiz")) initQuiz();
  if ($("#completeBtn")) initComplete();
  if ($("#resetProgress")) initReset();
  document.body.classList.toggle("is-journey", name === "journey");

  // Heavy pages load their code only when visited
  if ($("#journey")) mountModule("/journey.js", (m) => m.mount($("#journey")));
  // Home hero: TSL shader background, loaded after the page has painted
  if ($(".hero")) {
    const t = setTimeout(() => { if ($(".hero")) mountModule("/hero-tsl.js", (m) => m.mount($(".hero"))); }, 300);
    cleanup.push(() => clearTimeout(t));
  }
  if ($("#podPanic")) mountModule("/games.js", (m) => {
    const a = m.mountPodPanic($("#podPanic"));
    const b = m.mountTyper($("#typer"));
    return () => { a(); b(); };
  });
  $$(".step-check input").forEach((cb) =>
    cb.addEventListener("change", () => store.set("lab-" + cb.dataset.step, cb.checked))
  );
}

// Reveal-on-scroll + count-up numbers
function initReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("visible");
      $$("[data-count]", e.target).forEach(countUp);
      io.unobserve(e.target);
    });
  }, { threshold: 0.1 });
  $$(".reveal").forEach((el) => io.observe(el));
  cleanup.push(() => io.disconnect());
}

function countUp(el) {
  const target = +el.dataset.count;
  const start = performance.now();
  (function frame(now) {
    const p = Math.min((now - start) / 1100, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(frame);
  })(start);
}

function animateRings() {
  requestAnimationFrame(() =>
    $$(".ring-fg").forEach((c) => {
      c.style.strokeDashoffset = c.dataset.offset;
      if (+c.dataset.offset < 0.01) c.classList.add("full");
    })
  );
}

function initCopyButtons() {
  $$(".copy-btn").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const code = btn.closest(".code-block").querySelector("code").innerText;
      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = "copied \u2713";
        btn.classList.add("copied");
      } catch {
        btn.textContent = "failed";
      }
      setTimeout(() => { btn.textContent = "copy"; btn.classList.remove("copied"); }, 1500);
    })
  );
}

// Typing headline
function initTyping() {
  const el = $("#typed");
  const words = ["DevOps Engineer", "Cloud Builder", "Automation Pro", "SRE"];
  let w = 0, i = words[0].length, deleting = true, timer;
  function tick() {
    const word = words[w];
    i += deleting ? -1 : 1;
    el.textContent = word.slice(0, i);
    let delay = deleting ? 50 : 90;
    if (!deleting && i === word.length) { deleting = true; delay = 2200; }
    else if (deleting && i === 0) { deleting = false; w = (w + 1) % words.length; delay = 300; }
    timer = setTimeout(tick, delay);
  }
  timer = setTimeout(tick, 2500);
  cleanup.push(() => clearTimeout(timer));
}

// Animated terminal
function initTerminal() {
  const body = $("#terminalBody");
  const script = [
    ["cmd", "ssh ubuntu@lab-vm"],
    ["out", "Welcome to Ubuntu 24.04 LTS", "dim"],
    ["cmd", "ansible-playbook site.yml"],
    ["out", "PLAY RECAP  web1: ok=5 changed=2 failed=0", "ok"],
    ["cmd", "docker build -t myapp:1.0 ."],
    ["out", "=> naming to docker.io/library/myapp:1.0", "ok"],
    ["cmd", "terraform apply -auto-approve"],
    ["out", "Apply complete! Resources: 3 added.", "ok"],
    ["cmd", "kubectl get pods"],
    ["out", "web-7d9f8   1/1   Running   0   12s", "ok"],
    ["out", "ALERT InstanceDown resolved \u2713", "warn"],
  ];
  let line = 0, html = "", timer, alive = true;
  const later = (fn, ms) => { if (alive) timer = setTimeout(fn, ms); };
  function next() {
    if (line >= script.length) { later(() => { html = ""; line = 0; body.innerHTML = ""; next(); }, 4000); return; }
    const [type, text, cls] = script[line++];
    if (type === "out") { html += `<span class="${cls}">${esc(text)}</span>\n`; body.innerHTML = html; later(next, 450); return; }
    let c = 0;
    const prefix = `<span class="p">$</span> `;
    (function typeChar() {
      body.innerHTML = html + prefix + esc(text.slice(0, c)) + '<span class="cur">\u2588</span>';
      if (c++ < text.length) later(typeChar, 35 + Math.random() * 40);
      else { html += prefix + esc(text) + "\n"; later(next, 350); }
    })();
  }
  next();
  cleanup.push(() => { alive = false; clearTimeout(timer); });
}

// Topics page: search + level filter
function initTopicFilter() {
  const input = $("#searchInput");
  let level = "all";
  function apply() {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    $$(".topic-card").forEach((card) => {
      const ok = (level === "all" || card.dataset.level === level) && (!q || card.dataset.search.includes(q));
      card.hidden = !ok;
      if (ok) { shown++; card.classList.add("visible"); }
    });
    $("#noResults").hidden = shown > 0;
  }
  input.addEventListener("input", apply);
  $$("#levelChips .chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      $$("#levelChips .chip").forEach((c) => c.classList.toggle("active", c === chip));
      level = chip.dataset.level;
      apply();
    })
  );
}

// Topic page: table of contents + scroll-spy
function initToc() {
  const links = $$(".toc a");
  links.forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault(); // keep the route in the URL
      document.getElementById(a.dataset.target).scrollIntoView({ behavior: "smooth", block: "start" });
    })
  );
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle("active", a.dataset.target === e.target.id));
    });
  }, { rootMargin: "-20% 0px -70% 0px" });
  $$(".topic-content .block").forEach((s) => spy.observe(s));
  cleanup.push(() => spy.disconnect());
}

// Topic page: quiz
function initQuiz() {
  const questions = $$(".question");
  let answered = 0, correct = 0;
  questions.forEach((q) => {
    const answer = +q.dataset.answer;
    $$(".option", q).forEach((btn) =>
      btn.addEventListener("click", () => {
        if (q.classList.contains("answered")) return;
        q.classList.add("answered");
        const k = +btn.dataset.k;
        $$(".option", q).forEach((b) => {
          b.disabled = true;
          if (+b.dataset.k === answer) b.classList.add("correct");
        });
        if (k === answer) correct++;
        else btn.classList.add("wrong");
        $(".explain", q).hidden = false;
        answered++;
        if (answered === questions.length) {
          const perfect = correct === questions.length;
          $("#quizScore").innerHTML = `Score: <b>${correct}/${questions.length}</b> ${perfect ? "- perfect!" : "- review the explanations and try again later."}
            <button class="btn btn-small btn-ghost" id="retryQuiz">retry</button>`;
          $("#quizScore").classList.add(perfect ? "perfect" : "partial");
          $("#retryQuiz").addEventListener("click", async () => {
            await router();
            document.getElementById("quiz").scrollIntoView({ block: "start" });
          });
        }
      })
    );
  });
}

// Topic page: mark complete
function initComplete() {
  const btn = $("#completeBtn");
  btn.addEventListener("click", async () => {
    const slug = btn.dataset.slug;
    const now = !isDone(slug);
    setDone(slug, now);
    toast(now ? "Module completed!" : "Marked as not done");
    const scroll = window.scrollY;
    await router();
    window.scrollTo(0, scroll);
  });
}

function initReset() {
  $("#resetProgress").addEventListener("click", () => {
    completed = {};
    store.set("devops-progress", completed);
    toast("Progress reset");
    router();
  });
}

/* =========================================================
   GLOBAL UI (set up once)
   ========================================================= */
$("#themeToggle").addEventListener("click", () => {
  const root = document.documentElement;
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try { localStorage.setItem("theme", next); } catch {}
  toast(next === "dark" ? "Dark mode" : "Light mode");
});

$("#menuBtn").addEventListener("click", () => $("#navLinks").classList.toggle("open"));

function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  $("#scrollProgress").style.width = (max > 0 ? (scrollY / max) * 100 : 0) + "%";
  $("#nav").classList.toggle("scrolled", scrollY > 10);
  $("#toTop").classList.toggle("show", scrollY > 600);
}
addEventListener("scroll", onScroll, { passive: true });
$("#toTop").addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
$("#year").textContent = new Date().getFullYear();

// Start: load the topic list from the server, then render the current URL
(async function start() {
  try {
    TOPICS = await api("/api/topics.json");
    await router();
  } catch {
    app.innerHTML = viewError();
  }
  onScroll();
})();
