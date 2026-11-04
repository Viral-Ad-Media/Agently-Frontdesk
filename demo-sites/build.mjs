// Builds the two demo roofing websites as plain static HTML: node demo-sites/build.mjs [deskOrigin]
// Output: demo-sites/dist/<slug>/{index,pricing,services,about,contact}.html, ready for any static host.
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITES } from "./sites.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DESK = process.argv[2] || "https://agently-frontdesk.vercel.app";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ICONS = {
  leak: '<path d="M12 2.7s-6 6.6-6 11.3a6 6 0 0 0 12 0c0-4.7-6-11.3-6-11.3z"/>',
  storm: '<path d="M17.5 17H7a5 5 0 1 1 1.6-9.7A6 6 0 0 1 20 9.5a3.8 3.8 0 0 1-2.5 7.5z"/><path d="m13 12-3 5h4l-3 5"/>',
  flashing: '<path d="M3 21V9l9-6 9 6v12"/><path d="M15 21v-7h3v7"/>',
  gutter: '<path d="M3 7h18v3a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/><path d="M17 13v8"/>',
  replace: '<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10"/><path d="M9 21v-6h6v6"/>',
  inspect: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  skylight: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16M12 4v16"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ICONS.inspect}</svg>`;

function css(s) {
  const dark = s.theme === "dark";
  const t = dark
    ? { bg: "#0e0f11", surface: "#16181b", surface2: "#1d2024", line: "rgba(255,255,255,.09)", text: "#f3f1ee", muted: "#a5a29c", head: "'Barlow Condensed', 'Arial Narrow', sans-serif", body: "'Barlow', system-ui, sans-serif", headWeight: 700, headCase: "uppercase", track: ".01em", topbar: "#08090a", footer: "#08090a", heroTint: "rgba(10,10,11,.86), rgba(10,10,11,.35)" }
    : { bg: "#f7f5f1", surface: "#ffffff", surface2: "#efebe4", line: "#e3ddd2", text: "#1b2233", muted: "#5b6475", head: "'Fraunces', Georgia, serif", body: "'Source Sans 3', system-ui, sans-serif", headWeight: 600, headCase: "none", track: "-.01em", topbar: "#1d2b4f", footer: "#1d2b4f", heroTint: "rgba(20,28,48,.82), rgba(20,28,48,.25)" };
  return `
:root{--bg:${t.bg};--surface:${t.surface};--surface2:${t.surface2};--line:${t.line};--text:${t.text};--muted:${t.muted};--accent:${s.color};--head:${t.head};--body:${t.body};color-scheme:${dark ? "dark" : "light"}}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font:400 17px/1.6 var(--body);-webkit-font-smoothing:antialiased}
img{max-width:100%;display:block}a{color:inherit}
h1,h2,h3{font-family:var(--head);font-weight:${t.headWeight};text-transform:${t.headCase};letter-spacing:${t.track};line-height:1.05;margin:0}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px}
.topbar{background:${t.topbar};color:#e9e6e0;font-size:13.5px}.topbar .wrap{display:flex;gap:18px;justify-content:space-between;align-items:center;min-height:38px;flex-wrap:wrap}
.topbar a{text-decoration:none;font-weight:600}.topbar .lic{opacity:.75}
header.site{position:sticky;top:0;z-index:50;background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:saturate(1.4) blur(12px);border-bottom:1px solid var(--line)}
header.site .wrap{display:flex;align-items:center;gap:24px;min-height:70px}
.logo{display:flex;align-items:center;gap:10px;text-decoration:none;font-family:var(--head);font-weight:${t.headWeight};font-size:22px;text-transform:${t.headCase};letter-spacing:${t.track}}
.logo .mark{width:36px;height:36px;border-radius:8px;background:var(--accent);display:grid;place-items:center;color:#fff}
nav.main{display:flex;gap:4px;margin-left:auto}nav.main a{text-decoration:none;padding:8px 12px;border-radius:8px;font-size:15.5px;font-weight:500;color:var(--muted)}
nav.main a:hover,nav.main a[aria-current]{color:var(--text);background:var(--surface2)}
.btn{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:10px;padding:13px 20px;font:600 16px/1 var(--body);text-decoration:none;cursor:pointer;transition:transform .15s ease,filter .15s ease}
.btn:hover{transform:translateY(-1px);filter:brightness(1.06)}.btn-accent{background:var(--accent);color:#fff}.btn-ghost{background:transparent;color:inherit;box-shadow:inset 0 0 0 1.5px currentColor}
.btn-sm{padding:10px 14px;font-size:14.5px}
.menu-toggle{display:none}
.hero{position:relative;color:#fff;background:#111 center/cover no-repeat;min-height:620px;display:flex;align-items:center}
.hero:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,${t.heroTint})}
.hero .wrap{position:relative;padding-top:80px;padding-bottom:80px}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
.hero .eyebrow{color:#fff;background:rgba(255,255,255,.12);padding:6px 12px;border-radius:999px}
.hero h1{font-size:clamp(42px,6.4vw,80px);max-width:17ch;margin-top:18px}
.hero p.lead{font-size:19px;max-width:54ch;opacity:.92;margin:18px 0 28px}
.hero .ctas{display:flex;gap:12px;flex-wrap:wrap}.hero .btn-ghost{color:#fff}
.hero .proof{display:flex;gap:22px;flex-wrap:wrap;margin-top:30px;font-size:14.5px;opacity:.9}.stars{color:#ffc53d;letter-spacing:2px}
section{padding:84px 0}section.alt{background:var(--surface2)}
.sec-head{display:flex;justify-content:space-between;align-items:end;gap:20px;flex-wrap:wrap;margin-bottom:36px}.sec-head h2{font-size:clamp(32px,4.4vw,52px);max-width:18ch}.sec-head p{color:var(--muted);max-width:46ch;margin:0}
.trust{background:var(--surface);border-bottom:1px solid var(--line)}.trust .wrap{display:grid;grid-template-columns:repeat(4,1fr)}
.trust div{padding:22px 18px;border-left:1px solid var(--line);font-size:14.5px;color:var(--muted)}.trust div:first-child{border-left:0}.trust b{display:block;color:var(--text);font-size:16px;margin-bottom:2px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:24px}
.card .ic{width:44px;height:44px;border-radius:10px;display:grid;place-items:center;background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent);margin-bottom:16px}
.card h3{font-size:24px;margin-bottom:6px}.card p{color:var(--muted);margin:0 0 14px;font-size:15.5px}.price{font-weight:700;font-size:16px}
.steps{counter-reset:s}.step{position:relative;padding-top:56px}.step:before{counter-increment:s;content:counter(s,decimal-leading-zero);position:absolute;top:0;left:24px;font:700 34px/1 var(--head);color:var(--accent)}
table.rates{width:100%;border-collapse:collapse;background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden;font-size:16px}
table.rates th,table.rates td{text-align:left;padding:15px 18px;border-bottom:1px solid var(--line)}table.rates th{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);background:var(--surface2)}
table.rates td.n{font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}table.rates tr:last-child td{border-bottom:0}
.note{font-size:14.5px;color:var(--muted);margin-top:14px}
.rate-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:20px;align-items:start}
.facts{display:grid;gap:12px}.fact{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px 20px}.fact b{font-size:28px;font-family:var(--head)}.fact span{display:block;color:var(--muted);font-size:14.5px}
.gallery figure{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}.gallery img{aspect-ratio:4/3;object-fit:cover;width:100%;background:var(--surface2)}
.gallery figcaption{padding:14px 16px;font-size:15px}.gallery figcaption small{display:block;color:var(--accent);font-weight:700;font-size:12px;letter-spacing:.07em;text-transform:uppercase}
blockquote{margin:0}.review p{font-size:16.5px;margin:10px 0 16px}.review footer{font-size:14px;color:var(--muted)}.review footer b{color:var(--text)}
.area{display:flex;flex-wrap:wrap;gap:10px}.area span{padding:9px 14px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font-size:15px}
details{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:0 20px;margin-bottom:10px}summary{cursor:pointer;padding:18px 0;font-weight:600;list-style:none;display:flex;justify-content:space-between;gap:12px}summary:after{content:"+";color:var(--accent);font-size:22px;line-height:1}details[open] summary:after{content:"–"}details p{margin:0 0 18px;color:var(--muted)}
.band{background:var(--accent);color:#fff}.band .wrap{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;padding-top:44px;padding-bottom:44px}.band h2{font-size:clamp(28px,3.6vw,42px)}.band .btn{background:#fff;color:#111}
footer.site{background:${t.footer};color:#d7d3cc;font-size:15px}footer.site .wrap{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:28px;padding-top:56px;padding-bottom:28px}
footer.site h4{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#fff;margin:0 0 12px}footer.site ul{list-style:none;padding:0;margin:0;display:grid;gap:8px}footer.site a{text-decoration:none;opacity:.88}footer.site a:hover{opacity:1}
.legal{border-top:1px solid rgba(255,255,255,.12);font-size:13px;opacity:.75}.legal .wrap{display:block;padding-top:18px;padding-bottom:24px}
.page-hero{padding:64px 0 40px;border-bottom:1px solid var(--line)}.page-hero h1{font-size:clamp(40px,6vw,68px);max-width:16ch;margin-top:10px}.page-hero p{color:var(--muted);max-width:60ch;font-size:18px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}.two img{border-radius:16px;aspect-ratio:4/3;object-fit:cover;width:100%;background:var(--surface2)}
form.contact{display:grid;gap:14px}form.contact label{display:grid;gap:6px;font-size:14.5px;font-weight:600}
form.contact input,form.contact textarea{font:inherit;color:var(--text);background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:12px 14px}form.contact textarea{min-height:130px;resize:vertical}
.pill{display:inline-block;font-size:12.5px;font-weight:700;padding:4px 10px;border-radius:999px;background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent)}
.svc{display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:start;padding:22px 0;border-bottom:1px solid var(--line)}.svc h3{font-size:26px}.svc p{margin:6px 0 0;color:var(--muted)}
.reveal{animation:rise .6s ease both}@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.reveal{animation:none}.btn{transition:none}html{scroll-behavior:auto}}
@media (max-width:900px){nav.main{display:none}nav.main.open{display:flex;flex-direction:column;position:absolute;top:70px;left:0;right:0;background:var(--bg);border-bottom:1px solid var(--line);padding:12px 20px}
.menu-toggle{display:inline-flex;margin-left:auto;background:none;border:1px solid var(--line);color:var(--text);border-radius:8px;padding:8px 10px}
header.site .cta{display:none}.grid3,.rate-grid,.two{grid-template-columns:1fr}.trust .wrap{grid-template-columns:1fr 1fr}.trust div:nth-child(3){border-left:0}
footer.site .wrap{grid-template-columns:1fr 1fr}.hero{min-height:540px}section{padding:60px 0}.topbar .lic{display:none}}
@media (max-width:520px){footer.site .wrap{grid-template-columns:1fr}.svc{grid-template-columns:1fr}.svc .ic{display:none}}
@media print{.topbar,header.site,.band,[data-frontdesk-widget]{display:none}}`;
}

