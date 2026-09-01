import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports
import { createServiceClient } from "@/lib/supabase/service";
import { getAIProvider } from "@/lib/ai/provider";
import { CareerProfileService } from "./careerProfileService";
import { JobService } from "./jobService";
import { uploadVideoBuffer } from "@/lib/storage/video";
import { createSignedUrl } from "@/lib/storage/signedUrl";
import {
  MatchDTO,
  ScriptDTO,
  VideoDTO,
  PublicProfileDTO,
  PublicProfileViewDTO,
} from "@/lib/types";
import { MatchRequestInput } from "@/lib/validation/videoResume";

export class VideoResumeService {
  /**
   * 3A: Executes Job Matching Pipeline.
   * Reuses canonical Career Profile without re-uploading, upserts Job entity,
   * invokes ResumeJobMatcher, and persists the MatchDTO.
   */
  static async matchJob(
    userId: string,
    input: MatchRequestInput
  ): Promise<MatchDTO> {
    const careerProfile = await CareerProfileService.getProfileByUserId(userId);
    if (!careerProfile) {
      throw new Error(
        "Career Profile not found. Please create your profile before matching jobs."
      );
    }

    // 1. Upsert or reuse Job
    const job = await JobService.upsertJob(userId, {
      title: input.title,
      company: input.company,
      description: input.description,
      source: "video_resume",
    });

    // 2. Resolve Resume Version
    let resumeVersionId = input.resumeVersionId;
    if (!resumeVersionId) {
      const versions = await CareerProfileService.listResumeVersions(userId);
      if (versions.length > 0) {
        resumeVersionId = versions[0].id;
      }
    }

    // 3. Invoke AI ResumeJobMatcher
    const ai = getAIProvider();
    const matchResult = await ai.resumeJobMatcher.match({
      careerProfile,
      job,
    });

    const supabase = await createClient();

    // 4. Persist Match — map breakdown to legacy arrays + new breakdown column for DTO fidelity
    const strong = matchResult.breakdown.filter((b) => b.status === "strong").map((b) => b.label);
    const partial = matchResult.breakdown.filter((b) => b.status === "partial").map((b) => b.label);
    const missing = matchResult.breakdown.filter((b) => b.status === "missing").map((b) => b.label);

    const { data: matchRow, error: matchError } = await supabase
      .from("job_matches")
      .insert({
        job_id: job.id,
        resume_version_id: resumeVersionId || null,
        user_id: userId,
        score: matchResult.score,
        breakdown: matchResult.breakdown,
        strong_matches: strong,
        partial_matches: partial,
        missing_weak: missing,
        talking_points: matchResult.talkingPoints,
        ai_insight: matchResult.aiInsight || null,
        raw_analysis: matchResult as unknown as Record<string, unknown>,
        model: process.env.GEMINI_MODEL || "mock",
      })
      .select("*")
      .single();

    if (matchError || !matchRow) {
      throw new Error(`Failed to save match results: ${matchError?.message}`);
    }

    return {
      id: matchRow.id,
      jobId: matchRow.job_id,
      resumeVersionId: matchRow.resume_version_id || "",
      score: matchRow.score,
      breakdown: (matchRow.breakdown as MatchDTO["breakdown"]) || matchResult.breakdown,
      talkingPoints: matchRow.talking_points || matchResult.talkingPoints,
      createdAt: matchRow.created_at,
    };
  }

