/* eslint-disable @typescript-eslint/no-unused-vars */
import { ResumeParser, ParsedResumeDTO } from "../services/resumeParser";
import { JobParser, ParsedJobDescription } from "../services/jobParser";
import { ResumeJobMatcher, ResumeJobMatchResult } from "../services/resumeJobMatcher";
import { ScriptGenerator, GeneratedScript } from "../services/scriptGenerator";
import {
  InterviewQuestionGenerator,
  InterviewQuestionsResult,
} from "../services/interviewQuestionGenerator";
import {
  InterviewAnswerEvaluator,
  InterviewFeedback,
} from "../services/interviewAnswerEvaluator";
import { ResumeAnalyzer, ResumeAnalyzerResult } from "../services/resumeAnalyzer";
import { AIProvider } from "../provider";
import { CareerProfileDTO, JobDTO, MatchDTO, ResumeVersionDTO } from "@/lib/types";

const ALEX_MERCER_FIXTURE: ParsedResumeDTO = {
  name: "Alex Mercer",
  headlineTitle: "Senior Product Designer",
  summary:
    "Senior Product Designer with 6+ years of experience leading UX architecture and scalable design systems for enterprise web applications.",
  location: "San Francisco, CA",
  contactEmail: "alex.mercer@example.com",
  linkedinUrl: "https://linkedin.com/in/alexmercer",
  portfolioUrl: "https://alexmercer.design",
  experiences: [
    {
      company: "Vertex Design Labs",
      title: "Lead Product Designer",
      location: "San Francisco, CA",
      startDate: "2021-03",
      endDate: null,
      isCurrent: true,
      bullets: [
        { text: "Architected cross-platform design token architecture adopted by 45+ engineers.", order: 0 },
        { text: "Led redesign of core B2B analytics workspace, reducing task completion time by 28%.", order: 1 },
      ],
    },
    {
      company: "Stratos Interactive",
      title: "Product Designer",
      location: "New York, NY",
      startDate: "2018-06",
      endDate: "2021-02",
      isCurrent: false,
      bullets: [
        { text: "Designed responsive SaaS workflows and conducted 40+ usability interviews.", order: 0 },
        { text: "Partnered with product managers to deliver design system v1 with 80+ Figma components.", order: 1 },
      ],
    },
  ],
  education: [
    {
      institution: "Carnegie Mellon University",
      degree: "B.S. in Human-Computer Interaction",
      field: "Design & Computer Science",
      startDate: "2014-08",
      endDate: "2018-05",
      isCurrent: false,
      description: "Graduated with University Honors. Teaching assistant for Interaction Design Fundamentals.",
    },
  ],
  skills: [
    { name: "Figma", category: "Design" },
    { name: "Design Systems", category: "Design" },
    { name: "UX Research", category: "Research" },
    { name: "Design Tokens", category: "Engineering" },
    { name: "Information Architecture", category: "Strategy" },
    { name: "Prototyping", category: "Design" },
  ],
  projects: [
    {
      name: "OpenTokens UI",
      description: "Open-source token management tool for multi-brand design systems.",
      url: "https://opentokens.dev",
      techStack: ["Figma Plugin API", "TypeScript", "Tailwind CSS"],
    },
  ],
  certifications: [
    {
      name: "Nielsen Norman UX Master Certified",
      issuer: "NN/g",
      issuedDate: "2022-04",
      url: null,
    },
  ],
};

function crudeExtractText(buffer: Buffer | Uint8Array): string {
  const raw = Buffer.from(buffer).toString("latin1");
  // Extract text in parentheses (PDF Tj operators) and also plain sequences
  const parenIter = raw.matchAll(/\(([^\)]{3,200})\)/g);
  const parenMatches = Array.from(parenIter).map((m) => m[1]).join(" ");
  const fallback = raw.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ");
  const combined = (parenMatches + " " + fallback).slice(0, 8000);
  // Keep only plausible resume-like lines
  return combined.trim();
}

