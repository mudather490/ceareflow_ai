"use client";

type Props = {
  talkingPoints: string[];
};

export function TalkingPoints({ talkingPoints }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-label-md font-bold uppercase tracking-wider text-primary border-b border-outline-variant pb-2">
        Recommended Video Talking Points
      </h3>
      <p className="text-body-sm text-on-surface-variant">
        Incorporate these strategic angles into your video introduction to address key role requirements and bridge any gaps:
      </p>

      <div className="space-y-2.5 pt-1">
        {talkingPoints.map((point, idx) => (
          <div
            key={idx}
            className="p-3.5 bg-surface-container-lowest border border-outline-variant/80 rounded-xl flex items-start gap-3 shadow-sm hover:border-secondary/50 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-secondary/10 text-secondary flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
            </div>
            <p className="text-body-sm text-on-surface font-medium leading-relaxed">
              {point}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
