"use client";

import { MatchBreakdownItem } from "@/lib/types";

type Props = {
  breakdown: MatchBreakdownItem[];
};

export function SkillsBreakdown({ breakdown }: Props) {
  const strongItems = breakdown.filter((b) => b.status === "strong");
  const partialItems = breakdown.filter((b) => b.status === "partial");
  const missingItems = breakdown.filter((b) => b.status === "missing");

  return (
    <div className="space-y-4">
      <h3 className="text-label-md font-bold uppercase tracking-wider text-primary border-b border-outline-variant pb-2">
        Requirement & Skill Breakdown
      </h3>

      {/* Strong Matches */}
      {strongItems.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#137333]" />
            <span className="text-label-sm font-semibold text-[#137333]">
              Strong Matches ({strongItems.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {strongItems.map((item, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-[#e6f4ea] text-[#137333] rounded-full text-label-sm font-medium border border-[#ceead6] flex items-center gap-1.5"
                title={item.detail}
              >
                <span className="material-symbols-outlined text-[14px]">check</span>
                {item.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Partial Matches */}
      {partialItems.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#b06000]" />
            <span className="text-label-sm font-semibold text-[#b06000]">
              Partial / Transferable ({partialItems.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {partialItems.map((item, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-[#fef7e0] text-[#b06000] rounded-full text-label-sm font-medium border border-[#feefc3]"
                title={item.detail}
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing or Weak Requirements */}
      {missingItems.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#c5221f]" />
            <span className="text-label-sm font-semibold text-[#c5221f]">
              Identified Gaps ({missingItems.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {missingItems.map((item, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-[#fce8e6] text-[#c5221f] rounded-full text-label-sm font-medium border border-[#fad2cf]"
                title={item.detail}
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
