// frontend/src/components/TimerCircle.jsx
import React from "react";
import { formatMMSS } from "../utils/phases";

export default function TimerCircle({
  // anneau intérieur = pas (30 s)
  total = 30,
  remaining = 30,
  // phase courante pour la couleur (warmup | work | rest | stretch | idle)
  phase = "idle",
  // anneau extérieur = phase complète (300 / 180 / 60 / 300)
  outerTotal = 300,
  outerRemaining = 300,
}) {
  const size = 280;              // un peu plus grand pour 2 anneaux
  const gap = 6;                 // espace entre anneaux

  const outerStroke = 14;
  const innerStroke = 10;

  const rOuter = (size - outerStroke) / 2;
  const rInner = rOuter - (outerStroke / 2) - gap - (innerStroke / 2);

  const Couter = 2 * Math.PI * rOuter;
  const Cinner = 2 * Math.PI * rInner;

  // progressions
  const innerProgress = total > 0 ? 1 - remaining / total : 0;
  const outerProgress = outerTotal > 0 ? 1 - outerRemaining / outerTotal : 0;

  const innerDashOffset = Cinner * (1 - innerProgress);
  const outerDashOffset = Couter * (1 - outerProgress);

  // couleur de phase (safelist tailwind: text-warmup/work/rest/idle)
  const colorClass =
    phase === "warmup" ? "text-warmup" :
    phase === "work"   ? "text-work"   :
    (phase === "rest" || phase === "stretch") ? "text-rest" :
    "text-idle";

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={size} height={size} className="drop-shadow-lg">
        {/* démarre à 12 h */}
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {/* anneau extérieur (phase) */}
          <circle
            cx={size/2} cy={size/2} r={rOuter}
            stroke="currentColor" strokeOpacity="0.2" strokeWidth={outerStroke} fill="none"
            className="text-slate-400"
          />
          <circle
            cx={size/2} cy={size/2} r={rOuter}
            stroke="currentColor" strokeWidth={outerStroke} fill="none"
            strokeDasharray={Couter} strokeDashoffset={outerDashOffset} strokeLinecap="round"
            className={colorClass}
            style={{ transition: "stroke-dashoffset 0.5s linear" }}
          />

          {/* anneau intérieur (pas 30s) */}
          <circle
            cx={size/2} cy={size/2} r={rInner}
            stroke="currentColor" strokeOpacity="0.18" strokeWidth={innerStroke} fill="none"
            className="text-slate-300"
          />
          <circle
            cx={size/2} cy={size/2} r={rInner}
            stroke="currentColor" strokeWidth={innerStroke} fill="none"
            strokeDasharray={Cinner} strokeDashoffset={innerDashOffset} strokeLinecap="round"
            className="text-white"
            style={{ transition: "stroke-dashoffset 0.5s linear" }}
          />
        </g>

        {/* petit timer de phase (coloré) au-dessus */}
        <text
          x="50%" y="42%" dominantBaseline="middle" textAnchor="middle"
          className={`${colorClass} fill-current text-4xl font-semibold select-none`}
        >
          {formatMMSS(Math.max(0, outerRemaining))}
        </text>
        <br></br>
        {/* gros timer du pas au centre (blanc) */}
        <text
          x="50%" y="58%" dominantBaseline="middle" textAnchor="middle"
          className="fill-white dark:fill-white text-6xl font-bold select-none"
        >
          {formatMMSS(Math.max(0, remaining))}
        </text>
      </svg>
    </div>
  );
}
