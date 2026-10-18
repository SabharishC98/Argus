import React from 'react';

/**
 * ArgusMythBackground:
 * Classical Greek engraving of "Argus Panoptes" (Ἄργος Πανόπτης)
 *
 * Mechanical Dynamic Motion:
 * - Central All-Seeing Eye remains completely STABLE and vigilant.
 * - Surrounding astrolabe rings, celestial orbits, cardinal rays, and satellite eyes
 *   rotate smoothly like an astronomical clockwork mechanism.
 */
export default function ArgusMythBackground() {
  return (
    <div
      className="argus-myth-bg"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <svg
        viewBox="0 0 1600 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.88,
        }}
      >
        <defs>
          <style>{`
            @keyframes argusSpinClockwise {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes argusSpinCounter {
              from { transform: rotate(0deg); }
              to { transform: rotate(-360deg); }
            }
            .argus-rings-rot-1 {
              animation: argusSpinClockwise 110s linear infinite;
              transform-origin: 0px 0px;
            }
            .argus-rays-rot-2 {
              animation: argusSpinCounter 75s linear infinite;
              transform-origin: 0px 0px;
            }
            .argus-eye-stable {
              /* The central eye stays rock solid */
              transform-origin: 0px 0px;
            }
          `}</style>

          {/* Radial depth wash */}
          <radialGradient id="argusGlow" cx="68%" cy="46%" r="55%">
            <stop offset="0%" stopColor="#67242B" stopOpacity="0.09" />
            <stop offset="60%" stopColor="#67242B" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#67242B" stopOpacity="0" />
          </radialGradient>

          {/* Architectural etching grid */}
          <pattern id="hatchGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <line x1="0" y1="40" x2="40" y2="0" stroke="#67242B" strokeWidth="0.5" strokeOpacity="0.035" />
          </pattern>
        </defs>

        {/* Ambient Paper Depth & Etching Grid */}
        <rect width="1600" height="1000" fill="url(#argusGlow)" />
        <rect width="1600" height="1000" fill="url(#hatchGrid)" />

        {/* ── ARGUS PANOPTES CELESTIAL EYE & GRAPH ASTRONOMY ── */}
        <g transform="translate(1040, 470)">
          {/* ── ROTATING LAYER 1: OUTER ASTROLABE RINGS, SATELLITE EYES & INSCRIPTION (Clockwise) ── */}
          <g className="argus-rings-rot-1">
            {/* Outer Astrolabe Rings */}
            <circle r="440" stroke="#67242B" strokeWidth="0.75" strokeDasharray="6 8" strokeOpacity="0.22" />
            <circle r="390" stroke="#67242B" strokeWidth="0.5" strokeOpacity="0.14" />
            <circle r="330" stroke="#67242B" strokeWidth="1" strokeOpacity="0.28" />
            <circle r="280" stroke="#67242B" strokeWidth="0.75" strokeDasharray="3 6" strokeOpacity="0.2" />
            <circle r="220" stroke="#67242B" strokeWidth="0.6" strokeOpacity="0.18" />
            <circle r="160" stroke="#67242B" strokeWidth="1.2" strokeOpacity="0.32" />

            {/* Celestial Cardinal Rays & Ticks */}
            <line x1="-480" y1="0" x2="480" y2="0" stroke="#67242B" strokeWidth="0.75" strokeOpacity="0.2" />
            <line x1="0" y1="-480" x2="0" y2="480" stroke="#67242B" strokeWidth="0.75" strokeOpacity="0.2" />
            <line x1="-340" y1="-340" x2="340" y2="340" stroke="#67242B" strokeWidth="0.5" strokeOpacity="0.15" />
            <line x1="-340" y1="340" x2="340" y2="-340" stroke="#67242B" strokeWidth="0.5" strokeOpacity="0.15" />

            {/* SATELLITE WATCHFUL EYES (Orbiting around central eye) */}
            {[
              { x: -280, y: -120, r: 24 },
              { x: -220, y: 190, r: 20 },
              { x: -90, y: -290, r: 28 },
              { x: 120, y: -310, r: 22 },
              { x: 290, y: -140, r: 26 },
              { x: 310, y: 130, r: 22 },
              { x: 140, y: 280, r: 24 },
              { x: -70, y: 310, r: 25 },
              { x: -380, y: 30, r: 18 },
              { x: 390, y: -20, r: 18 },
            ].map((eye, idx) => (
              <g key={`sat-eye-${idx}`} transform={`translate(${eye.x}, ${eye.y})`}>
                <path
                  d={`M -${eye.r} 0 C -${eye.r / 2} -${eye.r * 0.75}, ${eye.r / 2} -${eye.r * 0.75}, ${eye.r} 0 C ${eye.r / 2} ${eye.r * 0.75}, -${eye.r / 2} ${eye.r * 0.75}, -${eye.r} 0 Z`}
                  stroke="#67242B"
                  strokeWidth="1.2"
                  strokeOpacity="0.45"
                  fill="none"
                />
                <circle r={eye.r * 0.38} stroke="#67242B" strokeWidth="0.8" strokeOpacity="0.5" fill="none" />
                <circle r={eye.r * 0.18} fill="#67242B" fillOpacity="0.75" />
                <line
                  x1="0"
                  y1="0"
                  x2={-eye.x * 0.38}
                  y2={-eye.y * 0.38}
                  stroke="#67242B"
                  strokeWidth="0.5"
                  strokeDasharray="2 4"
                  strokeOpacity="0.25"
                />
                <circle cx={eye.r * 0.55} cy="-2" r="1.5" fill="#67242B" fillOpacity="0.6" />
              </g>
            ))}

            {/* Classical Inscription along Arc */}
            <path
              id="argusArc"
              d="M -300 -220 A 380 380 0 0 1 300 -220"
              fill="none"
              stroke="none"
            />
            <text fill="#67242B" fillOpacity="0.38" fontSize="13" letterSpacing="0.45em" fontFamily="'Chillax', sans-serif" fontWeight="600" textAnchor="middle">
              <textPath href="#argusArc" startOffset="50%">
                ARGUS · PANOPTES · THE ALL-SEEING GUARDIAN
              </textPath>
            </text>
          </g>

          {/* ── ROTATING LAYER 2: RADIAL RAYS & INNER ASTROLABE (Counter-Clockwise) ── */}
          <g className="argus-rays-rot-2">
            <circle r="105" stroke="#67242B" strokeWidth="0.75" strokeDasharray="4 4" strokeOpacity="0.28" />

            {/* Radial Rays */}
            {Array.from({ length: 36 }).map((_, i) => {
              const angle = (i * 10 * Math.PI) / 180;
              const r1 = 155;
              const r2 = i % 3 === 0 ? 320 : i % 2 === 0 ? 270 : 210;
              return (
                <line
                  key={`ray-${i}`}
                  x1={Math.cos(angle) * r1}
                  y1={Math.sin(angle) * r1}
                  x2={Math.cos(angle) * r2}
                  y2={Math.sin(angle) * r2}
                  stroke="#67242B"
                  strokeWidth={i % 3 === 0 ? 1 : 0.5}
                  strokeOpacity={i % 3 === 0 ? 0.25 : 0.12}
                />
              );
            })}
          </g>

          {/* ── LAYER 3: THE CENTRAL EYE OF ARGUS (COMPLETELY STABLE & STATIONARY) ── */}
          <g className="argus-eye-stable">
            {/* Upper & Lower Eyelid Curves */}
            <path
              d="M -130 0 C -70 -75, 70 -75, 130 0 C 70 75, -70 75, -130 0 Z"
              stroke="#67242B"
              strokeWidth="2.5"
              strokeOpacity="0.75"
              fill="none"
            />
            <path
              d="M -145 0 C -75 -90, 75 -90, 145 0 C 75 90, -75 90, -145 0 Z"
              stroke="#67242B"
              strokeWidth="0.75"
              strokeOpacity="0.25"
              fill="none"
            />

            {/* Concentric Iris */}
            <circle r="52" stroke="#67242B" strokeWidth="1.8" strokeOpacity="0.65" fill="#F2F2F2" fillOpacity="0.3" />
            <circle r="44" stroke="#67242B" strokeWidth="0.6" strokeOpacity="0.35" fill="none" />
            <circle r="36" stroke="#67242B" strokeWidth="1.2" strokeOpacity="0.55" fill="none" />

            {/* Pupil: Deep Burgundy Core with Gaze Spark */}
            <circle r="22" fill="#67242B" fillOpacity="0.9" stroke="#67242B" strokeWidth="1" />
            <circle cx="7" cy="-7" r="4.5" fill="#F2F2F2" />

            {/* Eyebrow / Classical Crown Contour */}
            <path
              d="M -150 -45 C -70 -115, 70 -115, 150 -45"
              stroke="#67242B"
              strokeWidth="1.5"
              strokeOpacity="0.42"
              fill="none"
            />
            <path
              d="M -120 -55 C -50 -105, 50 -105, 120 -55"
              stroke="#67242B"
              strokeWidth="0.6"
              strokeOpacity="0.25"
              fill="none"
            />
          </g>
        </g>

        {/* ── LEFT & LOWER CONSTELLATION DRAWING ── */}
        <g stroke="#67242B" strokeWidth="0.75" strokeOpacity="0.22" fill="none">
          <path d="M 120 180 L 260 290 L 410 240 L 520 380 L 390 510 L 220 460 Z" />
          <path d="M 260 290 L 390 510" strokeDasharray="4 6" />
          <path d="M 410 240 L 640 180 L 760 310 L 520 380" />
          <path d="M 180 620 L 340 710 L 490 640 L 430 810 L 250 830 Z" />
          <path d="M 390 510 L 490 640" strokeDasharray="3 5" />
          <path d="M 640 180 L 880 140" strokeOpacity="0.18" />

          {/* Constellation Nodes */}
          {[
            { cx: 120, cy: 180 },
            { cx: 260, cy: 290 },
            { cx: 410, cy: 240 },
            { cx: 520, cy: 380 },
            { cx: 390, cy: 510 },
            { cx: 220, cy: 460 },
            { cx: 640, cy: 180 },
            { cx: 760, cy: 310 },
            { cx: 180, cy: 620 },
            { cx: 340, cy: 710 },
            { cx: 490, cy: 640 },
            { cx: 430, cy: 810 },
            { cx: 250, cy: 830 },
          ].map((pt, i) => (
            <g key={`pt-${i}`}>
              <circle cx={pt.cx} cy={pt.cy} r="4" stroke="#67242B" strokeWidth="1" strokeOpacity="0.5" fill="#F2F2F2" />
              <circle cx={pt.cx} cy={pt.cy} r="1.8" fill="#67242B" fillOpacity="0.75" />
            </g>
          ))}
        </g>

        {/* Bottom edge classic meander / etching rule */}
        <line x1="80" y1="940" x2="1520" y2="940" stroke="#67242B" strokeWidth="0.75" strokeOpacity="0.25" />
        <line x1="80" y1="946" x2="1520" y2="946" stroke="#67242B" strokeWidth="0.5" strokeOpacity="0.15" strokeDasharray="4 8" />
      </svg>
    </div>
  );
}
