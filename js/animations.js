/* ==========================================================================
   ANIMATIONS — smooth scroll (Lenis), reveals, split text, counters, parallax
   GSAP + ScrollTrigger drive scroll-linked motion; light reveals use
   IntersectionObserver + CSS transitions for performance.
   Everything is skipped when the visitor prefers reduced motion.
   ========================================================================== */
(function () {
  "use strict";

  const SBL = (window.SBL = window.SBL || {});
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  SBL.reduceMotion = reduce;
  SBL.hasGSAP = hasGSAP && !reduce;

  if (hasGSAP) window.gsap.registerPlugin(window.ScrollTrigger);

  /* ---------- Smooth scrolling ---------- */
  if (!reduce && typeof window.Lenis !== "undefined") {
    const lenis = new window.Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    SBL.lenis = lenis;
    if (hasGSAP) {
      lenis.on("scroll", window.ScrollTrigger.update);
      window.gsap.ticker.add((time) => lenis.raf(time * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  /* ---------- Split headings into masked words ---------- */
  function splitWords(el) {
    if (el.dataset.splitDone) return;
    let w = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const line = document.createElement("span");
            line.className = "split-line";
            const word = document.createElement("span");
            word.className = "split-word";
            word.style.setProperty("--w", w++);
            word.textContent = part;
            line.appendChild(word);
            frag.appendChild(line);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    };
    walk(el);
    el.dataset.splitDone = "1";
  }
  document.querySelectorAll("[data-split]").forEach(splitWords);

  /* ---------- Stagger index for children ---------- */
  document.querySelectorAll("[data-stagger]").forEach((group) => {
    Array.from(group.children).forEach((child, i) => child.style.setProperty("--i", i));
  });

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll("[data-reveal], [data-stagger], [data-split]");
  if (reduce || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-in"));
  } else {
    // Clip-path reveals start fully clipped, and IntersectionObserver treats a
    // fully clipped element as invisible — so those are watched via their parent.
    const targets = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (targets.get(entry.target) || [entry.target]).forEach((el) => el.classList.add("is-in"));
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealEls.forEach((el) => {
      if (el.hasAttribute("data-manual")) return;
      const isClip = /^clip/.test(el.getAttribute("data-reveal") || "");
      const watch = isClip && el.parentElement ? el.parentElement : el;
      if (!targets.has(watch)) targets.set(watch, []);
      targets.get(watch).push(el);
      io.observe(watch);
    });
  }

  /* ---------- Animated counters ---------- */
  const fmt = (n) => Math.round(n).toLocaleString("en-IN");
  function runCounter(el) {
    const target = parseFloat(el.dataset.count);
    if (reduce) { el.textContent = fmt(target); return; }
    const dur = parseFloat(el.dataset.duration || 2000);
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = fmt(target * eased);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    if (!("IntersectionObserver" in window)) counters.forEach(runCounter);
    else {
      const cio = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); } });
      }, { threshold: 0.5 });
      counters.forEach((el) => cio.observe(el));
    }
  }

  /* ---------- Parallax images ---------- */
  if (SBL.hasGSAP) {
    document.querySelectorAll("[data-parallax]").forEach((wrap) => {
      const img = wrap.querySelector("img, video");
      if (!img) return;
      const amt = parseFloat(wrap.dataset.parallax) || 12;
      window.gsap.fromTo(img, { yPercent: -amt / 2 }, {
        yPercent: amt / 2, ease: "none",
        scrollTrigger: { trigger: wrap, start: "top bottom", end: "bottom top", scrub: true }
      });
    });
    document.querySelectorAll("[data-float]").forEach((el) => {
      const amt = parseFloat(el.dataset.float) || 60;
      window.gsap.fromTo(el, { y: amt / 2 }, {
        y: -amt / 2, ease: "none",
        scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: true }
      });
    });
  }

  // Recalculate positions once images/fonts are in
  window.addEventListener("load", () => { if (hasGSAP) window.ScrollTrigger.refresh(); });
})();
