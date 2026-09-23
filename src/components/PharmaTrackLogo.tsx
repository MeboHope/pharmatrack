import type { SVGProps } from "react";

interface PharmaTrackLogoProps
  extends SVGProps<SVGSVGElement> {
  showWordmark?: boolean;
  subtitle?: boolean;
  compact?: boolean;
  light?: boolean;
}

export function PharmaTrackLogo({
  showWordmark = true,
  subtitle = false,
  compact = false,
  light = false,
  className = "",
  ...svgProps
}: PharmaTrackLogoProps) {
  const markSize = compact ? 38 : 44;

  return (
    <div
      className={`flex items-center gap-3 ${className}`}
    >
      <svg
        width={markSize}
        height={markSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        {...svgProps}
      >
        <defs>
          <linearGradient
            id="pharmatrackLogoGradient"
            x1="8"
            y1="6"
            x2="40"
            y2="42"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#38BDF8" />
            <stop
              offset="1"
              stopColor="#22577A"
            />
          </linearGradient>
        </defs>

        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="14"
          fill={
            light
              ? "white"
              : "url(#pharmatrackLogoGradient)"
          }
        />

        <path
          d="M24 9.5C20.4 12.1 16.6 13.7 12 14.2V22.8C12 31.2 16.9 36.8 24 39C31.1 36.8 36 31.2 36 22.8V14.2C31.4 13.7 27.6 12.1 24 9.5Z"
          fill={
            light
              ? "#22577A"
              : "rgba(255,255,255,0.96)"
          }
        />

        <rect
          x="21"
          y="16"
          width="6"
          height="18"
          rx="3"
          fill={
            light
              ? "white"
              : "#22577A"
          }
        />

        <rect
          x="15"
          y="22"
          width="18"
          height="6"
          rx="3"
          fill={
            light
              ? "white"
              : "#22577A"
          }
        />

        <circle
          cx="34.5"
          cy="13.5"
          r="4"
          fill={
            light
              ? "#38BDF8"
              : "white"
          }
        />

        <path
          d="M33 13.5H36M34.5 12V15"
          stroke={
            light
              ? "white"
              : "#22577A"
          }
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      {showWordmark && (
        <div className="min-w-0">
          <div
            className={`truncate text-lg font-bold tracking-tight ${
              light
                ? "text-white"
                : "text-[#22577A]"
            }`}
          >
            PharmaTrack
          </div>

          {subtitle && (
            <div
              className={`truncate text-[11px] font-medium ${
                light
                  ? "text-white/65"
                  : "text-slate-500"
              }`}
            >
              Pharmacy &amp; Clinic Management
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PharmaTrackLogo;