/* =========================================================
   /journey - a scroll-driven 3D dive with Three.js WebGPU + TSL
   From "code on your laptop" down to "live on the internet".
   Scrolling moves the camera along a curve through 12 stations.

   TSL (Three.js Shading Language) is used for:
   - hologram materials (fresnel rim + moving scanlines)
   - "data pulses" travelling along every wireframe line
   - 8,000 particles simulated on the GPU with a compute shader
   - bloom + vignette post-processing
   WebGPURenderer uses WebGPU when available and falls back to WebGL 2.
   ========================================================= */
import * as THREE from "three/webgpu";
import {
  Fn, If, time, deltaTime, uniform, float, vec2, vec3, color, mix, sin, abs, dot, fract, length,
  smoothstep, hash, uv, varying, instanceIndex, instancedArray, instancedBufferAttribute,
  positionWorld, positionView, normalView, screenUV, mx_noise_float, pass,
} from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

const C = {
  green: 0x39d353, amber: 0xf5a524, red: 0xff6b5b,
  white: 0xd9f2d0, dim: 0x1f2a1a, bg: 0x05070a,
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* =========================================================
   TSL materials
   Each material keeps its opacity in a uniform (material.userData.level)
   so the animations can change it every frame without recompiling.
   ========================================================= */

// Wireframe lines: base colour + a bright "data pulse" sweeping through world space
function lineMat(hex, opacity = 1) {
  const level = uniform(opacity);
  const m = new THREE.LineBasicNodeMaterial({ transparent: true, depthWrite: false });
  const wave = positionWorld.y.mul(0.35).add(positionWorld.z.mul(0.06)).add(time.mul(0.7));
  const pulse = smoothstep(0.9, 1.0, fract(wave));
  m.colorNode = mix(color(hex), color(0xffffff), pulse.mul(0.85));
  m.opacityNode = level.mul(pulse.mul(0.7).add(0.7)).min(1);
  m.userData.level = level;
  return m;
}

// Hologram fill: faint body + glowing fresnel rim + scanlines moving up the object
function fillMat(hex, opacity = 0.12, extra = {}) {
  const level = uniform(opacity);
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, ...extra });
  const viewDir = positionView.negate().normalize();
  const rim = float(1).sub(abs(dot(normalView, viewDir))).pow(2.5);
  const scan = sin(positionWorld.y.mul(16).sub(time.mul(3))).mul(0.5).add(0.5).pow(8);
  m.colorNode = mix(color(hex), color(0xffffff), scan.mul(0.25));
  m.opacityNode = level.add(rim.mul(0.35)).add(scan.mul(0.15)).min(1);
  m.userData.level = level;
  return m;
}
const setLevel = (material, v) => { material.userData.level.value = v; };

// Soft round glowing sprites, positioned per instance from a buffer (CPU-updated)
function spriteCloud(positions, hex, size) {
  const attr = new THREE.InstancedBufferAttribute(positions, 3);
  const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  m.positionNode = instancedBufferAttribute(attr);
  m.scaleNode = float(size);
  m.colorNode = color(hex);
  m.opacityNode = float(1).sub(smoothstep(0.0, 0.5, length(uv().sub(0.5))));
  const sprite = new THREE.Sprite(m);
  sprite.count = positions.length / 3;
  sprite.frustumCulled = false;
  return { sprite, attr };
}

/* ---------- geometry helpers ---------- */
function edged(geo, hex = C.green, opacity = 0.12) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, fillMat(hex, opacity)));
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat(hex)));
  return g;
}
function segments(arr, hex, opacity) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
  return new THREE.LineSegments(geo, lineMat(hex, opacity));
}

/* =========================================================
   3D models - one per station. Each returns { group, update(t, dt) }
   ========================================================= */
