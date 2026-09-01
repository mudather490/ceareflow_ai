import { z } from "zod";
import { CareerProfileDTO, JobDTO, MatchDTO } from "@/lib/types";
import { ResumeJobMatchResult } from "./resumeJobMatcher";

export const generatedScriptSchema = z.object({
  opening: z.string().min(10),
  experience: z.string().min(10),
  skills: z.string().min(10),
  closing: z.string().min(10),
  wordCount: z.number().int().positive(),
});

export type GeneratedScript = z.infer<typeof generatedScriptSchema>;

export interface ScriptGenerator {
  generate(input: {
    careerProfile: CareerProfileDTO;
    job: JobDTO;
    match: ResumeJobMatchResult | MatchDTO;
    mode?: "initial" | "regenerate" | "shorten" | "natural";
    currentScript?: {
      opening: string;
      experience: string;
      skills: string;
      closing: string;
    };
  }): Promise<GeneratedScript>;
}