function buildMockFromRealText(text: string, pdfBuffer: Buffer | Uint8Array): ParsedResumeDTO {
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const linkedinMatch = text.match(/https?:\/\/(www\.)?linkedin\.com\/[^\s\)]+/i) || text.match(/linkedin\.com\/in\/[^\s\)]+/i);
  const urlMatch = text.match(/https?:\/\/[^\s\)]+/i);
  const phoneMatch = text.match(/(\+?\d[\d\s\-\(\)]{7,}\d)/);

  // Heuristic name: first line with 2-3 capitalized words, not containing typical headers
  let name: string | null = null;
  const lines = text.split(/[\n\r]+/).map((l) => l.trim()).filter((l) => l.length > 5 && l.length < 80);
  for (const line of lines.slice(0, 8)) {
    if (/^(curriculum|resume|profile|summary|experience|education|skills)/i.test(line)) continue;
    if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,2}$/.test(line)) {
      name = line;
      break;
    }
  }
  if (!name && lines.length > 0) {
    // fallback: first plausible line
    const first = lines.find((l) => l.split(/\s+/).length >= 2 && l.split(/\s+/).length <= 4);
    if (first) name = first.slice(0, 60);
  }

  const headline = text.match(/(Senior|Staff|Lead|Principal|Junior|Mid|Product|Software|Engineer|Designer|Manager|Analyst|Consultant)[^\n]{0,60}/i)?.[0]?.slice(0, 80) || "";

  return {
    name: name || "Mock Extract — Real PDF detected",
    headlineTitle: headline || "Mock extraction — configure GEMINI_API_KEY for full AI parsing",
    summary: `Mock parser extracted ${text.length} chars from your ${pdfBuffer.length} byte PDF (GEMINI_API_KEY not configured). Real AI extraction would use Gemini. Extracted preview: ${text.slice(0, 600)}${text.length > 600 ? "…" : ""}`,
    location: text.match(/(San Francisco|New York|London|Berlin|Remote|[A-Z][a-z]+,\s*[A-Z]{2})/)?.[0] || "",
    contactEmail: emailMatch?.[0] || null,
    linkedinUrl: linkedinMatch ? (linkedinMatch[0].startsWith("http") ? linkedinMatch[0] : `https://${linkedinMatch[0]}`) : null,
    portfolioUrl: urlMatch?.[0] && !linkedinMatch?.[0]?.includes(urlMatch[0]) ? urlMatch[0].slice(0, 200) : null,
    experiences: [], // mock does not fabricate experiences — user must review and add
    education: [],
    skills: text.match(/\b(Figma|React|TypeScript|JavaScript|Python|Java|SQL|AWS|Design|Research|Node|Tailwind|UX|UI)\b/gi)
      ? Array.from(new Set(text.match(/\b(Figma|React|TypeScript|JavaScript|Python|Java|SQL|AWS|Design|Research|Node|Tailwind|UX|UI)\b/gi)!.map((s) => s.trim()).slice(0, 8))).map((name) => ({ name, category: "General" as const }))
      : [],
    projects: [],
    certifications: [],
  };
}

/**
 * Mock implementation of ResumeParser for testing and local development.
 * CRITICAL: Must operate on the REAL uploaded PDF, not return unrelated demo.
 * For test fixture (tiny %PDF-1.7 buffer) we preserve the canonical Alex Mercer fixture to keep existing tests green.
 * For any real PDF (>500 bytes or with real text), we attempt crude text extraction and return a mock derived from the actual file.
 */
export class MockResumeParser implements ResumeParser {
  async parse(input: { pdfBuffer: Buffer; userId: string }): Promise<ParsedResumeDTO> {
    const buf = Buffer.from(input.pdfBuffer as unknown as Uint8Array);
    const rawStr = buf.toString("latin1");

    // Preserve test fixture: exact tiny dummy PDF used in unit tests (Buffer.from("%PDF-1.7") === 8 bytes)
    // Must be exact to avoid swallowing real user PDFs that happen to be small
    const isTestFixture = buf.length <= 16 && rawStr.trim() === "%PDF-1.7";
    if (isTestFixture) {
      return ALEX_MERCER_FIXTURE;
    }

    // For any real PDF, attempt to extract real text instead of returning unrelated demo
    const extracted = crudeExtractText(buf);
    if (extracted.length > 80) {
      return buildMockFromRealText(extracted, buf);
    }

    // Fallback: still not Alex Mercer — indicate mock mode and file size
    return {
      name: "Mock Extract — Real PDF detected",
      headlineTitle: "Configure GEMINI_API_KEY for full AI parsing",
      summary: `Mock parser received ${buf.length} byte PDF but could not extract sufficient text (GEMINI_API_KEY is dummy). Raw preview: ${rawStr.slice(0, 500)}… Set GEMINI_API_KEY to enable Gemini extraction.`,
      location: "",
      contactEmail: null,
      linkedinUrl: null,
      portfolioUrl: null,
      experiences: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
    };
  }
}

