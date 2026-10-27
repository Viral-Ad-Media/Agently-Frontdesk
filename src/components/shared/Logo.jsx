
import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";

export const LOGO_URL = "https://media.base44.com/images/public/6adf4df2954ef8733787d5d7/9e4705b04_generated_image.png";

export default function Logo({ light = false, className = "", to = "/", showWord = true }) {
  return (
    <Link to={to} className={`group flex items-center gap-2.5 ${className}`}>
      <Image
        src={LOGO_URL}
        alt="Agently Frontdesk"
        className="h-10 w-10 shrink-0 rounded-xl transition-transform duration-700 ease-viscous group-hover:-rotate-6 group-hover:scale-105"
        fittingType="fill"
      />
      {showWord && (
        <span className={`font-heading text-xl leading-none tracking-tight transition-colors duration-500 ${light ? "text-white" : "text-foreground"}`}>
          Agently <span className="text-primary">Frontdesk</span>
        </span>
      )}
    </Link>
  );
}