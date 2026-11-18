/* =========================================================
   /play — two small DevOps games
   1. Pod Panic     — keep a cluster alive: restart crashed pods, patch memory leaks
   2. Terminal Typer — type the right command before the clock runs out
   Each mount function returns a cleanup function.
   ========================================================= */

const best = {
  get(key) { try { return +localStorage.getItem(key) || 0; } catch { return 0; } },
  set(key, v) { try { localStorage.setItem(key, String(v)); } catch {} },
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hash = () => Math.random().toString(16).slice(2, 7);

/* =========================================================
   GAME 1 — POD PANIC
   ========================================================= */
export function mountPodPanic(root) {
  const PODS = 12;
  const BEST_KEY = "best-pod-panic";
  root.innerHTML = `
    <div class="game-hud mono">
      <div>score <b data-score>0</b></div>
      <div>uptime <b data-time>0s</b></div>
      <div>best <b data-best>${best.get(BEST_KEY)}</b></div>
    </div>
    <div class="budget mono">
      <span>error budget</span>
      <div class="budget-bar"><i data-bar></i></div>
      <b data-budget>100%</b>
    </div>
    <div class="pp-grid" data-grid></div>
    <div class="game-overlay" data-overlay>
      <h3>Pod Panic</h3>
      <p>Your cluster is under load. <b class="t-red">Crashed</b> pods burn your error budget — click them to restart.
      <b class="t-amber">Leaking</b> pods get OOMKilled when memory hits 100% — click to patch them first.</p>
      <button class="btn btn-primary" data-start>kubectl run game</button>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const grid = $("[data-grid]");
  const overlay = $("[data-overlay]");
  const els = { score: $("[data-score]"), time: $("[data-time]"), best: $("[data-best]"), bar: $("[data-bar]"), budget: $("[data-budget]") };

  let pods, score, budget, elapsed, timer;

  const btns = Array.from({ length: PODS }, (_, i) => {
    const b = document.createElement("button");
    b.className = "pod";
    b.type = "button";
    b.addEventListener("click", () => clickPod(i));
    grid.appendChild(b);
    return b;
  });

  function newPod() {
    return { state: "ok", mem: 20 + Math.random() * 15, name: `web-${hash()}`, wait: 0 };
  }

  function draw() {
    pods.forEach((p, i) => {
      const b = btns[i];
      b.dataset.state = p.state;
      const label = {
        ok: "Running",
        leak: `Mem ${Math.round(p.mem)}%`,
        crash: p.oom ? "OOMKilled" : "CrashLoopBackOff",
        restarting: "Restarting…",
      }[p.state];
      b.innerHTML = `<span class="pod-name mono">${p.name}</span><span class="pod-status mono">${label}</span>
        <span class="pod-mem"><i style="width:${p.state === "crash" ? 0 : Math.round(p.mem)}%"></i></span>`;
    });
    els.score.textContent = score;
    els.time.textContent = `${Math.floor(elapsed)}s`;
    els.bar.style.width = `${budget}%`;
    els.bar.dataset.level = budget > 50 ? "ok" : budget > 25 ? "warn" : "bad";
    els.budget.textContent = `${Math.ceil(budget)}%`;
  }

  function clickPod(i) {
    if (!timer) return;
    const p = pods[i];
    if (p.state === "crash") {
      p.state = "restarting";
      p.wait = 0.6;
      score += 10;
      flash(btns[i], "+10");
    } else if (p.state === "leak") {
      p.state = "ok";
      p.mem = 25;
      score += 5;
      flash(btns[i], "+5");
    }
    draw();
  }

  function flash(el, text) {
    const f = document.createElement("span");
    f.className = "pod-pop mono";
    f.textContent = text;
    el.appendChild(f);
    setTimeout(() => f.remove(), 700);
  }

  let ticks = 0;
  function tick() {
    const dt = 0.1;
    ticks++;
    elapsed = ticks / 10;
    const difficulty = 1 + elapsed / 25;
    let down = 0;
    pods.forEach((p) => {
      if (p.state === "ok") {
        if (Math.random() < 0.004 * difficulty) { p.state = "crash"; p.oom = false; }
        else if (Math.random() < 0.006 * difficulty) p.state = "leak";
      } else if (p.state === "leak") {
        p.mem += (6 + 4 * difficulty) * dt;
        if (p.mem >= 100) { p.state = "crash"; p.oom = true; }
      } else if (p.state === "restarting") {
        p.wait -= dt;
        if (p.wait <= 0) Object.assign(p, newPod(), { name: p.name });
      }
      if (p.state === "crash") down++;
    });
    budget = Math.max(0, budget - down * 0.35);
    if (ticks % 10 === 0) score += 1; // +1 per second survived
    draw();
    if (budget <= 0) gameOver();
  }

  function start() {
    pods = Array.from({ length: PODS }, newPod);
    score = 0; budget = 100; elapsed = 0; ticks = 0;
    overlay.hidden = true;
    draw();
    clearInterval(timer);
    timer = setInterval(tick, 100);
  }

  function gameOver() {
    clearInterval(timer);
    timer = null;
    const record = score > best.get(BEST_KEY);
    if (record) best.set(BEST_KEY, score);
    els.best.textContent = best.get(BEST_KEY);
    overlay.innerHTML = `
      <h3>SLO breached 💥</h3>
      <p class="mono">error budget exhausted after <b>${Math.floor(elapsed)}s</b><br/>score: <b>${score}</b>${record ? ' · <span class="t-amber">new record!</span>' : ""}</p>
      <button class="btn btn-primary" data-start>kubectl rollout restart</button>`;
    overlay.hidden = false;
  }

  root.addEventListener("click", (e) => { if (e.target.closest("[data-start]")) start(); });
  pods = Array.from({ length: PODS }, newPod);
  score = 0; budget = 100; elapsed = 0;
  draw();

  return () => clearInterval(timer);
}

/* =========================================================
   GAME 2 — TERMINAL TYPER
   ========================================================= */
const TASKS = [
  { topic: "Docker", task: "List the running containers", a: ["docker ps", "docker container ls"] },
  { topic: "Docker", task: "List ALL containers, including stopped ones", a: ["docker ps -a", "docker ps --all", "docker container ls -a"] },
  { topic: "Docker", task: "Build an image tagged app:1.0 from the current folder", a: ["docker build -t app:1.0 .", "docker build --tag app:1.0 ."] },
  { topic: "Docker", task: "Start every service in compose.yaml in the background", a: ["docker compose up -d", "docker compose up --detach"] },
  { topic: "Docker", task: "Follow the logs of the container named api", a: ["docker logs -f api", "docker logs --follow api"] },
  { topic: "Docker", task: "Open a shell inside the running container web", a: ["docker exec -it web sh", "docker exec -it web bash", "docker exec -it web /bin/sh", "docker exec -it web /bin/bash"] },
  { topic: "Kubernetes", task: "Show the pods in every namespace", a: ["kubectl get pods -A", "kubectl get pods --all-namespaces", "kubectl get po -A", "kubectl get pod -A"] },
  { topic: "Kubernetes", task: "Apply the manifest file app.yaml", a: ["kubectl apply -f app.yaml"] },
  { topic: "Kubernetes", task: "Scale the deployment web to 5 replicas", a: ["kubectl scale deployment web --replicas=5", "kubectl scale deploy web --replicas=5", "kubectl scale deployment/web --replicas=5", "kubectl scale deploy/web --replicas=5"] },
  { topic: "Kubernetes", task: "Roll back the deployment web", a: ["kubectl rollout undo deployment/web", "kubectl rollout undo deployment web", "kubectl rollout undo deploy/web", "kubectl rollout undo deploy web"] },
  { topic: "Kubernetes", task: "Show details and events of the pod web-1", a: ["kubectl describe pod web-1", "kubectl describe po web-1", "kubectl describe pods web-1"] },
  { topic: "Terraform", task: "Initialise a Terraform folder (download providers)", a: ["terraform init"] },
  { topic: "Terraform", task: "Preview changes without applying them", a: ["terraform plan"] },
  { topic: "Terraform", task: "Delete every resource Terraform manages", a: ["terraform destroy"] },
  { topic: "Terraform", task: "Format all .tf files", a: ["terraform fmt", "terraform fmt -recursive"] },
  { topic: "SSH", task: "Generate a new ed25519 key pair", a: ["ssh-keygen -t ed25519"] },
  { topic: "SSH", task: "Copy your public key to ubuntu@10.0.0.5", a: ["ssh-copy-id ubuntu@10.0.0.5"] },
  { topic: "SSH", task: "Connect to ubuntu@10.0.0.5 on port 2222", a: ["ssh -p 2222 ubuntu@10.0.0.5"] },
  { topic: "Ansible", task: "Ping every host in inventory.ini", a: ["ansible all -i inventory.ini -m ping", "ansible -i inventory.ini all -m ping"] },
  { topic: "Ansible", task: "Dry-run the playbook site.yml", a: ["ansible-playbook site.yml --check", "ansible-playbook --check site.yml", "ansible-playbook -C site.yml", "ansible-playbook site.yml -C"] },
  { topic: "AWS", task: "Show which AWS identity you are using", a: ["aws sts get-caller-identity"] },
  { topic: "AWS", task: "List your S3 buckets", a: ["aws s3 ls"] },
  { topic: "Virtualization", task: "Create and start every VM in the Vagrantfile", a: ["vagrant up"] },
  { topic: "Virtualization", task: "Start the VirtualBox VM lab without a window", a: ["vboxmanage startvm lab --type headless"] },
  { topic: "Monitoring", task: "Validate the Prometheus config prometheus.yml", a: ["promtool check config prometheus.yml"] },
  { topic: "CI/CD", task: "Install exact dependencies from package-lock.json (CI style)", a: ["npm ci"] },
];

const norm = (s) => s.trim().replace(/\s+/g, " ").replace(/^\$\s*/, "").toLowerCase();

export function mountTyper(root) {
  const ROUND = 60;
  const BEST_KEY = "best-terminal-typer";
  root.innerHTML = `
    <div class="game-hud mono">
      <div>score <b data-score>0</b></div>
      <div>time <b data-time>${ROUND}s</b></div>
      <div>streak <b data-streak>0</b></div>
      <div>best <b data-best>${best.get(BEST_KEY)}</b></div>
    </div>
    <div class="tt-screen">
      <div class="tt-topic mono" data-topic>// ready</div>
      <div class="tt-task" data-task>Type the command that does the task.</div>
      <form class="tt-form" data-form autocomplete="off">
        <span class="mono">$</span>
        <input class="mono" data-input spellcheck="false" autocapitalize="off" placeholder="type here and press Enter" disabled />
      </form>
      <div class="tt-feedback mono" data-feedback></div>
    </div>
    <div class="tt-actions"><button class="btn btn-small btn-ghost" data-skip disabled>skip (Tab)</button></div>
    <div class="game-overlay" data-overlay>
      <h3>Terminal Typer</h3>
      <p>You get <b>${ROUND} seconds</b>. Read the task, type the matching command, press <kbd>Enter</kbd>.
      Streaks give bonus points. Stuck? Press <kbd>Tab</kbd> to skip.</p>
      <button class="btn btn-primary" data-start>./start.sh</button>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const el = {
    score: $("[data-score]"), time: $("[data-time]"), streak: $("[data-streak]"), best: $("[data-best]"),
    topic: $("[data-topic]"), task: $("[data-task]"), form: $("[data-form]"), input: $("[data-input]"),
    feedback: $("[data-feedback]"), skip: $("[data-skip]"), overlay: $("[data-overlay]"),
  };

  let queue = [], current, score, streak, left, correct, timer;

  function next() {
    if (!queue.length) queue = [...TASKS].sort(() => Math.random() - 0.5);
    current = queue.pop();
    el.topic.textContent = `// ${current.topic}`;
    el.task.textContent = current.task;
    el.input.value = "";
  }

  function feedback(html, cls) {
    el.feedback.className = `tt-feedback mono ${cls}`;
    el.feedback.innerHTML = html;
  }

  function submit(e) {
    e.preventDefault();
    if (!timer) return;
    const typed = norm(el.input.value);
    if (!typed) return;
    if (current.a.some((a) => norm(a) === typed)) {
      streak++;
      correct++;
      const pts = 10 + Math.min(streak - 1, 5) * 2;
      score += pts;
      feedback(`✓ correct +${pts}${streak > 1 ? ` · streak x${streak}` : ""}`, "ok");
      next();
    } else {
      streak = 0;
      feedback(`✗ not quite — try again`, "bad");
      el.form.classList.remove("shake");
      void el.form.offsetWidth;
      el.form.classList.add("shake");
    }
    draw();
  }

  function skip() {
    if (!timer) return;
    streak = 0;
    feedback(`answer: <code>${esc(current.a[0])}</code>`, "warn");
    next();
    draw();
    el.input.focus();
  }

  function draw() {
    el.score.textContent = score;
    el.streak.textContent = streak;
    el.time.textContent = `${left}s`;
    el.time.classList.toggle("t-red", left <= 10);
  }

  function start() {
    score = 0; streak = 0; correct = 0; left = ROUND;
    el.overlay.hidden = true;
    el.input.disabled = false;
    el.skip.disabled = false;
    feedback("", "");
    queue = [];
    next();
    draw();
    el.input.focus();
    clearInterval(timer);
    timer = setInterval(() => {
      left--;
      draw();
      if (left <= 0) end();
    }, 1000);
  }

  function end() {
    clearInterval(timer);
    timer = null;
    el.input.disabled = true;
    el.skip.disabled = true;
    const record = score > best.get(BEST_KEY);
    if (record) best.set(BEST_KEY, score);
    el.best.textContent = best.get(BEST_KEY);
    el.overlay.innerHTML = `
      <h3>exit 0 — time's up</h3>
      <p class="mono"><b>${correct}</b> commands correct · score <b>${score}</b>${record ? ' · <span class="t-amber">new record!</span>' : ""}</p>
      <button class="btn btn-primary" data-start>./start.sh --again</button>`;
    el.overlay.hidden = false;
  }

  el.form.addEventListener("submit", submit);
  el.skip.addEventListener("click", skip);
  el.input.addEventListener("keydown", (e) => {
    if (e.key === "Tab") { e.preventDefault(); skip(); }
  });
  root.addEventListener("click", (e) => { if (e.target.closest("[data-start]")) start(); });

  return () => clearInterval(timer);
}
