// Street addresses in plain code: spot one in what a customer typed, and tell whether two addresses are the
// same property. Pure module (no imports), shared by the browser, the tools and the server.

const SHORT = { street: "st", avenue: "ave", road: "rd", drive: "dr", lane: "ln", court: "ct", boulevard: "blvd", place: "pl", terrace: "ter", circle: "cir", parkway: "pkwy", highway: "hwy", trail: "trl", square: "sq", north: "n", south: "s", east: "e", west: "w" };
const LONG = new RegExp(`\\b(${Object.keys(SHORT).join("|")})\\b`, "g");

export const normAddress = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(LONG, (w) => SHORT[w])
    .replace(/[^a-z0-9]/g, "");

const SUFFIX = "street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|boulevard|blvd|place|pl|way|terrace|ter|circle|cir|parkway|pkwy|highway|hwy|trail|trl|loop|row|square|sq|crescent|cres|close|pike|alley|run|path|pass|ridge|point|pt";
// "14 Larkspur Lane", "2905 NW 63rd Terrace", "1418 Sunflower Ln Apt 2": a house number, up to four street words, a suffix.
const STREET = new RegExp(`\\b(\\d{1,6}[a-z]?\\s+(?:[a-z0-9'.-]+\\s+){0,4}?(?:${SUFFIX})\\b\\.?(?:\\s*(?:apt|unit|suite|ste|#)\\.?\\s*[\\w-]+)?)`, "i");
// What may follow it: ", Austin", ", Austin, TX", " Austin TX 78704" (city words start with a capital letter).
const TAIL = /^(?:,?\s+(?:[A-Z][A-Za-z.'-]*)(?:\s+[A-Z][A-Za-z.'-]*){0,2})?(?:,?\s+[A-Z]{2}\b)?(?:\s+\d{5}(?:-\d{4})?)?/;

// Words that never sit between a house number and the street suffix ("2 people to come this way" is no address).
const STOP = new Set(["the", "this", "that", "a", "an", "my", "your", "our", "their", "to", "of", "in", "on", "at", "for", "and", "or", "all", "any", "no", "one", "is", "are", "was", "be", "it", "come", "go", "minutes", "hours", "days", "weeks", "years", "people", "times"]);
const plausible = (street) => !street.split(/\s+/).slice(1, -1).some((w) => STOP.has(w.toLowerCase()));

// The first street address in a piece of text, as the customer wrote it, or "".
export function findAddress(text = "") {
  const s = String(text || "");
  const m = s.match(STREET);
  if (!m || !plausible(m[1].replace(/\s*(?:apt|unit|suite|ste|#).*$/i, ""))) return "";
  const street = m[1].replace(/[.,]$/, "");
  const rest = s.slice(m.index + m[0].length);
  const tail = (rest.match(TAIL) || [""])[0];
  // A lone capitalised word after the street is only a city when a comma or a state code says so.
  const keepTail = /,|\b[A-Z]{2}\b|\d{5}/.test(tail) ? tail : "";
  return (street + keepTail).replace(/\s+/g, " ").replace(/[\s,]+$/, "").trim();
}

// The house number and street only ("14larkspurln"), so "14 Larkspur Lane, Austin, Texas" and "14 Larkspur Ln"
// match.
export function streetKey(address = "") {
  const m = String(address || "").match(STREET);
  return m ? normAddress(m[1].replace(/\s*(?:apt|unit|suite|ste|#).*$/i, "")) : "";
}

// Same property: the same full address, one a longer form of the other, or the same house number and street.
export function sameAddress(a, b) {
  const x = normAddress(a);
  const y = normAddress(b);
  if (!x || !y) return false;
  if (x === y || (x.length > 8 && y.length > 8 && (x.startsWith(y) || y.startsWith(x)))) return true;
  const kx = streetKey(a);
  return kx.length > 4 && kx === streetKey(b);
}

// The address the customer gave most recently in the conversation, or "".
export function lastAddressIn(messages = []) {
  for (const m of [...messages].reverse()) {
    if (m.role !== "user") continue;
    const a = findAddress(m.content);
    if (a) return a;
  }
  return "";
}