function laptop() {
  const g = new THREE.Group();
  g.add(edged(new THREE.BoxGeometry(6, 0.3, 4)));
  const screen = edged(new THREE.BoxGeometry(6, 4, 0.2));
  screen.position.set(0, 2.1, -2);
  screen.rotation.x = -0.15;
  g.add(screen);
  const lines = [];
  for (let i = 0; i < 6; i++) {
    const w = 1.2 + Math.random() * 3.2;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.22), fillMat(i % 3 ? C.green : C.amber, 0.9));
    m.geometry.translate(w / 2, 0, 0); // grow from the left like typed text
    m.position.set(-2.5 + (i % 2) * 0.4, 1.3 - i * 0.5, 0.12);
    screen.add(m);
    lines.push(m);
  }
  return {
    group: g,
    update(t) {
      lines.forEach((m, i) => (m.scale.x = 0.35 + 0.65 * ((Math.sin(t * 1.4 + i * 0.8) + 1) / 2)));
      g.rotation.y = Math.sin(t * 0.4) * 0.3;
    },
  };
}

function gitGraph() {
  const g = new THREE.Group();
  const pts = [[-4, 0, 0], [-2, 0, 0], [0, 0, 0], [2, 0, 0], [4, 0, 0], [-1, 1.8, 0], [1, 1.8, 0]];
  const nodes = pts.map((p, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), fillMat(i >= 5 ? C.amber : C.green, 0.95));
    m.position.set(...p);
    g.add(m);
    return m;
  });
  const arr = [];
  [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [6, 3]].forEach(([a, b]) => arr.push(...pts[a], ...pts[b]));
  g.add(segments(arr, C.white, 0.6));
  return {
    group: g,
    update(t) {
      nodes.forEach((n, i) => n.scale.setScalar(1 + 0.3 * Math.max(0, Math.sin(t * 3 - i))));
      g.rotation.y = Math.sin(t * 0.4) * 0.5;
    },
  };
}

function ciRing() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.08, 8, 64), fillMat(C.green, 0.9)));
  const check = segments([-0.9, 0, 0, -0.2, -0.8, 0, -0.2, -0.8, 0, 1.1, 1, 0], C.green, 1);
  g.add(check);
  const cubes = [];
  for (let i = 0; i < 6; i++) {
    const c = edged(new THREE.BoxGeometry(0.8, 0.8, 0.8), i < 4 ? C.green : C.amber, 0.3);
    g.add(c);
    cubes.push(c);
  }
  return {
    group: g,
    update(t) {
      cubes.forEach((c, i) => {
        const a = t * 0.8 + (i * Math.PI) / 3;
        c.position.set(Math.cos(a) * 3.2, Math.sin(a) * 3.2, 0);
        c.rotation.set(t, t * 1.3, 0);
      });
      setLevel(check.material, 0.4 + 0.6 * ((Math.sin(t * 2) + 1) / 2));
    },
  };
}

function imageLayers() {
  const g = new THREE.Group();
  const layers = [];
  for (let i = 0; i < 5; i++) {
    const l = edged(new THREE.BoxGeometry(5 - i * 0.5, 0.5, 3.6 - i * 0.35), i === 4 ? C.amber : C.green, 0.12 + i * 0.06);
    g.add(l);
    layers.push(l);
  }
  return {
    group: g,
    update(t) {
      layers.forEach((l, i) => (l.position.y = i * (0.65 + 0.3 * Math.sin(t * 1.5)) - 1.2));
      g.rotation.y = t * 0.35;
    },
  };
}

function registry() {
  const g = new THREE.Group();
  let ours;
  for (let x = 0; x < 4; x++) for (let y = 0; y < 3; y++) {
    const mine = x === 2 && y === 1;
    const c = edged(new THREE.BoxGeometry(1.2, 1.2, 1.2), mine ? C.amber : C.green, mine ? 0.5 : 0.06);
    c.position.set((x - 1.5) * 1.7, (y - 1) * 1.7, 0);
    g.add(c);
    if (mine) ours = c;
  }
  return {
    group: g,
    update(t) {
      ours.position.z = Math.max(0, Math.sin(t * 1.2)) * 1.8;
      ours.rotation.y = t;
      g.rotation.y = Math.sin(t * 0.3) * 0.5;
    },
  };
}

