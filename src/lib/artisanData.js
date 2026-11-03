// /site hero photo per trade (synthetic illustrations made with Meta's Muse Image); see config/media.js.
import { HEROES } from "@/config/media";

export const heroSlides = HEROES;
export const heroFor = (trade) => HEROES[trade] || HEROES.roofing;
