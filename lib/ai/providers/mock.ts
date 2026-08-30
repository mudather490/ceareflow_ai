import { AIProvider } from "../provider";
import { ResumeParser, ResumeParserArgs, ParsedResumeDTO } from "../services/resumeParser";

/**
 * Canonical Mock Provider for testing and offline development.
 * Uses Alex Mercer synthetic identity per GEMINI.md Rule 16.
 */
export class MockResumeParser implements ResumeParser {
  async parse(_args: ResumeParserArgs): Promise<ParsedResumeDTO> {
    return {
      name: "Alex Mercer",
      headlineTitle: "Senior Product Designer & UX Strategist",
      summary:
        "Strategic designer with 8+ years of experience leading UX initiatives for high-growth SaaS platforms. Passionate about translating complex user needs into elegant, functional interfaces.",
      location: "San Francisco, CA",
      contactEmail: "alex.mercer@example.com",
      linkedinUrl: "https://linkedin.com/in/alexmercer",
      portfolioUrl: "https://alexmercer.design",
      experiences: [
        {
          company: "TechCorp Innovations",
          title: "Principal Product Designer",
          location: "San Francisco, CA",
          startDate: "2021-01-01",
          endDate: null,
          isCurrent: true,
          bullets: [
            { text: "Led redesign of core analytics dashboard, improving user retention by 24%.", order: 0 },
            { text: "Managed and mentored a cross-functional team of 4 product designers.", order: 1 },
            { text: "Established design system tokens and component library adopted across 3 product lines.", order: 2 },
          ],
        },
        {
          company: "CreativeLoop",
          title: "Product Designer",
          location: "Austin, TX",
          startDate: "2018-06-01",
          endDate: "2020-12-31",
          isCurrent: false,
          bullets: [
            { text: "Delivered end-to-end UX/UI designs for 15+ high-growth B2B clients.", order: 0 },
            { text: "Conducted usability testing sessions with over 60 enterprise participants.", order: 1 },
          ],
        },
      ],
      education: [
        {
          institution: "Carnegie Mellon University",
          degree: "M.S. Human-Computer Interaction",
          field: "Human-Computer Interaction",
          startDate: "2015-09-01",
          endDate: "2017-05-01",
          isCurrent: false,
          description: "Focus on interactive system design and cognitive ergonomics.",
        },
        {
          institution: "Rhode Island School of Design",
          degree: "B.S. Graphic Design",
          field: "Design",
          startDate: "2011-09-01",
          endDate: "2015-05-01",
          isCurrent: false,
          description: "Graduated with honors in visual communications.",
        },
      ],
      skills: [
        { name: "UX Research", category: "Design" },
        { name: "Figma", category: "Tools" },
        { name: "Design Systems", category: "Design" },
        { name: "Prototyping", category: "Design" },
        { name: "Usability Testing", category: "Research" },
        { name: "HTML/CSS", category: "Engineering" },
      ],
      projects: [
        {
          name: "Design System 2.0",
          description: "Comprehensive multi-brand design tokens architecture for enterprise SaaS.",
          url: "https://alexmercer.design/projects/design-system",
          techStack: ["Figma", "Storybook", "TypeScript"],
        },
      ],
      certifications: [
        {
          name: "Certified Usability Analyst (CUA)",
          issuer: "Human Factors International",
          issuedDate: "2019-04-15",
          url: null,
        },
      ],
    };
  }
}

export class MockProvider implements AIProvider {
  resumeParser = new MockResumeParser();
}