function blueprint() {
  const g = new THREE.Group();
  const grid = new THREE.GridHelper(10, 10, C.green, C.dim);
  grid.material.transparent = true;
  grid.material.opacity = 0.7;
  grid.position.y = -1.5;
  g.add(grid);
  const boxes = [[-3, -2, 2, 2, 2], [0, 1, 2.5, 3, 2], [3, -1, 1.5, 1.5, 1.5]].map(([x, z, w, h, d]) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    geo.translate(0, h / 2, 0); // grow up from the grid
    const b = edged(geo, C.green, 0.1);
    b.position.set(x, -1.5, z);
    g.add(b);
    return b;
  });
  return {
    group: g,
    update(t) {
      boxes.forEach((b, i) => {
        const p = (Math.sin(t * 1.1 - i) + 1) / 2;
        setLevel(b.children[0].material, 0.04 + p * 0.35);
        b.scale.y = 0.15 + 0.85 * Math.min(1, p * 1.6);
      });
      g.rotation.y = t * 0.2;
    },
  };
}

function cloudVMs() {
  const g = new THREE.Group();
  const shell = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(4.2, 1)), lineMat(C.green, 0.45));
  g.add(shell);
  const vms = [0, 1, 2].map((i) => {
    const v = edged(new THREE.BoxGeometry(1.4, 1.4, 1.4), i === 1 ? C.amber : C.green, 0.25);
    g.add(v);
    return v;
  });
  return {
    group: g,
    update(t) {
      shell.rotation.set(t * 0.1, t * 0.15, 0);
      vms.forEach((v, i) => {
        const a = t * 0.5 + i * 2.094;
        v.position.set(Math.cos(a) * 1.9, Math.sin(t + i) * 0.6, Math.sin(a) * 1.9);
        v.rotation.y = t;
      });
    },
  };
}

function configGear() {
  const g = new THREE.Group();
  const gear = new THREE.Group();
  gear.add(new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.35, 8, 24), fillMat(C.amber, 0.9)));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5), fillMat(C.amber, 0.9));
    tooth.position.set(Math.cos(a) * 1.9, Math.sin(a) * 1.9, 0);
    tooth.rotation.z = a;
    gear.add(tooth);
  }
  gear.position.y = 1.2;
  g.add(gear);
  const arr = [];
  const servers = [0, 1, 2].map((i) => {
    const s = edged(new THREE.BoxGeometry(1.8, 0.6, 1.2), C.green, 0.2);
    s.position.set(-3.5 + i * 3.5, -2.6, 0);
    g.add(s);
    arr.push(0, -0.9, 0, s.position.x, -2.3, 0);
    return s;
  });
  g.add(segments(arr, C.green, 0.6));
  return {
    group: g,
    update(t) {
      gear.rotation.z = t * 0.8;
      servers.forEach((s, i) => setLevel(s.children[0].material, 0.12 + 0.55 * Math.max(0, Math.sin(t * 2 - i * 1.2))));
    },
  };
}

function k8sWheel() {
  const g = new THREE.Group();
  const wheel = new THREE.Group();
  const ring = [];
  const spokes = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + Math.PI / 2;
    ring.push(new THREE.Vector3(Math.cos(a) * 3, Math.sin(a) * 3, 0));
    spokes.push(0, 0, 0, Math.cos(a) * 2.5, Math.sin(a) * 2.5, 0);
  }
  ring.push(ring[0].clone()); // close the loop (WebGPU has no LineLoop, so draw a closed Line)
  wheel.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), lineMat(C.green)));
  wheel.add(segments(spokes, C.green, 0.6));
  wheel.add(new THREE.Mesh(new THREE.CircleGeometry(0.6, 24), fillMat(C.green, 0.9)));
  g.add(wheel);
  const pods = [0, 1, 2, 3, 4].map(() => {
    const p = edged(new THREE.BoxGeometry(0.7, 0.7, 0.7), C.amber, 0.4);
    g.add(p);
    return p;
  });
  return {
    group: g,
    update(t) {
      wheel.rotation.z = t * 0.4;
      pods.forEach((p, i) => {
        const a = -t * 0.6 + i * 1.2566;
        p.position.set(Math.cos(a) * 4.3, Math.sin(a) * 4.3, Math.sin(t + i) * 0.5);
        p.rotation.set(t, t, 0);
      });
    },
  };
}

