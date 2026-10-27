
// Artisan sample profiles used across the consumer experience.
import { routeByProximity } from "@/lib/geo";

const U = "https://media.base44.com/images/public/6adf4df2954ef8733787d5d7/";
const img = {
  carpenterHero: U + "94b2965f1_generated_a773c29b.png",
  plumberHero: U + "d5fac5936_generated_618e0afc.png",
  electricianHero: U + "77f303c8c_generated_9f8d048c.png",
  masonHero: U + "6acb34a07_generated_dcf29923.png",
  roofer: U + "eeba5afb1_generated_3e92aa26.png",
  carpenter: U + "7660f6ac1_generated_b5ee8b17.png",
  electrician: U + "9e58a3f6c_generated_88a13a4d.png",
  plumber: U + "974108397_generated_c60ba5ea.png",
  mason: U + "cac6ec47d_generated_9b649455.png",
  carpentryWork: U + "e7bb9a232_generated_image.png",
  plumbingWork: U + "e75f8667b_generated_image.png",
  electricalWork: U + "928bddea1_generated_image.png",
  masonryWork: U + "d31c2fc01_generated_image.png",
};

export const heroSlides = [
  { src: img.carpenterHero, word: "Carpenters", caption: "Oak, shaved by hand" },
  { src: img.plumberHero, word: "Plumbers", caption: "A joint, tightened true" },
  { src: img.electricianHero, word: "Electricians", caption: "Live work, steady hands" },
  { src: img.masonHero, word: "Stone Masons", caption: "Course by course at dawn" },
  { src: img.roofer, word: "Roofers", caption: "Sunrise on clay tile" },
];

export const trades = ["Plumbing", "Electrical", "Carpentry", "Masonry", "Roofing"];

const raw = [
  {
    id: "marisol-vega",
    name: "Marisol Vega",
    trade: "Electrician",
    tradeKey: "Electrical",
    tagline: "Safe circuits, explained plainly.",
    rating: 4.8,
    reviews: 167,
    rate: 52,
    years: 12,
    quote: [80, 160],
    area: "Ikoyi & Ikeja GRA",
    coords: { lat: 6.452, lng: 3.4346 },
    portrait: img.electrician,
    action: img.electricianHero,
    aspect: "aspect-[3/4]",
    philosophy:
      "Electricity forgives nothing, so I take no shortcuts. I test everything twice, label every circuit, and walk you through what I found in language that doesn't need a manual.",
    tools: ["Multimeter", "Thermal camera", "Insulation tester", "Cable tracer"],
    services: [
      { name: "Fault finding", price: "from $60" },
      { name: "Breaker panel upgrade", price: "from $240" },
      { name: "Lighting & socket install", price: "from $55" },
    ],
    works: [
      { title: "Consumer unit replacement", year: "2025", blurb: "Old fuse board swapped for a labelled RCBO unit in a single morning.", image: img.electricalWork },
      { title: "Full rewire, three-bed terrace", year: "2024", blurb: "Seven circuits, new earthing, minimal plaster damage.", image: img.electricianHero },
      { title: "Garden workshop supply", year: "2023", blurb: "Buried armoured feed with its own board and RCD.", image: img.electrician },
    ],
  },
  {
    id: "gus-delaney",
    name: "Gus Delaney",
    trade: "Plumber",
    tradeKey: "Plumbing",
    tagline: "No leak left behind.",
    rating: 4.7,
    reviews: 304,
    rate: 45,
    years: 22,
    quote: [75, 95],
    area: "Surulere & Yaba",
    coords: { lat: 6.498, lng: 3.358 },
    portrait: img.plumber,
    action: img.plumberHero,
    aspect: "aspect-square",
    philosophy:
      "Twenty-two years of kitchens and bathrooms taught me that most leaks are small problems that were ignored. I fix the cause, not the symptom, and I show you the old part so you can see why.",
    tools: ["Pipe wrenches", "Press tool", "Drain camera", "Pressure gauge"],
    services: [
      { name: "Leak & drip repair", price: "from $40" },
      { name: "Drain unblocking", price: "from $50" },
      { name: "Fixture installation", price: "from $65" },
    ],
    works: [
      { title: "Kitchen sink re-pipe", year: "2025", blurb: "Corroded trap and waste replaced, new isolation valves fitted.", image: img.plumbingWork },
      { title: "Bathroom refit pipework", year: "2024", blurb: "First-fix for a full bathroom, pressure tested before tiling.", image: img.plumberHero },
      { title: "Emergency burst main", year: "2023", blurb: "Made safe at midnight, permanent repair the next morning.", image: img.plumber },
    ],
  },
  {
    id: "idris-okafor",
    name: "Idris Okafor",
    trade: "Stone Mason",
    tradeKey: "Masonry",
    tagline: "Walls built to be inherited.",
    rating: 4.9,
    reviews: 129,
    rate: 40,
    years: 15,
    quote: [120, 260],
    area: "Mainland & Ajah",
    coords: { lat: 6.469, lng: 3.57 },
    portrait: img.mason,
    action: img.masonHero,
    aspect: "aspect-[4/5]",
    philosophy:
      "Stone and brick are patient materials. I match mortar to the age of your wall, repoint by hand and treat cracks as clues. A good repair should disappear into the building.",
    tools: ["Pointing trowels", "Lump hammer", "Mortar mixer", "Plumb line"],
    services: [
      { name: "Crack & wall repair", price: "from $70" },
      { name: "Repointing", price: "from $150" },
      { name: "Boundary walls", price: "from $300" },
    ],
    works: [
      { title: "Repointed 1920s brick gable", year: "2025", blurb: "Lime mortar matched to the original mix, joints raked by hand.", image: img.masonryWork },
      { title: "Rebuilt collapsed garden wall", year: "2024", blurb: "Salvaged brick, new footing, straight as a rule.", image: img.masonHero },
      { title: "Stone cottage crack stitching", year: "2023", blurb: "Cracks stitched and pinned before cosmetic repair.", image: img.mason },
    ],
  },
  {
    id: "tunde-adebayo",
    name: "Tunde Adebayo",
    trade: "Carpenter",
    tradeKey: "Carpentry",
    tagline: "Joinery that outlives the house.",
    rating: 4.9,
    reviews: 212,
    rate: 38,
    years: 18,
    quote: [90, 140],
    area: "Lekki & Victoria Island",
    coords: { lat: 6.4413, lng: 3.522 },
    portrait: img.carpenter,
    action: img.carpenterHero,
    aspect: "aspect-[4/5]",
    philosophy:
      "I learned on my uncle's bench at fourteen: measure twice, listen to the grain, and never hide a bad joint behind filler. Every door I hang and every frame I repair is something I would be proud to sign.",
    tools: ["Hand planes", "Dovetail saw", "Router table", "Laser level"],
    services: [
      { name: "Door & frame repair", price: "from $45" },
      { name: "Custom shelving", price: "from $120" },
      { name: "Floor & decking repair", price: "from $80" },
    ],
    works: [
      { title: "Fitted oak library wall", year: "2025", blurb: "Floor-to-ceiling shelving in solid oak, scribed to an uneven wall.", image: img.carpentryWork },
      { title: "Restored a sagging door frame", year: "2024", blurb: "New hardwood frame, hung and cased to the original profile.", image: img.carpenterHero },
      { title: "Iroko dining table", year: "2023", blurb: "Single-slab top with hand-cut breadboard ends.", image: img.carpenter },
    ],
  },
];

// Smart proximity routing — every marketplace list is ordered by real distance from the job site.
export const artisans = routeByProximity(raw);

export const getArtisan = (id) => artisans.find((a) => a.id === id);