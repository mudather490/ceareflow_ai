import { z } from "zod";

export const jobSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  company: z.string().min(1, "Company is required").max(120),
  description: z.string().min(20, "Description should be at least 20 characters").max(10000),
});

export type JobInput = z.infer<typeof jobSchema>;
