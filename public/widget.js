/* Agently Front Desk: the one-line chat button a business adds to its own website.
 *   <script src="https://agently-frontdesk.vercel.app/widget.js" defer></script>
 * Optional: data-label, data-sub, data-color, data-greeting, data-site (defaults to this page's host).
 * Any element with data-frontdesk opens the chat too; data-frontdesk-q="..." starts it with that message.
 * The chat opens in its own small window on a computer and a new tab on a phone, on the desk's own address,
 * so the owner's desk sees the conversation live. Nothing is read from the host page. */
(function () {
  if (window.FrontDesk) return;
  var script = document.currentScript || document.querySelector('script[src*="widget.js"]');
  var data = (script && script.dataset) || {};
  var origin = data.desk || (script ? new URL(script.src, location.href).origin : "https://agently-frontdesk.vercel.app");
  var site = (data.site || location.hostname).replace(/^www\./, "").toLowerCase();
  var color = /^#[0-9a-f]{3,8}$/i.test(data.color || "") ? data.color : "#f15a24";
  var label = data.label || "Chat with us";
  var sub = data.sub || "Send a photo, get a price range";
  var greeting = data.greeting || "Hi! Roof trouble? Send me a photo and I'll draft a price range and book a free inspection.";

  function chatUrl(q) {
    var u = origin + "/chat?site=" + encodeURIComponent(site);
    if (q) u += "&q=" + encodeURIComponent(q);
    return u;
  }

  function open(q) {
    var url = chatUrl(q);
    var phone = window.matchMedia("(max-width: 640px)").matches || /Mobi|Android|iPhone/i.test(navigator.userAgent);
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
    hideTeaser(true);
  }

  var host = document.createElement("div");
  host.setAttribute("data-frontdesk-widget", "");
  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
  root.innerHTML =
    "<style>" +
    ":host{all:initial}" +
    ".fd{position:fixed;right:20px;bottom:20px;z-index:2147483000;font:500 15px/1.35 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;display:flex;flex-direction:column;align-items:flex-end;gap:10px}" +
    ".btn{display:flex;align-items:center;gap:12px;border:0;cursor:pointer;background:" + color + ";color:#fff;border-radius:999px;padding:10px 20px 10px 10px;box-shadow:0 10px 30px rgba(0,0,0,.28),0 2px 6px rgba(0,0,0,.18);transition:transform .2s ease,box-shadow .2s ease}" +
    ".btn:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(0,0,0,.32),0 2px 6px rgba(0,0,0,.18)}" +
    ".btn:focus-visible{outline:3px solid #fff;outline-offset:3px}" +
    ".ic{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.18);display:grid;place-items:center;position:relative}" +
    ".ic:after{content:'';position:absolute;right:1px;top:1px;width:10px;height:10px;border-radius:50%;background:#34c759;border:2px solid " + color + "}" +
    ".t{display:flex;flex-direction:column;text-align:left}.t b{font-weight:650;font-size:15px}.t span{font-size:12.5px;opacity:.88}" +
    ".teaser{max-width:290px;background:#fff;color:#111;border-radius:16px 16px 4px 16px;padding:14px 36px 14px 16px;box-shadow:0 12px 32px rgba(0,0,0,.22);position:relative;cursor:pointer;animation:in .35s ease both}" +
    ".teaser p{margin:0;font-size:14.5px;font-weight:450}.teaser small{display:block;margin-top:6px;color:#666;font-size:12px}" +
    ".x{position:absolute;top:6px;right:6px;width:26px;height:26px;border:0;border-radius:50%;background:transparent;color:#777;cursor:pointer;font-size:18px;line-height:26px}" +
    ".x:hover{background:#f1f1f1}" +
    "@keyframes in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}" +
    "@media (prefers-reduced-motion:reduce){.btn,.teaser{transition:none;animation:none}}" +
    "@media (max-width:640px){.fd{right:14px;bottom:14px}.t span{display:none}}" +
    "</style>" +
    '<div class="fd">' +
    '<div class="teaser" role="button" tabindex="0" hidden><button class="x" aria-label="Close">×</button><p></p><small>AI front desk · replies in seconds</small></div>' +
    '<button class="btn" type="button"><span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span><span class="t"><b></b><span></span></span></button>' +
    "</div>";
  root.querySelector(".btn").setAttribute("aria-label", label);
  root.querySelector(".t b").textContent = label;
  root.querySelector(".t span").textContent = sub;
  var teaser = root.querySelector(".teaser");
  teaser.querySelector("p").textContent = greeting;

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
  root.querySelector(".btn").addEventListener("click", function () {
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
    }, 3500);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);

  window.FrontDesk = { open: open, url: chatUrl };
})();
