// Photos for every trade. All are synthetic illustrations made with Meta's Muse Image (no real customers,
// homes or people). Roofing and med spa ship in public/images; the newer trades are served from the
// project's Cloudinary media library, resized on the fly (f_auto, q_auto, width).
const CDN = "https://res.cloudinary.com/dz58pgz41/image/upload";
export const cdn = (id, w = 1600) => `${CDN}/f_auto,q_auto,w_${w}/agently/${id}`;

export const HEROES = {
  roofing: { src: "/images/roofer-storm.webp", alt: "A roofer nailing shingles under a stormy sky" },
  medspa: { src: "/images/spa-hero.webp", alt: "A calm treatment room in soft rose light, with peonies and folded towels" },
  plumbing: { src: cdn("hero-plumbing", 2048), alt: "A plumber fixing the pipes under a kitchen sink" },
  hvac: { src: cdn("hero-hvac", 2048), alt: "A technician servicing an outdoor air conditioner beside a brick house in summer sun" },
  salon: { src: cdn("hero-salon", 2048), alt: "A bright hair salon with blush walls, round mirrors and velvet chairs" },
  barber: { src: cdn("hero-barber", 2048), alt: "A classic barber shop with leather chairs and tools on a wooden counter" },
};

// One-tap sample jobs per trade, so a judge without a camera can run the full photo path. Each runs through
// the same checks and pipeline as a customer's own photo; nothing about the result is pre-made.
export const SAMPLES = {
  roofing: [
    { id: "lifted-shingles", src: "/images/roof-lifted-shingles.webp", title: "Lifted shingles", description: "Shingles lifted and blew off after last night's storm." },
    { id: "chimney-flashing", src: "/images/chimney-flashing.webp", title: "Flashing gap", description: "Water is getting in around the chimney. The metal flashing has pulled away." },
    { id: "ceiling-stain", src: "/images/ceiling-stain.webp", title: "Ceiling stain", description: "A brown water stain is spreading on the bedroom ceiling under the roof." },
  ],
  medspa: [
    { id: "medspa-redness", src: cdn("sample-medspa-redness", 900), title: "Redness", description: "Redness and dryness on my cheeks that won't settle." },
    { id: "medspa-lines", src: cdn("sample-medspa-lines", 900), title: "Fine lines", description: "Fine lines on my forehead I'd like to soften." },
    { id: "medspa-breakouts", src: cdn("sample-medspa-breakouts", 900), title: "Breakouts", description: "Breakouts on my chin that keep coming back." },
  ],
  plumbing: [
    { id: "plumbing-sink-leak", src: cdn("sample-plumbing-sink-leak", 900), title: "Sink leak", description: "Water dripping under the kitchen sink since yesterday, there's a puddle in the cabinet." },
    { id: "plumbing-water-heater", src: cdn("sample-plumbing-water-heater", 900), title: "Water heater", description: "No hot water and the water heater tank is leaking at the bottom." },
    { id: "plumbing-frozen-pipe", src: cdn("sample-plumbing-frozen-pipe", 900), title: "Frozen pipe", description: "A pipe froze overnight and now it's split and spraying water in the crawlspace." },
  ],
  hvac: [
    { id: "hvac-iced-line", src: cdn("sample-hvac-iced-line", 900), title: "Iced line", description: "The AC is blowing warm air and there's ice on the pipe at the outdoor unit." },
    { id: "hvac-fridge-code", src: cdn("sample-hvac-fridge-code", 900), title: "Fridge code", description: "The fridge isn't cold and the display is flashing an error code." },
    { id: "hvac-no-airflow", src: cdn("sample-hvac-no-airflow", 900), title: "No airflow", description: "The AC runs but hardly any air comes out of the vents." },
  ],
  salon: [
    { id: "salon-brassy", src: cdn("sample-salon-brassy", 900), title: "Brassy colour", description: "My colour went brassy after a box dye, can you fix it?" },
    { id: "salon-roots", src: cdn("sample-salon-roots", 900), title: "Grey roots", description: "My grey roots are showing, I'd like my colour done." },
    { id: "salon-ends", src: cdn("sample-salon-split-ends", 900), title: "Split ends", description: "My ends are dry and split, I need a trim and some repair." },
  ],
  barber: [
    { id: "barber-fade", src: cdn("sample-barber-fade", 900), title: "Skin fade", description: "Same skin fade again please, it's grown out." },
    { id: "barber-overgrown", src: cdn("sample-barber-overgrown", 900), title: "Grown out", description: "It's grown out a lot, I want a short back and sides." },
    { id: "barber-beard", src: cdn("sample-barber-beard", 900), title: "Beard", description: "Beard trim and a line-up please." },
  ],
};
export const samplesFor = (trade) => SAMPLES[trade] || [];

// Synthetic demo addresses inside each business's area, used only when a sample job needs one.
export const SAMPLE_ADDRESS = {
  roofing: "14 Larkspur Lane, Austin, TX",
  plumbing: "210 Magnolia Ave, Fort Worth, TX",
  hvac: "15 Alamo Heights Blvd, San Antonio, TX",
};
