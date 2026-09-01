import { GoogleGenerativeAI } from "@google/generative-ai";
import { NON_FABRICATION_PREAMBLE } from "../safety/nonFabrication";
import { ResumeParser, ParsedResumeDTO, parsedResumeSchema } from "../services/resumeParser";
import { JobParser, ParsedJobDescription, parsedJobDescriptionSchema } from "../services/jobParser";
import { ResumeJobMatcher, ResumeJobMatchResult, resumeJobMatchResultSchema } from "../services/resumeJobMatcher";
import { ScriptGenerator, GeneratedScript, generatedScriptSchema } from "../services/scriptGenerator";
import {
  InterviewQuestionGenerator,
  InterviewQuestionsResult,
  interviewQuestionsResultSchema,
} from "../services/interviewQuestionGenerator";
import {
  InterviewAnswerEvaluator,
  InterviewFeedback,
  interviewFeedbackSchema,
} from "../services/interviewAnswerEvaluator";
import {
  ResumeAnalyzer,
  ResumeAnalyzerResult,
  resumeAnalyzerResultSchema,
} from "../services/resumeAnalyzer";
import { AIProvider } from "../provider";
import { CareerProfileDTO, JobDTO, MatchDTO } from "@/lib/types";

export class GeminiResumeParser implements ResumeParser {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gemini-1.5-pro") {
    if (typeof window !== "undefined") {
      throw new Error("GeminiProvider can only be initialized on the server");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async parse(input: { pdfBuffer: Buffer; userId: string }): Promise<ParsedResumeDTO> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const prompt = `
${NON_FABRICATION_PREAMBLE}

You are an expert resume parsing engine.
Analyze the provided PDF resume document and extract candidate career facts into a clean, structured JSON format.

JSON Schema to strictly adhere to:
{
  "name": "Candidate Full Name (or empty string if not found)",
  "headlineTitle": "Current or target professional title",
  "summary": "Professional overview or summary paragraph",
  "location": "City, State or Country",
  "contactEmail": "email@example.com (or empty string)",
  "linkedinUrl": "https://linkedin.com/in/... (or empty string)",
  "portfolioUrl": "https://... (or empty string)",
  "experiences": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "location": "City, State or null",
      "startDate": "YYYY-MM or YYYY or null",
      "endDate": "YYYY-MM or YYYY or null",
      "isCurrent": boolean,
      "bullets": [
        { "text": "Bullet description of achievement or responsibility", "order": 0 }
      ]
    }
  ],
  "education": [
    {
      "institution": "University / College Name",
      "degree": "Degree (e.g. B.S., M.S.)",
      "field": "Field of Study or null",
      "startDate": "YYYY or null",
      "endDate": "YYYY or null",
      "isCurrent": boolean,
      "description": "Honors, GPA, or null"
    }
  ],
  "skills": [
    { "name": "Skill Name", "category": "Category or General" }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Project summary",
      "url": "URL or null",
      "techStack": ["Tech1", "Tech2"]
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuer or null",
      "issuedDate": "YYYY-MM or null",
      "url": "URL or null"
    }
  ]
}

Return ONLY valid JSON matching this schema.
`;

    const base64Data = input.pdfBuffer.toString("base64");
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64Data,
        },
      },
    ]);

    const text = result.response.text();
    const parsedJson = JSON.parse(text);
    return parsedResumeSchema.parse(parsedJson);
  }
}

