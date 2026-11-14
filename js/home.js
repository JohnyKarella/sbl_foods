/* ==========================================================================
   HOME — scroll choreography
   1  Hero: entrance, mouse-parallax packs, pinned arch → full-screen expand
   2  Statement: words light up as you scroll
   3  Scroll-linked marquee rows
   4  Parallax layers: categories, about, banners, manufacturing, legacy,
      sustainability, future banner, maps
   5  Farm-to-fork pinned horizontal scroll
   6  Why-SBL progress line + active item
   7  Footer: see js/footer.js (live grain wordmark, shared by all pages)
   Heavy pinning runs on large screens only; everything is skipped when the
   visitor prefers reduced motion.
   ========================================================================== */
(function () {
  "use strict";
  const SBL = window.SBL || {};
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  const motion = !!SBL.hasGSAP;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ================= 1. HERO ================= */
  const hero = $("[data-hero-stage]");
  if (hero) {
    // Entrance
    const ready = () => hero.classList.add("is-ready");
    const delay = document.documentElement.classList.contains("pt-enter") ? 450 : 60;
    if (document.readyState === "complete") setTimeout(ready, delay);
    else window.addEventListener("load", () => setTimeout(ready, delay), { once: true });
    setTimeout(ready, 1500);

    // Mouse parallax on packs + seal
    const layers = $$("[data-depth]", hero);
    if (fine && !SBL.reduceMotion) {
      let raf = null, mx = 0, my = 0;
      hero.addEventListener("mousemove", (e) => {
        const r = hero.getBoundingClientRect();
        mx = (e.clientX - r.left) / r.width - 0.5;
        my = (e.clientY - r.top) / r.height - 0.5;
        if (!raf) raf = requestAnimationFrame(() => {
          layers.forEach((l) => { const d = parseFloat(l.dataset.depth) || 1; l.style.translate = (mx * d * -36) + "px " + (my * d * -30) + "px"; });
          raf = null;
        });
      });
      hero.addEventListener("mouseleave", () => layers.forEach((l) => { l.style.translate = "0px 0px"; }));
    }

    // Pinned expansion: arch window grows to fill the screen
    if (motion && gsap.matchMedia) {
      gsap.matchMedia().add("(min-width: 1024px) and (min-height: 640px)", () => {
        const stage = $("[data-hero-window]", hero);
        const win = $(".hero__window", hero);
        const shade = $(".hero__window-shade", hero);
        const text = $("[data-hero-reveal]", hero);
        const left = $$("[data-hero-left]", hero);
        const right = $("[data-hero-right]", hero);
        const packs = $$(".hero__pack", hero);
        const seal = $(".hero__seal", hero);
        const marquee = $(".hero__marquee", hero);
        const headerH = () => (document.querySelector("[data-header]") || {}).offsetHeight || 70;

        setTimeout(() => hero.classList.add("is-expandable"), 1700);
        const w0 = stage.offsetWidth;
        gsap.set(win, { borderRadius: (w0 / 2) + "px " + (w0 / 2) + "px 32px 32px" });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: hero, start: () => "top " + headerH(), end: "+=120%",
            pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
            onToggle: (self) => hero.classList.toggle("is-pinning", self.isActive)
          }
        });
        tl.fromTo(left, { xPercent: 0, autoAlpha: 1 }, { xPercent: -30, autoAlpha: 0, duration: 0.45 }, 0)
          .fromTo(right, { xPercent: 0, autoAlpha: 1 }, { xPercent: 30, autoAlpha: 0, duration: 0.45 }, 0)
          .to(marquee, { autoAlpha: 0, duration: 0.3 }, 0)
          .fromTo(packs, { autoAlpha: 1, scale: 1, x: 0, y: 0, rotation: 0 }, { autoAlpha: 0, scale: 1.6, x: (i) => [-260, -300, 280, 300, 200][i] || 0, y: (i) => [-220, 240, -240, 200, 300][i] || 0, rotation: (i) => [-25, 18, 30, -20, 15][i] || 0, duration: 0.55, stagger: 0.03 }, 0)
          .fromTo(seal, { autoAlpha: 1, y: 0, scale: 1 }, { autoAlpha: 0, y: 160, scale: 0.6, duration: 0.4 }, 0)
          .to(stage, { width: () => hero.offsetWidth, height: () => hero.offsetHeight, top: "50%", duration: 1, ease: "power2.inOut" }, 0.05)
          .to(win, { borderRadius: "0px 0px 0px 0px", outlineOffset: 0, outlineColor: "rgba(199,154,59,0)", duration: 1, ease: "power2.inOut" }, 0.05)
          .to(shade, { opacity: 1, duration: 0.4 }, 0.75)
          .to(text, { autoAlpha: 1, y: 0, duration: 0.35 }, 0.85)
          .to({}, { duration: 0.25 });
        gsap.set(text, { y: 40 });

        return () => { hero.classList.remove("is-expandable"); gsap.set([stage, win, shade, text, left, right, packs, seal, marquee].flat(), { clearProps: "all" }); };
      });
    }
  }

  /* ================= 2. STATEMENT — scroll-scrubbed words ================= */
  const stmt = $("[data-scrub-text]");
  if (stmt) {
    // Wrap text words (keep inline image pills intact)
    Array.from(stmt.childNodes).forEach((node) => {
      if (node.nodeType !== 3) return;
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
        const s = document.createElement("span"); s.className = "sw"; s.textContent = part; frag.appendChild(s);
      });
      node.replaceWith(frag);
    });
    const words = $$(".sw", stmt);
    if (motion) {
      ST.create({
        trigger: stmt, start: "top 80%", end: "bottom 45%", scrub: true,
        onUpdate: (self) => {
          const n = Math.round(self.progress * words.length);
          words.forEach((w, i) => { w.style.opacity = i < n ? 1 : 0.14; });
        }
      });
      gsap.from($$(".statement__pill", stmt), { scale: 0, rotation: -20, duration: 0.8, ease: "back.out(2)", stagger: 0.2, scrollTrigger: { trigger: stmt, start: "top 75%" } });
    } else words.forEach((w) => { w.style.opacity = 1; });
  }

  if (!motion) {
    farmToForkFallback();
    mapPins();
    return;
  }

  /* ================= 3. SCROLL-LINKED MARQUEE ================= */
  $$("[data-velo]").forEach((row) => {
    const dir = parseFloat(row.dataset.velo) || -1;
    gsap.fromTo(row, { xPercent: dir < 0 ? 0 : -35 }, {
      xPercent: dir < 0 ? -35 : 0, ease: "none",
      scrollTrigger: { trigger: row.parentElement, start: "top bottom", end: "bottom top", scrub: 0.6 }
    });
  });

  /* ================= 4. PARALLAX & REVEAL LAYERS ================= */
  // Category tiles: alternate float + circle spin
  $$(".cat").forEach((cat, i) => {
    gsap.fromTo(cat, { y: i % 2 ? 60 : 20 }, { y: i % 2 ? -20 : -40, ease: "none", scrollTrigger: { trigger: ".cats__grid", start: "top bottom", end: "bottom top", scrub: true } });
  });
  // About: second image and sack drift
  gsap.fromTo(".about__img--b", { y: 80 }, { y: -40, ease: "none", scrollTrigger: { trigger: ".about", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.fromTo(".about__badge", { y: -30, x: 30 }, { y: 40, x: 0, ease: "none", scrollTrigger: { trigger: ".about", start: "top bottom", end: "bottom top", scrub: true } });

  // Product cards stagger in each time the section enters
  gsap.from("#ppanel-cereals-pulses .pcard", { y: 60, autoAlpha: 0, stagger: 0.08, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".ptabs", start: "top 80%" } });

  // Banners: art pops & drifts
  $$(".banner").forEach((b) => {
    gsap.fromTo($$(".ba", b), { y: 70, rotation: (i) => [-6, 8, -8][i] || 0 }, { y: -20, rotation: 0, ease: "none", stagger: 0.05, scrollTrigger: { trigger: b, start: "top bottom", end: "bottom top", scrub: true } });
  });

  // Manufacturing: image unveils from the left and settles
  gsap.fromTo(".mfg__media", { clipPath: "inset(0 40% 0 0)" }, { clipPath: "inset(0 0% 0 0)", ease: "none", scrollTrigger: { trigger: ".mfg", start: "top 85%", end: "top 25%", scrub: true } });
  gsap.fromTo(".mfg__float", { y: 80, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".mfg", start: "top 55%" } });

  // Legacy: arch portrait scales up, year cards cascade
  gsap.fromTo(".legacy__frame", { scale: 0.86, rotation: -3 }, { scale: 1, rotation: 0, ease: "none", scrollTrigger: { trigger: ".legacy", start: "top bottom", end: "center center", scrub: true } });

  // Sustainability: field zooms out, panel slides
  gsap.fromTo(".sustain__bg img", { scale: 1.35 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".sustain", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.fromTo(".sustain__badge", { y: 100 }, { y: -30, ease: "none", scrollTrigger: { trigger: ".sustain", start: "top bottom", end: "bottom top", scrub: true } });

  // Maps scale in
  gsap.utils.toArray(".map").forEach((m) => gsap.fromTo(m, { scale: 0.9, autoAlpha: 0.4 }, { scale: 1, autoAlpha: 1, ease: "none", scrollTrigger: { trigger: m, start: "top 95%", end: "top 45%", scrub: true } }));

  // Future banner: image zoom + card rise
  gsap.fromTo(".future__bg", { scale: 1.3 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".future__banner", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.fromTo(".future__card", { y: 120 }, { y: 0, ease: "none", scrollTrigger: { trigger: ".future__banner", start: "top bottom", end: "center center", scrub: true } });

  /* ================= 5. FARM TO FORK ================= */
  const process = $(".process");
  if (process) {
    const pin = $(".process__pin", process), viewport = $(".process__viewport", process), track = $(".process__track", process), bar = $(".process__bar span", process);
    gsap.matchMedia().add("(min-width: 1024px) and (min-height: 640px)", () => {
      process.classList.add("is-pinned");
      const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
      const tween = gsap.to(track, {
        x: () => -distance(), ease: "none",
        scrollTrigger: { trigger: process, pin: pin, start: "top top", end: () => "+=" + distance(), scrub: 0.8, invalidateOnRefresh: true,
          onUpdate: (self) => { if (bar) bar.style.transform = "scaleX(" + Math.max(0.1, self.progress) + ")"; } }
      });
      // each card tilts in as it enters the viewport horizontally
      $$(".step", track).forEach((step) => {
        gsap.fromTo(step, { rotation: 4, y: 40 }, { rotation: 0, y: 0, ease: "none", scrollTrigger: { trigger: step, containerAnimation: tween, start: "left right", end: "left 60%", scrub: true } });
      });
      return () => { tween.scrollTrigger && tween.scrollTrigger.kill(); tween.kill(); gsap.set(track, { x: 0 }); process.classList.remove("is-pinned"); };
    });
    viewport.addEventListener("scroll", () => {
      if (process.classList.contains("is-pinned") || !bar) return;
      const max = viewport.scrollWidth - viewport.clientWidth;
      bar.style.transform = "scaleX(" + Math.max(0.1, max > 0 ? viewport.scrollLeft / max : 0) + ")";
    }, { passive: true });
  }

  /* ================= 6. WHY SBL — progress line + active item ================= */
  const whyList = $(".why__list");
  if (whyList) {
    const line = document.createElement("span");
    line.className = "why__progress"; line.setAttribute("aria-hidden", "true");
    whyList.prepend(line);
    gsap.fromTo(line, { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: whyList, start: "top 60%", end: "bottom 60%", scrub: true } });
    $$(".why__item", whyList).forEach((item) => {
      ST.create({ trigger: item, start: "top 62%", end: "bottom 62%", toggleClass: { targets: item, className: "is-current" } });
    });
  }

  /* 7. Footer animation lives in js/footer.js */
  mapPins();

  window.addEventListener("load", () => ST.refresh());

  /* ---------- helpers ---------- */
  function mapPins() {
    const maps = $$("[data-pins]");
    maps.forEach((m) => $$(".pin", m).forEach((p, i) => { p.style.setProperty("--i", i); p.style.setProperty("--d", (i * 0.3) + "s"); }));
    if ("IntersectionObserver" in window && !SBL.reduceMotion) {
      const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("pins-in"); io.unobserve(e.target); } }), { threshold: 0.3 });
      maps.forEach((m) => io.observe(m));
    } else maps.forEach((m) => m.classList.add("pins-in"));
  }
  function farmToForkFallback() {
    const vp = $(".process__viewport"), bar = $(".process__bar span");
    if (!vp || !bar) return;
    vp.addEventListener("scroll", () => { const max = vp.scrollWidth - vp.clientWidth; bar.style.transform = "scaleX(" + Math.max(0.1, max > 0 ? vp.scrollLeft / max : 0) + ")"; }, { passive: true });
  }
})();
