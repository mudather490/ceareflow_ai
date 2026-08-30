import { z } from "zod";

/**
 * Resume Parser Service Interface & Schema
 * Spec: docs/architecture/04_AI_ARCHITECTURE.md:47
 */

export const parsedExperienceSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  title: z.string().min(1, "Job title is required"),
  location: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().default(false),
  bullets: z.array(
    z.object({
      text: z.string().min(1),
      order: z.number().int().default(0),
    })
  ).default([]),
});

export const parsedEducationSchema = z.object({
  institution: z.string().min(1, "Institution name is required"),
  degree: z.string().min(1, "Degree is required"),
  field: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().nullable().optional(),
});

export const parsedSkillSchema = z.object({
  name: z.string().min(1, "Skill name is required"),
  category: z.string().nullable().optional(),
});

export const parsedProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().default(""),
  url: z.string().nullable().optional(),
  techStack: z.array(z.string()).default([]),
});

export const parsedCertificationSchema = z.object({
  name: z.string().min(1, "Certification name is required"),
  issuer: z.string().nullable().optional(),
  issuedDate: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
});

export const parsedResumeSchema = z.object({
  name: z.string().nullable().optional(),
  headlineTitle: z.string().default(""),
  summary: z.string().default(""),
  location: z.string().default(""),
  contactEmail: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  portfolioUrl: z.string().nullable().optional(),
  experiences: z.array(parsedExperienceSchema).default([]),
  education: z.array(parsedEducationSchema).default([]),
  skills: z.array(parsedSkillSchema).default([]),
  projects: z.array(parsedProjectSchema).default([]),
  certifications: z.array(parsedCertificationSchema).default([]),
});

export type ParsedResumeDTO = z.infer<typeof parsedResumeSchema>;

export type ResumeParserArgs = {
  pdfBuffer: Buffer | Uint8Array;
  userId: string;
};

export interface ResumeParser {
  parse(args: ResumeParserArgs): Promise<ParsedResumeDTO>;
}