export class GeminiJobParser implements JobParser {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gemini-1.5-pro") {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async parse(input: { description: string; title?: string; company?: string }): Promise<ParsedJobDescription> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const prompt = `
${NON_FABRICATION_PREAMBLE}

Analyze this Job Description:
Job Title: ${input.title || "Unknown"}
Company: ${input.company || "Unknown"}
Description:
${input.description}

Extract structured requirements into this JSON format:
{
  "requirements": ["Requirement 1", "Requirement 2"],
  "requiredSkills": ["Skill 1", "Skill 2"],
  "niceToHave": ["Nice to have 1"],
  "qualifications": ["Qualification 1"],
  "experienceLevel": "Entry / Mid / Senior / Lead / Executive"
}
`;

    const result = await model.generateContent(prompt);
    const parsedJson = JSON.parse(result.response.text());
    return parsedJobDescriptionSchema.parse(parsedJson);
  }
}

export class GeminiResumeJobMatcher implements ResumeJobMatcher {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gemini-1.5-pro") {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async match(input: {
    careerProfile: CareerProfileDTO;
    job: JobDTO;
  }): Promise<ResumeJobMatchResult> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const prompt = `
${NON_FABRICATION_PREAMBLE}

You are an AI alignment matching engine evaluating how well a candidate's verified Career Profile aligns with a target Job Description.

CRITICAL RULES:
1. The score is an "Alignment Indicator" (0-100) reflecting skill and experience overlap, NOT a hiring probability.
2. Rely ONLY on the candidate's verified profile data. If a requirement is not mentioned or weak in their profile, categorize it as "missing" or "partial". DO NOT invent experience.
3. Generate 2 to 3 actionable "talkingPoints" for their video introduction explaining how they can speak to their strengths and address any gaps.

Candidate Profile:
${JSON.stringify(input.careerProfile, null, 2)}

Target Job:
Title: ${input.job.title}
Company: ${input.job.company}
Description:
${input.job.description}

Return JSON with this exact schema:
{
  "score": 82,
  "breakdown": [
    { "label": "Requirement / Skill Name", "status": "strong" | "partial" | "missing", "detail": "Brief justification" }
  ],
  "strongMatches": ["Match 1", "Match 2"],
  "partialMatches": ["Partial 1"],
  "missingWeak": ["Missing 1"],
  "talkingPoints": [
    "Talking point 1 highlighting how to frame a core strength",
    "Talking point 2 addressing a skill gap with adaptability"
  ],
  "aiInsight": "Brief summary analysis of alignment"
}
`;

    const result = await model.generateContent(prompt);
    const parsedJson = JSON.parse(result.response.text());
    return resumeJobMatchResultSchema.parse(parsedJson);
  }
}

export class GeminiScriptGenerator implements ScriptGenerator {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gemini-1.5-pro") {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async generate(input: {
    careerProfile: CareerProfileDTO;
    job: JobDTO;
    match: ResumeJobMatchResult | MatchDTO;
    mode?: "initial" | "regenerate" | "shorten" | "natural";
    currentScript?: {
      opening: string;
      experience: string;
      skills: string;
      closing: string;
    };
  }): Promise<GeneratedScript> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const prompt = `
${NON_FABRICATION_PREAMBLE}

You are an expert video pitch scriptwriter for CareerFlow AI.
Generate a concise, professional 90-120 second video introduction script for the candidate targeting this specific role.

INVARIANTS:
1. Strict Non-Fabrication: Use ONLY verified facts from the candidate's profile. If specific metrics or context are missing, include a placeholder in format: [NEEDS_USER: ask candidate for specific metric].
2. Structure into 4 sections: "opening", "experience", "skills", "closing".
3. First-person voice ("I", "my"). Confident, natural, recruiter-focused.
4. Mode: ${input.mode || "initial"}. If "shorten", make it 30% more concise while keeping core facts. If "natural", make cadence conversational.

Candidate:
Name: ${input.careerProfile.displayName}
Summary: ${input.careerProfile.summary}
Experiences: ${JSON.stringify(input.careerProfile.experiences)}
Skills: ${JSON.stringify(input.careerProfile.skills.map((s) => s.name))}

Target Role:
Title: ${input.job.title}
Company: ${input.job.company}

Match Talking Points:
${JSON.stringify(input.match.talkingPoints)}

${input.currentScript ? `Current Script:\n${JSON.stringify(input.currentScript)}` : ""}

Return JSON format:
{
  "opening": "Opening section text...",
  "experience": "Relevant experience section text...",
  "skills": "Key competencies and skills section text...",
  "closing": "Closing section text...",
  "wordCount": 150
}
`;

    const result = await model.generateContent(prompt);
    const parsedJson = JSON.parse(result.response.text());
    const validated = generatedScriptSchema.parse(parsedJson);
    const computedWordCount = `${validated.opening} ${validated.experience} ${validated.skills} ${validated.closing}`.split(/\s+/).length;
    return {
      ...validated,
      wordCount: computedWordCount,
    };
  }
}

export class GeminiInterviewQuestionGenerator implements InterviewQuestionGenerator {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gemini-1.5-pro") {
    if (typeof window !== "undefined") {
      throw new Error("GeminiInterviewQuestionGenerator can only be initialized on the server");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async generate(input: {
    careerProfile: CareerProfileDTO;
    job: JobDTO;
    type: "behavioral" | "technical" | "mixed";
    difficulty: "easy" | "medium" | "hard";
    questionCount: number;
  }): Promise<InterviewQuestionsResult> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    const prompt = `
${NON_FABRICATION_PREAMBLE}

You are an expert interview coach generating tailored interview questions.

RULES:
1. Use ONLY facts present in the Career Profile and Job Description. DO NOT invent candidate experience, skills, education, achievements, certifications, employers, or qualifications.
2. If candidate has insufficient information for a category, still generate the question but set idealFocus to "[NEEDS_USER: ...]" describing missing info rather than fabricating.
3. Generate exactly ${input.questionCount} questions. Mix categories according to type "${input.type}":
   - behavioral: focus on behavioral/situational/resume_based
   - technical: focus on technical/role_specific
   - mixed: balanced across behavioral, technical, role_specific, company, resume_based, situational
4. Difficulty "${input.difficulty}" controls depth: easy=foundational, medium=applied, hard=expert/leadership.

Candidate Profile:
Name: ${input.careerProfile.displayName}
Headline: ${input.careerProfile.headlineTitle}
Summary: ${input.careerProfile.summary}
Experiences: ${JSON.stringify(input.careerProfile.experiences.map((e) => ({ company: e.company, title: e.title, bullets: e.bullets })))}
Skills: ${JSON.stringify(input.careerProfile.skills.map((s) => s.name))}
Education: ${JSON.stringify(input.careerProfile.education.map((e) => ({ institution: e.institution, degree: e.degree, field: e.field })))}
Projects: ${JSON.stringify(input.careerProfile.projects.map((p) => p.name))}
Certifications: ${JSON.stringify(input.careerProfile.certifications.map((c) => c.name))}

Job:
Title: ${input.job.title}
Company: ${input.job.company}
Description:
${input.job.description}

Return JSON:
{
  "questions": [
    {
      "question": "Question text ...?",
      "category": "behavioral|technical|role_specific|company|resume_based|situational",
      "difficulty": "easy|medium|hard",
      "idealFocus": "What a strong answer should cover, or [NEEDS_USER: ...] if missing info",
      "order": 0
    }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const parsedJson = JSON.parse(result.response.text());
    return interviewQuestionsResultSchema.parse(parsedJson);
  }
}

export class GeminiInterviewAnswerEvaluator implements InterviewAnswerEvaluator {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gemini-1.5-pro") {
    if (typeof window !== "undefined") {
      throw new Error("GeminiInterviewAnswerEvaluator can only be initialized on the server");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async evaluate(input: {
    question: string;
    answer: string;
    careerProfile: CareerProfileDTO;
    job: JobDTO;
    category?: string;
    difficulty?: string;
  }): Promise<InterviewFeedback> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const prompt = `
${NON_FABRICATION_PREAMBLE}

You are an expert interview coach evaluating a candidate's answer.

ANTI-FABRICATION: Do NOT invent candidate experience or skills not in the provided Career Profile. If answer references unverified claims, note it as unverifiable rather than penalizing creativity, but flag missing evidence with [NEEDS_USER] style guidance in improvement.

Question (${input.category || "general"}, ${input.difficulty || "medium"}):
${input.question}

Candidate Answer:
${input.answer}

Candidate Profile (for context, do not fabricate):
${JSON.stringify({ headline: input.careerProfile.headlineTitle, summary: input.careerProfile.summary, experiences: input.careerProfile.experiences.slice(0, 3).map((e) => e.title + " at " + e.company), skills: input.careerProfile.skills.slice(0, 10).map((s) => s.name) })}

Job Context:
Title: ${input.job.title}
Company: ${input.job.company}
Description snippet: ${input.job.description.slice(0, 800)}

Evaluate and return JSON:
{
  "score": 0-100,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1"],
  "improvement": "Actionable 2-3 sentence improvement guidance",
  "betterAnswer": "2-3 sentence outline of a stronger answer using ONLY verified profile facts, or [NEEDS_USER: ...] if missing",
  "feedback": "Concise overall feedback 1-2 sentences"
}

Scoring rubric: 90-100 strong, 70-89 proficient, 50-69 developing, 0-49 needs_work. Be calibrated and constructive.
`;

    const result = await model.generateContent(prompt);
    const parsedJson = JSON.parse(result.response.text());
    return interviewFeedbackSchema.parse(parsedJson);
  }
}

export class GeminiResumeAnalyzer implements ResumeAnalyzer {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gemini-1.5-pro") {
    if (typeof window !== "undefined") {
      throw new Error("GeminiResumeAnalyzer can only be initialized on the server");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async analyze(input: {
    careerProfile: CareerProfileDTO;
    resumeVersion?: import("@/lib/types").ResumeVersionDTO | null;
    job?: JobDTO | null;
  }): Promise<ResumeAnalyzerResult> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const hasJob = !!input.job;
    const prompt = `
${NON_FABRICATION_PREAMBLE}

You are an expert resume quality analyst for CareerFlow AI. Analyze the candidate's verified Career Profile ${hasJob ? "against the target Job" : "for general quality"}.

ANTI-FABRICATION RULES (STRICT):
- ONLY facts present in Career Profile. DO NOT invent skills, employers, titles, certifications, achievements, metrics, education, technologies, years of experience.
- If data is ambiguous or missing, DO NOT claim it is present or absent as a hallucinated issue. Say "[NEEDS_USER: ...]" or mark as unknown.
- Recommendations must distinguish facts vs suggestions. Never instruct to falsely add unverified qualifications.
- Missing keyword suggestions must be truthful: only suggest terms that reflect real profile-adjacent skills.

Candidate Career Profile:
Name: ${input.careerProfile.displayName}
Headline: ${input.careerProfile.headlineTitle}
Summary: ${input.careerProfile.summary}
Location: ${input.careerProfile.location}
Experiences: ${JSON.stringify(input.careerProfile.experiences.map((e) => ({ company: e.company, title: e.title, bullets: e.bullets })))}
Skills: ${JSON.stringify(input.careerProfile.skills.map((s) => s.name))}
Education: ${JSON.stringify(input.careerProfile.education.map((e) => ({ institution: e.institution, degree: e.degree, field: e.field })))}
Projects: ${JSON.stringify(input.careerProfile.projects.map((p) => ({ name: p.name, description: p.description })))}
Certifications: ${JSON.stringify(input.careerProfile.certifications.map((c) => c.name))}

${hasJob ? `Target Job:\nTitle: ${input.job!.title}\nCompany: ${input.job!.company}\nDescription:\n${input.job!.description}` : "No target job — do general quality analysis across summary, experience, skills, education, formatting."}

Return JSON with this exact schema:
{
  "overallScore": 0-100,
  "label": "needs_work|developing|proficient|strong",
  "summary": "2-3 sentence executive summary",
  "sectionScores": [
    { "section": "summary|experience|skills|education|formatting", "score": 0-100, "strengths": ["..."], "issues": ["..."], "recommendations": ["..."] }
  ],
  "strengths": ["strength 1", "strength 2"],
  "issues": ["issue 1", "issue 2"],
  "recommendations": ["recommendation 1 with STAR/action verb guidance", "recommendation 2"],
  "keywordSuggestions": ["keyword 1", "keyword 2"],
  "jobAlignment": ${hasJob ? `{
    "matchingStrengths": ["skill already present"],
    "missingWeakAreas": ["requirement not represented"],
    "keywordSuggestions": ["job-specific keyword truthful to profile"],
    "experienceRecommendations": ["emphasize existing experience X for requirement Y"]
  }` : "null"}
}

Scoring: overallScore is Resume Quality Score (no job) or Resume Alignment Score (with job), NOT hiring probability. Be calibrated: 90-100 strong, 70-89 proficient, 50-69 developing, 0-49 needs_work. Section scores average toward overall. Do not fabricate.
`;

    const result = await model.generateContent(prompt);
    const parsedJson = JSON.parse(result.response.text());
    return resumeAnalyzerResultSchema.parse(parsedJson);
  }
}

export class GeminiProvider implements AIProvider {
  resumeParser: GeminiResumeParser;
  jobParser: GeminiJobParser;
  resumeJobMatcher: GeminiResumeJobMatcher;
  scriptGenerator: GeminiScriptGenerator;
  interviewQuestionGenerator: InterviewQuestionGenerator;
  interviewAnswerEvaluator: InterviewAnswerEvaluator;
  resumeAnalyzer: ResumeAnalyzer;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required for GeminiProvider");
    }
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-pro";
    this.resumeParser = new GeminiResumeParser(apiKey, modelName);
    this.jobParser = new GeminiJobParser(apiKey, modelName);
    this.resumeJobMatcher = new GeminiResumeJobMatcher(apiKey, modelName);
    this.scriptGenerator = new GeminiScriptGenerator(apiKey, modelName);
    this.interviewQuestionGenerator = new GeminiInterviewQuestionGenerator(apiKey, modelName);
    this.interviewAnswerEvaluator = new GeminiInterviewAnswerEvaluator(apiKey, modelName);
    this.resumeAnalyzer = new GeminiResumeAnalyzer(apiKey, modelName);
  }
}
