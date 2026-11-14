/* ==========================================================================
   NAVIGATION — sticky header state, active menu item, dropdowns,
   mega menu (touch + keyboard), mobile drawer
   All menu text and links live in the HTML; this file only adds behaviour.
   ========================================================================== */
(function () {
  "use strict";

  const header = document.querySelector("[data-header]");
  if (!header) return;
  const body = document.body;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");

  /* ---------- Active section (from <body data-section="...">) ---------- */
  const section = body.dataset.section;
  const page = body.dataset.page;
  document.querySelectorAll('[data-nav="' + section + '"]').forEach((li) => li.classList.add("is-active"));
  // Mark the exact current page link inside menus
  const here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".dd a, .mega a, .drawer__sub a").forEach((a) => {
    const file = (a.getAttribute("href") || "").split("/").pop().split("#")[0];
    if (file && file === here && !a.getAttribute("href").includes("#")) { a.classList.add("is-current"); a.setAttribute("aria-current", "page"); }
  });
  if (page === "home") {
    const home = document.querySelector('.nav__item[data-nav="home"] > .nav__link');
    if (home) home.setAttribute("aria-current", "page");
  }

  /* ---------- Sticky state ---------- */
  const sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;height:1px;width:1px;";
  header.before(sentinel);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => header.classList.toggle("is-stuck", !en.isIntersecting), { rootMargin: "-1px 0px 0px 0px" }).observe(sentinel);
  }
  // Fallback for the topbar height offset
  window.addEventListener("scroll", () => header.classList.toggle("is-stuck", window.scrollY > (document.querySelector(".topbar")?.offsetHeight || 0)), { passive: true });

  /* ---------- Dropdowns & mega menu ---------- */
  const items = header.querySelectorAll(".nav__item .dd, .nav__item .mega");
  const parents = Array.from(items).map((panel) => panel.parentElement);
  function closeAll(except) {
    parents.forEach((li) => {
      if (li === except) return;
      li.classList.remove("is-open");
      li.querySelector(".nav__link").setAttribute("aria-expanded", "false");
    });
  }
  parents.forEach((li) => {
    const link = li.querySelector(".nav__link");
    link.addEventListener("click", (e) => {
      // Touch / no-hover: first tap opens, second tap follows the link
      if (canHover.matches) return;
      if (!li.classList.contains("is-open")) { e.preventDefault(); closeAll(li); li.classList.add("is-open"); link.setAttribute("aria-expanded", "true"); }
    });
    li.addEventListener("mouseenter", () => { if (canHover.matches) link.setAttribute("aria-expanded", "true"); });
    li.addEventListener("mouseleave", () => { if (canHover.matches) { link.setAttribute("aria-expanded", "false"); li.classList.remove("is-open"); } });
    link.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault(); li.classList.add("is-open"); link.setAttribute("aria-expanded", "true");
        const first = li.querySelector(".dd a, .mega a:not([tabindex='-1'])"); if (first) first.focus();
      }
    });
    li.addEventListener("focusout", (e) => { if (!li.contains(e.relatedTarget)) { li.classList.remove("is-open"); link.setAttribute("aria-expanded", "false"); } });
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".nav__item")) closeAll(); });

  /* ---------- Mobile drawer ---------- */
  const drawer = document.getElementById("drawer");
  const burger = header.querySelector(".burger");
  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    burger.setAttribute("aria-expanded", String(open));
    body.classList.toggle("no-scroll", open);
    if (window.SBL && window.SBL.lenis) open ? window.SBL.lenis.stop() : window.SBL.lenis.start();
    if (open) setTimeout(() => drawer.querySelector(".drawer__close").focus(), 350);
    else burger.focus({ preventScroll: true });
  }
  if (burger) burger.addEventListener("click", () => setDrawer(true));
  if (drawer) {
    drawer.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => setDrawer(false)));
    drawer.querySelectorAll(".drawer__toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sub = document.getElementById(btn.getAttribute("aria-controls"));
        const open = btn.getAttribute("aria-expanded") !== "true";
        btn.setAttribute("aria-expanded", String(open));
        sub.classList.toggle("is-open", open);
      });
    });
    // Auto-expand the current section in the drawer
    const activeToggle = drawer.querySelector("li.is-active .drawer__toggle");
    if (activeToggle && section !== "home") activeToggle.click();
    // Focus trap
    drawer.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const f = Array.from(drawer.querySelectorAll("a, button")).filter((el) => el.offsetParent !== null);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (drawer && drawer.classList.contains("is-open")) setDrawer(false);
    const open = header.querySelector(".nav__item.is-open");
    if (open) { closeAll(); open.querySelector(".nav__link").focus(); }
  });
  window.matchMedia("(min-width: 1200px)").addEventListener("change", (mq) => { if (mq.matches) setDrawer(false); });
})();
