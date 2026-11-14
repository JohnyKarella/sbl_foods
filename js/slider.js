/* ==========================================================================
   SLIDER — product carousels (arrows + mouse drag + native touch scroll)
   ========================================================================== */
(function () {
  "use strict";
  const SBL = window.SBL || {};
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Product carousels ---------- */
  function setupCarousel(root) {
    const track = root.querySelector("[data-track]");
    if (!track || track.dataset.ready) return;
    track.dataset.ready = "1";
    const scope = root.closest(".ptabs__panel") || root.parentElement;
    const prev = scope.querySelector("[data-prev]");
    const next = scope.querySelector("[data-next]");
    const step = () => {
      const card = track.firstElementChild;
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 16;
      return card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
    };
    const update = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
    };
    if (prev) prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: reduce ? "auto" : "smooth" }));
    if (next) next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: reduce ? "auto" : "smooth" }));
    track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
    window.addEventListener("resize", update);

    // Mouse drag to scroll (touch uses native scrolling)
    let down = false, startX = 0, startLeft = 0, moved = false;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
    });
    window.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5) { moved = true; track.classList.add("is-dragging"); }
      if (moved) track.scrollLeft = startLeft - dx;
    });
    window.addEventListener("pointerup", () => {
      if (!down) return; down = false;
      track.classList.remove("is-dragging");
      if (moved) { const s = step(); track.scrollTo({ left: Math.round(track.scrollLeft / s) * s, behavior: "smooth" }); }
    });
    track.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    update();
    root._update = update;
  }
  document.querySelectorAll("[data-carousel]").forEach(setupCarousel);
  SBL.setupCarousel = setupCarousel;
})();
