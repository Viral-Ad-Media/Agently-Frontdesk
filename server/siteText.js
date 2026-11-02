// Reads a business website as plain text for the instant-setup flow. Runs server-side only (Vite dev
// middleware and the Vercel route), because browsers cannot read other sites. Public http(s) pages only:
// private and local addresses are refused, pages are capped in size and time, and nothing is stored.

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|.*\.localhost|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|\[?::1\]?|\[?f[cd][0-9a-f]{2}:.*)$/i;
const MAX_BYTES = 1_500_000;
const MAX_TEXT = 9000;
const SUBPAGE = /(service|pricing|price|menu|treatment|roof|repair|about|contact)/i;

export function normalizeUrl(input) {
  let s = String(input || "").trim();
  if (!s) throw new Error("Paste the business website address.");
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u;
  try {
    u = new URL(s);
  } catch {
    throw new Error("That doesn't look like a website address.");
  }
  if (!/^https?:$/.test(u.protocol)) throw new Error("Only http and https websites can be read.");
  if (PRIVATE_HOST.test(u.hostname) || !u.hostname.includes(".")) throw new Error("That address is not a public website.");
  u.hash = "";
  return u;
}

const decode = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, " ");

// HTML to { title, description, text, links }. Keeps headings and list items on their own lines.
export function htmlToText(html, baseUrl) {
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
  const description = decode((html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i) || [])[1] || "").trim();
  const siteName = decode((html.match(/<meta[^>]+property=["']og:site_name["'][^>]*content=["']([^"']*)["']/i) || [])[1] || "").trim();
  const links = [];
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const u = new URL(m[1], baseUrl);
      if (u.origin === new URL(baseUrl).origin) links.push({ href: u.href.replace(/#.*$/, ""), label: decode(m[2].replace(/<[^>]+>/g, " ")).trim() });
    } catch {
      /* skip bad links */
    }
  }
  const text = decode(
    html
      .replace(/<(script|style|noscript|svg|iframe|template)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(h[1-6]|p|li|div|section|tr|br|article|header|footer)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<[^>]+>/g, " ")
  )
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 1)
    .filter((l, i, a) => a.indexOf(l) === i)
    .join("\n");
  return { title, description, siteName, text, links };
}

async function getPage(url, fetchImpl) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    // Follow redirects by hand so every hop is checked against the public-address rule.
    let res;
    let at = url;
    for (let hop = 0; hop < 4; hop++) {
      res = await fetchImpl(at, { signal: ctrl.signal, redirect: "manual", headers: { "user-agent": "AgentlyFrontDeskSetup/1.0 (+https://agently-frontdesk.vercel.app)", accept: "text/html,application/xhtml+xml" } });
      const loc = res.status >= 300 && res.status < 400 ? res.headers.get?.("location") : null;
      if (!loc) break;
      at = normalizeUrl(new URL(loc, at).href).href;
    }
    if (!res.ok) throw new Error(`The site answered ${res.status}.`);
    const type = res.headers.get?.("content-type") || "text/html";
    if (!/html|text/i.test(type)) throw new Error("That address is not a web page.");
    const html = (await res.text()).slice(0, MAX_BYTES);
    return html;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("The site took too long to answer.");
    throw e;
  } finally {
    clearTimeout(t);
  }
}

// The home page plus up to two same-site pages that look like services or pricing.
export async function readSite(input, fetchImpl = fetch) {
  const u = normalizeUrl(input);
  const home = htmlToText(await getPage(u.href, fetchImpl), u.href);
  const pages = [{ url: u.href, text: home.text }];
  const picks = [...new Map(home.links.filter((l) => SUBPAGE.test(l.href) || SUBPAGE.test(l.label)).map((l) => [l.href, l])).values()].filter((l) => l.href !== u.href).slice(0, 2);
  for (const l of picks) {
    try {
      const p = htmlToText(await getPage(l.href, fetchImpl), l.href);
      pages.push({ url: l.href, text: p.text });
    } catch {
      /* a missing subpage is fine */
    }
  }
  let budget = MAX_TEXT;
  const combined = pages
    .map((p) => {
      const chunk = p.text.slice(0, Math.max(0, budget));
      budget -= chunk.length;
      return chunk ? `# ${p.url}\n${chunk}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
  return { url: u.href, host: u.hostname.replace(/^www\./, ""), title: home.title, siteName: home.siteName, description: home.description, text: combined, pages: pages.map((p) => p.url) };
}