function portal() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.15, 12, 80), fillMat(C.green, 0.95));
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.04, 8, 80), fillMat(C.amber, 0.8));
  g.add(ring, ring2);
  const n = 160;
  const pos = new Float32Array(n * 3);
  const seeds = Array.from({ length: n }, () => ({
    a: Math.random() * Math.PI * 2, r: Math.random() * 3.1, z: Math.random() * 16 - 8, s: 2 + Math.random() * 4,
  }));
  const { sprite, attr } = spriteCloud(pos, C.green, 0.16);
  g.add(sprite);
  return {
    group: g,
    update(t, dt) {
      seeds.forEach((s, i) => {
        s.z -= s.s * dt; // traffic flows into the cluster
        if (s.z < -8) s.z = 8;
        pos[i * 3] = Math.cos(s.a) * s.r;
        pos[i * 3 + 1] = Math.sin(s.a) * s.r;
        pos[i * 3 + 2] = s.z;
      });
      attr.needsUpdate = true;
      ring.rotation.z = t * 0.3;
      ring2.rotation.z = -t * 0.2;
    },
  };
}

function dashboard() {
  const g = new THREE.Group();
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(9.5, 6)), lineMat(C.green, 0.5));
  frame.position.y = 1.5;
  g.add(frame);
  const bars = Array.from({ length: 8 }, (_, i) => {
    const geo = new THREE.BoxGeometry(0.6, 1, 0.6);
    geo.translate(0, 0.5, 0);
    const b = new THREE.Mesh(geo, fillMat(i === 5 ? C.red : C.green, 0.75));
    b.position.set(-3.5 + i, -1.2, 0);
    g.add(b);
    return b;
  });
  const lp = new Float32Array(40 * 3);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(lp, 3));
  g.add(new THREE.Line(lineGeo, lineMat(C.amber)));
  return {
    group: g,
    update(t) {
      bars.forEach((b, i) => (b.scale.y = 0.3 + 2.4 * ((Math.sin(t * 1.7 + i * 0.9) + 1) / 2)));
      for (let i = 0; i < 40; i++) {
        lp[i * 3] = -4.2 + (i * 8.4) / 39;
        lp[i * 3 + 1] = 3.2 + 0.5 * Math.sin(t * 2 + i * 0.5) + 0.25 * Math.sin(t * 5 + i);
      }
      lineGeo.attributes.position.needsUpdate = true;
    },
  };
}

function globe() {
  const g = new THREE.Group();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(4, 32, 20), fillMat(C.green, 0.12, { wireframe: true }));
  g.add(sphere);
  const dots = [];
  for (let i = 0; i < 44; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), fillMat(i % 4 === 0 ? C.amber : C.green, 1));
    d.position.setFromSphericalCoords(4.05, Math.acos(2 * Math.random() - 1), Math.random() * Math.PI * 2);
    sphere.add(d);
    dots.push(d);
  }
  const origin = dots[0].position;
  for (let i = 1; i < 10; i++) {
    const end = dots[i].position;
    const mid = origin.clone().add(end).multiplyScalar(0.5);
    if (mid.length() < 0.5) mid.set(0, 1, 0);
    mid.setLength(6);
    const curve = new THREE.QuadraticBezierCurve3(origin, mid, end);
    sphere.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(30)), lineMat(C.amber, 0.65)));
  }
  return {
    group: g,
    update(t) {
      sphere.rotation.y = t * 0.25;
      dots.forEach((d, i) => d.scale.setScalar(1 + 0.9 * Math.max(0, Math.sin(t * 3 + i))));
    },
  };
}

