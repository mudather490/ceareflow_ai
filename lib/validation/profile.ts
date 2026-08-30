import { z } from "zod";

export const experienceInputSchema = z.object({
  id: z.string().uuid().optional(),
  company: z.string().min(1, "Company name is required").max(150),
  title: z.string().min(1, "Job title is required").max(150),
  location: z.string().max(100).nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().default(false),
  bullets: z.array(
    z.object({
      text: z.string().min(1, "Bullet point cannot be empty"),
      order: z.number().int().default(0),
    })
  ).default([]),
  orderIndex: z.number().int().default(0),
});

export const educationInputSchema = z.object({
  id: z.string().uuid().optional(),
  institution: z.string().min(1, "Institution name is required").max(150),
  degree: z.string().min(1, "Degree is required").max(150),
  field: z.string().max(100).nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().max(1000).nullable().optional(),
});

export const skillInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Skill name is required").max(80),
  category: z.string().max(50).nullable().optional(),
  proficiency: z.number().int().min(0).max(100).nullable().optional(),
});

export const projectInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Project name is required").max(150),
  description: z.string().max(2000).default(""),
  url: z.string().url().max(300).nullable().optional().or(z.literal("")),
  techStack: z.array(z.string().max(50)).default([]),
  orderIndex: z.number().int().default(0),
});

export const certificationInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Certification name is required").max(150),
  issuer: z.string().max(150).nullable().optional(),
  issuedDate: z.string().nullable().optional(),
  url: z.string().url().max(300).nullable().optional().or(z.literal("")),
});

export const careerProfileInputSchema = z.object({
  displayName: z.string().max(100).optional(),
  headlineTitle: z.string().max(150).nullable().optional(),
  summary: z.string().max(3000).nullable().optional(),
  location: z.string().max(100).nullable().optional(),
  contactEmail: z.string().email("Invalid email address").max(150).nullable().optional().or(z.literal("")),
  linkedinUrl: z.string().max(300).nullable().optional().or(z.literal("")),
  portfolioUrl: z.string().max(300).nullable().optional().or(z.literal("")),
  experiences: z.array(experienceInputSchema).optional(),
  education: z.array(educationInputSchema).optional(),
  skills: z.array(skillInputSchema).optional(),
  projects: z.array(projectInputSchema).optional(),
  certifications: z.array(certificationInputSchema).optional(),
});

export type ExperienceInput = z.infer<typeof experienceInputSchema>;
export type EducationInput = z.infer<typeof educationInputSchema>;
export type SkillInput = z.infer<typeof skillInputSchema>;
export type ProjectInput = z.infer<typeof projectInputSchema>;
export type CertificationInput = z.infer<typeof certificationInputSchema>;
export type CareerProfileInput = z.infer<typeof careerProfileInputSchema>;

// Legacy alias for simple form checks
export const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100),
  headline: z.string().max(120).optional(),
  location: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal("")),
  linkedinUrl: z.string().optional().or(z.literal("")),
  summary: z.string().max(2000).optional(),
});
export type ProfileInput = z.infer<typeof profileSchema>;