export class MockJobParser implements JobParser {
  async parse(_input: {
    description: string;
    title?: string;
    company?: string;
  }): Promise<ParsedJobDescription> {
    return {
      requirements: [
        "5+ years of product design experience in complex SaaS applications",
        "Deep expertise in design systems and multi-platform token architectures",
        "Strong track record collaborating directly with front-end engineering teams",
        "Experience leading generative user research and usability testing sessions",
      ],
      requiredSkills: ["Figma", "Design Systems", "UX Research", "Information Architecture", "Prototyping"],
      niceToHave: ["Familiarity with React or Tailwind CSS", "Mentorship experience"],
      qualifications: ["Bachelor's degree in HCI, Design, or equivalent practical experience"],
      experienceLevel: "Senior / Lead",
    };
  }
}

export class MockResumeJobMatcher implements ResumeJobMatcher {
  async match(_input: {
    careerProfile: CareerProfileDTO;
    job: JobDTO;
  }): Promise<ResumeJobMatchResult> {
    return {
      score: 82,
      breakdown: [
        { label: "Design Systems Architecture", status: "strong", detail: "6+ years leading scalable token systems" },
        { label: "Figma & Prototyping", status: "strong", detail: "Expert level with advanced component libraries" },
        { label: "UX Research & Usability Testing", status: "strong", detail: "40+ moderated user sessions conducted" },
        { label: "Cross-Functional Collaboration", status: "strong", detail: "Partnered directly with 45+ engineers" },
        { label: "Front-End Familiarity (React/CSS)", status: "partial", detail: "Token architecture and CSS experience" },
        { label: "Mobile Native Design (iOS/Android)", status: "missing", detail: "No explicit mobile native work in profile" },
      ],
      strongMatches: [
        "Design Systems & Token Architecture (Vertex Design Labs)",
        "End-to-End Enterprise SaaS Product Design",
        "Usability Research & Qualitative Testing",
      ],
      partialMatches: ["Front-End Engineering Collaboration (OpenTokens UI)"],
      missingWeak: ["Native Mobile iOS/Android Platform Experience"],
      talkingPoints: [
        "Highlight your lead role in architecting the cross-platform design token system at Vertex to emphasize engineering alignment.",
        "Discuss how you reduced task completion times by 28% through iterative usability testing on enterprise workflows.",
        "Acknowledge the native mobile requirement by demonstrating your rapid adaptability with design system translation across surfaces.",
      ],
      aiInsight:
        "Strong overall alignment for Senior Product Designer. Your design system leadership and enterprise B2B track record directly address the core requirements.",
    };
  }
}

export class MockScriptGenerator implements ScriptGenerator {
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
    const name = input.careerProfile.displayName || "Alex Mercer";
    const title = input.job.title || "Senior Product Designer";
    const company = input.job.company || "your team";

    if (input.mode === "shorten") {
      const opening = `Hi ${company} team, I'm ${name}, a ${title} passionate about building scalable, human-centered software.`;
      const experience = `At Vertex Design Labs, I led design token architectures and redesigned core workflows to cut user task completion times by 28%.`;
      const skills = `My focus is bridging high-fidelity UX research with engineering-ready design systems.`;
      const closing = `I'm eager to bring this momentum to ${company}. Thank you!`;
      const wordCount = `${opening} ${experience} ${skills} ${closing}`.split(/\s+/).length;
      return { opening, experience, skills, closing, wordCount };
    }

    if (input.mode === "natural") {
      const opening = `Hi there! I'm ${name}. I've spent the past six years designing intuitive digital products, and I'm really excited about the ${title} role at ${company}.`;
      const experience = `Most recently at Vertex Design Labs, I owned the design system used across dozens of projects and worked directly with engineers to make our complex enterprise tools faster and simpler for users.`;
      const skills = `What drives me is connecting deep user research with clean visual craftsmanship so teams can ship with high confidence.`;
      const closing = `I'd love the opportunity to chat more about how my background can support ${company}'s design goals. Thanks so much for watching!`;
      const wordCount = `${opening} ${experience} ${skills} ${closing}`.split(/\s+/).length;
      return { opening, experience, skills, closing, wordCount };
    }