  /**
   * Fetches latest match result for a job.
   */
  static async getMatchByJobId(
    userId: string,
    jobId: string
  ): Promise<MatchDTO | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_matches")
      .select("*")
      .eq("job_id", jobId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      jobId: data.job_id,
      resumeVersionId: data.resume_version_id || "",
      score: data.score,
      breakdown: data.breakdown || [],
      talkingPoints: data.talking_points || [],
      createdAt: data.created_at,
    };
  }

  /**
   * 3B: Generates, retrieves, or adjusts (shorten/natural) an AI video script.
   */
  static async getOrCreateScript(
    userId: string,
    jobId: string,
    mode: "initial" | "regenerate" | "shorten" | "natural" = "initial"
  ): Promise<ScriptDTO> {
    const supabase = await createClient();

    // Check for existing script if not regenerating or transforming
    if (mode === "initial") {
      const { data: existing } = await supabase
        .from("scripts")
        .select("*")
        .eq("job_id", jobId)
        .eq("user_id", userId)
        .single();

      if (existing) {
        return {
          id: existing.id,
          jobId: existing.job_id,
          userId: existing.user_id,
          opening: existing.opening,
          experience: existing.experience,
          skills: existing.skills,
          closing: existing.closing,
          wordCount: existing.word_count,
          model: existing.model,
          createdAt: existing.created_at,
          updatedAt: existing.updated_at,
        };
      }
    }

    const [careerProfile, job, match] = await Promise.all([
      CareerProfileService.getProfileByUserId(userId),
      JobService.getJobById(userId, jobId),
      this.getMatchByJobId(userId, jobId),
    ]);

    if (!careerProfile || !job) {
      throw new Error("Career Profile or Job not found.");
    }

    const effectiveMatch: MatchDTO = match || {
      id: "temp",
      jobId,
      resumeVersionId: "",
      score: 80,
      breakdown: [],
      talkingPoints: [
        "Focus on your primary design/engineering experience.",
        "Emphasize user-centered delivery and cross-functional leadership.",
      ],
      createdAt: new Date().toISOString(),
    };

    let currentScriptData;
    if (mode === "shorten" || mode === "natural") {
      const { data: current } = await supabase
        .from("scripts")
        .select("opening, experience, skills, closing")
        .eq("job_id", jobId)
        .eq("user_id", userId)
        .single();
      if (current) currentScriptData = current;
    }

    const ai = getAIProvider();
    const generated = await ai.scriptGenerator.generate({
      careerProfile,
      job,
      match: effectiveMatch,
      mode,
      currentScript: currentScriptData,
    });

    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-pro";

    const { data: scriptRow, error } = await supabase
      .from("scripts")
      .upsert(
        {
          job_id: jobId,
          user_id: userId,
          opening: generated.opening,
          experience: generated.experience,
          skills: generated.skills,
          closing: generated.closing,
          word_count: generated.wordCount,
          model: modelName,
        },
        { onConflict: "job_id,user_id" }
      )
      .select("*")
      .single();

    if (error || !scriptRow) {
      throw new Error(`Failed to save script: ${error?.message}`);
    }

    return {
      id: scriptRow.id,
      jobId: scriptRow.job_id,
      userId: scriptRow.user_id,
      opening: scriptRow.opening,
      experience: scriptRow.experience,
      skills: scriptRow.skills,
      closing: scriptRow.closing,
      wordCount: scriptRow.word_count,
      model: scriptRow.model,
      createdAt: scriptRow.created_at,
      updatedAt: scriptRow.updated_at,
    };
  }

  /**
   * Saves candidate's manual edits to the script.
   */
  static async saveCustomScript(
    userId: string,
    jobId: string,
    scriptData: {
      opening: string;
      experience: string;
      skills: string;
      closing: string;
    }
  ): Promise<ScriptDTO> {
    const supabase = await createClient();
    const wordCount = `${scriptData.opening} ${scriptData.experience} ${scriptData.skills} ${scriptData.closing}`.split(
      /\s+/
    ).length;

    const { data: scriptRow, error } = await supabase
      .from("scripts")
      .upsert(
        {
          job_id: jobId,
          user_id: userId,
          opening: scriptData.opening,
          experience: scriptData.experience,
          skills: scriptData.skills,
          closing: scriptData.closing,
          word_count: wordCount,
          model: "user-edited",
        },
        { onConflict: "job_id,user_id" }
      )
      .select("*")
      .single();

    if (error || !scriptRow) {
      throw new Error(`Failed to save custom script: ${error?.message}`);
    }

    return {
      id: scriptRow.id,
      jobId: scriptRow.job_id,
      userId: scriptRow.user_id,
      opening: scriptRow.opening,
      experience: scriptRow.experience,
      skills: scriptRow.skills,
      closing: scriptRow.closing,
      wordCount: scriptRow.word_count,
      model: scriptRow.model,
      createdAt: scriptRow.created_at,
      updatedAt: scriptRow.updated_at,
    };
  }

  /**
   * 3B: Uploads recorded video to private storage and initializes draft public profile.
   */
  static async saveRecordedVideo(
    userId: string,
    jobId: string,
    buffer: Buffer,
    mimeType: string = "video/webm",
    durationSec?: number
  ): Promise<{ video: VideoDTO; publicProfile: PublicProfileDTO }> {
    // 0. Verify job ownership (prevent IDOR)
    const job = await JobService.getJobById(userId, jobId);
    if (!job) throw new Error("Job not found or not owned by user");

    // 1. Upload to private Storage
    const uploadResult = await uploadVideoBuffer(userId, jobId, buffer, mimeType);

    const supabase = await createClient();

    // 2. Insert video record — canonical column is file_size_bytes per 005 (spec)
    const { data: videoRow, error: videoError } = await supabase
      .from("videos")
      .insert({
        job_id: jobId,
        user_id: userId,
        storage_path: uploadResult.storagePath,
        mime_type: uploadResult.mimeType,
        duration_sec: durationSec || null,
        file_size_bytes: uploadResult.fileSize,
        status: "ready",
      })
      .select("*")
      .single();

    if (videoError || !videoRow) {
      throw new Error(`Failed to save video record: ${videoError?.message}`);
    }

    // 3. Resolve latest resume version
    const versions = await CareerProfileService.listResumeVersions(userId);
    const resumeVersionId = versions.length > 0 ? versions[0].id : null;

    // 4. Create or update draft public profile — slug is immutable per ADR-004
    const { data: existingForSlug } = await supabase
      .from("public_profiles")
      .select("slug, is_published")
      .eq("user_id", userId)
      .eq("job_id", jobId)
      .single();
    const slug = (existingForSlug as { slug: string } | null)?.slug || nanoid(10).toLowerCase();
    const preservePublished = (existingForSlug as { is_published: boolean } | null)?.is_published;

    const { data: profileRow, error: profileError } = await supabase
      .from("public_profiles")
      .upsert(
        {
          user_id: userId,
          job_id: jobId,
          video_id: videoRow.id,
          resume_version_id: resumeVersionId,
          slug: slug,
          // Preserve publish state if profile already existed; otherwise draft
          is_published: preservePublished ?? false,
        },
        { onConflict: "user_id,job_id" }
      )
      .select("*")
      .single();

    if (profileError || !profileRow) {
      throw new Error(
        `Failed to create draft public profile: ${profileError?.message}`
      );
    }

    return {
      video: {
        id: videoRow.id,
        jobId: videoRow.job_id,
        userId: videoRow.user_id,
        storagePath: videoRow.storage_path,
        mimeType: videoRow.mime_type,
        durationSec: videoRow.duration_sec,
        fileSize: (videoRow.file_size_bytes ?? videoRow.file_size) as number | null,
        status: videoRow.status,
        thumbnailPath: videoRow.thumbnail_path,
        createdAt: videoRow.created_at,
        updatedAt: (videoRow.updated_at as string) || videoRow.created_at,
      },
      publicProfile: {
        id: profileRow.id,
        userId: profileRow.user_id,
        jobId: profileRow.job_id,
        videoId: profileRow.video_id,
        resumeVersionId: profileRow.resume_version_id,
        slug: profileRow.slug,
        isPublished: profileRow.is_published,
        createdAt: profileRow.created_at,
        updatedAt: profileRow.updated_at,
      },
    };
  }

  /**
   * 3C: Gets owner's public profile by jobId or profileId.
   */
  static async getPublicProfileByJobId(
    userId: string,
    jobId: string
  ): Promise<PublicProfileDTO | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("public_profiles")
      .select("*")
      .eq("job_id", jobId)
      .eq("user_id", userId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      jobId: data.job_id,
      videoId: data.video_id,
      resumeVersionId: data.resume_version_id,
      slug: data.slug,
      isPublished: data.is_published,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  static async getPublicProfileById(
    userId: string,
    profileId: string
  ): Promise<PublicProfileDTO | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("public_profiles")
      .select("*")
      .eq("id", profileId)
      .eq("user_id", userId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      jobId: data.job_id,
      videoId: data.video_id,
      resumeVersionId: data.resume_version_id,
      slug: data.slug,
      isPublished: data.is_published,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * 3C: Publish or Unpublish the candidate's public profile.
   */
  static async updatePublicProfileStatus(
    userId: string,
    profileId: string,
    isPublished: boolean
  ): Promise<PublicProfileDTO> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("public_profiles")
      .update({ is_published: isPublished })
      .eq("id", profileId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update publication status: ${error?.message}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      jobId: data.job_id,
      videoId: data.video_id,
      resumeVersionId: data.resume_version_id,
      slug: data.slug,
      isPublished: data.is_published,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * 3C: Retrieves the minimal recruiter-facing public profile at /p/[slug].
   * Spec: ADR-004-MINIMAL-PUBLIC-PROFILE.md
   * Enforces strict public boundary:
   * Only published profiles are accessible to anonymous recruiters.
   * Never leaks internal IDs, AI prompts, Match scores, or private JD details.
   *
   * FIX: Must use service-role client for anonymous recruiter access.
   * RLS on public_profiles / career_profiles / storage is owner-only
   * (user_id = auth.uid()), so an anon createClient() would always return
   * 404 even for published slugs. Using service bypass is intentional and
   * safe because we filter to is_published=true and whitelist only fields.
   */
  static async getPublicProfileBySlug(
    slug: string
  ): Promise<PublicProfileViewDTO | null> {
    // Basic slug format validation (defense in depth, matches route validation)
    if (!slug || typeof slug !== "string" || slug.length < 3 || slug.length > 64) return null;
    // Use service-role to allow anonymous recruiter reads of published-only data
    const service = createServiceClient();

    // Query public_profiles by slug — service bypasses RLS but we enforce is_published
    const { data: pubProfile } = await service
      .from("public_profiles")
      .select("id, user_id, video_id, resume_version_id, is_published")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (!pubProfile) {
      return null;
    }

    const userId = pubProfile.user_id;

    // Fetch user info and career profile via service (bypass owner RLS but scoped to this userId)
    const [userRes, profileRes, experiencesRes, educationRes, skillsRes, videoRes, resumeRes] =
      await Promise.all([
        service.from("users").select("display_name").eq("id", userId).single(),
        service.from("career_profiles").select("*").eq("user_id", userId).single(),
        service
          .from("experiences")
          .select("company, title, location, start_date, end_date, is_current, bullets, order_index")
          .eq("user_id", userId)
          .order("order_index", { ascending: true })
          .order("start_date", { ascending: false }),
        service
          .from("education")
          .select("institution, degree, field, start_date, end_date, is_current, description")
          .eq("user_id", userId)
          .order("start_date", { ascending: false }),
        service
          .from("skills")
          .select("name, category")
          .eq("user_id", userId)
          .order("name", { ascending: true }),
        pubProfile.video_id
          ? service.from("videos").select("storage_path").eq("id", pubProfile.video_id).single()
          : Promise.resolve({ data: null }),
        pubProfile.resume_version_id
          ? service.from("resume_versions").select("file_path").eq("id", pubProfile.resume_version_id).single()
          : Promise.resolve({ data: null }),
      ]);

    const user = userRes.data;
    const profile = profileRes.data;

    let videoUrl: string | null = null;
    if (videoRes.data?.storage_path) {
      // Must use service-role to mint signed URLs for private bucket object (anon cannot)
      videoUrl = await createSignedUrl("videos", videoRes.data.storage_path, 300, true);
    }

    let resumeUrl: string | null = null;
    if (resumeRes.data?.file_path) {
      resumeUrl = await createSignedUrl("resumes", resumeRes.data.file_path, 60, true);
    }

    const experiences = (experiencesRes.data || []).map((exp) => ({
      company: exp.company,
      title: exp.title,
      location: exp.location,
      startDate: exp.start_date,
      endDate: exp.end_date,
      isCurrent: exp.is_current,
      bullets: Array.isArray(exp.bullets) ? exp.bullets : [],
    }));

    const education = (educationRes.data || []).map((edu) => ({
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field,
      startDate: edu.start_date,
      endDate: edu.end_date,
      isCurrent: edu.is_current,
      description: edu.description,
    }));

    const skills = (skillsRes.data || []).map((s) => ({
      name: s.name,
      category: s.category,
    }));

    return {
      name: user?.display_name || "Alex Mercer",
      title: profile?.headline_title || "Product Professional",
      location: profile?.location || null,
      summary: profile?.summary || null,
      linkedinUrl: profile?.linkedin_url || null,
      portfolioUrl: profile?.portfolio_url || null,
      contactEmail: profile?.contact_email || null,
      experiences,
      education,
      skills,
      videoUrl,
      resumeUrl,
    };
  }
}
