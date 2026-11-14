/* ==========================================================================
   CONTACT FORM — client-side validation, then opens the visitor's email app
   with the enquiry ready to send. Nothing is submitted to a server, so the
   status message says exactly that.
   ========================================================================== */
(function () {
  "use strict";
  const form = document.querySelector("[data-cform]");
  if (!form) return;
  const TO = "sbaf@sblfoods.com";
  const status = form.querySelector(".cform__status");
  const f = (id) => document.getElementById(id);
  const fields = {
    name: { el: f("f-name"), err: f("e-name"), test: (v) => v.length >= 2 || "Please enter your name." },
    email: { el: f("f-email"), err: f("e-email"), test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || "Please enter a valid email address." },
    phone: { el: f("f-phone"), err: f("e-phone"), test: (v) => v.replace(/\D/g, "").length >= 7 || "Please enter a valid phone number." },
    type: { el: f("f-type"), err: f("e-type"), test: (v) => !!v || "Please choose an enquiry type." },
    msg: { el: f("f-msg"), err: f("e-msg"), test: (v) => v.length >= 10 || "Please tell us a little more (at least 10 characters)." },
  };

  /* Prefill from links such as contact.html?enquiry=bulk&product=Toor+Dal */
  const params = new URLSearchParams(location.search);
  const TYPES = { product: "Product enquiry", bulk: "Bulk / trade pricing", distributor: "Become a distributor", partnership: "Business partnership", horeca: "HoReCa supply", institutional: "Institutional supply", export: "Export enquiry" };
  const t = TYPES[params.get("enquiry")];
  if (t && fields.type.el) fields.type.el.value = t;
  const product = params.get("product");
  if (product && fields.msg.el && !fields.msg.el.value) fields.msg.el.value = "I would like to know more about: " + product.replace(/\+/g, " ") + ".\n\n";

  function check(key) {
    const fd = fields[key];
    if (!fd.el) return true;
    const res = fd.test(fd.el.value.trim());
    const ok = res === true;
    fd.el.closest(".field").classList.toggle("is-invalid", !ok);
    fd.el.setAttribute("aria-invalid", String(!ok));
    if (fd.err) { fd.err.textContent = ok ? "" : res; fd.el.setAttribute("aria-describedby", fd.err.id); }
    return ok;
  }
  Object.keys(fields).forEach((k) => {
    const el = fields[k].el;
    if (!el) return;
    el.addEventListener("blur", () => { if (el.value) check(k); });
    el.addEventListener("input", () => { if (el.closest(".field").classList.contains("is-invalid")) check(k); });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const bad = Object.keys(fields).filter((k) => !check(k));
    if (bad.length) {
      fields[bad[0]].el.focus();
      show(true, "<h3 class=\"h4\">Please check the highlighted fields</h3><p>" + bad.length + " field" + (bad.length > 1 ? "s need" : " needs") + " your attention.</p>");
      return;
    }
    const v = (id) => (f(id) ? f(id).value.trim() : "");
    const subject = "Website enquiry: " + v("f-type") + " — " + v("f-name");
    const body = [
      "Name: " + v("f-name"),
      v("f-company") ? "Company: " + v("f-company") : "",
      "Email: " + v("f-email"),
      "Phone: " + v("f-phone"),
      "Enquiry type: " + v("f-type"),
      "",
      v("f-msg"),
    ].filter((l, i) => l !== "" || i === 5).join("\n");
    const href = "mailto:" + TO + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    window.location.href = href;
    show(false,
      "<h3 class=\"h4\">Your email app should now open</h3>" +
      "<p>Your enquiry is ready to send to <strong>" + TO + "</strong>. It has not been sent yet — please press send in your email app.</p>" +
      "<div class=\"btn-row\"><a class=\"btn btn--sm\" href=\"" + href.replace(/"/g, "&quot;") + "\">Open email again</a>" +
      "<a class=\"btn btn--ghost btn--sm\" href=\"tel:+918026741561\">Or call +91-80-26741561</a></div>");
  });

  function show(isError, html) {
    if (!status) return;
    status.hidden = false;
    status.classList.toggle("is-error", isError);
    status.innerHTML = html;
  }
})();