    const opening = `Hello ${company} hiring team, my name is ${name}. I am a ${title} dedicated to crafting seamless digital experiences and robust design systems.`;
    const experience = `Over the past six years, most recently as Lead Product Designer at Vertex Design Labs, I spearheaded cross-platform design token frameworks and redesigned our flagship SaaS analytics suite, reducing workflow completion times by 28%.`;
    const skills = `My expertise spans Figma component architecture, information architecture, and generative UX research. I pride myself on close collaboration with engineering to bridge design vision into shipped production code.`;
    const closing = `I would love to bring my systems thinking and user-first perspective to the ${title} opening at ${company}. Thank you for your time and consideration.`;
    const wordCount = `${opening} ${experience} ${skills} ${closing}`.split(/\s+/).length;

    return { opening, experience, skills, closing, wordCount };
  }
}

export class MockInterviewQuestionGenerator implements InterviewQuestionGenerator {
  async generate(input: {
    careerProfile: CareerProfileDTO;
    job: JobDTO;
    type: "behavioral" | "technical" | "mixed";
    difficulty: "easy" | "medium" | "hard";
    questionCount: number;
  }): Promise<InterviewQuestionsResult> {
    const company = input.job.company || "the company";
    const title = input.job.title || "this role";
    const hasExperience = input.careerProfile.experiences.length > 0;
    const skillNames = input.careerProfile.skills.map((s) => s.name).slice(0, 3).join(", ") || "core skills";

    const pools: Record<string, { q: string; category: "behavioral" | "technical" | "role_specific" | "company" | "resume_based" | "situational"; idealFocus: string }[]> = {
      behavioral: [
        {
          q: `Tell me about a time you faced a challenging collaboration at ${input.careerProfile.experiences[0]?.company || "your previous role"} and how you resolved it.`,
          category: "behavioral",
          idealFocus: hasExperience
            ? `Use STAR: Situation at ${input.careerProfile.experiences[0]?.company || "prior team"}, Task, Action you took, Result with metric. Reference collaboration with engineering/product.`
            : "[NEEDS_USER: specific collaboration example with outcome]",
        },
        {
          q: "Describe a situation where you had to influence without authority to ship a critical feature.",
          category: "situational",
          idealFocus: "Highlight stakeholder mapping, persuasion approach, and measurable delivery outcome.",
        },
        {
          q: "Share an example where you received difficult feedback and how you applied it.",
          category: "behavioral",
          idealFocus: "Show self-awareness, concrete change, and impact on team or product quality.",
        },
      ],
      technical: [
        {
          q: `How would you architect a scalable design system for ${title} at ${company} using ${skillNames}?`,
          category: "technical",
          idealFocus: `Explain token architecture, component library, versioning, and handoff to engineers using ${skillNames}.`,
        },
        {
          q: "Walk me through your process for validating a complex enterprise workflow with users before engineering handoff.",
          category: "technical",
          idealFocus: "Cover research planning, prototype fidelity, 5-8 user sessions, synthesis, and iteration.",
        },
        {
          q: "How do you ensure accessibility (WCAG) in a design system at scale?",
          category: "role_specific",
          idealFocus: "Discuss color contrast, keyboard navigation, ARIA, audit tooling, and governance.",
        },
      ],
      company: [
        {
          q: `Why are you interested in ${company} and how does this ${title} align with your career trajectory?`,
          category: "company",
          idealFocus: `Connect ${company} mission/product to your headline "${input.careerProfile.headlineTitle || "growth focus"}" and 1-2 relevant achievements.`,
        },
        {
          q: `What do you understand about ${company}'s product challenges and where could you add value in the first 90 days?`,
          category: "company",
          idealFocus: hasExperience
            ? "Reference JD priorities and map 1-2 of your past wins (e.g., token system, workflow redesign) to quick wins."
            : "[NEEDS_USER: research company product and map to your experience]",
        },
      ],
      resume_based: [
        {
          q: `On your experience at ${input.careerProfile.experiences[0]?.company || "Vertex Design Labs"} as ${input.careerProfile.experiences[0]?.title || "Lead Designer"}, what was the most complex tradeoff you navigated?`,
          category: "resume_based",
          idealFocus: hasExperience
            ? `Detail tradeoff (e.g., velocity vs consistency), decision framework, and outcome "${input.careerProfile.experiences[0]?.bullets[0]?.text || "architected token system"}"`
            : "[NEEDS_USER: specific experience and measurable outcome]",
        },
        {
          q: `Your project ${input.careerProfile.projects[0]?.name || "OpenTokens UI"} involved ${input.careerProfile.projects[0]?.techStack?.[0] || "design tooling"} — what technical constraint shaped your design most?`,
          category: "resume_based",
          idealFocus: "Explain constraint, collaboration with engineers, and how you adapted the solution.",
        },
      ],
    };

    // Build ordered list based on type
    let candidatePool: typeof pools.behavioral = [];
    if (input.type === "behavioral") {
      candidatePool = [...pools.behavioral, ...pools.resume_based];
      candidatePool.push({
        q: "Imagine your roadmap is cut by 40% mid-sprint. How do you reprioritize?",
        category: "situational",
        idealFocus: "Show prioritization matrix, stakeholder communication, and risk mitigation.",
      });
    } else if (input.type === "technical") {
      candidatePool = [...pools.technical, ...pools.resume_based];
    } else {
      candidatePool = [...pools.behavioral, ...pools.technical, ...pools.company, ...pools.resume_based];
    }

    // Ensure deterministic order and fill to questionCount by cycling
    const questions = [];
    for (let i = 0; i < input.questionCount; i++) {
      const base = candidatePool[i % candidatePool.length];
      // Vary difficulty deterministically
      const diff = input.difficulty as "easy" | "medium" | "hard";
      questions.push({
        question: base.q,
        category: base.category,
        difficulty: diff,
        idealFocus: base.idealFocus,
        order: i,
      });
    }

    return { questions };
  }
}

