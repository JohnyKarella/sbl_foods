/* ==========================================================================
   FOOTER
   1. Giant "SBL FOODS" wordmark rises letter by letter (GSAP scrub, or a
      CSS fallback), packs float up beside it — the original design.
   2. Living background: drifting aurora light (CSS), orbiting rings (CSS),
      a soft light that follows the pointer, and real-time drifting grains
      (canvas particles with depth, sway and pointer repulsion).
   3. Phones: link groups fold into tap-to-open rows.
   Everything pauses off-screen and respects prefers-reduced-motion.
   ========================================================================== */

/* ---------- 1. Rising wordmark ---------- */
(function () {
  "use strict";
  const word = document.querySelector("[data-footer-word]");
  if (!word) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;
  const letters = Array.from(word.querySelectorAll("span:not(.footer__word-gap)"));
  const packs = word.querySelectorAll(".footer__word-pack");
  const run = () => {
    const gsap = window.gsap, ST = window.ScrollTrigger;
    if (gsap && ST) {
      gsap.registerPlugin(ST);
      gsap.fromTo(letters, { yPercent: 110 }, { yPercent: 0, ease: "power2.out", stagger: 0.06, scrollTrigger: { trigger: word, start: "top 95%", end: "bottom bottom", scrub: 0.8 } });
      gsap.fromTo(packs, { y: 160, rotation: 0, autoAlpha: 0 }, { y: 0, rotation: (i) => (i ? 12 : -10), autoAlpha: 1, ease: "none", stagger: 0.1, scrollTrigger: { trigger: word, start: "top 90%", end: "bottom bottom", scrub: true } });
      window.addEventListener("load", () => ST.refresh());
      return;
    }
    if (!("IntersectionObserver" in window)) return;
    letters.forEach((l, i) => l.style.setProperty("--i", i));
    word.classList.add("is-pending");
    const io = new IntersectionObserver((en) => en.forEach((e) => {
      if (e.isIntersecting) { word.classList.add("is-risen"); io.disconnect(); }
    }), { threshold: 0.3 });
    io.observe(word);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();

/* ---------- 2. Living background ---------- */
(function () {
  "use strict";
  const bg = document.querySelector("[data-footer-bg]");
  if (!bg) return;
  const card = bg.parentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (reduce) return;

  // Soft light following the pointer
  let mx = -9999, my = -9999;
  if (fine) {
    const spot = bg.querySelector(".footer__spot");
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
      if (spot) { spot.style.setProperty("--mx", mx + "px"); spot.style.setProperty("--my", my + "px"); }
      card.classList.add("is-lit");
    });
    card.addEventListener("pointerleave", () => { card.classList.remove("is-lit"); mx = my = -9999; });
  }

  // Drifting grains
  const cv = document.createElement("canvas");
  cv.className = "footer__dust";
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  bg.appendChild(cv);
  const COLS = ["#e3a92f", "#f0e7d2", "#7ea246", "#d4683a", "#8a5a40", "#d8b27a", "#e8cf8f", "#d7a95b"];
  let W = 0, H = 0, dpr = 1, parts = [], raf = 0, visible = false, last = 0;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = card.clientWidth; H = card.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const n = Math.round(Math.min(90, Math.max(28, W * H / 16000)));
    parts = [];
    for (let i = 0; i < n; i++) parts.push(make(true));
  }
  function make(anywhere) {
    const z = 0.35 + Math.random() * 0.65; // depth: nearer grains are bigger, faster, brighter
    return {
      x: Math.random() * W, y: anywhere ? Math.random() * H : H + 10,
      z, len: (2.2 + Math.random() * 2.8) * (0.6 + z), wid: 0, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.02,
      vy: -(0.12 + Math.random() * 0.3) * z, ph: Math.random() * Math.PI * 2, sw: 0.25 + Math.random() * 0.5,
      ox: 0, oy: 0, c: COLS[(Math.random() * COLS.length) | 0], a: 0.25 + z * 0.5,
    };
  }
  function tick(t) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min(3, last ? (t - last) / 16.7 : 1); last = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.ph += 0.012 * dt;
      p.y += p.vy * dt;
      p.x += Math.sin(p.ph) * p.sw * 0.3 * dt;
      p.rot += p.vr * dt;
      // pointer pushes nearby grains away (eases back afterwards)
      const dx = p.x + p.ox - mx, dy = p.y + p.oy - my, d2 = dx * dx + dy * dy;
      if (d2 < 14400) { const d = Math.sqrt(d2) || 1, f = (1 - d / 120) * 2.2 * p.z; p.ox += dx / d * f * dt; p.oy += dy / d * f * dt; }
      p.ox *= 0.94; p.oy *= 0.94;
      if (p.y < -12) Object.assign(p, make(false));
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      const fade = Math.min(1, (H - p.y) / 120, (p.y + 12) / 160);
      ctx.save();
      ctx.translate(p.x + p.ox, p.y + p.oy); ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.a * fade);
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.ellipse(0, 0, p.len, p.len * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha *= 0.55; ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.ellipse(-p.len * 0.3, -p.len * 0.18, p.len * 0.35, p.len * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    raf = requestAnimationFrame(tick);
  }
  size();
  let rt = 0, lastW = W;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (card.clientWidth !== lastW || Math.abs(card.clientHeight - H) > 40) { lastW = card.clientWidth; size(); } }, 200); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((en) => en.forEach((e) => {
      visible = e.isIntersecting;
      if (visible) { if (card.clientHeight !== H) size(); last = 0; if (!raf) raf = requestAnimationFrame(tick); }
    })).observe(card);
  } else { visible = true; raf = requestAnimationFrame(tick); }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && visible && !raf) { last = 0; raf = requestAnimationFrame(tick); } });
})();

/* ---------- Phones: link groups fold into tap-to-open rows ---------- */
(function () {
  "use strict";
  const footer = document.querySelector("[data-footer]");
  if (!footer) return;
  const navs = Array.from(footer.querySelectorAll(".footer__grid > nav.footer__col"));
  const mq = window.matchMedia("(max-width: 680px)");
  footer.classList.add("footer--fold");
  const btns = navs.map((nav, i) => {
    const h = nav.querySelector("h3"), ul = nav.querySelector("ul");
    if (!h || !ul) return null;
    if (!ul.id) ul.id = "footer-links-" + i;
    const b = document.createElement("button");
    b.type = "button"; b.className = "footer__fold-btn"; b.textContent = h.textContent;
    b.setAttribute("aria-controls", ul.id);
    h.textContent = ""; h.appendChild(b);
    b.addEventListener("click", () => {
      if (!mq.matches) return;
      const open = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      b.setAttribute("aria-expanded", String(open));
    });
    return b;
  });
  const sync = () => btns.forEach((b, i) => {
    if (!b) return;
    if (mq.matches) { b.removeAttribute("tabindex"); b.setAttribute("aria-expanded", String(navs[i].classList.contains("is-open"))); }
    else { b.setAttribute("tabindex", "-1"); b.removeAttribute("aria-expanded"); }
  });
  sync();
  if (mq.addEventListener) mq.addEventListener("change", sync); else if (mq.addListener) mq.addListener(sync);
})();
