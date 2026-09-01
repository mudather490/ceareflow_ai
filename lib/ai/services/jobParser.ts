import { z } from "zod";

export const parsedJobDescriptionSchema = z.object({
  requirements: z.array(z.string()),
  requiredSkills: z.array(z.string()),
  niceToHave: z.array(z.string()),
  qualifications: z.array(z.string()),
  experienceLevel: z.string().optional(),
});

export type ParsedJobDescription = z.infer<typeof parsedJobDescriptionSchema>;

export interface JobParser {
  parse(input: {
    description: string;
    title?: string;
    company?: string;
  }): Promise<ParsedJobDescription>;
}
