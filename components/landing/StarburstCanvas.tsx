"use client";

import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/* ─── Config ─── */
const RAY_COUNT = 400;
const SEGMENTS = 5;
const DOT_R = 3.5;
const REPEL_R = 180;
const REPEL_F = 140;

/* ─── Simplex-like 2D noise ─── */
const PERM = new Uint8Array(512);
(() => {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

const G2 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

function dot2(g: number[], x: number, y: number) {
  return g[0] * x + g[1] * y;
}

function noise2d(x: number, y: number): number {
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2s = (3 - Math.sqrt(3)) / 6;
  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const t = (i + j) * G2s;
  const x0 = x - (i - t);
  const y0 = y - (j - t);
  const i1 = x0 > y0 ? 1 : 0;
  const j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + G2s;
  const y1 = y0 - j1 + G2s;
  const x2 = x0 - 1 + 2 * G2s;
  const y2 = y0 - 1 + 2 * G2s;
  const ii = i & 255;
  const jj = j & 255;
  const gi0 = PERM[ii + PERM[jj]] % 8;
  const gi1 = PERM[ii + i1 + PERM[jj + j1]] % 8;
  const gi2 = PERM[ii + 1 + PERM[jj + 1]] % 8;
  let n0 = 0, n1 = 0, n2 = 0;
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * dot2(G2[gi0], x0, y0); }
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * dot2(G2[gi1], x1, y1); }
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * dot2(G2[gi2], x2, y2); }
  return 70 * (n0 + n1 + n2);
}

/* ─── Types ─── */
interface Ray {
  angle: number;
  len: number;
  speed: number;
  phase: number;
  hue: number;
  opacity: number;
  noiseOffX: number;
  noiseOffY: number;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function gauss() {
  return (Math.random() + Math.random() + Math.random()) / 3;
}

function buildRays(w: number, h: number): Ray[] {
  const maxLen = Math.min(w, h) * 0.4;
  const out: Ray[] = [];
  for (let i = 0; i < RAY_COUNT; i++) {
    const g = gauss();
    const angle = -Math.PI / 2 + (g - 0.5) * Math.PI * 1.15;
    out.push({
      angle,
      len: 40 + Math.random() * maxLen,
      speed: 0.06 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
      hue: 0.57 + Math.random() * 0.1,
      opacity: 0.03 + Math.random() * 0.1,
      noiseOffX: Math.random() * 100,
      noiseOffY: Math.random() * 100,
    });
  }
  return out;
}

/* ─── Component ─── */
export function StarburstCanvas() {
  const boxRef = useRef<HTMLDivElement>(null);
  const mRef = useRef({ x: 9999, y: 9999 });
  const smRef = useRef({ x: 9999, y: 9999 });

  const onMove = useCallback((e: MouseEvent) => {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) {
      mRef.current = { x: 9999, y: 9999 };
      return;
    }
    mRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  const onLeave = useCallback(() => {
    mRef.current = { x: 9999, y: 9999 };
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const W = box.clientWidth;
    const H = box.clientHeight;

    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(0, W, 0, H, -1, 1);

    const gl = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    gl.setSize(W, H);
    gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    gl.toneMapping = THREE.NoToneMapping;
    box.appendChild(gl.domElement);

    /* Bloom postprocessing */
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, cam));

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(W, H),
      0.6,   // strength
      0.5,   // radius
      0.3    // threshold
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const ox = W * 0.5;
    const oy = H * 0.97;

    const rays = buildRays(W, H);
    const dotGeo = new THREE.CircleGeometry(DOT_R, 8);

    const items: { pa: Float32Array; ca: Float32Array; ln: THREE.Line; dt: THREE.Mesh }[] = [];

    for (const ray of rays) {
      const n = (SEGMENTS + 1) * 3;
      const pa = new Float32Array(n);
      const ca = new Float32Array(n);

      const baseColor = new THREE.Color().setHSL(ray.hue, 0.5, 0.75);

      for (let s = 0; s <= SEGMENTS; s++) {
        const t = s / SEGMENTS;
        const fade = 1 - t * 0.7;
        ca[s * 3] = baseColor.r * fade;
        ca[s * 3 + 1] = baseColor.g * fade;
        ca[s * 3 + 2] = baseColor.b * fade;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pa, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(ca, 3));

      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: ray.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ln = new THREE.Line(geo, mat);
      scene.add(ln);

      const dMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const dt = new THREE.Mesh(dotGeo, dMat);
      scene.add(dt);

      items.push({ pa, ca, ln, dt });
    }

    let t = 0;
    let af: number;

    const tick = () => {
      af = requestAnimationFrame(tick);
      t += 0.003;

      smRef.current.x = lerp(smRef.current.x, mRef.current.x, 0.18);
      smRef.current.y = lerp(smRef.current.y, mRef.current.y, 0.18);
      const mx = smRef.current.x;
      const my = smRef.current.y;

      for (let i = 0; i < rays.length; i++) {
        const r = rays[i];
        const g = items[i];
        const pulse = 0.88 + 0.12 * Math.sin(t * r.speed * 4 + r.phase);
        const drift = noise2d(r.noiseOffX + t * 0.15, r.noiseOffY) * 0.08;
        const breathLen = r.len * pulse * (1 + 0.06 * Math.sin(t * 0.8 + r.phase));
        const segLen = breathLen / SEGMENTS;

        let cx = ox;
        let cy = oy;
        const a = g.pa;

        a[0] = cx;
        a[1] = cy;
        a[2] = 0;

        for (let s = 1; s <= SEGMENTS; s++) {
          const st = s / SEGMENTS;
          const nVal = noise2d(
            r.noiseOffX + t * r.speed * 1.8,
            r.noiseOffY + s * 0.35 + t * 0.3
          );
          const ang = r.angle + drift + nVal * 0.05 * st;

          cx += Math.cos(ang) * segLen;
          cy += Math.sin(ang) * segLen;

          const dx = cx - mx;
          const dy = cy - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < REPEL_R) {
            const f = ((1 - dist / REPEL_R) ** 2) * REPEL_F * st;
            const pushA = Math.atan2(dy, dx);
            cx += Math.cos(pushA) * f;
            cy += Math.sin(pushA) * f;
          }

          a[s * 3] = cx;
          a[s * 3 + 1] = cy;
          a[s * 3 + 2] = 0;
        }

        g.ln.geometry.attributes.position.needsUpdate = true;

        g.dt.position.set(cx, cy, 0);
        const sc = 0.3 + pulse * 0.7;
        g.dt.scale.set(sc, sc, sc);
        const flicker = Math.sin(t * r.speed * 8 + r.phase * 3) * 0.5 + 0.5;
        (g.dt.material as THREE.MeshBasicMaterial).opacity = flicker * (0.15 + pulse * 0.35);
      }

      composer.render();
    };

    tick();

    const onR = () => {
      if (!box) return;
      const nw = box.clientWidth;
      const nh = box.clientHeight;
      cam.right = nw;
      cam.bottom = nh;
      cam.updateProjectionMatrix();
      gl.setSize(nw, nh);
      composer.setSize(nw, nh);
    };

    window.addEventListener("resize", onR);
    window.addEventListener("mousemove", onMove);
    box.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(af);
      window.removeEventListener("resize", onR);
      window.removeEventListener("mousemove", onMove);
      box.removeEventListener("mouseleave", onLeave);
      composer.dispose();
      gl.dispose();
      if (box.contains(gl.domElement)) box.removeChild(gl.domElement);
    };
  }, [onMove, onLeave]);

  return <div ref={boxRef} className="starburst-canvas" />;
}
