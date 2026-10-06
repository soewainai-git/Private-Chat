import React, { useState, useEffect } from 'react';

export type SkyTheme = 'auto' | 'day' | 'night';

interface Props {
  currentTheme?: SkyTheme;
  onThemeChange?: (theme: SkyTheme) => void;
}

export const SkyBackground: React.FC<Props> = ({ currentTheme = 'auto' }) => {
  const [currentHour, setCurrentHour] = useState<number>(() => new Date().getHours());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000); // Check every minute
    return () => clearInterval(timer);
  }, []);

  const isDay =
    currentTheme === 'day' ||
    (currentTheme === 'auto' && currentHour >= 6 && currentHour < 18);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden select-none z-0">
      {/* Dynamic Sky Gradient Transition */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          isDay ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'linear-gradient(180deg, #4fa3f7 0%, #76bcfd 28%, #a2d6ff 58%, #fde6d2 90%, #fef3c7 100%)',
        }}
      />
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          !isDay ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'linear-gradient(180deg, #070b14 0%, #0c1427 30%, #151d38 65%, #24163f 100%)',
        }}
      />

      {/* ================= DAYTIME SCENE (HEARTOPIA PASTEL CLOUDS) ================= */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          isDay ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Soft Warm Sun Aura */}
        <div className="absolute top-[-10%] right-[-10%] w-[340px] h-[340px] rounded-full bg-radial from-amber-200/40 via-amber-100/15 to-transparent blur-2xl" />

        {/* Back Cloud Layer (Slower, Larger, Higher Altitude) */}
        <div className="absolute top-[8%] left-[-20%] w-[140%] opacity-28 animate-cloud-slow">
          <svg viewBox="0 0 1200 350" fill="none" className="w-full h-auto drop-shadow-md">
            <defs>
              <linearGradient id="cloudBackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="70%" stopColor="#F8FAFC" />
                <stop offset="100%" stopColor="#FED7AA" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            {/* Fluffy Cumulus Cloud 1 */}
            <path
              d="M 120 220 
                 C 100 180 130 140 180 150 
                 C 210 110 280 100 320 140 
                 C 360 90 450 100 480 150 
                 C 530 140 570 180 560 220 
                 C 590 230 600 270 560 290 
                 L 110 290 
                 C 70 280 80 230 120 220 Z"
              fill="url(#cloudBackGrad)"
            />
            {/* Fluffy Cumulus Cloud 2 */}
            <path
              d="M 720 200 
                 C 700 160 740 120 790 130 
                 C 830 80 910 80 950 120 
                 C 1000 70 1090 90 1110 140 
                 C 1160 140 1190 180 1170 220 
                 L 700 220 
                 C 670 210 680 170 720 200 Z"
              fill="url(#cloudBackGrad)"
            />
          </svg>
        </div>

        {/* Front Cloud Layer (Smooth, Fluffy Heartopia Style, Gentle Drift) */}
        <div className="absolute top-[28%] left-[-25%] w-[150%] opacity-38 animate-cloud-fast">
          <svg viewBox="0 0 1400 380" fill="none" className="w-full h-auto drop-shadow-sm">
            <defs>
              <linearGradient id="cloudFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="60%" stopColor="#FDFBF7" />
                <stop offset="100%" stopColor="#FFEDD5" stopOpacity="0.85" />
              </linearGradient>
            </defs>
            {/* Large Billowy Cartoon Cloud */}
            <path
              d="M 280 260 
                 C 250 210 300 160 360 170 
                 C 390 120 480 100 540 140 
                 C 590 80 700 90 750 150 
                 C 810 120 880 160 880 220 
                 C 920 230 940 280 890 320 
                 L 260 320 
                 C 220 300 240 240 280 260 Z"
              fill="url(#cloudFrontGrad)"
            />
            {/* Companion Sweet Cloud */}
            <path
              d="M 980 240 
                 C 960 200 1000 160 1050 170 
                 C 1090 120 1170 120 1210 160 
                 C 1260 130 1330 160 1340 210 
                 C 1380 220 1390 270 1350 300 
                 L 960 300 
                 C 930 280 940 230 980 240 Z"
              fill="url(#cloudFrontGrad)"
            />
          </svg>
        </div>
      </div>

      {/* ================= NIGHTTIME SCENE (STARRY ENCHANTED NIGHT) ================= */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          !isDay ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Soft Glowing Moon in Top-Right */}
        <div className="absolute top-10 right-8 w-16 h-16 pointer-events-none animate-moon-glow">
          <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
            <defs>
              <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FEF9C3" />
                <stop offset="50%" stopColor="#FDE047" />
                <stop offset="100%" stopColor="#FACC15" />
              </linearGradient>
            </defs>
            {/* Crescent Moon */}
            <path
              d="M 65 15 
                 C 40 25 25 50 30 75 
                 C 35 90 50 100 65 100 
                 C 40 95 20 70 20 45 
                 C 20 28 35 12 55 5 
                 C 59 4 63 12 65 15 Z"
              fill="url(#moonGrad)"
              transform="scale(0.85) translate(8, 0)"
            />
          </svg>
          {/* Moon Atmospheric Halo */}
          <div className="absolute inset-0 rounded-full bg-yellow-200/20 blur-xl" />
        </div>

        {/* Twinkling Stars */}
        <div className="absolute inset-0">
          {/* Star Clusters with varied delays */}
          <div className="absolute top-[12%] left-[15%] w-2 h-2 rounded-full bg-amber-100 animate-twinkle-1 shadow-xs shadow-white" />
          <div className="absolute top-[18%] left-[45%] w-1.5 h-1.5 rounded-full bg-indigo-200 animate-twinkle-2" />
          <div className="absolute top-[8%] left-[70%] w-2.5 h-2.5 rounded-full bg-yellow-100 animate-twinkle-3 shadow-xs shadow-amber-200" />
          <div className="absolute top-[26%] left-[82%] w-1.5 h-1.5 rounded-full bg-white animate-twinkle-1" />
          <div className="absolute top-[35%] left-[25%] w-2 h-2 rounded-full bg-amber-200 animate-twinkle-2" />
          <div className="absolute top-[22%] left-[10%] w-1.5 h-1.5 rounded-full bg-indigo-100 animate-twinkle-3" />
          <div className="absolute top-[42%] left-[65%] w-2 h-2 rounded-full bg-yellow-100 animate-twinkle-1" />
          <div className="absolute top-[15%] left-[32%] w-1 h-1 rounded-full bg-white animate-twinkle-2" />
          <div className="absolute top-[50%] left-[88%] w-1.5 h-1.5 rounded-full bg-indigo-200 animate-twinkle-3" />
          <div className="absolute top-[58%] left-[18%] w-1 h-1 rounded-full bg-white animate-twinkle-1" />
          <div className="absolute top-[65%] left-[78%] w-1.5 h-1.5 rounded-full bg-amber-100 animate-twinkle-2" />
        </div>

        {/* Soft Silhouetted Night Clouds Drifting Lazily */}
        <div className="absolute top-[32%] left-[-20%] w-[140%] opacity-22 animate-cloud-slow">
          <svg viewBox="0 0 1200 350" fill="none" className="w-full h-auto">
            <path
              d="M 120 220 
                 C 100 180 130 140 180 150 
                 C 210 110 280 100 320 140 
                 C 360 90 450 100 480 150 
                 C 530 140 570 180 560 220 
                 C 590 230 600 270 560 290 
                 L 110 290 
                 C 70 280 80 230 120 220 Z"
              fill="#1e293b"
            />
            <path
              d="M 680 200 
                 C 660 160 700 120 750 130 
                 C 790 80 870 80 910 120 
                 C 960 70 1050 90 1070 140 
                 C 1120 140 1150 180 1130 220 
                 L 660 220 Z"
              fill="#1e293b"
            />
          </svg>
        </div>
      </div>

      {/* Subtle Readability Vignette: Ensures chat bubbles in foreground remain ultra readable */}
      <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/15 pointer-events-none" />
    </div>
  );
};
