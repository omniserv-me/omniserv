/* stack.js — Movement 03, LATTICE. design.md §6.5 (geometry), §9.6, §7.5.

   CP3's four labelled columns are the authored state: the `s` layout (≤ 640 px),
   the no-JS page and tier NONE. Above 640 px, with a stage or before the probe
   has reported, this module lays the same 22 buttons out on a triangular
   lattice and draws the edges between them. The DOM is never reordered — only
   positioned — so tab order and the accessibility tree stay the columns'.

   Geometry (§6.5, errata E38, E39). Every node sits at lattice coordinates
   (i, j), i + j even, resolved to px as (i·dx, j·dy) with dx = pitch·cos 30°
   and dy = pitch·sin 30° — i.e. integer combinations of b₁ = (1, −1) and
   b₂ = (−1, −1). Edges are k·b₁, k·b₂ or k·(b₁ + b₂) only: 30°, 150°, 90°.
   Coordinates are authored once per cluster, relative to its root (the
   cluster's first node, which is also the topmost, so its branch chain never
   crosses its own nodes). Each cluster is its own lattice, since no edge
   leaves a cluster: packed a gutter apart, four across where the measured
   spans fit and 2×2 otherwise, rows sharing a lattice row. Pitch 88 px above
   900 px, 62 px from 641 to 900 px.

   The edge topology is the wireframe's (§6.5), except where the axis rule
   forbids an edge: Java hangs from C/C++ rather than Go, SQL from MongoDB
   rather than FastAPI, and Traefik–Caddy stands in for Docker–Caddy and
   Traefik–Linux.

   The root nodes feed 6b's branch chains without an API: gl/movements.js
   measures each cluster's first node on every refresh, and in graph mode that
   node *is* the lattice root. place() runs on `refreshInit`, before that
   measurement.

   Growth (§9.6) is once per page, on `top 68%`. Edge draws tween
   stroke-dasharray in pathLength units, not DrawSVG, which ignores pathLength
   (errata E25). Hover and focus share one state, drawn by classes (CSS owns the
   colours, the 0.60 dim and the letter-spacing, errata E40); only the node's
   seat, `back.out`, is a tween. Reduced motion and LOW keep only the colour
   changes: no growth, no dim, no scale. */

import { gsap, ScrollTrigger, T, ease } from '../core/easings.js';
import { register } from '../core/registry.js';
import { tier } from '../core/signals.js';
import { sectionHeader } from './header.js';

const section = document.querySelector('#lattice');
const lattice = section.querySelector('[data-lattice]');
const readout = section.querySelector('[data-readout]');
const rest = readout.innerHTML;

sectionHeader(section.querySelector('.head'));

/* Lattice coordinates [i, j], relative to each cluster's root; y grows down.
   Rows are two units apart, so capsules on different rows never touch; nodes
   sharing a row are two units apart, which the widest pair clears at 62 px. */
const GRAPH = {
  backend: {
    at: { Python: [0, 0], Go: [0, 2], FastAPI: [2, 2], 'C/C++': [0, 4], gRPC: [2, 4],
      Java: [0, 6], MongoDB: [2, 6], SQL: [2, 8] },
    edges: [['Python', 'Go'], ['Python', 'FastAPI'], ['Go', 'C/C++'], ['Go', 'gRPC'],
      ['FastAPI', 'gRPC'], ['C/C++', 'Java'], ['gRPC', 'MongoDB'], ['MongoDB', 'SQL']],
  },
  infra: {
    at: { Docker: [0, 0], Traefik: [0, 2], 'CI/CD': [2, 2], Caddy: [0, 4], Cloudflare: [2, 6],
      'Linux (Arch, Debian)': [0, 8], AWS: [2, 10], 'Google Cloud': [0, 12] },
    edges: [['Docker', 'Traefik'], ['Docker', 'CI/CD'], ['Traefik', 'Caddy'], ['CI/CD', 'Caddy'],
      ['CI/CD', 'Cloudflare'], ['Caddy', 'Linux (Arch, Debian)'], ['Cloudflare', 'Linux (Arch, Debian)'],
      ['Linux (Arch, Debian)', 'AWS'], ['Linux (Arch, Debian)', 'Google Cloud']],
  },
  frontend: {
    at: { 'Flutter/Dart': [0, 0], HTML: [2, 2], CSS: [0, 4], JavaScript: [2, 6] },
    edges: [['Flutter/Dart', 'HTML'], ['HTML', 'CSS'], ['CSS', 'JavaScript']],
  },
  tooling: {
    at: { Git: [0, 0], Make: [2, 2] },
    edges: [['Git', 'Make']],
  },
};

