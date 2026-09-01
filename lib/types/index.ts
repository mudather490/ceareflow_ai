export type ExperienceDTO = {
  id: string;
  careerProfileId: string;
  userId: string;
  company: string;
  title: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  bullets: { text: string; order: number }[];
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type EducationDTO = {
  id: string;
  careerProfileId: string;
  userId: string;
  institution: string;
  degree: string;
  field: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SkillDTO = {
  id: string;
  careerProfileId: string;
  userId: string;
  name: string;
  category: string | null;
  proficiency: number | null;
  createdAt: string;
};

export type ProjectDTO = {
  id: string;
  careerProfileId: string;
  userId: string;
  name: string;
  description: string;
  url: string | null;
  techStack: string[];
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type CertificationDTO = {
  id: string;
  careerProfileId: string;
  userId: string;
  name: string;
  issuer: string | null;
  issuedDate: string | null;
  url: string | null;
  createdAt: string;
};

export type CareerProfileDTO = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  headlineTitle: string | null;
  summary: string | null;
  location: string | null;
  contactEmail: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  completionScore: number;
  lastEditedAt: string;
  createdAt: string;
  updatedAt: string;
  experiences: ExperienceDTO[];
  education: EducationDTO[];
  skills: SkillDTO[];
  projects: ProjectDTO[];
  certifications: CertificationDTO[];
};

export type JobDTO = {
  id: string;
  userId: string;
  title: string;
  company: string;
  description: string;
  descriptionHash: string;
  source: "video_resume" | "interview" | "resume_ai" | "manual";
  createdAt: string;
};

export type ResumeVersionDTO = {
  id: string;
  resumeId: string;
  versionNumber: number;
  filePath: string | null;
  fileUrl?: string | null;
  extractedText: string | null;
  parsedData: Record<string, unknown> | null;
  source: "upload" | "generated";
  createdAt: string;
};

export type MatchBreakdownItem = {
  label: string;
  status: "strong" | "partial" | "missing";
  detail?: string;
};

export type MatchDTO = {
  id: string;
  jobId: string;
  resumeVersionId: string;
  score: number;
  breakdown: MatchBreakdownItem[];
  talkingPoints: string[];
  createdAt: string;
};

export type ScriptDTO = {
  id: string;
  jobId: string;
  userId: string;
  opening: string;
  experience: string;
  skills: string;
  closing: string;
  wordCount: number;
  model: string;
  createdAt: string;
  updatedAt: string;
};

export type VideoDTO = {
  id: string;
  jobId: string;
  userId: string;
  storagePath: string;
  videoUrl?: string | null;
  mimeType: string;
  durationSec: number | null;
  fileSize: number | null;
  status: "processing" | "ready" | "failed";
  thumbnailPath?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicProfileDTO = {
  id: string;
  userId: string;
  jobId: string;
  videoId: string | null;
  resumeVersionId: string | null;
  slug: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicProfileViewDTO = {
  name: string;
  title: string | null;
  location: string | null;
  summary: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  contactEmail: string | null;
  experiences: Array<{
    company: string;
    title: string;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
    isCurrent: boolean;
    bullets: { text: string; order: number }[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string | null;
    startDate: string | null;
    endDate: string | null;
    isCurrent: boolean;
    description: string | null;
  }>;
  skills: Array<{
    name: string;
    category: string | null;
  }>;
  videoUrl: string | null;
  resumeUrl: string | null;
};

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "AI_UNAVAILABLE"
  | "INTERNAL_ERROR";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  field?: string;
};

export type ApiResponse<T> = { data: T; error: null } | { data: null; error: ApiError };
