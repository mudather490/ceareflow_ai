import { AIProvider } from "../provider";
import { ResumeParser, ResumeParserArgs, ParsedResumeDTO, parsedResumeSchema } from "../services/resumeParser";
import { NON_FABRICATION_PREAMBLE } from "../safety/nonFabrication";

if (typeof window !== "undefined") {
  throw new Error("GeminiProvider is server-only and must never be imported in client components");
}

export class GeminiResumeParser implements ResumeParser {
  private apiKey: string;
  private modelId: string;

  constructor(apiKey: string, modelId: string = "gemini-1.5-pro") {
    this.apiKey = apiKey;
    this.modelId = modelId;
  }

  async parse(args: ResumeParserArgs): Promise<ParsedResumeDTO> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const base64Pdf = Buffer.from(args.pdfBuffer).toString("base64");

    const prompt = `
${NON_FABRICATION_PREAMBLE}

TASK:
Extract structured candidate profile information from the attached PDF resume.
Only extract facts present in the resume. Do NOT fabricate companies, dates, or metrics.
If a section or field is missing in the resume, return empty array or null.

JSON FORMAT REQUIREMENTS:
Return a valid JSON object matching this exact schema:
{
  "name": string | null,
  "headlineTitle": string,
  "summary": string,
  "location": string,
  "contactEmail": string | null,
  "linkedinUrl": string | null,
  "portfolioUrl": string | null,
  "experiences": [
    {
      "company": string,
      "title": string,
      "location": string | null,
      "startDate": string | null (YYYY-MM-DD or YYYY-MM),
      "endDate": string | null (null if current),
      "isCurrent": boolean,
      "bullets": [
        { "text": string, "order": number }
      ]
    }
  ],
  "education": [
    {
      "institution": string,
      "degree": string,
      "field": string | null,
      "startDate": string | null,
      "endDate": string | null,
      "isCurrent": boolean,
      "description": string | null
    }
  ],
  "skills": [
    { "name": string, "category": string | null }
  ],
  "projects": [
    {
      "name": string,
      "description": string,
      "url": string | null,
      "techStack": string[]
    }
  ],
  "certifications": [
    {
      "name": string,
      "issuer": string | null,
      "issuedDate": string | null,
      "url": string | null
    }
  ]
}
`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Pdf,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:generateContent?key=${this.apiKey}`;

    let lastError: Error | null = null;

    // Up to 2 attempts
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!candidateText) {
          throw new Error("Gemini returned an empty candidate response.");
        }

        const parsedJson = JSON.parse(candidateText);
        const validated = parsedResumeSchema.parse(parsedJson);
        return validated;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt === 2) {
          break;
        }
      }
    }

    throw new Error(`AI_UNAVAILABLE: Failed to parse resume with Gemini: ${lastError?.message}`);
  }
}

export class GeminiProvider implements AIProvider {
  resumeParser: ResumeParser;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY ?? "";
    const modelId = process.env.GEMINI_MODEL ?? "gemini-1.5-pro";
    this.resumeParser = new GeminiResumeParser(apiKey, modelId);
  }
}