const GAP = 24;       // between clusters on a row: --gutter
const ROW_GAP = 40;   // between rows of clusters: --s-5
const LABEL_GAP = 8;  // cluster label above its root: --s-1

/* The model: nodes with their cluster, edges in BFS order from each root. */
const nodes = [];
const clusters = [...lattice.querySelectorAll('[data-cluster]')].map((el) => {
  const spec = GRAPH[el.dataset.cluster];
  const byName = new Map();
  for (const btn of el.querySelectorAll('.node')) {
    const name = btn.textContent.trim();
    const [i, j] = spec.at[name];
    const n = { el: btn, li: btn.parentElement, label: btn.querySelector('.node__label'), i, j, x: 0, y: 0, w: 0, h: 0 };
    byName.set(name, n);
    nodes.push(n);
  }
  const root = byName.get(Object.keys(spec.at)[0]);
  const adj = new Map([...byName.values()].map((n) => [n, []]));
  const edges = spec.edges.map(([a, b]) => {
    const e = { from: byName.get(a), to: byName.get(b), first: false, path: null };
    adj.get(e.from).push(e);
    adj.get(e.to).push(e);
    return e;
  });
  // BFS: each edge is emitted once and runs from the node dequeued first, so
  // its draw grows out of the node already on screen; a node grows on the
  // first edge that reaches it.
  const order = [];
  const seen = new Set([root]);
  for (const queue = [root]; queue.length;) {
    const from = queue.shift();
    for (const e of adj.get(from)) {
      if (order.includes(e)) continue;
      if (e.from !== from) [e.from, e.to] = [e.to, e.from];
      e.first = !seen.has(e.to);
      if (e.first) { seen.add(e.to); queue.push(e.to); }
      order.push(e);
    }
  }
  return { el, label: el.querySelector('.cluster__label'), root, edges: order, nodes: [...byName.values()] };
});
const edges = clusters.flatMap((c) => c.edges);
const clusterOf = new Map(clusters.flatMap((c) => c.nodes.map((n) => [n, c])));

let svg = null;
let placed = false;
let played = false;

/* ── Layout ──────────────────────────────────────────────────────────────── */