/* =========================================================
   The 12 stations of the journey
   ========================================================= */
export const STATIONS = [
  { title: "Write the app", where: "Your laptop / localhost", model: laptop,
    text: "Every journey starts on localhost. You write a small Node.js app, run it and check it in your browser at http://localhost:3000.",
    cmd: "npm init -y\nnpm install express\nnode server.js", topics: [] },
  { title: "Commit & push", where: "Git / GitHub", model: gitGraph,
    text: "Git records every change. Pushing to GitHub shares the code with your team - and triggers the automation that follows.",
    cmd: 'git add .\ngit commit -m "feat: first version"\ngit push origin main', topics: ["cicd"] },
  { title: "CI pipeline runs", where: "GitHub Actions", model: ciRing,
    text: "A runner checks out the commit, installs dependencies and runs the tests. A failing test stops a broken change before it goes anywhere.",
    cmd: "npm ci\nnpm test\nnpm run lint", topics: ["cicd"] },
  { title: "Build the container image", where: "Docker", model: imageLayers,
    text: "The pipeline packages the app with its runtime and libraries into an image made of layers. The same artifact will run everywhere.",
    cmd: "docker build -t devops-path:1.4.0 .", topics: ["docker"] },
  { title: "Push to a registry", where: "GHCR / Amazon ECR", model: registry,
    text: "The image is tagged with its version (or the commit SHA) and pushed to a registry, where the servers can pull it from.",
    cmd: "docker tag devops-path:1.4.0 ghcr.io/you/devops-path:1.4.0\ndocker push ghcr.io/you/devops-path:1.4.0", topics: ["docker", "cicd"] },
  { title: "Provision infrastructure", where: "Terraform", model: blueprint,
    text: "Code describes the network, the Kubernetes cluster and the database. Terraform shows a plan, then creates exactly that through the AWS API.",
    cmd: "terraform init\nterraform plan -out=tf.plan\nterraform apply tf.plan", topics: ["terraform"] },
  { title: "Inside the cloud", where: "AWS / VPC / EC2", model: cloudVMs,
    text: "A VPC with public and private subnets across two Availability Zones. The worker nodes are EC2 instances - virtual machines running on AWS hypervisors.",
    cmd: "aws ec2 describe-instances \\\n  --filters Name=tag:Project,Values=devops-path", topics: ["aws", "virtualization"] },
  { title: "Configure the servers", where: "Ansible / SSH", model: configGear,
    text: "Ansible connects over SSH through a bastion host and hardens every machine the same way: users, keys, firewall and updates.",
    cmd: "ansible-playbook -i inventory.ini harden.yml", topics: ["ansible", "ssh"] },
  { title: "Deploy to Kubernetes", where: "Amazon EKS", model: k8sWheel,
    text: "A Deployment asks for 3 replicas of the new image. The scheduler places pods on nodes and rolls them out with zero downtime.",
    cmd: "kubectl apply -f k8s/\nkubectl rollout status deployment/web", topics: ["kubernetes"] },
  { title: "Open the door to the internet", where: "Ingress / Load balancer / DNS", model: portal,
    text: "An Ingress behind a cloud load balancer receives HTTPS traffic. A DNS record points your domain at it and a TLS certificate secures it.",
    cmd: "curl -I https://devopspath.example\n# HTTP/2 200", topics: ["kubernetes", "aws"] },
  { title: "Watch it in production", where: "Prometheus / Grafana / Loki / Alloy", model: dashboard,
    text: "Alloy ships metrics and logs to Prometheus and Loki. Grafana dashboards and alerts tell you something broke - before your users do.",
    cmd: 'rate(http_requests_total{app="web"}[5m])', topics: ["monitoring"] },
  { title: "Live for the whole world", where: "The internet", model: globe,
    text: "Users anywhere can reach your app. The next git push travels this entire path again - automatically, in minutes.",
    cmd: "git push   # ...and the journey starts again", topics: [], final: true },
];

