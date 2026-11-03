// Trust card: licence, insurance, warranty and reviews, shown on the site and read by the desk. Only what the
// business states: the demo businesses carry made-up credentials (labelled as demo data), and a business set up
// from its website shows only the site's own words about licences, insurance, warranties and reviews.

const DEMO = {
  "summit-ridge": {
    licence: "Demo licence no. SR-1042",
    insurance: "General liability and workers' comp on file",
    warranty: "10-year workmanship warranty on repairs",
    reviews: { rating: 4.8, count: 126 },
    since: 2009,
  },
  "luma-skin": {
    licence: "Treatments by licensed clinicians under a medical director",
    insurance: "Professional liability cover on file",
    warranty: "Free review visit two weeks after any treatment",
    reviews: { rating: 4.9, count: 212 },
    since: 2016,
  },
  "clearline-plumbing": {
    licence: "Demo master plumber licence no. CP-2231",
    insurance: "General liability on file",
    warranty: "1-year warranty on parts and labour",
    reviews: { rating: 4.7, count: 98 },
    since: 2012,
  },
  "polar-point": {
    licence: "Demo AC contractor licence no. PP-5508",
    insurance: "General liability on file",
    warranty: "90-day warranty on every repair",
    reviews: { rating: 4.8, count: 143 },
    since: 2014,
  },
  "fern-fringe": {
    licence: "Licensed cosmetologists",
    insurance: "Salon liability cover on file",
    warranty: "Free colour touch-up within 7 days if you're not happy",
    reviews: { rating: 4.9, count: 187 },
    since: 2018,
  },
  "ironside-barbers": {
    licence: "Licensed barbers",
    insurance: "Shop liability cover on file",
    warranty: "Free tidy-up within 5 days",
    reviews: { rating: 4.9, count: 264 },
    since: 2015,
  },
};

const TRUST_WORDS = /licen[cs]|insur|bonded|warrant|guarantee|review|rated|stars?\b|years? in business|since \d{4}|certified/i;

export const demoTrust = (id) => (DEMO[id] ? { ...DEMO[id], demo: true } : null);

// The lines to show: [{ label, value }], plus whether they are demo data or the website's own words.
export function trustFor(tenant = {}) {
  const t = tenant.trust;
  if (t) {
    const lines = [
      t.licence && { label: "Licence", value: t.licence },
      t.insurance && { label: "Insurance", value: t.insurance },
      t.warranty && { label: "Warranty", value: t.warranty },
      t.reviews && { label: "Reviews", value: `${t.reviews.rating} out of 5 from ${t.reviews.count} reviews` },
      t.since && { label: "In business", value: `Since ${t.since}` },
    ].filter(Boolean);
    return { lines, source: t.demo ? "demo" : "owner" };
  }
  const quotes = (tenant.setup?.evidence || []).filter((e) => e?.quote && TRUST_WORDS.test(e.quote)).slice(0, 5);
  return { lines: quotes.map((e) => ({ label: "From our website", value: `"${e.quote}"` })), source: "website" };
}

export const TRUST_NOTE = {
  demo: "Demo business: these credentials are made up for the demo.",
  owner: "As stated by the business.",
  website: "Quoted from the business's own website.",
};