function place() {
  lattice.classList.add('is-graph');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'lattice__edges');
    svg.setAttribute('aria-hidden', 'true');
    for (const e of edges) {
      e.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      e.path.setAttribute('pathLength', '100');
      svg.append(e.path);
    }
  }
  lattice.prepend(svg);
  placed = true;

  const pitch = window.matchMedia('(min-width: 901px)').matches ? 88 : 62;
  const dx = pitch * Math.cos(Math.PI / 6);
  const dy = pitch / 2;
  // The cluster label starts clear of the branch chain that hangs into the
  // root: half the link's outer diameter (§7.3, 0.044·H) plus a beat of air.
  const clear = 0.022 * window.innerHeight + LABEL_GAP;

  for (const n of nodes) {
    n.li.style.width = '';
    n.w = n.el.offsetWidth;
    n.h = n.el.offsetHeight;
  }

  // Each cluster's box in its own lattice px, root at the origin.
  const box = clusters.map((c) => {
    let x0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of c.nodes) {
      x0 = Math.min(x0, n.i * dx - n.w / 2);
      x1 = Math.max(x1, n.i * dx + n.w / 2);
      y1 = Math.max(y1, n.j * dy + n.h / 2);
    }
    x1 = Math.max(x1, clear + c.label.offsetWidth);
    return { x0, x1, y0: -(c.root.h / 2 + LABEL_GAP + c.label.offsetHeight), y1 };
  });

  // Pack a row of clusters from the left, exactly GAP apart. Each cluster is
  // its own lattice (its edges never leave it): rows share a lattice row J,
  // but x is not snapped — snapping lost up to one step per cluster and kept
  // four across from ever fitting (errata E38).
  const pack = (row, top) => {
    const J = Math.ceil((top - Math.min(...row.map((k) => box[k].y0))) / dy);
    let x = 0;
    const at = row.map((k) => {
      const ox = x - box[k].x0;
      x = ox + box[k].x1 + GAP;
      return [k, ox, J];
    });
    return { at, right: x - GAP, bottom: J * dy + Math.max(...row.map((k) => box[k].y1)) };
  };

  // Four across if it fits, else 2×2 (errata E38); one column only as a guard
  // against a width no arrangement was authored for.
  const width = lattice.clientWidth;
  let rows = [];
  for (const shape of [[[0, 1, 2, 3]], [[0, 1], [2, 3]], [[0], [1], [2], [3]]]) {
    let top = 0;
    rows = shape.map((r) => { const p = pack(r, top); top = p.bottom + ROW_GAP; return p; });
    if (rows.every((p) => p.right <= width)) break;
  }

  for (const { at } of rows) {
    for (const [k, ox, J] of at) {
      const c = clusters[k];
      for (const n of c.nodes) {
        n.x = ox + n.i * dx;
        n.y = (J + n.j) * dy;
        // The li is the rest box; the button centres in it, so a label that
        // tracks out on hover widens both ways and the box's offsets stay the
        // node's (gl/movements.js measures the root through them).
        Object.assign(n.li.style, { left: `${n.x - n.w / 2}px`, top: `${n.y - n.h / 2}px`, width: `${n.w}px` });
      }
      Object.assign(c.label.style, {
        left: `${c.root.x + clear}px`,
        top: `${c.root.y - c.root.h / 2 - LABEL_GAP - c.label.offsetHeight}px`,
      });
    }
  }
  lattice.style.height = `${rows[rows.length - 1].bottom}px`;
  for (const e of edges) e.path.setAttribute('d', `M${e.from.x} ${e.from.y}L${e.to.x} ${e.to.y}`);
}

function unplace() {
  if (!placed) return;
  placed = false;
  lattice.classList.remove('is-graph', 'is-kinetic', 'is-focus');
  lattice.style.height = '';
  for (const n of nodes) n.li.removeAttribute('style');
  for (const c of clusters) c.label.removeAttribute('style');
  svg.remove();
}

/* ── Growth — §9.6, ≈ 13τ ──────────────────────────────────────────────────
   | 0            cluster label   opacity, letter-spacing 0.4em → 0.18em  5τ glyph
   | 0            root            scale 0 → 1 from its centre             3τ chain
   | 3τ + k·0.5τ  edge k (BFS)    stroke-dasharray '0 100' → '100 0'      2τ mask
   | edge done    node            scale 0 → 1 from the edge's start       3τ chain
   | node seated  node label      opacity 0 → 1                           1τ glyph */

function growth() {
  const tl = gsap.timeline({
    scrollTrigger: { trigger: lattice, start: 'top 68%' },
    onStart() { played = true; },
  });
  const seat = (n, from, at) => {
    const origin = from ? `${from.x - n.x + n.w / 2}px ${from.y - n.y + n.h / 2}px` : '50% 50%';
    tl.fromTo(n.el, { scale: 0, transformOrigin: origin }, { scale: 1, duration: 3 * T, ease: ease.chain }, at)
      // Cleared at rest, so the hover's CSS dim can reach the label.
      .fromTo(n.label, { opacity: 0 }, { opacity: 1, duration: T, ease: ease.glyph, clearProps: 'opacity' }, at + 3 * T);
  };
  for (const c of clusters) {
    tl.fromTo(c.label, { opacity: 0, letterSpacing: '0.4em' },
      { opacity: 1, letterSpacing: '0.18em', duration: 5 * T, ease: ease.glyph }, 0);
    seat(c.root, null, 0);
    c.edges.forEach((e, k) => {
      const at = 3 * T + k * 0.5 * T;
      tl.fromTo(e.path, { strokeDasharray: '0 100' },
        { strokeDasharray: '100 0', duration: 2 * T, ease: ease.mask }, at);
      if (e.first) seat(e.to, e.from, at + 2 * T);
    });
  }
  return tl;
}

