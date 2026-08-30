import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/provider";
import { uploadResumePdf } from "@/lib/storage/resume";
import { ParsedResumeDTO } from "@/lib/ai/services/resumeParser";
import { CareerProfileInput } from "@/lib/validation/profile";
import { CareerProfileDTO, ResumeVersionDTO } from "@/lib/types";

/**
 * Calculates profile completion score (0-100).
 * Spec: docs/architecture/02_DATABASE_SCHEMA.md:54 and docs/product/03_FEATURES.md:54
 */
export function calculateCompletionScore(data: {
  headlineTitle?: string | null;
  summary?: string | null;
  location?: string | null;
  contactEmail?: string | null;
  experiences?: Array<unknown>;
  education?: Array<unknown>;
  skills?: Array<unknown>;
  projects?: Array<unknown>;
  certifications?: Array<unknown>;
}): number {
  let score = 0;

  if (data.headlineTitle && data.headlineTitle.trim().length > 0) score += 15;
  if (data.summary && data.summary.trim().length > 0) score += 15;
  if (data.location && data.location.trim().length > 0) score += 10;
  if (data.contactEmail && data.contactEmail.trim().length > 0) score += 5;

  if (data.experiences && data.experiences.length > 0) {
    score += Math.min(25, 15 + (data.experiences.length - 1) * 5);
  }

  if (data.education && data.education.length > 0) score += 15;

  if (data.skills && data.skills.length > 0) {
    score += Math.min(10, data.skills.length >= 3 ? 10 : data.skills.length * 3);
  }

  if (
    (data.projects && data.projects.length > 0) ||
    (data.certifications && data.certifications.length > 0)
  ) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

export class CareerProfileService {
  /**
   * Retrieves the canonical Career Profile and all associated child entities for a user.
   */
  static async getProfileByUserId(userId: string): Promise<CareerProfileDTO | null> {
    const supabase = await createClient();

    // Fetch user row for displayName / avatarUrl
    const { data: userRow } = await supabase
      .from("users")
      .select("display_name, avatar_url")
      .eq("id", userId)
      .single();

    // Fetch career profile
    const { data: profile, error: profileError } = await supabase
      .from("career_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return null;
    }

    // Fetch child tables in parallel
    const [
      { data: experiences },
      { data: education },
      { data: skills },
      { data: projects },
      { data: certifications },
    ] = await Promise.all([
      supabase
        .from("experiences")
        .select("*")
        .eq("career_profile_id", profile.id)
        .order("order_index", { ascending: true })
        .order("start_date", { ascending: false }),
      supabase
        .from("education")
        .select("*")
        .eq("career_profile_id", profile.id)
        .order("start_date", { ascending: false }),
      supabase
        .from("skills")
        .select("*")
        .eq("career_profile_id", profile.id)
        .order("name", { ascending: true }),
      supabase
        .from("projects")
        .select("*")
        .eq("career_profile_id", profile.id)
        .order("order_index", { ascending: true }),
      supabase
        .from("certifications")
        .select("*")
        .eq("career_profile_id", profile.id)
        .order("issued_date", { ascending: false }),
    ]);

    const mappedExperiences = (experiences || []).map((exp) => ({
      id: exp.id,
      careerProfileId: exp.career_profile_id,
      userId: exp.user_id,
      company: exp.company,
      title: exp.title,
      location: exp.location,
      startDate: exp.start_date,
      endDate: exp.end_date,
      isCurrent: exp.is_current,
      bullets: Array.isArray(exp.bullets) ? exp.bullets : [],
      orderIndex: exp.order_index,
      createdAt: exp.created_at,
      updatedAt: exp.updated_at,
    }));

    const mappedEducation = (education || []).map((edu) => ({
      id: edu.id,
      careerProfileId: edu.career_profile_id,
      userId: edu.user_id,
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field,
      startDate: edu.start_date,
      endDate: edu.end_date,
      isCurrent: edu.is_current,
      description: edu.description,
      createdAt: edu.created_at,
      updatedAt: edu.updated_at,
    }));

    const mappedSkills = (skills || []).map((s) => ({
      id: s.id,
      careerProfileId: s.career_profile_id,
      userId: s.user_id,
      name: s.name,
      category: s.category,
      proficiency: s.proficiency,
      createdAt: s.created_at,
    }));

    const mappedProjects = (projects || []).map((p) => ({
      id: p.id,
      careerProfileId: p.career_profile_id,
      userId: p.user_id,
      name: p.name,
      description: p.description,
      url: p.url,
      techStack: Array.isArray(p.tech_stack) ? p.tech_stack : [],
      orderIndex: p.order_index,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    const mappedCertifications = (certifications || []).map((c) => ({
      id: c.id,
      careerProfileId: c.career_profile_id,
      userId: c.user_id,
      name: c.name,
      issuer: c.issuer,
      issuedDate: c.issued_date,
      url: c.url,
      createdAt: c.created_at,
    }));

    const score = calculateCompletionScore({
      headlineTitle: profile.headline_title,
      summary: profile.summary,
      location: profile.location,
      contactEmail: profile.contact_email,
      experiences: mappedExperiences,
      education: mappedEducation,
      skills: mappedSkills,
      projects: mappedProjects,
      certifications: mappedCertifications,
    });

    return {
      id: profile.id,
      userId: profile.user_id,
      displayName: userRow?.display_name || "Candidate",
      avatarUrl: userRow?.avatar_url || null,
      headlineTitle: profile.headline_title,
      summary: profile.summary,
      location: profile.location,
      contactEmail: profile.contact_email,
      linkedinUrl: profile.linkedin_url,
      portfolioUrl: profile.portfolio_url,
      completionScore: score,
      lastEditedAt: profile.last_edited_at,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      experiences: mappedExperiences,
      education: mappedEducation,
      skills: mappedSkills,
      projects: mappedProjects,
      certifications: mappedCertifications,
    };
  }

  /**
   * Commits and saves user-reviewed career profile data to the database.
   * Only called upon explicit user confirmation (e.g. PATCH /api/profile).
   */
  static async saveProfile(
    userId: string,
    input: CareerProfileInput
  ): Promise<CareerProfileDTO> {
    const supabase = await createClient();

    // 1. Update user display name if provided
    if (input.displayName) {
      await supabase
        .from("users")
        .update({ display_name: input.displayName })
        .eq("id", userId);
    }

    // 2. Calculate completion score
    const completionScore = calculateCompletionScore({
      headlineTitle: input.headlineTitle,
      summary: input.summary,
      location: input.location,
      contactEmail: input.contactEmail,
      experiences: input.experiences,
      education: input.education,
      skills: input.skills,
      projects: input.projects,
      certifications: input.certifications,
    });

    // 3. Upsert career_profiles record
    const { data: profile, error: profileErr } = await supabase
      .from("career_profiles")
      .upsert(
        {
          user_id: userId,
          headline_title: input.headlineTitle ?? null,
          summary: input.summary ?? null,
          location: input.location ?? null,
          contact_email: input.contactEmail ?? null,
          linkedin_url: input.linkedinUrl ?? null,
          portfolio_url: input.portfolioUrl ?? null,
          completion_score: completionScore,
          last_edited_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    if (profileErr || !profile) {
      throw new Error(`Failed to save career profile: ${profileErr?.message}`);
    }

    const profileId = profile.id;

    // 4. Sync Experiences if provided
    if (input.experiences !== undefined) {
      await supabase.from("experiences").delete().eq("career_profile_id", profileId);
      if (input.experiences.length > 0) {
        const rows = input.experiences.map((exp, idx) => ({
          career_profile_id: profileId,
          user_id: userId,
          company: exp.company,
          title: exp.title,
          location: exp.location ?? null,
          start_date: exp.startDate || null,
          end_date: exp.endDate || null,
          is_current: exp.isCurrent ?? false,
          bullets: Array.isArray(exp.bullets) ? exp.bullets : [],
          order_index: exp.orderIndex ?? idx,
        }));
        const { error: expErr } = await supabase.from("experiences").insert(rows);
        if (expErr) throw new Error(`Failed to save experiences: ${expErr.message}`);
      }
    }

    // 5. Sync Education if provided
    if (input.education !== undefined) {
      await supabase.from("education").delete().eq("career_profile_id", profileId);
      if (input.education.length > 0) {
        const rows = input.education.map((edu) => ({
          career_profile_id: profileId,
          user_id: userId,
          institution: edu.institution,
          degree: edu.degree,
          field: edu.field ?? null,
          start_date: edu.startDate || null,
          end_date: edu.endDate || null,
          is_current: edu.isCurrent ?? false,
          description: edu.description ?? null,
        }));
        const { error: eduErr } = await supabase.from("education").insert(rows);
        if (eduErr) throw new Error(`Failed to save education: ${eduErr.message}`);
      }
    }

    // 6. Sync Skills if provided
    if (input.skills !== undefined) {
      await supabase.from("skills").delete().eq("career_profile_id", profileId);
      if (input.skills.length > 0) {
        // Deduplicate skills by name
        const uniqueSkillsMap = new Map<string, typeof input.skills[0]>();
        for (const s of input.skills) {
          const key = s.name.trim().toLowerCase();
          if (!uniqueSkillsMap.has(key)) {
            uniqueSkillsMap.set(key, s);
          }
        }
        const rows = Array.from(uniqueSkillsMap.values()).map((s) => ({
          career_profile_id: profileId,
          user_id: userId,
          name: s.name.trim(),
          category: s.category ?? null,
          proficiency: s.proficiency ?? null,
        }));
        const { error: skillErr } = await supabase.from("skills").insert(rows);
        if (skillErr) throw new Error(`Failed to save skills: ${skillErr.message}`);
      }
    }

    // 7. Sync Projects if provided
    if (input.projects !== undefined) {
      await supabase.from("projects").delete().eq("career_profile_id", profileId);
      if (input.projects.length > 0) {
        const rows = input.projects.map((p, idx) => ({
          career_profile_id: profileId,
          user_id: userId,
          name: p.name,
          description: p.description || "",
          url: p.url || null,
          tech_stack: p.techStack || [],
          order_index: p.orderIndex ?? idx,
        }));
        const { error: projErr } = await supabase.from("projects").insert(rows);
        if (projErr) throw new Error(`Failed to save projects: ${projErr.message}`);
      }
    }

    // 8. Sync Certifications if provided
    if (input.certifications !== undefined) {
      await supabase.from("certifications").delete().eq("career_profile_id", profileId);
      if (input.certifications.length > 0) {
        const rows = input.certifications.map((c) => ({
          career_profile_id: profileId,
          user_id: userId,
          name: c.name,
          issuer: c.issuer ?? null,
          issued_date: c.issuedDate || null,
          url: c.url || null,
        }));
        const { error: certErr } = await supabase.from("certifications").insert(rows);
        if (certErr) throw new Error(`Failed to save certifications: ${certErr.message}`);
      }
    }

    // Return the full freshly saved profile
    const saved = await this.getProfileByUserId(userId);
    if (!saved) throw new Error("Could not reload saved profile.");
    return saved;
  }

  /**
   * PDF Upload + AI Parse -> Stages extracted data and creates resume_version.
   *
   * CRITICAL DATA BOUNDARY:
   * This method NEVER overwrites or modifies `career_profiles` or canonical child tables.
   * It stores the PDF, parses via AI, creates a resume_version, and returns the staged
   * DTO for user review in the Review Sheet.
   */
  static async parseAndStageResume(
    userId: string,
    pdfBuffer: Buffer,
    mimeTypeHint: string = "application/pdf"
  ): Promise<{
    resumeVersionId: string;
    versionNumber: number;
    filePath: string;
    isScanned?: boolean;
    parsedData: ParsedResumeDTO;
  }> {
    // 1. Upload to private Storage
    const uploadResult = await uploadResumePdf(userId, pdfBuffer, mimeTypeHint);

    // 2. Invoke ResumeParser AI Service
    const aiProvider = getAIProvider();
    const parsedData = await aiProvider.resumeParser.parse({
      pdfBuffer,
      userId,
    });

    const supabase = await createClient();

    // 3. Find or create logical resumes container
    let resumeId: string;
    const { data: existingResume } = await supabase
      .from("resumes")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (existingResume) {
      resumeId = existingResume.id;
    } else {
      const { data: newResume, error: resumeErr } = await supabase
        .from("resumes")
        .insert({
          user_id: userId,
          title: parsedData.headlineTitle || "Primary Resume",
        })
        .select("id")
        .single();
      if (resumeErr || !newResume) {
        throw new Error(`Failed to create resume entry: ${resumeErr?.message}`);
      }
      resumeId = newResume.id;
    }

    // 4. Calculate next monotonic version number
    const { data: latestVersion } = await supabase
      .from("resume_versions")
      .select("version_number")
      .eq("resume_id", resumeId)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    const nextVersionNumber = (latestVersion?.version_number ?? 0) + 1;

    // 5. Insert immutable resume_versions row
    const { data: versionRow, error: versionErr } = await supabase
      .from("resume_versions")
      .insert({
        id: uploadResult.versionId,
        resume_id: resumeId,
        user_id: userId,
        version_number: nextVersionNumber,
        file_path: uploadResult.filePath,
        parsed_data: parsedData as unknown as Record<string, unknown>,
        source: "upload",
      })
      .select("id, version_number")
      .single();

    if (versionErr || !versionRow) {
      throw new Error(`Failed to record resume version: ${versionErr?.message}`);
    }

    return {
      resumeVersionId: versionRow.id,
      versionNumber: versionRow.version_number,
      filePath: uploadResult.filePath,
      isScanned: uploadResult.isScanned,
      parsedData,
    };
  }

  /**
   * Lists all resume versions for a user.
   */
  static async listResumeVersions(
    userId: string,
    resumeId?: string
  ): Promise<ResumeVersionDTO[]> {
    const supabase = await createClient();
    let query = supabase
      .from("resume_versions")
      .select("*")
      .eq("user_id", userId)
      .order("version_number", { ascending: false });

    if (resumeId) {
      query = query.eq("resume_id", resumeId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((v) => ({
      id: v.id,
      resumeId: v.resume_id,
      versionNumber: v.version_number,
      filePath: v.file_path,
      extractedText: v.extracted_text,
      parsedData: v.parsed_data,
      source: v.source as "upload" | "generated",
      createdAt: v.created_at,
    }));
  }
}
