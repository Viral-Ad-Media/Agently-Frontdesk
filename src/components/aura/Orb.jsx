
import { motion } from "framer-motion";

const themes = {
  idle: { glow: "#FF9A4D", rim: "#FFD9AE", core: "#FFF3E4", mid: "#E2703A", deep: "#7E2C10", spin: 18, dur: 4 },
  listening: { glow: "#FF7A2F", rim: "#FFD2A0", core: "#FFF7EC", mid: "#F07B2E", deep: "#8F2708", spin: 9, dur: 1.1 },
  processing: { glow: "#6FA8FF", rim: "#CFE4FF", core: "#F4F9FF", mid: "#5B7FE0", deep: "#182858", spin: 2.4, dur: 1.5 },
  speaking: { glow: "#FF5E7A", rim: "#FFC7D2", core: "#FFF3F5", mid: "#E4536E", deep: "#73101F", spin: 11, dur: 0.85 },
};

const pulse = {
  idle: [1, 1.07, 1],
  listening: [1, 1.26, 0.93, 1.18, 1],
  processing: [0.86, 0.95, 0.86],
  speaking: [1, 1.32, 1.02, 1.2, 1],
};

const morph = ["50% 50% 50% 50%", "62% 38% 55% 45%", "44% 56% 40% 60%", "55% 45% 62% 38%", "50% 50% 50% 50%"];

export default function Orb({ state = "idle", size = 220, className = "" }) {
  const t = themes[state] || themes.idle;
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* wide bloom */}
      <motion.div
        className="absolute rounded-full"
        style={{ inset: "-60%", background: `radial-gradient(circle, ${t.glow} 0%, ${t.glow}00 68%)`, filter: "blur(30px)" }}
        animate={{ opacity: [0.6, 0.95, 0.6], scale: [1, 1.1, 1] }}
        transition={{ duration: t.dur * 1.3, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* tight bloom */}
      <motion.div
        className="absolute rounded-full"
        style={{ inset: "-4%", background: `radial-gradient(circle, ${t.glow} 0%, ${t.glow}00 72%)`, filter: "blur(16px)" }}
        animate={{ opacity: [0.75, 1, 0.75] }}
        transition={{ duration: t.dur * 0.8, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* sphere */}
      <div
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          background: `radial-gradient(circle at 34% 26%, ${t.core} 0%, ${t.mid} 48%, ${t.deep} 100%)`,
          boxShadow: `inset 0 6px 26px ${t.rim}, inset -20px -28px 60px ${t.deep}, 0 0 50px ${t.glow}, 0 30px 90px -20px ${t.glow}`,
        }}
      >
        {/* liquid metal sweep */}
        <motion.div
          className="absolute -inset-1/4"
          style={{
            background: `conic-gradient(from 0deg, ${t.glow}00 0deg, ${t.rim} 42deg, ${t.glow}00 96deg, ${t.glow} 168deg, ${t.glow}00 214deg, ${t.core} 268deg, ${t.glow}00 322deg)`,
            filter: "blur(7px)",
            mixBlendMode: "screen",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: t.spin, repeat: Infinity, ease: "linear" }}
        />
        {/* molten core */}
        <motion.div
          className="absolute inset-[24%]"
          style={{
            background: `radial-gradient(circle at 40% 34%, ${t.core} 0%, ${t.glow} 58%, ${t.glow}00 80%)`,
            filter: "blur(5px)",
            mixBlendMode: "screen",
          }}
          animate={{ scale: pulse[state] || pulse.idle, borderRadius: morph, opacity: [0.8, 1, 0.8] }}
          transition={{
            scale: { duration: t.dur, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: t.dur * 1.2, repeat: Infinity, ease: "easeInOut" },
            borderRadius: { duration: t.dur * 3, repeat: Infinity, ease: "easeInOut" },
          }}
        />
        {/* specular highlight */}
        <div
          className="absolute left-[15%] top-[9%] h-[30%] w-[45%] rounded-full"
          style={{ background: "radial-gradient(ellipse at 40% 28%, rgba(255,255,255,0.95), rgba(255,255,255,0) 70%)", filter: "blur(5px)" }}
        />
        {/* inner shadow for depth */}
        <div className="absolute inset-0 rounded-full" style={{ boxShadow: `inset 0 -22px 44px ${t.deep}80` }} />
      </div>
      {/* halo rings */}
      <motion.div
        className="absolute rounded-full"
        style={{ inset: "-9%", border: `1px solid ${t.rim}` }}
        animate={{ scale: [1, 1.07, 1], opacity: [0.18, 0.5, 0.18] }}
        transition={{ duration: t.dur * 1.7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ inset: "-20%", border: `1px solid ${t.glow}`, borderTopColor: "transparent", borderBottomColor: "transparent" }}
        animate={{ rotate: -360, opacity: [0.15, 0.45, 0.15] }}
        transition={{ rotate: { duration: t.spin * 2.4, repeat: Infinity, ease: "linear" }, opacity: { duration: t.dur * 2, repeat: Infinity } }}
      />
    </div>
  );
}