"use client";

type Props = {
  currentStep: 1 | 2 | 3;
};

export function VideoResumeStepper({ currentStep }: Props) {
  const steps = [
    { num: 1, label: "Match Job" },
    { num: 2, label: "Script & Record" },
    { num: 3, label: "Publish & Share" },
  ];

  return (
    <div className="flex items-center justify-center gap-2 md:gap-4 py-3">
      {steps.map((step, idx) => {
        const isActive = step.num === currentStep;
        const isPast = step.num < currentStep;

        return (
          <div key={step.num} className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-label-md font-bold transition-colors ${
                  isActive
                    ? "bg-secondary text-on-secondary shadow-sm ring-4 ring-secondary/20"
                    : isPast
                    ? "bg-[#137333] text-white"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {isPast ? (
                  <span className="material-symbols-outlined text-[18px]">check</span>
                ) : (
                  step.num
                )}
              </div>
              <span
                className={`text-label-md hidden sm:inline ${
                  isActive
                    ? "font-bold text-primary"
                    : isPast
                    ? "font-medium text-on-surface"
                    : "text-on-surface-variant font-normal"
                }`}
              >
                {step.label}
              </span>
            </div>

            {idx < steps.length - 1 && (
              <div
                className={`w-8 md:w-16 h-0.5 ${
                  isPast ? "bg-[#137333]" : "bg-outline-variant"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
