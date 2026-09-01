import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { JobDTO } from "@/lib/types";
import { JobInput } from "@/lib/validation/jobs";

/**
 * Normalizes text for consistent hash generation and deduplication.
 */
export function computeJobHash(title: string, company: string, description: string): string {
  const normalizedTitle = title.trim().toLowerCase();
  const normalizedCompany = company.trim().toLowerCase();
  const normalizedJD = description.trim().toLowerCase().replace(/\s+/g, " ");
  const raw = `${normalizedTitle}|${normalizedCompany}|${normalizedJD}`;
  return createHash("sha256").update(raw).digest("hex");
}

export class JobService {
  /**
   * Upserts or reuses a job based on its deduplication hash.
   * Spec: docs/modules/01_VIDEO_RESUME.md:63 & docs/architecture/02_DATABASE_SCHEMA.md:120
   */
  static async upsertJob(userId: string, input: JobInput): Promise<JobDTO> {
    const supabase = await createClient();
    const hash = computeJobHash(input.title, input.company, input.description);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Check for existing job within the 7-day deduplication window
    const { data: existing } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .eq("description_hash", hash)
      .gte("updated_at", sevenDaysAgo)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      return {
        id: existing.id,
        userId: existing.user_id,
        title: existing.title,
        company: existing.company,
        description: existing.description,
        descriptionHash: existing.description_hash,
        source: existing.source,
        createdAt: existing.created_at,
      };
    }

    // Insert new job record
    const { data: created, error } = await supabase
      .from("jobs")
      .insert({
        user_id: userId,
        title: input.title.trim(),
        company: input.company.trim(),
        description: input.description.trim(),
        description_hash: hash,
        source: input.source || "video_resume",
      })
      .select("*")
      .single();

    if (error || !created) {
      throw new Error(`Failed to create job: ${error?.message}`);
    }

    return {
      id: created.id,
      userId: created.user_id,
      title: created.title,
      company: created.company,
      description: created.description,
      descriptionHash: created.description_hash,
      source: created.source,
      createdAt: created.created_at,
    };
  }

  /**
   * Retrieves a job by ID ensuring tenant isolation (user_id).
   */
  static async getJobById(userId: string, jobId: string): Promise<JobDTO | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", userId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      company: data.company,
      description: data.description,
      descriptionHash: data.description_hash,
      source: data.source,
      createdAt: data.created_at,
    };
  }

  /**
   * Lists jobs belonging to the authenticated user.
   */
  static async listJobs(userId: string): Promise<JobDTO[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((d) => ({
      id: d.id,
      userId: d.user_id,
      title: d.title,
      company: d.company,
      description: d.description,
      descriptionHash: d.description_hash,
      source: d.source,
      createdAt: d.created_at,
    }));
  }
}
