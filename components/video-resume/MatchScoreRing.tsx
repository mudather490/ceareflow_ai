"use client";

type Props = {
  score: number;
};

export function MatchScoreRing({ score }: Props) {
  const normalizedScore = Math.min(100, Math.max(0, score));
  const radius = 45;
  const circumference = 2 * Math.PI * radius; // ~282.74
  const strokeDashoffset = circumference * (1 - normalizedScore / 100);

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="text-surface-container-high stroke-current"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Animated score circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="text-secondary stroke-current transition-all duration-1000 ease-out"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-display font-bold text-primary leading-none">
            {normalizedScore}%
          </span>
          <span className="text-label-sm font-semibold text-secondary mt-1">
            {normalizedScore >= 80 ? "Strong Match" : normalizedScore >= 60 ? "Moderate" : "Gaps Found"}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-label-sm font-bold text-on-surface uppercase tracking-wider">
          Job Alignment Indicator
        </p>
        <p className="text-body-sm text-on-surface-variant max-w-xs mt-0.5">
          Quantified alignment between your verified Career Profile and target requirements.
        </p>
      </div>
    </div>
  );
}
