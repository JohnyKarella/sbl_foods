/* ==========================================================================
   SBL JOURNEY — horizontal road with a driving SBL truck
   No dependencies. Works for every .sblj section on the page.

   1. The section pins to the screen; moving down the page slides the road
      sideways, left → right.
   2. The road is built from where the cards actually sit: a right-angled road
      with rounded bends that zig-zags between the cards above and below it.
   3. The truck drives along the road; the road is paved behind it, pins drop,
      cards slide in and the big year in the header updates as it passes.
   4. Rebuilds on resize / rotation / font + image load.
   Reduced-motion visitors get a sideways-swipe road with everything shown.
   ========================================================================== */
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TRUCK_AT = 0.55;   // the truck drives at 55% of the screen width
  let uid = 0;

  function el(name, attrs, parent) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function Journey(section) {
    this.section = section;
    this.sticky = section.querySelector(".sblj__sticky");
    this.track = section.querySelector(".sblj__track");
    this.list = section.querySelector(".sblj__list");
    // The road is drawn by script; the HTML only holds an empty placeholder element.
    let road = section.querySelector(".sblj__road");
    if (road && road.namespaceURI !== "http://www.w3.org/2000/svg") {
      const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgEl.setAttribute("class", road.getAttribute("class"));
      svgEl.setAttribute("aria-hidden", "true"); svgEl.setAttribute("focusable", "false");
      road.replaceWith(svgEl); road = svgEl;
    }
    this.svg = road;
    this.finish = section.querySelector(".sblj__finish");
    this.now = section.querySelector(".sblj__now span");
    this.items = Array.from(section.querySelectorAll(".sblj__item"));
    this.id = "sblj" + (++uid);
    this.shift = 0; this.shiftTarget = 0;   // sideways travel (smoothed / target)
    this.raf = null;
    if (!this.sticky || !this.track || !this.svg || !this.items.length) return;

    section.classList.add("is-enhanced");
    if (reduceMotion) {
      section.classList.add("is-static");
      // wrap the track so it can be swiped sideways
      const vp = document.createElement("div");
      vp.className = "sblj__viewport";
      this.track.parentNode.insertBefore(vp, this.track);
      vp.appendChild(this.track);
    }

    this.build();
    this.onScroll = this.onScroll.bind(this);
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.debounce(() => this.rebuild(), 150));
    window.addEventListener("orientationchange", () => setTimeout(() => this.rebuild(), 300));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.rebuild());
    section.querySelectorAll("img").forEach((img) => { if (!img.complete) img.addEventListener("load", () => this.rebuild(), { once: true }); });
    this.onScroll();
  }

  Journey.prototype.debounce = function (fn, ms) { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };

  /* ---------- Geometry ---------- */
  Journey.prototype.measure = function () {
    const tr = this.track.getBoundingClientRect();
    const W = this.track.scrollWidth, H = tr.height;
    const cs = getComputedStyle(this.section);
    // the road band sits in the middle of the track
    const firstItem = this.items[0].getBoundingClientRect();
    const laneTop = firstItem.bottom - tr.top;
    const laneBottom = this.items.length > 1 ? this.items[1].getBoundingClientRect().top - tr.top : laneTop + 120;
    const lane = Math.max(60, laneBottom - laneTop);
    const small = window.innerWidth < 561;
    const roadW = Math.max(20, Math.min(44, lane * 0.3));

    const pts = this.items.map((item, i) => {
      const yEl = item.querySelector(".sblj__year") || item;
      const r = yEl.getBoundingClientRect();
      const above = i % 2 === 0;
      const x = r.left + r.width / 2 - tr.left;
      const y = laneTop + lane * (above ? 0.3 : 0.7);
      // connector end: plaque edge facing the road
      const ly = above ? r.bottom - tr.top + 6 : r.top - tr.top - 6;
      return { x, y, lx: x, ly, above };
    });
    return { W, H, pts, lane, laneTop, roadW, small };
  };

  // Right-angled road with rounded bends, travelling left → right
  Journey.prototype.pathFor = function (g) {
    const p = g.pts, R = Math.min(40, g.lane * 0.32);
    let d = "M -80 " + p[0].y + " L " + p[0].x + " " + p[0].y;
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dy) < 0.5) { d += " L " + b.x + " " + b.y; continue; }
      const xm = a.x + dx * 0.5;
      const r = Math.max(2, Math.min(R, Math.abs(dy) / 2, dx / 2 - 1));
      const s = dy > 0 ? 1 : -1;
      d += " L " + (xm - r) + " " + a.y +
           " Q " + xm + " " + a.y + " " + xm + " " + (a.y + s * r) +
           " L " + xm + " " + (b.y - s * r) +
           " Q " + xm + " " + b.y + " " + (xm + r) + " " + b.y +
           " L " + b.x + " " + b.y;
    }
    const last = p[p.length - 1];
    this.endX = last.x + Math.min(window.innerWidth * 0.32, 340);
    d += " L " + this.endX + " " + last.y;
    return d;
  };

  /* ---------- Build the SVG ---------- */
  Journey.prototype.build = function () {
    this.track.style.transform = "";
    const g = this.geo = this.measure();
    const svg = this.svg, id = this.id, w = g.roadW;
    svg.innerHTML = "";
    svg.setAttribute("viewBox", "0 0 " + g.W + " " + g.H);
    svg.setAttribute("width", g.W);
    svg.setAttribute("height", g.H);

    const defs = el("defs", {}, svg);
    const pat = el("pattern", { id: id + "-asphalt", width: 48, height: 48, patternUnits: "userSpaceOnUse" }, defs);
    el("rect", { width: 48, height: 48, fill: "#4a4e55" }, pat);
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 70; i++) {
      el("rect", { x: (rnd() * 48).toFixed(1), y: (rnd() * 48).toFixed(1), width: (0.8 + rnd() * 1.6).toFixed(1), height: (0.8 + rnd() * 1.6).toFixed(1),
        fill: rnd() > 0.5 ? "#5d626a" : "#3b3e44", opacity: (0.45 + rnd() * 0.5).toFixed(2) }, pat);
    }
    const d = this.pathFor(g);
    const route = el("path", { id: id + "-route", d: d }, defs);
    const mask = el("mask", { id: id + "-paved", maskUnits: "userSpaceOnUse", x: -200, y: -100, width: g.W + 400, height: g.H + 200 }, defs);
    this.maskPath = el("path", { d: d, fill: "none", stroke: "#fff", "stroke-width": w + 18, "stroke-linecap": "butt", "stroke-linejoin": "round" }, mask);
    const mk = el("marker", { id: id + "-arrow", viewBox: "0 0 10 10", refX: 7, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
    el("path", { d: "M 0 1 L 8 5 L 0 9", fill: "none", stroke: "#a97c22", "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" }, mk);

    const href = "#" + id + "-route";
    el("use", { href: href, class: "sblj__ghost", "stroke-width": Math.max(2, w * 0.12), "stroke-dasharray": "1 " + (w * 0.45).toFixed(1) }, svg);
    const paved = el("g", { mask: "url(#" + id + "-paved)" }, svg);
    el("use", { href: href, class: "sblj__shadow", "stroke-width": w + 10, transform: "translate(0 6)" }, paved);
    el("use", { href: href, class: "sblj__edge", "stroke-width": w }, paved);
    el("use", { href: href, class: "sblj__asphalt", stroke: "url(#" + id + "-asphalt)", "stroke-width": w - Math.max(4, w * 0.14) }, paved);
    el("use", { href: href, class: "sblj__centre", "stroke-width": Math.max(2, w * 0.07), "stroke-dasharray": g.small ? "8 7" : "16 14" }, paved);

    const links = el("g", {}, svg);
    const pins = el("g", {}, svg);
    const pinScale = Math.max(0.6, Math.min(1, w / 40));
    this.marks = g.pts.map((pt, i) => {
      // dashed arrow from the pin to the year plaque
      const sx = pt.x + 14, sy = pt.y + (pt.above ? -(w * 0.5 + 40 * pinScale) : w * 0.5 + 6);
      const ey = pt.ly;
      const link = el("path", { class: "sblj__link", d: "M " + sx + " " + sy + " Q " + (sx + 26) + " " + ((sy + ey) / 2) + " " + (pt.lx + 6) + " " + ey, "marker-end": "url(#" + id + "-arrow)" }, links);
      if (Math.abs(ey - sy) < 10) link.style.display = "none";

      const wrap = el("g", { transform: "translate(" + pt.x + " " + pt.y + ") scale(" + pinScale + ")" }, pins);
      const shadow = el("ellipse", { class: "sblj__pin-shadow", cx: 0, cy: 1, rx: 9, ry: 3.5, fill: "rgba(0,0,0,0.3)" }, wrap);
      const ring = el("circle", { class: "sblj__pin-ring", cx: 0, cy: 0, r: 10, fill: "none", stroke: "#e23b2e", "stroke-width": 2 }, wrap);
      const pin = el("g", { class: "sblj__pin" }, wrap);
      el("path", { d: "M0 0 C -3 -9 -15 -18 -15 -30 A 15 15 0 1 1 15 -30 C 15 -18 3 -9 0 0 Z", fill: "#e23b2e", stroke: "#b8241a", "stroke-width": 1 }, pin);
      el("path", { d: "M -9 -38 A 11 11 0 0 1 4 -42", fill: "none", stroke: "rgba(255,255,255,0.55)", "stroke-width": 2.2, "stroke-linecap": "round" }, pin);
      el("circle", { cx: 0, cy: -30, r: 6.2, fill: "#fff" }, pin);
      const year = (this.items[i].querySelector(".sblj__year") || {}).textContent || "";
      return { pin, shadow, ring, link, len: 0, item: this.items[i], year: year.trim() };
    });

    // Truck, top-down, facing +x
    this.truck = el("g", { class: "sblj__truck" }, svg);
    const t = el("g", { transform: "scale(" + Math.max(0.5, Math.min(1, w / 42)) + ")" }, this.truck);
    el("ellipse", { cx: -2, cy: 3, rx: 34, ry: 14, fill: "rgba(0,0,0,0.25)" }, t);
    el("rect", { x: -32, y: -12, width: 44, height: 24, rx: 3, fill: "#f7f2e6", stroke: "#c9bfa6", "stroke-width": 1 }, t);
    el("rect", { x: -29, y: -9, width: 38, height: 18, rx: 2, fill: "none", stroke: "#e2d8c0", "stroke-width": 1 }, t);
    const txt = el("text", { x: -10, y: 4, "text-anchor": "middle", "font-size": 10, "font-weight": 800, "font-family": "system-ui, sans-serif", fill: "#c8202f" }, t);
    txt.textContent = "SBL";
    el("rect", { x: 13, y: -11, width: 18, height: 22, rx: 5, fill: "#f08a1c", stroke: "#c96a0c", "stroke-width": 1 }, t);
    el("rect", { x: 23, y: -8.5, width: 6, height: 17, rx: 2, fill: "#2f3a44" }, t);
    el("rect", { x: 15, y: -9, width: 6, height: 18, rx: 1.5, fill: "#ffb04d" }, t);
    el("rect", { x: 29.5, y: -10, width: 2.5, height: 4, rx: 1, fill: "#fff7c2" }, t);
    el("rect", { x: 29.5, y: 6, width: 2.5, height: 4, rx: 1, fill: "#fff7c2" }, t);
    el("path", { d: "M 32 -8 L 64 -20 L 64 -2 Z", fill: "rgba(255,240,170,0.28)" }, t);
    el("path", { d: "M 32 8 L 64 2 L 64 20 Z", fill: "rgba(255,240,170,0.28)" }, t);
    [[-26, -13.5], [-26, 13.5], [-12, -13.5], [-12, 13.5], [22, -12.5], [22, 12.5]].forEach(([x, y]) =>
      el("rect", { x: x - 4, y: y - 1.8, width: 8, height: 3.6, rx: 1.4, fill: "#1d1f22" }, t));

    this.route = route;
    this.total = route.getTotalLength();
    this.samples = this.sample();
    this.marks.forEach((m, i) => { m.len = this.lenAtX(g.pts[i].x); });
    if (this.finish) {
      const last = g.pts[g.pts.length - 1];
      const fs = this.finish.offsetWidth || 84;
      this.finish.style.left = (this.endX - fs * 0.35) + "px";   // logo sits on the end of the road
      this.finish.style.top = (last.y - fs / 2) + "px";
    }

    // how far the track must travel sideways
    const vw = this.sticky.clientWidth;
    this.maxShift = Math.max(0, this.endX + 4 - vw * TRUCK_AT);   // truck reaches the logo exactly at the end
    // distance the visitor moves down the page while the stage is pinned
    if (!reduceMotion) this.section.style.height = (this.sticky.offsetHeight + this.maxShift) + "px";
    else { this.shift = this.shiftTarget = 0; }
    this.render();
  };

  Journey.prototype.rebuild = function () {
    const ratio = this.maxShift ? this.shift / this.maxShift : 0;
    this.section.style.height = "";
    this.build();
    this.shift = this.shiftTarget = ratio * this.maxShift;
    this.onScroll();
    this.render();
  };

  // Road only moves rightwards, so "length at a given x" is a quick lookup
  Journey.prototype.sample = function () {
    const out = [], n = Math.max(300, Math.ceil(this.total / 5));
    for (let i = 0; i <= n; i++) { const l = (i / n) * this.total; out.push([l, this.route.getPointAtLength(l).x]); }
    return out;
  };
  Journey.prototype.lenAtX = function (x) {
    const s = this.samples;
    if (x <= s[0][1]) return 0;
    let lo = 0, hi = s.length - 1;
    if (x >= s[hi][1]) return this.total;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (s[mid][1] < x) lo = mid; else hi = mid; }
    const a = s[lo], b = s[hi];
    if (b[1] - a[1] < 0.01) return b[0];      // vertical stretch: drive through it
    return a[0] + (b[0] - a[0]) * ((x - a[1]) / (b[1] - a[1]));
  };

  /* ---------- Page position → sideways travel ---------- */
  Journey.prototype.onScroll = function () {
    if (!this.samples) return;
    if (reduceMotion) { this.render(); return; }
    const r = this.section.getBoundingClientRect();
    const span = Math.max(1, this.section.offsetHeight - this.sticky.offsetHeight);
    const p = Math.max(0, Math.min(1, -r.top / span));
    this.shiftTarget = p * this.maxShift;
    if (!this.raf) this.raf = requestAnimationFrame(() => this.tick());
  };
  Journey.prototype.tick = function () {
    this.raf = null;
    const diff = this.shiftTarget - this.shift;
    this.shift += Math.abs(diff) < 0.4 ? diff : diff * 0.12;   // eased, so the truck accelerates and brakes
    this.render();
    if (Math.abs(this.shiftTarget - this.shift) > 0.3) this.raf = requestAnimationFrame(() => this.tick());
  };

  Journey.prototype.render = function () {
    const total = this.total;
    let L;
    if (reduceMotion) L = total;
    else {
      this.track.style.transform = "translate3d(" + (-this.shift).toFixed(2) + "px,0,0)";
      L = Math.max(0, Math.min(total, this.lenAtX(this.shift + this.sticky.clientWidth * TRUCK_AT)));
    }
    this.maskPath.setAttribute("stroke-dasharray", Math.max(0.001, L) + " " + (total + 10));

    const p = this.route.getPointAtLength(L);
    const q = this.route.getPointAtLength(Math.min(total, L + 3));
    const p0 = this.route.getPointAtLength(Math.max(0, L - 3));
    const ang = Math.atan2(q.y - p0.y, q.x - p0.x) * 180 / Math.PI;
    this.truck.setAttribute("transform", "translate(" + p.x.toFixed(2) + " " + p.y.toFixed(2) + ") rotate(" + ang.toFixed(2) + ")");
    this.truck.style.display = reduceMotion ? "none" : "";

    let latest = null;
    this.marks.forEach((m) => {
      const on = L >= m.len - 2;
      if (on) latest = m;
      if (on === m.on) return;
      m.on = on;
      [m.pin, m.shadow, m.ring, m.link].forEach((n) => n.classList.toggle("is-reached", on));
      m.item.classList.toggle("is-reached", on);
    });
    if (this.finish) this.finish.classList.toggle("is-reached", L >= total - 2);

    // big year in the header
    const yr = latest ? latest.year : (this.marks[0] && this.marks[0].year);
    if (this.now && yr && this.now.textContent !== yr) {
      const host = this.now.parentElement;
      host.classList.add("is-changing");
      this.now.textContent = yr;
      requestAnimationFrame(() => requestAnimationFrame(() => host.classList.remove("is-changing")));
    }
  };

  function init() { document.querySelectorAll(".sblj").forEach((s) => { if (!s._sblj) s._sblj = new Journey(s); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  window.SBLJourney = { init: init };
})();