const NAV = [
  ["index.html", "Home"],
  ["pricing.html", "Pricing"],
  ["services.html", "Services"],
  ["about.html", "About"],
  ["contact.html", "Contact"],
];

function layout(s, page, title, desc, body) {
  const fonts = s.theme === "dark" ? "family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700" : "family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Source+Sans+3:wght@400;600;700";
  const ld = {
    "@context": "https://schema.org",
    "@type": "RoofingContractor",
    name: s.name,
    telephone: s.phone,
    email: s.email,
    address: s.address,
    areaServed: s.area,
    aggregateRating: { "@type": "AggregateRating", ratingValue: s.rating, reviewCount: s.reviews },
    foundingDate: String(s.since),
  };
  const mark = `<span class="mark"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 12 9-8 9 8"/><path d="M7 10v9h10v-9"/></svg></span>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:site_name" content="${esc(s.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${s.images.hero}">
<meta name="theme-color" content="${s.color}">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='${s.color}'/><path d='M6 17 16 8l10 9M10 15v10h12V15' fill='none' stroke='white' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/></svg>`)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts}&display=swap">
<style>${css(s)}</style>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<div class="topbar"><div class="wrap"><div>Call <a href="tel:${s.tel}">${s.phone}</a> · ${esc(s.hours)}</div><div class="lic">${esc(s.licence)}</div></div></div>
<header class="site"><div class="wrap">
<a class="logo" href="index.html">${mark}<span>${esc(s.name)}</span></a>
<button class="menu-toggle" type="button" aria-label="Menu" aria-expanded="false" onclick="var n=document.querySelector('nav.main');n.classList.toggle('open');this.setAttribute('aria-expanded',n.classList.contains('open'))">Menu</button>
<nav class="main" aria-label="Main">${NAV.map(([href, label]) => `<a href="${href}"${href === page ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
<a class="btn btn-accent btn-sm cta" href="contact.html" data-frontdesk>Free estimate</a>
</div></header>
<main>
${body}
</main>
<section class="band"><div class="wrap"><h2>Roof trouble? Send us a photo.</h2><a class="btn" href="contact.html" data-frontdesk data-frontdesk-q="Hi, I'd like a free estimate for my roof.">Start a free estimate</a></div></section>
<footer class="site">
<div class="wrap">
<div><a class="logo" href="index.html" style="color:#fff">${mark}<span>${esc(s.name)}</span></a><p style="margin:14px 0 0;opacity:.8">${esc(s.tagline)} ${esc(s.insurance)}. ${esc(s.warranty)}.</p></div>
<div><h4>Services</h4><ul>${s.services.slice(0, 5).map((x) => `<li><a href="services.html">${esc(x[0])}</a></li>`).join("")}</ul></div>
<div><h4>Company</h4><ul><li><a href="about.html">About us</a></li><li><a href="pricing.html">Pricing</a></li><li><a href="contact.html">Contact</a></li><li><a href="contact.html" data-frontdesk>Chat with our front desk</a></li></ul></div>
<div><h4>Contact</h4><ul><li><a href="tel:${s.tel}">${s.phone}</a></li><li><a href="mailto:${s.email}">${s.email}</a></li><li>${esc(s.address)}</li><li>${esc(s.hours)}</li></ul></div>
</div>
<div class="legal"><div class="wrap">© ${new Date().getFullYear()} ${esc(s.name)} · ${esc(s.licence)}. <strong>Demo website:</strong> ${esc(s.name)} is a fictional business made to demonstrate Agently Front Desk. Names, licence numbers, reviews, addresses and prices are made up; phone numbers use the 555 range reserved for fiction. Photos made with Muse Image.</div></div>
</footer>
<script src="${DESK}/widget.js" data-color="${s.color}" data-label="Chat with ${esc(s.short)}" data-sub="Send a photo, get a price range" defer></script>
</body>
</html>`;
}

const rateTable = (s, full) => `<table class="rates">
<caption class="sr-only" style="position:absolute;left:-9999px">${esc(s.name)} published repair rates</caption>
<thead><tr><th scope="col">Material (supplied and fitted)</th><th scope="col">Per sq ft</th><th scope="col">Per m²</th></tr></thead>
<tbody>
${s.rates.map(([m, sqft, m2]) => `<tr><td>${esc(m)}</td><td class="n">$${sqft} per sq ft</td><td class="n">$${m2} per m²</td></tr>`).join("\n")}
<tr><td>Labour, per roofer</td><td class="n" colspan="2">$${s.labour} per hour</td></tr>
<tr><td>Repairs</td><td class="n" colspan="2">${s.minimum}-hour minimum on all repairs</td></tr>
${full ? `<tr><td>Inspection and photo estimate</td><td class="n" colspan="2">Free</td></tr>` : ""}
</tbody></table>`;

function home(s) {
  return layout(
    s,
    "index.html",
    `${s.name} | Roof repair and replacement in ${s.city}, ${s.state}`,
    `${s.name}: roof repair, storm damage and replacement across ${s.area.slice(0, 4).join(", ")}. Free inspections, published prices, ${s.rating}-star rated.`,
    `
<section class="hero" style="background-image:url('${s.images.hero}')"><div class="wrap reveal">
<span class="eyebrow">Proudly serving ${esc(s.area.slice(0, -1).join(", "))} and ${esc(s.area.at(-1))}</span>
<h1>${esc(s.tagline)}</h1>
<p class="lead">${esc(s.heroText)}</p>
<div class="ctas"><a class="btn btn-accent" href="contact.html" data-frontdesk data-frontdesk-q="Hi, I'd like a photo estimate for my roof.">Get a photo estimate</a><a class="btn btn-ghost" href="tel:${s.tel}">Call ${s.phone}</a></div>
<div class="proof"><div><span class="stars" aria-hidden="true">★★★★★</span> Rated ${s.rating} from ${s.reviews} reviews</div><div>Licensed and insured</div><div>In business since ${s.since}</div></div>
</div></section>

<div class="trust"><div class="wrap">
<div><b>Free inspections</b>Written report with photos</div>
<div><b>Warranty</b>${esc(s.warranty)}</div>
<div><b>Licensed and insured</b>${esc(s.insurance)}</div>
<div><b>Answers 24/7</b>Our AI front desk replies in seconds</div>
</div></div>

<section><div class="wrap">
<div class="sec-head"><h2>What we fix</h2><p>Every price below is a published range. A roofer confirms the final price on site before any work starts.</p></div>
<div class="grid3">
${s.services.map(([name, price, text, ic]) => `<article class="card"><div class="ic">${icon(ic)}</div><h3>${esc(name)}</h3><p>${esc(text)}</p><div class="price">${esc(price)}</div></article>`).join("\n")}
</div></div></section>

<section class="alt"><div class="wrap">
<div class="sec-head"><h2>Our rates, in the open</h2><p>We price a repair by the area that needs work, times the material rate, plus labour by the hour. No mystery numbers.</p></div>
<div class="rate-grid">${rateTable(s, false)}
<div class="facts"><div class="fact"><b>$${s.labour}/h</b><span>Labour per roofer</span></div><div class="fact"><b>${s.minimum} h</b><span>Minimum on repairs</span></div><div class="fact"><b>Free</b><span>Inspection and photo estimate</span></div></div></div>
<p class="note">Draft ranges are ±20% until a roofer has seen the roof. <a href="pricing.html">See full pricing and a worked example</a>.</p>
</div></section>

<section><div class="wrap">
<div class="sec-head"><h2>How it works</h2><p>Day or night, our front desk picks up.</p></div>
<div class="grid3 steps">
<div class="card step"><h3>Tell us what's wrong</h3><p>Open the chat and describe the problem in your own words, or call us.</p></div>
<div class="card step"><h3>Send a photo</h3><p>The desk outlines the damage on your photo and drafts a price range from the rates above.</p></div>
<div class="card step"><h3>Book a free inspection</h3><p>Pick a time that suits you. A roofer checks the roof and confirms the price before any work.</p></div>
</div></div></section>

<section class="alt"><div class="wrap">
<div class="sec-head"><h2>Recent work</h2><p>A few jobs from the last season.</p></div>
<div class="grid3 gallery">
${s.gallery.map(([k, cap, tag]) => `<figure><img src="${s.images[k]}" alt="${esc(cap)}" loading="lazy" width="1000" height="750"><figcaption><small>${esc(tag)}</small>${esc(cap)}</figcaption></figure>`).join("\n")}
</div></div></section>

<section><div class="wrap">
<div class="sec-head"><h2>What neighbours say</h2><p><span class="stars" aria-hidden="true">★★★★★</span> ${s.rating} average from ${s.reviews} reviews</p></div>
<div class="grid3">
${s.reviewsList.map(([who, where, text]) => `<blockquote class="card review"><span class="stars" aria-label="5 stars">★★★★★</span><p>“${esc(text)}”</p><footer><b>${esc(who)}</b> · ${esc(where)}</footer></blockquote>`).join("\n")}
</div></div></section>

<section class="alt"><div class="wrap two">
<div><span class="eyebrow">Service area</span><h2 style="font-size:clamp(30px,4vw,46px);margin:10px 0 18px">Where we work</h2><div class="area">${s.area.map((a) => `<span>${esc(a)}</span>`).join("")}</div><p class="note">Outside these areas? Ask the front desk, we may still be able to help.</p></div>
<div><h2 style="font-size:clamp(30px,4vw,46px);margin-bottom:18px">Questions</h2>
${s.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n")}
</div></div></section>`
  );
}

function pricing(s) {
  const area = 6;
  const m2 = s.rates[0][2];
  const hours = Math.max(s.minimum, Math.round(area * 1.5 * 2) / 2);
  const total = area * m2 + hours * s.labour;
  return layout(
    s,
    "pricing.html",
    `Pricing and rate card | ${s.name}`,
    `${s.name} published rate card: material rates per square foot and per square metre, labour per hour and common repair prices.`,
    `
<div class="page-hero"><div class="wrap"><span class="eyebrow">Pricing</span><h1>Our published rate card</h1><p>These are the rates our front desk uses for every draft estimate. A roofer confirms the final price on site, and nothing is ordered until you say yes.</p></div></div>
<section><div class="wrap">
<div class="sec-head"><h2>Repair rates</h2><p>Supplied and fitted, per unit of roof area that needs work.</p></div>
${rateTable(s, true)}
<p class="note">Prices in US dollars, excluding permit fees where a permit is required. Rates last updated November 2026.</p>
</div></section>
<section class="alt"><div class="wrap two">
<div><h2 style="font-size:clamp(30px,4vw,46px)">How a price is worked out</h2><p>Area that needs work × material rate, plus labour hours × $${s.labour}. Labour runs at about 1.5 hours per square metre, with a ${s.minimum}-hour minimum on repairs.</p>
<p><strong>Example:</strong> ${area} m² (about ${Math.round(area * 10.7639)} sq ft) of ${s.rates[0][0].toLowerCase()}: ${area} × $${m2} = $${area * m2} materials, plus ${hours} h × $${s.labour} = $${hours * s.labour} labour. Total $${total.toLocaleString("en-US")}, shown as a draft range of $${Math.round(total * 0.8).toLocaleString("en-US")} – $${Math.round(total * 1.2).toLocaleString("en-US")} until a roofer has seen it.</p></div>
<div class="card"><h3 style="font-size:26px;margin-bottom:12px">Common jobs</h3>
<table class="rates"><tbody>${s.services.map(([n, p]) => `<tr><td>${esc(n)}</td><td class="n">${esc(p)}</td></tr>`).join("")}</tbody></table></div>
</div></section>`
  );
}

function services(s) {
  return layout(
    s,
    "services.html",
    `Roofing services | ${s.name}`,
    `Leak repair, storm damage, flashing, gutters and full replacement from ${s.name}.`,
    `
<div class="page-hero"><div class="wrap"><span class="eyebrow">Services</span><h1>Repairs, storm work and new roofs</h1><p>Licensed, insured and local to ${esc(s.city)}. ${esc(s.warranty)}.</p></div></div>
<section><div class="wrap">
${s.services.map(([name, price, text, ic]) => `<div class="svc"><div class="card" style="padding:12px"><div class="ic" style="margin:0">${icon(ic)}</div></div><div><h3>${esc(name)}</h3><p>${esc(text)}</p></div><span class="pill">${esc(price)}</span></div>`).join("\n")}
</div></section>`
  );
}

function about(s) {
  return layout(
    s,
    "about.html",
    `About us | ${s.name}`,
    `${s.name}: ${s.tagline}`,
    `
<div class="page-hero"><div class="wrap"><span class="eyebrow">About</span><h1>Roofers you can actually reach</h1></div></div>
<section><div class="wrap two">
<div><p style="font-size:19px">${esc(s.story)}</p>
<ul style="padding-left:20px;color:var(--muted)"><li>${esc(s.licence)}</li><li>${esc(s.insurance)}</li><li>${esc(s.warranty)}</li><li>Rated ${s.rating} from ${s.reviews} reviews</li><li>In business since ${s.since}</li></ul></div>
<img src="${s.images.team}" alt="The ${esc(s.short)} crew" loading="lazy" width="1200" height="900">
</div></section>`
  );
}

function contact(s) {
  return layout(
    s,
    "contact.html",
    `Contact | ${s.name}`,
    `Call ${s.phone} or chat with the ${s.name} front desk for a free estimate.`,
    `
<div class="page-hero"><div class="wrap"><span class="eyebrow">Contact</span><h1>Get a free estimate</h1><p>The quickest way is the chat: describe the problem, add a photo and pick an inspection time. Or send the form and it goes straight to our front desk.</p></div></div>
<section><div class="wrap two" style="align-items:start">
<form class="contact" id="contact-form">
<label>Your name<input name="name" autocomplete="name" required></label>
<label>Phone<input name="phone" type="tel" autocomplete="tel"></label>
<label>Property address<input name="address" autocomplete="street-address"></label>
<label>What's going on?<textarea name="message" required placeholder="e.g. Water stain on the bedroom ceiling after last night's storm"></textarea></label>
<button class="btn btn-accent" type="submit">Send to our front desk</button>
<p class="note" style="margin:0">Your message opens our front desk chat, where you can add a photo and book a time.</p>
</form>
<div class="card"><h3 style="font-size:26px;margin-bottom:12px">${esc(s.name)}</h3><p style="color:var(--text)"><a href="tel:${s.tel}">${s.phone}</a><br><a href="mailto:${s.email}">${s.email}</a><br>${esc(s.address)}</p><p>${esc(s.hours)}</p><p>${esc(s.licence)}</p></div>
</div></section>
<script>
document.getElementById("contact-form").addEventListener("submit", function (e) {
  e.preventDefault();
  var f = new FormData(e.target);
  var parts = [f.get("message")];
  if (f.get("address")) parts.push("The address is " + f.get("address") + ".");
  if (f.get("name")) parts.push("My name is " + f.get("name") + (f.get("phone") ? ", phone " + f.get("phone") : "") + ".");
  var q = parts.filter(Boolean).join(" ");
  if (window.FrontDesk) window.FrontDesk.open(q);
});
</script>`
  );
}

const out = join(here, "dist");
rmSync(out, { recursive: true, force: true });
for (const s of Object.values(SITES)) {
  const dir = join(out, s.slug);
  mkdirSync(dir, { recursive: true });
  const pages = { "index.html": home(s), "pricing.html": pricing(s), "services.html": services(s), "about.html": about(s), "contact.html": contact(s) };
  for (const [f, html] of Object.entries(pages)) writeFileSync(join(dir, f), html);
  writeFileSync(join(dir, "robots.txt"), "User-agent: *\nDisallow: /\n");
  console.log(`built ${s.slug} (${Object.keys(pages).length} pages) -> desk ${DESK}`);
}
