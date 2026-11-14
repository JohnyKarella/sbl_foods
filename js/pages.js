/* ==========================================================================
   INNER PAGES — behaviour only (all content lives in the HTML)
   Works without GSAP and respects prefers-reduced-motion.
   ========================================================================== */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasIO = "IntersectionObserver" in window;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* Run something once an element enters the viewport */
  function onView(el, fn, threshold) {
    if (!el) return;
    if (!hasIO || reduce) { fn(el); return; }
    const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { fn(e.target); io.unobserve(e.target); } }), { threshold: threshold == null ? 0.25 : threshold });
    io.observe(el);
  }
  /* Scroll-progress helper: 0 when el top hits `start` (fraction of vh), 1 when bottom hits `end` */
  const scrollers = [];
  function onScrollProgress(el, fn, start, end) {
    if (!el) return;
    scrollers.push({ el, fn, start: start == null ? 0.8 : start, end: end == null ? 0.4 : end });
  }
  let ticking = false;
  function runScrollers() {
    ticking = false;
    const vh = window.innerHeight;
    scrollers.forEach((s) => {
      const r = s.el.getBoundingClientRect();
      const from = r.top - vh * s.start;          // px until progress starts
      const span = r.height + vh * (s.start - s.end);
      s.fn(clamp(-from / Math.max(1, span), 0, 1));
    });
  }
  function requestRun() { if (!ticking) { ticking = true; requestAnimationFrame(runScrollers); } }
  window.addEventListener("scroll", requestRun, { passive: true });
  window.addEventListener("resize", requestRun);

  /* ================= Hero entrance + pointer depth ================= */
  const hero = $("[data-phero]");
  if (hero) {
    const ready = () => hero.classList.add("is-ready");
    if (document.readyState === "complete") requestAnimationFrame(ready);
    else window.addEventListener("load", ready);
    setTimeout(ready, 900); // never leave the hero hidden
    if (fine && !reduce) {
      const layers = $$("[data-depth]", hero);
      hero.addEventListener("mousemove", (e) => {
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        layers.forEach((l) => { const d = parseFloat(l.dataset.depth) || 10; l.style.translate = (x * d).toFixed(1) + "px " + (y * d).toFixed(1) + "px"; });
      });
      hero.addEventListener("mouseleave", () => layers.forEach((l) => (l.style.translate = "")));
    }
  }

  /* ================= Chapter bar: keep the current chapter in view ================= */
  const cur = $(".chapters__link.is-current");
  if (cur) { const list = cur.parentElement; list.scrollLeft = cur.offsetLeft - (list.clientWidth - cur.offsetWidth) / 2; }

  /* ================= Statement: words light up while scrolling ================= */
  $$("[data-scrub-text]").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = words.map((w) => '<span class="sw" aria-hidden="true">' + w + "</span>").join(" ");
    const spans = $$(".sw", el);
    if (reduce) { spans.forEach((s) => (s.style.opacity = 1)); return; }
    onScrollProgress(el, (p) => {
      const lit = p * spans.length * 1.15;
      spans.forEach((s, i) => (s.style.opacity = clamp(lit - i, 0.14, 1)));
    }, 0.85, 0.35);
  });

  /* ================= Filter chips (+ optional search) ================= */
  $$("[data-filter-group]").forEach((group) => {
    const key = group.dataset.filterGroup;
    const target = $('[data-filter-target="' + key + '"]');
    if (!target) return;
    const items = Array.from(target.children);
    const finder = group.closest("[data-finder]");
    const search = finder && $("[data-search]", finder);
    const countOut = finder && $("[data-count-out]", finder);
    const empty = finder && $("[data-empty]", finder);
    const chips = $$("[data-filter]", group);
    let filter = "all";

    function apply(animate) {
      const q = search ? search.value.trim().toLowerCase() : "";
      let shown = 0;
      items.forEach((it) => {
        const g = it.dataset.group || it.dataset.cat || "";
        const name = (it.dataset.name || it.textContent).toLowerCase();
        const ok = (filter === "all" || g === filter) && (!q || name.indexOf(q) !== -1);
        const was = !it.classList.contains("is-hidden");
        it.classList.toggle("is-hidden", !ok);
        if (ok) {
          shown++;
          if (animate && !reduce && !was) { it.classList.remove("is-filtering-in"); void it.offsetWidth; it.classList.add("is-filtering-in"); }
          it.classList.add("is-in"); // make sure revealed cards are visible
        }
      });
      if (countOut) countOut.textContent = shown;
      if (empty) empty.hidden = shown !== 0;
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }
    chips.forEach((c) => c.addEventListener("click", () => {
      filter = c.dataset.filter;
      chips.forEach((x) => { const on = x === c; x.classList.toggle("is-on", on); x.setAttribute("aria-pressed", String(on)); });
      apply(true);
    }));
    if (search) {
      search.addEventListener("input", () => apply(true));
      const q = new URLSearchParams(location.search).get("q");
      if (q) search.value = q;
    }
    const pre = new URLSearchParams(location.search).get("cat");
    const preChip = pre && chips.find((c) => c.dataset.filter === pre);
    if (preChip) preChip.click(); else apply(false);
  });

  /* ================= Dialogs (leadership profiles) ================= */
  $$("[data-dialog]").forEach((btn) => {
    const dlg = document.getElementById(btn.dataset.dialog);
    if (!dlg) return;
    btn.addEventListener("click", () => {
      if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
      document.documentElement.classList.add("has-dialog");
    });
  });
  $$("dialog").forEach((dlg) => {
    dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-close-dialog]")) close(dlg); });
    dlg.addEventListener("close", () => document.documentElement.classList.remove("has-dialog"));
  });
  function close(dlg) { if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open"); }

  /* ================= Lightbox (operations gallery) ================= */
  const lb = $("#lightbox");
  if (lb) {
    const img = $("img", lb), cap = $(".lightbox__cap", lb);
    $$("[data-lightbox]").forEach((b) => b.addEventListener("click", () => {
      img.src = b.dataset.lightbox; img.alt = b.dataset.caption || ""; cap.textContent = b.dataset.caption || "";
      if (typeof lb.showModal === "function") lb.showModal(); else lb.setAttribute("open", "");
    }));
  }

  /* ================= Orbit (group ecosystem) ================= */
  const orbit = $("[data-orbit]");
  if (orbit) {
    const nodes = $$(".orbit__node", orbit);
    const infos = $$("[data-info]");
    nodes.forEach((n, i) => n.style.setProperty("--n", i));
    onView(orbit, (o) => o.classList.add("is-in"), 0.3);
    const show = (id) => {
      infos.forEach((p) => (p.hidden = p.dataset.info !== id));
      nodes.forEach((n) => n.setAttribute("aria-pressed", String(n.dataset.node === id)));
    };
    nodes.forEach((n) => n.addEventListener("click", () => {
      const on = n.getAttribute("aria-pressed") === "true";
      show(on ? "intro" : n.dataset.node);
      const panel = $("#orbit-panel");
      if (!on && panel && window.innerWidth < 1025) panel.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    }));
  }

  /* ================= Value flow + chart bars + dials ================= */
  $$("[data-flow]").forEach((f) => { $$("li", f).forEach((li, i) => li.style.setProperty("--i", i)); onView(f, (x) => x.classList.add("is-in"), 0.2); });
  $$("[data-chart]").forEach((c) => { $$(".bar", c).forEach((b, i) => b.style.setProperty("--i", i)); onView(c, (x) => x.classList.add("is-in"), 0.3); });
  $$(".dial__ring").forEach((d) => onView(d, (el) => {
    if (reduce) { el.style.setProperty("--p", 1); return; }
    const t0 = performance.now();
    const step = (t) => { const k = clamp((t - t0) / 1600, 0, 1); el.style.setProperty("--p", (1 - Math.pow(1 - k, 3)).toFixed(3)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, 0.4));

  /* ================= Horizontal accordion (sustainability) ================= */
  $$("[data-acc]").forEach((acc) => {
    const panels = $$(".acc__panel", acc);
    panels.forEach((p) => {
      const btn = $(".acc__btn", p);
      const open = () => panels.forEach((x) => { const on = x === p; x.classList.toggle("is-open", on); $(".acc__btn", x).setAttribute("aria-expanded", String(on)); });
      btn.addEventListener("click", open);
      if (fine) p.addEventListener("mouseenter", open);
    });
  });

  /* ================= Tabs (states on the markets page) ================= */
  $$("[data-tabs]").forEach((root) => {
    const tabs = $$('[role="tab"]', root);
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1;
        const p = document.getElementById(t.getAttribute("aria-controls")); if (p) p.hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t, false));
      t.addEventListener("keydown", (e) => {
        const map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
        if (!(e.key in map)) return;
        e.preventDefault(); select(tabs[(map[e.key] + tabs.length) % tabs.length], true);
      });
    });
  });

  /* ================= Map pins ================= */
  $$("[data-pins]").forEach((m) => {
    $$(".pin", m).forEach((p, i) => { p.style.setProperty("--i", i); p.style.setProperty("--d", i * 0.3 + "s"); });
    onView(m, (x) => x.classList.add("pins-in"), 0.3);
  });

  /* ================= Distribution route: truck drives the loop as you scroll ================= */
  const route = $("[data-route]");
  if (route) {
    // Same points as images/brand/route-line.svg (percent of the map box)
    const pts = [[33, 71.5], [26.5, 62], [37, 57.5], [42, 71], [30, 78], [33, 71.5]];
    const truck = $(".route__truck", route);
    const place = (p) => {
      const w = route.clientWidth, h = route.clientHeight;
      const px = pts.map(([x, y]) => [x / 100 * w, y / 100 * h]);
      const segs = []; let total = 0;
      for (let i = 1; i < px.length; i++) { const l = Math.hypot(px[i][0] - px[i - 1][0], px[i][1] - px[i - 1][1]); segs.push(l); total += l; }
      let d = p * total, i = 0;
      while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; }
      const a = px[i], b = px[i + 1], k = segs[i] ? d / segs[i] : 0;
      const x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
      truck.style.left = x + "px"; truck.style.top = y + "px"; truck.style.rotate = ang.toFixed(1) + "deg";
    };
    place(0.02);
    if (!reduce) onScrollProgress(route, (p) => place(0.02 + p * 0.96), 0.9, 0.2);
    window.addEventListener("resize", () => runScrollers());
  }

  /* ================= Founder story: progress + chapter index ================= */
  const storyBody = $(".story__body");
  if (storyBody) {
    const bar = $(".story__progress span");
    onScrollProgress(storyBody, (p) => bar && bar.style.setProperty("--p", p.toFixed(3)), 0.6, 0.6);
    const links = $$(".story__index a");
    if (hasIO && links.length) {
      const io = new IntersectionObserver((en) => en.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("is-on", a.getAttribute("href") === "#" + e.target.id));
      }), { rootMargin: "-45% 0px -50% 0px" });
      $$(".story__ch[id]").forEach((c) => io.observe(c));
    }
  }

  /* ================= Quality pipeline: test tube fills, active step ================= */
  const pipe = $("[data-pipe]");
  if (pipe) {
    const tube = $(".tube");
    const steps = $$(".pipe__step", pipe);
    onScrollProgress(pipe, (p) => {
      if (tube) tube.style.setProperty("--p", p.toFixed(3));
      const idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
      steps.forEach((s, i) => s.classList.toggle("is-current", i === idx));
    }, 0.7, 0.5);
  }

  /* ================= Category jump bar: highlight the visible group ================= */
  const gj = $(".gjump");
  if (gj && hasIO) {
    const links = $$("a", gj);
    const io = new IntersectionObserver((en) => en.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => {
        const on = a.getAttribute("href") === "#" + e.target.id;
        a.classList.toggle("is-on", on);
        if (on) gj.scrollTo({ left: a.offsetLeft - (gj.clientWidth - a.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
      });
    }), { rootMargin: "-35% 0px -60% 0px" });
    $$(".pgroup[id]").forEach((g) => io.observe(g));
  }

  requestRun();
  window.addEventListener("load", requestRun);
})();