const TOPIC_NAMES = {
  ssh: "SSH", virtualization: "Virtualization", ansible: "Ansible", docker: "Docker", cicd: "CI/CD",
  aws: "AWS", terraform: "Terraform", kubernetes: "Kubernetes", monitoring: "Monitoring",
};

/* =========================================================
   mount(root) - builds the page and returns a cleanup function.
   The renderer starts asynchronously (WebGPU needs an async init).
   ========================================================= */
export function mount(root) {
  const N = STATIONS.length;
  const SPACING = 26;

  root.style.height = `${(N + 1) * 100}vh`;
  root.innerHTML = `
    <div class="jr-sticky">
      <canvas class="jr-canvas"></canvas>
      <div class="jr-intro">
        <span class="kicker">// three.js / WebGPU / TSL - scroll to descend</span>
        <h1>From <span class="hl">localhost</span><br/>to the internet</h1>
        <p>Follow one app on its journey through every DevOps tool in this course - ${N} stations deep.</p>
        <div class="jr-scroll-hint mono">scroll &darr;</div>
      </div>
      <div class="jr-card" aria-live="polite"></div>
      <nav class="jr-rail" aria-label="Journey stations">
        ${STATIONS.map((s, i) => `<button data-i="${i}" title="${esc(s.title)}"><span>${String(i + 1).padStart(2, "0")}</span></button>`).join("")}
      </nav>
      <div class="jr-depth mono">depth <b>0</b> m <span class="jr-backend">starting renderer...</span></div>
    </div>`;

  const sticky = root.querySelector(".jr-sticky");
  const canvas = root.querySelector(".jr-canvas");
  const card = root.querySelector(".jr-card");
  const intro = root.querySelector(".jr-intro");
  const railBtns = [...root.querySelectorAll(".jr-rail button")];
  const depthEl = root.querySelector(".jr-depth b");
  const backendEl = root.querySelector(".jr-backend");

  let disposed = false;
  let renderer, pipeline, scene;
  const listeners = [];
  const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); listeners.push([target, type, fn]); };

  /* ---------- HUD card (plain DOM, works before the 3D is ready) ---------- */
  let shown = -2;
  function showStation(i) {
    if (i === shown) return;
    shown = i;
    intro.classList.toggle("hide", i >= 0);
    railBtns.forEach((b, k) => {
      b.classList.toggle("active", k === i);
      b.classList.toggle("passed", k < i);
    });
    if (i < 0) { card.classList.remove("show"); return; }
    const s = STATIONS[i];
    card.classList.remove("show");
    void card.offsetWidth; // restart the fade-in animation
    card.innerHTML = `
      <div class="jr-step mono">station ${String(i + 1).padStart(2, "0")} / ${N}</div>
      <h2>${esc(s.title)}</h2>
      <div class="jr-where mono">${esc(s.where)}</div>
      <p>${esc(s.text)}</p>
      <pre class="jr-cmd"><code>${esc(s.cmd)
        .split("\n").map((l) => (l.trim().startsWith("#") ? `<span class="cm">${l}</span>` : `<span class="p">$</span> ${l}`)).join("\n")}</code></pre>
      ${s.topics.length ? `<div class="jr-topics">${s.topics.map((t) => `<a href="/topic/${t}">learn ${TOPIC_NAMES[t]} &rarr;</a>`).join("")}</div>` : ""}
      ${s.final ? `<div class="jr-final"><a class="btn btn-primary" href="/topics">Start the course &rarr;</a><a class="btn btn-ghost" href="/play">Play a game</a></div>` : ""}`;
    card.classList.add("show");
  }

  /* ---------- scroll -> progress ---------- */
  let target = 0, current = 0;
  function readScroll() {
    const top = root.getBoundingClientRect().top;
    const range = root.offsetHeight - sticky.offsetHeight;
    target = Math.min(1, Math.max(0, -top / range));
  }
  railBtns.forEach((b) => b.addEventListener("click", () => {
    const range = root.offsetHeight - sticky.offsetHeight;
    const y = root.getBoundingClientRect().top + window.scrollY + ((+b.dataset.i + 1) / N) * range;
    window.scrollTo({ top: y, behavior: "smooth" });
  }));
  const mouse = { x: 0, y: 0 };
  on(window, "scroll", readScroll, { passive: true });
  on(window, "pointermove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  readScroll();

  /* ---------- 3D scene (async: WebGPU init) ---------- */
  (async () => {
    try {
      // add ?webgl to the URL to force the WebGL 2 backend (to compare / test the fallback)
      const forceWebGL = new URLSearchParams(location.search).has("webgl");
      renderer = new THREE.WebGPURenderer({ canvas, antialias: true, forceWebGL });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      await renderer.init();
    } catch (err) {
      console.warn("3D renderer unavailable:", err);
      if (!disposed) { root.style.height = ""; root.innerHTML = fallback(); }
      return;
    }
    if (disposed) { renderer.dispose(); return; }
    backendEl.textContent = renderer.backend.isWebGPUBackend ? "/ WebGPU + TSL" : "/ WebGL 2 + TSL";

    scene = new THREE.Scene();
    scene.background = new THREE.Color(C.bg);
    scene.fog = new THREE.FogExp2(C.bg, 0.022);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);

    // stations + camera path
    const models = [];
    const camPts = [new THREE.Vector3(0, 8, 40)];
    const lookPts = [new THREE.Vector3(0, 0, -8)];
    STATIONS.forEach((s, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      const pos = new THREE.Vector3(side * 4.5, -i * 3, -i * SPACING);
      const m = s.model();
      m.group.position.copy(pos);
      scene.add(m.group);
      models.push(m);
      camPts.push(new THREE.Vector3(pos.x - 3.2, pos.y + 1.8, pos.z + 14));
      lookPts.push(pos.clone().add(new THREE.Vector3(-3, 0, 0)));
    });
    const camCurve = new THREE.CatmullRomCurve3(camPts);
    const lookCurve = new THREE.CatmullRomCurve3(lookPts);

    // the shaft: rings along the path
    const depthY = (z) => (z / SPACING) * 3;
    for (let z = 30; z > -N * SPACING; z -= 7) {
      const pts = Array.from({ length: 49 }, (_, k) => {
        const a = (k / 48) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * 18, Math.sin(a) * 12, 0);
      });
      const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(C.green, 0.07));
      ring.position.set(0, depthY(z), z);
      scene.add(ring);
    }

    /* ----- GPU particles: positions live on the GPU and are moved by a TSL compute shader ----- */
    const COUNT = 8000;
    const TOP = 40, LENGTH = N * SPACING + 80;
    const positions = instancedArray(COUNT, "vec3");
    const initParticles = Fn(() => {
      const p = positions.element(instanceIndex);
      const z = float(TOP).sub(hash(instanceIndex.add(7)).mul(LENGTH));
      const y = z.div(SPACING).mul(3).add(hash(instanceIndex.add(13)).sub(0.5).mul(50));
      p.assign(vec3(hash(instanceIndex).sub(0.5).mul(70), y, z));
    })().compute(COUNT);
    const updateParticles = Fn(() => {
      const p = positions.element(instanceIndex);
      // curl-ish drift from 3D noise, plus a slow rise like bubbles in deep water
      const n1 = mx_noise_float(p.mul(0.04).add(vec3(0, 0, time.mul(0.15))));
      const n2 = mx_noise_float(p.mul(0.04).add(vec3(31.7, 0, time.mul(0.15))));
      const next = p.add(vec3(n1, float(0.6), n2).mul(deltaTime).mul(1.6)).toVar();
      const baseY = next.z.div(SPACING).mul(3);
      If(next.y.greaterThan(baseY.add(25)), () => { next.y.assign(baseY.sub(25)); });
      p.assign(next);
    })().compute(COUNT);
    await renderer.computeAsync(initParticles);
    if (disposed) { renderer.dispose(); return; }

    const seed = varying(hash(instanceIndex.add(99)));
    const pMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    pMat.positionNode = positions.toAttribute();
    pMat.scaleNode = mix(float(0.06), float(0.16), seed);
    pMat.colorNode = mix(color(C.green), color(C.amber), smoothstep(0.92, 0.93, seed));
    const twinkle = sin(time.mul(2).add(seed.mul(40))).mul(0.35).add(0.65);
    pMat.opacityNode = float(1).sub(smoothstep(0.0, 0.5, length(uv().sub(0.5)))).mul(twinkle).mul(0.8);
    const particles = new THREE.Sprite(pMat);
    particles.count = COUNT;
    particles.frustumCulled = false;
    scene.add(particles);

    /* ----- post-processing with TSL: scene -> bloom -> vignette ----- */
    pipeline = new THREE.RenderPipeline(renderer);
    const scenePass = pass(scene, camera);
    const sceneColor = scenePass.getTextureNode("output");
    const glow = bloom(sceneColor, 0.9, 0.5, 0.08);
    const vignette = float(1).sub(smoothstep(0.25, 0.95, length(screenUV.sub(vec2(0.55, 0.5)))));
    pipeline.outputNode = sceneColor.add(glow).mul(mix(float(0.35), float(1), vignette));

    function resize() {
      const w = sticky.clientWidth, h = sticky.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w < 700 ? 68 : 55; // pull back a little on phones
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(sticky);
    listeners.push([null, "resize-observer", () => ro.disconnect()]);
    resize();
    models.forEach((m) => m.update(0, 0));

    /* ----- render loop ----- */
    const look = new THREE.Vector3();
    const start = performance.now();
    let last = start;
    renderer.setAnimationLoop(() => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      const t = (now - start) / 1000;
      last = now;
      current += (target - current) * Math.min(1, dt * 4);

      camera.position.copy(camCurve.getPoint(current));
      camera.position.x += mouse.x * 0.8;
      camera.position.y -= mouse.y * 0.5;
      lookCurve.getPoint(current, look);
      camera.lookAt(look);

      const idx = Math.round(current * N) - 1;
      models.forEach((m, i) => { if (Math.abs(i - idx) <= 1) m.update(t, dt); });
      showStation(idx);
      depthEl.textContent = Math.round(current * N * 120);

      renderer.compute(updateParticles);
      pipeline.render();
    });
  })();

  // show the intro / first card even before the renderer is ready
  showStation(Math.round(target * N) - 1);

  /* ---------- cleanup when leaving the page ---------- */
  return () => {
    disposed = true;
    listeners.forEach(([t, type, fn]) => (t ? t.removeEventListener(type, fn) : fn()));
    if (renderer) renderer.setAnimationLoop(null);
    if (scene) scene.traverse((o) => {
      o.geometry?.dispose();
      [].concat(o.material || []).forEach((m) => m.dispose());
    });
    pipeline?.dispose();
    renderer?.dispose();
  };
}

// Shown if the browser can't do WebGPU or WebGL 2
function fallback() {
  return `<section class="section"><div class="container">
    <div class="section-head"><span class="kicker">// 3D unavailable</span><h2>From localhost to the internet</h2>
    <p>Your browser can't show the 3D version, so here's the path as a list.</p></div>
    <ol class="jr-fallback">${STATIONS.map((s) => `<li><b>${esc(s.title)}</b> <span class="mono muted">${esc(s.where)}</span><p>${esc(s.text)}</p></li>`).join("")}</ol>
  </div></section>`;
}