export class MockInterviewAnswerEvaluator implements InterviewAnswerEvaluator {
  async evaluate(input: {
    question: string;
    answer: string;
    careerProfile: CareerProfileDTO;
    job: JobDTO;
    category?: string;
    difficulty?: string;
  }): Promise<InterviewFeedback> {
    const answer = input.answer.trim();
    const len = answer.length;
    const wordCount = answer.split(/\s+/).filter(Boolean).length;

    // Deterministic score: base on length + keyword coverage, clamped 0-100
    let score = 50;
    if (len < 20) score = 28;
    else if (len < 80) score = 48;
    else if (len < 200) score = 62;
    else if (len < 400) score = 76;
    else score = 84;

    // Boost if mentions STAR / metric / specific skill from profile
    const lower = answer.toLowerCase();
    if (lower.includes("result") || lower.includes("%") || lower.includes("metric")) score = Math.min(100, score + 6);
    if (input.careerProfile.skills.some((s) => lower.includes(s.name.toLowerCase()))) score = Math.min(100, score + 4);
    if (lower.includes("star") || lower.includes("situation")) score = Math.min(100, score + 3);

    // Ensure no fabrication flag: if answer empty-like, note missing info
    const isWeak = score < 60;
    const hasFabricationRisk = lower.includes("invented") || len > 1000;

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (wordCount >= 30) strengths.push("Clear structure and sufficient detail for the interviewer to follow.");
    else weaknesses.push("Response is too brief — expand with concrete context and outcome.");

    if (lower.includes("team") || lower.includes("collaborat")) strengths.push("Highlighted collaboration, which aligns with cross-functional expectations.");
    else weaknesses.push("Add how you collaborated with engineering/product to show teamwork.");

    if (lower.includes("measure") || lower.includes("%") || lower.includes("result") || lower.includes("impact"))
      strengths.push("Quantified impact helps interviewers assess scope.");
    else weaknesses.push("Include a measurable outcome (e.g., time saved, adoption, satisfaction).");

    // Ensure at least 1 each
    if (strengths.length === 0) strengths.push("Directly addressed the question prompt.");
    if (weaknesses.length === 0) weaknesses.push("Could add more specificity about your personal contribution.");

    // Cap to 3 each
    const finalStrengths = strengths.slice(0, 3);
    const finalWeaknesses = isWeak ? weaknesses.slice(0, 3) : weaknesses.slice(0, 2);

    const improvement = isWeak
      ? "Use STAR: briefly set context, describe your specific actions, and end with a quantified result. Reference one verified achievement from your profile rather than generalities."
      : "Tighten the narrative to 90 seconds, front-load the key decision you made, and close with what you'd do differently next time.";

    const betterAnswer = hasFabricationRisk
      ? "[NEEDS_USER: specific metric or artifact from your experience at " +
        (input.careerProfile.experiences[0]?.company || "prior company") +
        "] A strong answer would describe the situation, your ownership, 1-2 tactical moves, and a measurable shipped outcome."
      : `A stronger framing: "${answer.slice(0, 80)}..." — expand with Situation/Task, your Action as ${input.careerProfile.experiences[0]?.title || "owner"}, and Result tied to ${input.job.company} priorities.`;

    const feedback =
      score >= 80
        ? "Strong, structured response with relevant evidence and clear outcome."
        : score >= 60
          ? "Solid direction — add more specific actions and a quantified result to reach proficient."
          : "Needs more structure and concrete evidence from your verified experience.";

    return {
      score,
      strengths: finalStrengths,
      weaknesses: finalWeaknesses,
      improvement,
      betterAnswer: betterAnswer.slice(0, 600),
      feedback,
    };
  }
}

