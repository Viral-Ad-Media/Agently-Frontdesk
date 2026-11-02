// /site hero image: an illustration made with Meta's Muse Image, served from public/images (no external CDN).
// Each business site gets its own hero photo (made with Meta's Muse Image): a strong, weathered look for
// roofing and a soft, calm treatment room for the med spa.
export const heroSlides = {
  roofing: { src: "/images/roofer-storm.webp", alt: "A roofer nailing shingles under a stormy sky" },
  medspa: { src: "/images/spa-hero.webp", alt: "A calm treatment room in soft rose light, with peonies and folded towels" },
};
export const heroFor = (trade) => heroSlides[trade === "medspa" ? "medspa" : "roofing"];
