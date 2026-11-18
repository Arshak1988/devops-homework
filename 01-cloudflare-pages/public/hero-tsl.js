/* =========================================================
   Home page hero background - a full-screen TSL shader
   A tunnel of rings and spokes flowing into the depth, with soft noise.
   Colours follow the site's dark / light theme.
   Rendered with WebGPURenderer (WebGPU, or WebGL 2 as a fallback).
   ========================================================= */
import * as THREE from "three/webgpu";
import {
  uniform, float, vec2, vec3, mix, sin, abs, fract, length, atan, smoothstep, time, screenUV,
  mx_noise_float,
} from "three/tsl";

const THEMES = {
  dark: { bg: 0x0c0f0a, line: 0x39d353, accent: 0xf5a524, strength: 0.3 },
  light: { bg: 0xf4f1e8, line: 0x1f8a3a, accent: 0xb86e00, strength: 0.35 },
};

export function mount(hero) {
  if (!hero.isConnected || hero.querySelector("canvas.hero-tsl")) return () => {};
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.createElement("canvas");
  canvas.className = "hero-tsl";
  canvas.setAttribute("aria-hidden", "true");
  hero.prepend(canvas);

  let renderer, material, disposed = false, visible = true;
  const cleanups = [];

  (async () => {
    try {
      const forceWebGL = new URLSearchParams(location.search).has("webgl"); // ?webgl forces WebGL 2
      renderer = new THREE.WebGPURenderer({ canvas, antialias: false, alpha: false, forceWebGL });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      await renderer.init();
    } catch (err) {
      console.warn("Hero shader unavailable:", err);
      canvas.remove();
      return; // the CSS grid background stays as the fallback
    }
    if (disposed) { renderer.dispose(); return; }

    /* ----- uniforms (changed from JavaScript without recompiling) ----- */
    const uBg = uniform(new THREE.Color(THEMES.dark.bg));
    const uLine = uniform(new THREE.Color(THEMES.dark.line));
    const uAccent = uniform(new THREE.Color(THEMES.dark.accent));
    const uStrength = uniform(THEMES.dark.strength);
    const uAspect = uniform(1);
    const uSpeed = uniform(reduceMotion ? 0 : 1);

    /* ----- the shader, written in TSL ----- */
    const t = time.mul(uSpeed);
    // centre of the tunnel sits on the right, behind the terminal window
    const p = screenUV.sub(vec2(0.74, 0.5)).mul(vec2(uAspect, 1));
    const r = length(p);
    const angle = atan(p.y, p.x);
    const depth = float(1).div(r.add(0.03));                      // fake perspective: near the centre = far away
    const rings = smoothstep(0.95, 1.0, fract(depth.mul(0.55).sub(t.mul(0.5))));
    const spokes = smoothstep(0.985, 1.0, abs(sin(angle.mul(10).add(t.mul(0.05)))));
    const fadeIn = smoothstep(0.02, 0.18, r);                      // hide the singular centre
    const fadeOut = float(1).sub(smoothstep(0.15, 0.62, r));       // gone before it reaches the hero text
    const noise = mx_noise_float(vec3(p.mul(2.5), t.mul(0.12))).mul(0.5).add(0.5);
    const lines = rings.add(spokes.mul(0.5)).mul(fadeIn).mul(fadeOut);
    const glow = float(1).sub(smoothstep(0.0, 0.55, r)).mul(0.3).mul(noise);
    const accentRing = smoothstep(0.99, 1.0, fract(depth.mul(0.11).sub(t.mul(0.1)))).mul(fadeIn).mul(fadeOut);

    let col = mix(uBg, uLine, lines.add(glow).mul(uStrength).min(1));
    col = mix(col, uAccent, accentRing.mul(uStrength).mul(0.6));

    material = new THREE.MeshBasicNodeMaterial();
    material.colorNode = col;
    const quad = new THREE.QuadMesh(material);

    /* ----- theme + size ----- */
    function applyTheme() {
      const th = THEMES[document.documentElement.getAttribute("data-theme")] || THEMES.dark;
      uBg.value.set(th.bg);
      uLine.value.set(th.line);
      uAccent.value.set(th.accent);
      uStrength.value = th.strength;
      if (reduceMotion) quad.render(renderer);
    }
    function resize() {
      const w = hero.clientWidth, h = hero.clientHeight;
      renderer.setSize(w, h, false);
      uAspect.value = w / h;
      if (reduceMotion) quad.render(renderer);
    }
    const mo = new MutationObserver(applyTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const ro = new ResizeObserver(resize);
    ro.observe(hero);
    // pause when the hero is scrolled out of view
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(hero);
    cleanups.push(() => mo.disconnect(), () => ro.disconnect(), () => io.disconnect());

    applyTheme();
    resize();
    hero.classList.add("tsl-on");

    if (reduceMotion) {
      quad.render(renderer); // one still frame
    } else {
      renderer.setAnimationLoop(() => { if (visible && !document.hidden) quad.render(renderer); });
    }
  })();

  return () => {
    disposed = true;
    cleanups.forEach((fn) => fn());
    hero.classList.remove("tsl-on");
    if (renderer) { renderer.setAnimationLoop(null); renderer.dispose(); }
    material?.dispose();
    canvas.remove();
  };
}