/* ── Hover and focus — §9.6 ───────────────────────────────────────────────── */

function bindFocus(kinetic) {
  let hover = null;
  let focus = null;
  let active = null;

  const show = () => {
    const n = hover ?? focus;
    if (n === active) return;
    const prev = active;
    active = n;
    const linked = new Set();
    for (const e of edges) {
      const lit = !!n && (e.from === n || e.to === n);
      e.path.classList.toggle('is-lit', lit);
      if (lit) linked.add(e.from === n ? e.to : e.from);
    }
    for (const m of nodes) {
      m.el.classList.toggle('is-active', m === n);
      m.el.classList.toggle('is-linked', linked.has(m));
    }
    lattice.classList.toggle('is-focus', !!n);
    if (n) readout.textContent = clusterOf.get(n).label.textContent.trim();
    else readout.innerHTML = rest;
    if (!kinetic()) return;
    if (prev) gsap.to(prev.el, { scale: 1, duration: 2 * T, ease: ease.chain, overwrite: 'auto' });
    if (n) gsap.to(n.el, { scale: 1.06, transformOrigin: '50% 50%', duration: T, ease: ease.chain, overwrite: 'auto' });
  };

  const node = (t) => nodes.find((m) => m.el === t?.closest?.('.node'));
  const over = (ev) => { hover = node(ev.target) ?? null; show(); };
  const out = (ev) => { if (!node(ev.relatedTarget)) { hover = null; show(); } };
  const fin = (ev) => { focus = node(ev.target) ?? null; show(); };
  const fout = (ev) => { if (!node(ev.relatedTarget)) { focus = null; show(); } };
  const on = [['pointerover', over], ['pointerout', out], ['focusin', fin], ['focusout', fout]];
  on.forEach(([t, f]) => lattice.addEventListener(t, f));

  return () => {
    on.forEach(([t, f]) => lattice.removeEventListener(t, f));
    hover = focus = null;
    show();
    gsap.killTweensOf(nodes.map((n) => n.el));
    gsap.set(nodes.map((n) => n.el), { clearProps: 'scale,transform,transformOrigin' });
  };
}

/* ── Branches ─────────────────────────────────────────────────────────────── */

function build(full) {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 641px)', () => {
    if (tier.value === 'NONE') return undefined;
    place();
    ScrollTrigger.addEventListener('refreshInit', place);

    const kinetic = () => full && tier.value !== 'LOW';
    let tl = !played && kinetic() ? growth() : null;
    const unfocus = bindFocus(kinetic);

    const offTier = tier.subscribe((t) => {
      lattice.classList.toggle('is-kinetic', placed && full && t !== 'LOW');
      // LOW arriving before the growth has played: no growth, rest drawn.
      if (tl && !played && !kinetic()) { tl.scrollTrigger.kill(); tl.progress(1); tl = null; }
      // No stage after all: back to the columns (§6.5's fallback).
      if (t === 'NONE' && placed) {
        tl?.revert();
        tl = null;
        unfocus();
        ScrollTrigger.removeEventListener('refreshInit', place);
        unplace();
        ScrollTrigger.refresh();
      }
    });

    return () => {
      offTier();
      unfocus();
      ScrollTrigger.removeEventListener('refreshInit', place);
      unplace();
    };
  });
}

register({
  name: 'stack',
  desktopFull: () => build(true),
  mobileFull: () => build(true),
  staticStates: () => build(false),
});