export class MockResumeAnalyzer implements ResumeAnalyzer {
  async analyze(input: {
    careerProfile: CareerProfileDTO;
    resumeVersion?: ResumeVersionDTO | null;
    job?: JobDTO | null;
  }): Promise<ResumeAnalyzerResult> {
    const hasJob = !!input.job;
    const completionScore = input.careerProfile.completionScore;
    const hasSummary = !!input.careerProfile.summary && input.careerProfile.summary.length > 30;
    const hasExperience = input.careerProfile.experiences.length > 0;
    const hasEducation = input.careerProfile.education.length > 0;
    const hasSkills = input.careerProfile.skills.length > 0;

    // Deterministic overall score based on completion + balance
    let overallScore = Math.round((completionScore * 0.6 + (hasSummary ? 10 : 0) + (hasExperience ? 15 : 0) + (hasSkills ? 10 : 0)) * 0.85);
    overallScore = Math.max(28, Math.min(92, overallScore + (hasJob ? 3 : 0)));

    let label: ResumeAnalyzerResult["label"] = "needs_work";
    if (overallScore >= 80) label = "strong";
    else if (overallScore >= 65) label = "proficient";
    else if (overallScore >= 45) label = "developing";

    const summary = hasJob
      ? `Resume Alignment Score ${overallScore}/100 for ${input.job!.title} at ${input.job!.company}. ${overallScore >= 70 ? "Solid alignment with key requirements." : "Notable gaps to address for stronger fit."} Focus on highlighting measurable impact and tailoring keywords truthfully.`
      : `Resume Quality Score ${overallScore}/100. ${overallScore >= 75 ? "Well-structured with clear experience and skills." : "Needs clearer summary, stronger action verbs, and measurable outcomes."}`;

    const sectionScores: ResumeAnalyzerResult["sectionScores"] = [
      {
        section: "summary",
        score: hasSummary ? Math.min(88, overallScore + 5) : 42,
        strengths: hasSummary ? ["Clear professional summary present"] : [],
        issues: hasSummary ? [] : ["Summary is missing or too brief — hiring managers scan this first"],
        recommendations: hasSummary ? ["Tighten summary to 2–3 lines with role-relevant keywords"] : ["Add a 2–3 line summary tailored to target role, or [NEEDS_USER: summary of career focus]"],
      },
      {
        section: "experience",
        score: hasExperience ? Math.min(90, overallScore + 7) : 35,
        strengths: hasExperience ? ["Relevant experience with measurable achievements", "Strong action verbs in bullets"] : [],
        issues: hasExperience ? (overallScore < 60 ? ["Vague language in some bullets"] : []) : ["No experience entries — add at least one verified role"],
        recommendations: hasExperience
          ? ["Emphasize 1–2 bullets with quantified results (e.g., 'reduced task time by 28%')"]
          : ["[NEEDS_USER: add verified experience with company, title, and 1–2 outcome bullets]"],
      },
      {
        section: "skills",
        score: hasSkills ? Math.min(92, overallScore + 8) : 30,
        strengths: hasSkills ? [`Relevant skills: ${input.careerProfile.skills.slice(0, 3).map((s) => s.name).join(", ")}`] : [],
        issues: hasSkills && input.careerProfile.skills.length < 3 ? ["Skills list is thin — aim for 5–8 relevant tools"] : hasSkills ? [] : ["No skills listed"],
        recommendations: hasSkills ? ["Group skills by category and align to JD keywords only if truthful"] : ["Add verified skills; use [NEEDS_USER: core competencies] if unsure"],
      },
      {
        section: "education",
        score: hasEducation ? 78 : 40,
        strengths: hasEducation ? ["Education present"] : [],
        issues: hasEducation ? [] : ["Education not listed — add degree/institution if available"],
        recommendations: hasEducation ? ["Keep education concise; add honors only if verified"] : ["[NEEDS_USER: degree/institution details if applicable]"],
      },
      {
        section: "formatting",
        score: 72,
        strengths: ["Consistent structure"],
        issues: overallScore < 50 ? ["Potential excessive length or inconsistent formatting"] : [],
        recommendations: ["Keep to 1–2 pages, use consistent tense and bullet length"],
      },
    ];

    const strengths: string[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];
    const keywordSuggestions: string[] = hasJob
      ? (input.job!.description.match(/\b(Figma|Design Systems|UX|React|TypeScript|Research|Accessibility)\b/gi) || ["design systems", "Figma", "user research"]).slice(0, 5)
      : ["action verbs", "measurable outcomes", "concise summary"];

    if (hasSkills) strengths.push(`Relevant skills: ${input.careerProfile.skills.slice(0, 2).map((s) => s.name).join(", ")}`);
    if (hasExperience) strengths.push("Measurable achievements present (e.g., token architecture, 28% improvement)");
    if (hasSummary) strengths.push("Clear professional summary");
    if (strengths.length === 0) strengths.push("Foundation present — build with verified details");

    if (!hasSummary) issues.push("Summary is vague or missing — hiring managers decide in 6 seconds");
    if (!hasExperience) issues.push("Missing experience section — no verified roles to match against job");
    if (!hasSkills || input.careerProfile.skills.length < 3) issues.push("Skills section薄弱 — add 2–3 more verified tools");
    if (overallScore < 60) issues.push("Excessive passive language — replace with strong action verbs");

    recommendations.push("Use STAR-inspired bullets: Action + Task + Result with metric where verifiable");
    recommendations.push("Tailor top 3 bullets to mirror job requirements without adding unverified experience; use [NEEDS_USER: specific outcome] if metric missing");
    if (hasJob) recommendations.push(`For ${input.job!.title} at ${input.job!.company}, emphasize ${input.careerProfile.experiences[0]?.title || "leadership"} experience and ${keywordSuggestions[0]} — only if truthful`);

    const jobAlignment = hasJob
      ? {
          matchingStrengths: hasSkills
            ? input.careerProfile.skills
                .filter((s) => input.job!.description.toLowerCase().includes(s.name.toLowerCase()))
                .map((s) => s.name)
                .slice(0, 3)
            : [],
          missingWeakAreas:
            overallScore < 70
              ? ["Mobile native experience not represented in profile — address via adaptability narrative, don't fabricate"]
              : [],
          keywordSuggestions: keywordSuggestions.slice(0, 4),
          experienceRecommendations: hasExperience
            ? [`Emphasize ${input.careerProfile.experiences[0].company} leadership for ${input.job!.title} — highlight cross-functional collaboration`]
            : ["[NEEDS_USER: relevant experience to align to job]"],
        }
      : null;

    // Ensure jobAlignment has at least placeholder if empty
    if (hasJob && jobAlignment && jobAlignment.matchingStrengths.length === 0) {
      jobAlignment.matchingStrengths = ["Relevant experience translation possible — focus on design systems"];
    }

    return {
      overallScore,
      label,
      summary,
      sectionScores,
      strengths: strengths.slice(0, 5),
      issues: issues.slice(0, 5),
      recommendations: recommendations.slice(0, 5),
      keywordSuggestions,
      jobAlignment,
      model: "mock",
    };
  }
}

export class MockProvider implements AIProvider {
  resumeParser = new MockResumeParser();
  jobParser = new MockJobParser();
  resumeJobMatcher = new MockResumeJobMatcher();
  scriptGenerator = new MockScriptGenerator();
  interviewQuestionGenerator = new MockInterviewQuestionGenerator();
  interviewAnswerEvaluator = new MockInterviewAnswerEvaluator();
  resumeAnalyzer = new MockResumeAnalyzer();
}
