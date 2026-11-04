/* Agently Front Desk: the one-line chat button a business adds to its own website.
 *   <script src="https://agently-frontdesk.vercel.app/widget.js?site=your-website.com" defer></script>
 * The button dresses itself in the business: its name and greeting come from the desk the owner published,
 * its colour from the page (theme colour, then the site's own main button), its picture from the site's icon.
 * Optional: data-label, data-sub, data-color, data-greeting, data-teaser="off", data-site (defaults to ?site=,
 * then this page's host). Any element with data-frontdesk opens the chat too; data-frontdesk-q="..." starts it
 * with that message. The chat opens in its own small window on a computer and a new tab on a phone, on the
 * desk's own address, so the owner's desk sees the conversation live. Nothing the visitor types is read here. */
(function () {
  if (window.FrontDesk) return;
  var script = document.currentScript || document.querySelector('script[src*="widget.js"]');
  var data = (script && script.dataset) || {};
  var src = script ? new URL(script.src, location.href) : null;
  var origin = data.desk || (src ? src.origin : "https://agently-frontdesk.vercel.app");
  var site = (data.site || (src && src.searchParams.get("site")) || location.hostname).replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").toLowerCase();

  // ----- the business's own look, read from its page -----
  function okColor(c) {
    if (!c) return "";
    try {
      return window.CSS && CSS.supports("color", c) ? c : "";
    } catch (e) {
      return "";
    }
  }
  function rgbOf(c) {
    var probe = document.createElement("span");
    probe.style.color = c;
    probe.style.display = "none";
    document.documentElement.appendChild(probe);
    var m = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g) || [];
    probe.remove();
    return m.length >= 3 ? [Number(m[0]), Number(m[1]), Number(m[2]), m[3] == null ? 1 : Number(m[3])] : null;
  }
  // A colour that reads as a brand colour: not see-through, not near white, black or grey.
  function brandish(c) {
    var v = c && rgbOf(c);
    if (!v || v[3] < 0.6) return false;
    var max = Math.max(v[0], v[1], v[2]);
    var min = Math.min(v[0], v[1], v[2]);
    return max - min > 40 && max > 60 && min < 235;
  }
  function pageAccent() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta && brandish(meta.content)) return meta.content;
    var picks = document.querySelectorAll("a[class*='btn'], a[class*='button'], button, [class*='cta'], .button, input[type='submit']");
    for (var i = 0; i < picks.length && i < 60; i++) {
      var bg = getComputedStyle(picks[i]).backgroundColor;
      if (brandish(bg)) return bg;
    }
    return "";
  }
  function inkFor(c) {
    var v = rgbOf(c) || [241, 90, 36];
    var lum = (0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]) / 255;
    return lum > 0.62 ? "#111111" : "#ffffff";
  }
  function siteIcon() {
    var links = document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]');
    var best = "";
    for (var i = 0; i < links.length; i++) {
      var href = links[i].href;
      if (!href || /\.ico(\?|$)/i.test(href)) continue;
      if (/apple-touch/i.test(links[i].rel)) return href;
      best = best || href;
    }
    return best;
  }
  var shortName = function (name) {
    return String(name || "")
      .replace(/[,.]?\s+(co|inc|llc|ltd|corp|company)\.?$/i, "")
      .replace(/\s+&\s+.*$/, "")
      .trim()
      .slice(0, 28);
  };
  var SUB = { roofing: "Send a photo, get a price range", plumbing: "Send a photo, get a price range", hvac: "Send a photo, get a price range", medspa: "Ask about treatments and book", salon: "See prices and book a chair", barber: "See prices and book a chair" };
  var ASK = {
    roofing: "Roof trouble? Send me a photo and I'll outline the damage, draft a price range and book your free inspection.",
    plumbing: "Leak or blockage? Send me a photo and I'll draft a price range and book a visit.",
    hvac: "AC or appliance acting up? Tell me what it's doing and I'll get a technician booked.",
    medspa: "Tell me what you'd like help with and I'll show you the treatments, prices and open times.",
    salon: "Tell me what you'd like done and I'll show you prices and open times.",
    barber: "Tell me what you're after and I'll show you prices and open chairs.",
  };

  var color = okColor(data.color) || pageAccent() || "#f15a24";
  var ink = inkFor(color);
  var icon = siteIcon();

  function chatUrl(q) {
    var u = origin + "/chat?site=" + encodeURIComponent(site);
    if (q) u += "&q=" + encodeURIComponent(q);
    return u;
  }

  function open(q) {
    var url = chatUrl(q);
    var phone = window.matchMedia("(max-width: 640px)").matches || /Mobi|Android|iPhone/i.test(navigator.userAgent);
    hideTeaser(true);
    if (phone) {
      window.open(url, "_blank") || (location.href = url);
      return;
    }
    var w = 440;
    var h = Math.min(780, (screen.availHeight || 900) - 60);
    var left = Math.max(0, (window.screenX || 0) + (window.outerWidth || screen.availWidth) - w - 32);
    var top = Math.max(0, (window.screenY || 0) + 60);
    var win = window.open(url, "frontdesk-" + site, "popup=yes,width=" + w + ",height=" + h + ",left=" + left + ",top=" + top);
    if (win) win.focus();
    else window.open(url, "_blank");
  }

  var chatSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var host = document.createElement("div");
  host.setAttribute("data-frontdesk-widget", "");
  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
  root.innerHTML =
    "<style>" +
    ":host{all:initial}" +
    ".fd{--c:" + color + ";--ink:" + ink + ";position:fixed;right:20px;bottom:20px;z-index:2147483000;font:500 15px/1.35 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;display:flex;flex-direction:column;align-items:flex-end;gap:12px}" +
    ".btn{display:flex;align-items:center;gap:12px;border:0;cursor:pointer;background:var(--c);color:var(--ink);border-radius:999px;padding:8px 20px 8px 8px;box-shadow:0 12px 32px rgba(0,0,0,.28),0 2px 6px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.18);transition:transform .2s ease,box-shadow .2s ease;animation:rise .5s cubic-bezier(.2,.8,.2,1) both}" +
    ".btn:hover{transform:translateY(-2px);box-shadow:0 16px 40px rgba(0,0,0,.32),0 2px 6px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.18)}" +
    ".btn:focus-visible{outline:3px solid var(--c);outline-offset:3px}" +
    ".av{width:44px;height:44px;border-radius:50%;background:#fff;color:var(--c);display:grid;place-items:center;position:relative;flex:none;box-shadow:0 0 0 2px rgba(255,255,255,.35)}" +
    ".av img{width:30px;height:30px;border-radius:8px;object-fit:contain}" +
    ".av:before{content:'';position:absolute;inset:-4px;border-radius:50%;border:2px solid var(--c);opacity:0;animation:ring 2.4s ease-out 1s 3}" +
    ".av:after{content:'';position:absolute;right:0;bottom:1px;width:11px;height:11px;border-radius:50%;background:#34c759;border:2px solid var(--c)}" +
    ".t{display:flex;flex-direction:column;text-align:left;min-width:0}.t b{font-weight:650;font-size:15px;letter-spacing:-.01em;white-space:nowrap}.t span{font-size:12.5px;opacity:.85;white-space:nowrap}" +
    ".teaser{width:300px;max-width:calc(100vw - 40px);background:#fff;color:#14161a;border-radius:18px 18px 6px 18px;box-shadow:0 18px 44px rgba(0,0,0,.22),0 0 0 1px rgba(0,0,0,.05);position:relative;cursor:pointer;animation:in .4s cubic-bezier(.2,.8,.2,1) both;overflow:hidden}" +
    ".teaser .top{display:flex;align-items:center;gap:10px;padding:12px 40px 10px 14px;border-bottom:1px solid #eee;border-top:3px solid var(--c)}" +
    ".teaser .mini{width:30px;height:30px;border-radius:50%;background:var(--c);color:var(--ink);display:grid;place-items:center;font-weight:700;font-size:13px;flex:none;overflow:hidden}" +
    ".teaser .mini img{width:22px;height:22px;object-fit:contain;border-radius:5px;background:#fff}" +
    ".teaser .who b{display:block;font-size:13.5px;font-weight:650}.teaser .who small{display:flex;align-items:center;gap:5px;color:#5c6370;font-size:11.5px}" +
    ".teaser .who small i{width:7px;height:7px;border-radius:50%;background:#34c759;display:inline-block}" +
    ".teaser p{margin:0;padding:12px 14px 4px;font-size:14.5px;font-weight:450;line-height:1.4}" +
    ".teaser .go{display:inline-block;margin:6px 14px 14px;padding:8px 14px;border-radius:999px;background:var(--c);color:var(--ink);font-size:13.5px;font-weight:600}" +
    ".x{position:absolute;top:10px;right:8px;width:28px;height:28px;border:0;border-radius:50%;background:transparent;color:#777;cursor:pointer;font-size:19px;line-height:28px}" +
    ".x:hover{background:#f1f1f1}" +
    "@keyframes in{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}" +
    "@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}" +
    "@keyframes ring{0%{opacity:.7;transform:scale(1)}100%{opacity:0;transform:scale(1.45)}}" +
    "@media (prefers-reduced-motion:reduce){.btn,.teaser,.av:before{transition:none;animation:none}}" +
    "@media (max-width:640px){.fd{right:14px;bottom:14px}.t span{display:none}.btn{padding:6px 16px 6px 6px}}" +
    "</style>" +
    '<div class="fd">' +
    '<div class="teaser" role="button" tabindex="0" hidden><button class="x" aria-label="Close">×</button>' +
    '<div class="top"><span class="mini"></span><span class="who"><b></b><small><i></i> AI front desk · online now</small></span></div>' +
    '<p></p><span class="go">Start chatting</span></div>' +
    '<button class="btn" type="button"><span class="av"></span><span class="t"><b></b><span></span></span></button>' +
    "</div>";
  var btn = root.querySelector(".btn");
  var teaser = root.querySelector(".teaser");
  function picture(el, size) {
    el.innerHTML = "";
    if (icon) {
      var img = document.createElement("img");
      img.alt = "";
      img.src = icon;
      img.onerror = function () {
        el.innerHTML = size === "mini" ? "" : chatSvg;
      };
      el.appendChild(img);
    } else if (size !== "mini") el.innerHTML = chatSvg;
  }
  picture(root.querySelector(".av"), "big");
  picture(root.querySelector(".mini"), "mini");

  // Words: the page's own settings first, then the published desk, then plain defaults.
  function words(desk) {
    var name = shortName(desk && desk.name);
    var agent = (desk && desk.words && desk.words.agentName) || "Aura";
    var trade = desk && desk.trade;
    var label = data.label || (name ? "Chat with " + name : "Chat with us");
    var sub = data.sub || SUB[trade] || "Send a photo, get a price range";
    var greeting = data.greeting || (name ? "Hi, I'm " + agent + " at " + name + ". " : "Hi! ") + (ASK[trade] || ASK.roofing);
    btn.setAttribute("aria-label", label);
    root.querySelector(".t b").textContent = label;
    root.querySelector(".t span").textContent = sub;
    root.querySelector(".who b").textContent = name ? agent + " · " + name : agent;
    if (!icon) root.querySelector(".mini").textContent = (name || agent).charAt(0).toUpperCase();
    teaser.querySelector("p").textContent = greeting;
  }
  words(null);
  try {
    fetch(origin + "/api/desk?site=" + encodeURIComponent(site))
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (d) {
        if (d && d.tenant) words(d.tenant);
      })
      .catch(function () {
        /* not published yet: the plain words stay */
      });
  } catch (e) {
    /* fetch unavailable */
  }

  function hideTeaser(remember) {
    teaser.hidden = true;
    if (remember) {
      try {
        sessionStorage.setItem("fd-teaser-closed", "1");
      } catch (e) {
        /* storage blocked */
      }
    }
  }
  btn.addEventListener("click", function () {
    open("");
  });
  teaser.addEventListener("click", function (e) {
    if (e.target.classList.contains("x")) {
      e.stopPropagation();
      hideTeaser(true);
      return;
    }
    open("");
  });
  teaser.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") open("");
  });

  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-frontdesk]");
    if (!el) return;
    e.preventDefault();
    open(el.getAttribute("data-frontdesk-q") || "");
  });

  function mount() {
    document.body.appendChild(host);
    var closed = false;
    try {
      closed = sessionStorage.getItem("fd-teaser-closed") === "1";
    } catch (e) {
      /* storage blocked */
    }
    if (!closed && data.teaser !== "off") setTimeout(function () {
      teaser.hidden = false;
    }, 3000);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);

  window.FrontDesk = { open: open, url: chatUrl, site: site };
})();
