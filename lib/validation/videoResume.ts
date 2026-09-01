import { z } from "zod";

export const matchRequestSchema = z.object({
  resumeVersionId: z.string().uuid("Invalid resume version ID").optional(),
  title: z.string().min(1, "Job title is required").max(120).trim(),
  company: z.string().min(1, "Company is required").max(120).trim(),
  description: z.string().min(20, "Job description should be at least 20 characters").max(20000).trim(),
});

export type MatchRequestInput = z.infer<typeof matchRequestSchema>;

export const scriptGenerateSchema = z.object({
  jobId: z.string().uuid("Invalid job ID"),
  resumeVersionId: z.string().uuid("Invalid resume version ID").optional(),
  mode: z.enum(["initial", "regenerate", "shorten", "natural"]).optional().default("initial"),
});

export type ScriptGenerateInput = z.infer<typeof scriptGenerateSchema>;

export const scriptUpdateSchema = z.object({
  jobId: z.string().uuid("Invalid job ID"),
  opening: z.string().min(1, "Opening is required"),
  experience: z.string().min(1, "Experience section is required"),
  skills: z.string().min(1, "Skills section is required"),
  closing: z.string().min(1, "Closing is required"),
});

export type ScriptUpdateInput = z.infer<typeof scriptUpdateSchema>;

export const publicProfileUpdateSchema = z.object({
  isPublished: z.boolean(),
});

export type PublicProfileUpdateInput = z.infer<typeof publicProfileUpdateSchema>;
