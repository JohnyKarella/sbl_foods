/* ==========================================================================
   MAIN — global UI shared by every page
   scroll progress · back-to-top · page transitions · anchor scrolling
   ========================================================================== */
(function () {
  "use strict";

  const SBL = (window.SBL = window.SBL || {});
  const body = document.body;
  const progress = document.querySelector(".scroll-progress");
  const toTop = document.querySelector(".back-to-top");
  const ring = toTop && toTop.querySelector(".ring");

  /* ---------- Scroll progress + back-to-top ---------- */
  let ticking = false;
  function update() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    if (progress) progress.style.transform = "scaleX(" + ratio + ")";
    if (toTop) toTop.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.8);
    if (ring) ring.style.setProperty("--p", ratio.toFixed(4));
    ticking = false;
  }
  window.addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
  window.addEventListener("resize", update);
  update();

  if (toTop) {
    toTop.addEventListener("click", () => {
      if (SBL.lenis) SBL.lenis.scrollTo(0, { duration: 1.4 });
      else window.scrollTo({ top: 0, behavior: SBL.reduceMotion ? "auto" : "smooth" });
      const skip = document.querySelector(".skip-link");
      if (skip) skip.focus({ preventScroll: true });
    });
  }

  /* ---------- In-page anchors (smooth with Lenis) ---------- */
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (SBL.lenis) SBL.lenis.scrollTo(target, { offset: -80 });
    else target.scrollIntoView({ behavior: SBL.reduceMotion ? "auto" : "smooth" });
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });

  /* ---------- Page transitions between internal pages ---------- */
  // Let the entry curtain finish fading before removing its trigger class
  setTimeout(() => document.documentElement.classList.remove("pt-enter"), 900);
  try { sessionStorage.removeItem("sbl-pt"); } catch (err) { /* storage unavailable */ }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || SBL.reduceMotion) return;
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target && a.target !== "_self") return;
    if (a.hasAttribute("download")) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin && location.protocol !== "file:") return;
    if (/^https?:/.test(href) && url.host !== location.host) return;
    if (url.pathname === location.pathname && url.hash) return; // same page anchor
    e.preventDefault();
    try { sessionStorage.setItem("sbl-pt", "1"); } catch (err) { /* ignore */ }
    body.classList.add("is-leaving");
    setTimeout(() => { window.location.href = a.href; }, 380);
  });

  // Restore if the page comes back from the back/forward cache
  window.addEventListener("pageshow", (e) => { if (e.persisted) body.classList.remove("is-leaving"); });

  /* ---------- Current year ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Background videos respect reduced motion & data saver ---------- */
  const saveData = navigator.connection && navigator.connection.saveData;
  document.querySelectorAll("video[data-bg-video]").forEach((v) => {
    if (SBL.reduceMotion || saveData) { v.removeAttribute("autoplay"); v.pause(); return; }
    const play = v.play();
    if (play && play.catch) play.catch(() => {});
    // Pause when offscreen to save battery
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([en]) => { en.isIntersecting ? v.play().catch(() => {}) : v.pause(); }).observe(v);
    }
  });
})();
