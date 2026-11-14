# SBL Foods — Corporate Website (v6 · Homepage + 22 inner pages)

Plain HTML, CSS and vanilla JavaScript. No build step, no frameworks.
Open `index.html`, or serve the folder: `python3 -m http.server 8000`
(serving is recommended so videos, dialogs and fonts behave exactly as online).

## Editing rule
All text, links and images live in the HTML. JS files only add behaviour.
There is **no inline SVG code** in any page: every icon and graphic is an image file
(`assets/icons/*.svg`, `assets/images/brand/*.svg`, `.webp` photos) loaded with `<img>`.
The header, drawer and footer are identical on every page; inner pages use `../` paths and
`<body data-section="…">` to highlight the right menu item.

## Pages (`/pages`)
| Section | Pages |
|---|---|
| About Us | about, founder, leadership, journey |
| Our Group | group (interactive orbit), companies (filterable dossiers) |
| Capabilities | capabilities (dials, sales chart, photo lightbox), quality (lab pipeline) |
| Products | products (110-product finder with search + filters) and 6 category pages: cereals-pulses, flour-rice-flakes, suji, rice, spices-millets, snacks-sweets-dairy |
| Sustainability | sustainability (farmer impact, SBL Farms accordion, green footprint) |
| Our Network | distribution (fleet route truck), markets (India state tabs + global map), clients |
| Other | future-vision, contact, privacy-policy |

Every inner page has a sticky chapter bar for its section and a full-width "Next chapter" link,
so the whole site can be read in sequence.

## Files
- css/style.css — design tokens, buttons, cards, chips, image-icon helpers (`.ico`)
- css/header.css, css/footer.css, css/animations.css, css/responsive.css, css/home.css (homepage only)
- css/pages.css — all inner-page components (hero arch, chapter bar, stack cards, bento, orbit, chart, finder, accordion, form, …)
- css/journey.css + js/journey.js — the horizontal "SBL Journey" road (journey page)
- js/pages.js — inner-page behaviour: hero entrance, scroll-lit text, filters & search, dialogs, lightbox, orbit, tabs, accordion, route truck, story/pipeline progress, footer motion
- js/footer.js — footer motion: the giant SBL FOODS wordmark rising letter by letter, a living background (drifting aurora light, orbiting rings, pointer-following light, real-time drifting grains on canvas), and tap-to-open link groups on phones. Pauses off-screen; respects reduced motion.
- js/forms.js — contact form validation; opens the visitor's email app with the enquiry prefilled (no server, nothing is sent automatically)
- js/navigation.js, js/animations.js, js/main.js, js/slider.js, js/products.js, js/home.js — shared/homepage scripts
- js/vendor/ — GSAP 3.15 + ScrollTrigger, Lenis (self-hosted)

## Links into the contact form
`pages/contact.html?enquiry=product|bulk|distributor|partnership|horeca|institutional|export&product=Name#enquiry`
preselects the enquiry type and pre-writes the message. `pages/products.html?cat=rice` or `?q=sona` opens the catalogue filtered.

## Content notes
- All copy, figures, addresses, product names and pack sizes come from the SBL brochure / sblfoods.com.
- Four products have no pack photo in the brochure (Globe Gram Flour, Milk Kova, Ghee Mysore Pak, Mysore Pak); they show a labelled tile instead of an invented image.
- Sales projections carry the brochure's 8.85% CAGR disclaimer.
- To make the contact form submit to a server, point the `<form>` at your endpoint and remove `js/forms.js`'s `mailto` step.
