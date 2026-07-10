import React from 'react';

/**
 * RobotAvatar
 * Animated SVG robot avatar inspired by the friendly white robot reference image.
 * Uses CSS keyframe animations defined inline — no extra dependencies.
 * Variants: 'floating' (large, for header), 'small' (for message bubbles), 'fab' (for the FAB button)
 */
const RobotAvatar = ({ variant = 'floating', className = '' }) => {
  const sizes = {
    fab: { width: 36, height: 36 },
    small: { width: 28, height: 28 },
    floating: { width: 48, height: 48 },
  };

  const { width, height } = sizes[variant] || sizes.floating;

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width, height }}>
      <style>{`
        @keyframes bot-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes bot-eye-blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes bot-antenna-pulse {
          0%, 100% { opacity: 1; r: 2.5; }
          50% { opacity: 0.6; r: 3.5; }
        }
        @keyframes bot-chest-glow {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.4; }
        }
        .bot-float { animation: bot-float 3s ease-in-out infinite; }
        .bot-eye-blink { animation: bot-eye-blink 4s ease-in-out infinite; transform-origin: center; }
        .bot-antenna-pulse { animation: bot-antenna-pulse 2s ease-in-out infinite; }
        .bot-chest-glow { animation: bot-chest-glow 2.5s ease-in-out infinite; }
      `}</style>

      <svg
        viewBox="0 0 100 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="bot-float"
        style={{ width: '100%', height: '100%' }}
      >
        {/* --- Antenna --- */}
        <line x1="50" y1="8" x2="50" y2="18" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="6" r="4" fill="#6366f1" className="bot-antenna-pulse" />

        {/* --- Head --- */}
        {/* Outer shell */}
        <ellipse cx="50" cy="32" rx="26" ry="24" fill="#e2e8f0" />
        {/* Highlight sheen */}
        <ellipse cx="42" cy="22" rx="8" ry="5" fill="white" opacity="0.5" transform="rotate(-20 42 22)" />

        {/* Visor / face screen */}
        <rect x="28" y="24" width="44" height="20" rx="8" fill="#0f172a" />
        {/* Visor reflection */}
        <rect x="30" y="26" width="18" height="3" rx="1.5" fill="white" opacity="0.08" />

        {/* Eyes */}
        <g className="bot-eye-blink">
          <circle cx="40" cy="34" r="5" fill="white" />
          <circle cx="60" cy="34" r="5" fill="white" />
          <circle cx="41" cy="34" r="3" fill="#6366f1" />
          <circle cx="61" cy="34" r="3" fill="#6366f1" />
          {/* Eye shine */}
          <circle cx="42.5" cy="32.5" r="1.2" fill="white" />
          <circle cx="62.5" cy="32.5" r="1.2" fill="white" />
        </g>

        {/* Ear / side accent — left */}
        <circle cx="24" cy="32" r="5" fill="#cbd5e1" />
        <circle cx="24" cy="32" r="3" fill="#f59e0b" opacity="0.9" />

        {/* Ear / side accent — right */}
        <circle cx="76" cy="32" r="5" fill="#cbd5e1" />
        <circle cx="76" cy="32" r="3" fill="#6366f1" opacity="0.9" />

        {/* Neck */}
        <rect x="43" y="54" width="14" height="8" rx="3" fill="#cbd5e1" />

        {/* --- Body --- */}
        <rect x="26" y="60" width="48" height="36" rx="12" fill="#e2e8f0" />
        {/* Body highlight */}
        <rect x="30" y="63" width="20" height="4" rx="2" fill="white" opacity="0.45" />

        {/* Chest panel */}
        <rect x="34" y="68" width="32" height="20" rx="6" fill="#c7d2fe" opacity="0.7" />

        {/* Chest light */}
        <circle cx="50" cy="78" r="5" fill="#6366f1" className="bot-chest-glow" />
        <circle cx="50" cy="78" r="2.5" fill="white" opacity="0.8" />

        {/* Body detail dots */}
        <circle cx="39" cy="82" r="2" fill="#6366f1" opacity="0.6" />
        <circle cx="61" cy="82" r="2" fill="#6366f1" opacity="0.6" />

        {/* --- Arms --- */}
        {/* Left arm */}
        <rect x="10" y="62" width="16" height="26" rx="8" fill="#e2e8f0" />
        <circle cx="18" cy="91" r="6" fill="#cbd5e1" />
        {/* Left arm joint */}
        <circle cx="18" cy="64" r="4" fill="#cbd5e1" />

        {/* Right arm */}
        <rect x="74" y="62" width="16" height="26" rx="8" fill="#e2e8f0" />
        <circle cx="82" cy="91" r="6" fill="#cbd5e1" />
        {/* Right arm joint */}
        <circle cx="82" cy="64" r="4" fill="#cbd5e1" />

        {/* --- Legs --- */}
        {/* Left leg */}
        <rect x="32" y="94" width="14" height="20" rx="7" fill="#e2e8f0" />
        <ellipse cx="39" cy="114" rx="9" ry="5" fill="#cbd5e1" />

        {/* Right leg */}
        <rect x="54" y="94" width="14" height="20" rx="7" fill="#e2e8f0" />
        <ellipse cx="61" cy="114" rx="9" ry="5" fill="#cbd5e1" />

        {/* Bottom shadow */}
        <ellipse cx="50" cy="119" rx="24" ry="3" fill="#94a3b8" opacity="0.2" />
      </svg>
    </div>
  );
};

export default RobotAvatar;
