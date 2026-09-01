import { createClient } from "@/lib/supabase/server";
import { CareerProfileService } from "./careerProfileService";
import { JobService } from "./jobService";
import { getAIProvider } from "@/lib/ai/provider";
import { ResumeAiAnalyzeInput } from "@/lib/validation/resumeAi";
import { ResumeAnalyzerResult } from "@/lib/ai/services/resumeAnalyzer";
import { AnalyticsService } from "./analyticsService";

export class ResumeAiService {
  static async analyze(
    userId: string,
    input: ResumeAiAnalyzeInput
  ): Promise<ResumeAnalyzerResult> {
    const supabase = await createClient();

    // Verify resume version ownership
    const { data: resumeVersion, error: rvError } = await supabase
      .from("resume_versions")
      .select("id,resume_id,user_id,version_number,file_path,parsed_data,source")
      .eq("id", input.resumeVersionId)
      .eq("user_id", userId)
      .single();

    if (rvError || !resumeVersion) {
      throw new Error("Resume version not found or unauthorized");
    }

    let job = null;
    if (input.jobId) {
      job = await JobService.getJobById(userId, input.jobId);
      if (!job) {
        throw new Error("Job not found or unauthorized");
      }
    }

    const careerProfile = await CareerProfileService.getProfileByUserId(userId);
    if (!careerProfile) {
      throw new Error("Career profile not found. Please complete your profile first.");
    }

    const resumeVersionDto = {
      id: resumeVersion.id,
      resumeId: resumeVersion.resume_id,
      versionNumber: resumeVersion.version_number,
      filePath: resumeVersion.file_path,
      extractedText: null as string | null,
      parsedData: resumeVersion.parsed_data as Record<string, unknown> | null,
      source: resumeVersion.source as "upload" | "generated",
      createdAt: new Date().toISOString(),
    };

    const ai = getAIProvider();
    const result = await ai.resumeAnalyzer.analyze({
      careerProfile,
      resumeVersion: resumeVersionDto,
      job: job || null,
    });

    // Optionally persist analysis for history (non-fatal if fails)
    try {
      const { data: analysisRow, error: insErr } = await supabase
        .from("resume_analyses")
        .insert({
          user_id: userId,
          resume_version_id: input.resumeVersionId,
          job_id: input.jobId || null,
          summary: result.summary,
          category_scores: {
            overall: result.overallScore,
            sections: result.sectionScores.reduce((acc, s) => ({ ...acc, [s.section]: s.score }), {}),
          },
          model: result.model || "mock",
        })
        .select("id")
        .single();

      if (!insErr && analysisRow) {
        // Best-effort: create suggestions rows from recommendations/issues if needed, but not required for MVP display
        // We skip detailed suggestions insertion to keep flow simple; UI uses direct AI output
      }
    } catch {
      // Non-fatal
    }

    // Analytics: resume_analysis
    try {
      await AnalyticsService.recordEvent({
        userId,
        eventType: "resume_analysis",
        jobId: input.jobId || null,
        metadata: { resume_version_id: input.resumeVersionId, overallScore: result.overallScore, hasJob: !!input.jobId },
      });
    } catch {}

    return result;
  }

  static async listAnalyses(userId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("resume_analyses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error || !data) return [];
    return data;
  }
}
