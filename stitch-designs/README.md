# Stitch Design Reference

This directory contains the **Stitch HTML prototypes** used as the visual reference for `DESIGN_SYSTEM.md` and `tailwind.config.ts`.

- **Original folder:** previously named `dising stitch` (typo) — renamed to `stitch-designs` for GitHub-friendliness (no spaces, correct spelling).
- **Contents:** 14 variants, each with `code.html` (Tailwind markup) + `screen.png` (screenshot):

| Folder | Purpose |
|---|---|
| `careerflow_ai/` | Canonical `DESIGN.md` tokens (`surface`, `secondary`, etc.) |
| `careerflow_ai_landing_page/` | Marketing landing |
| `sign_up_careerflow_ai/` | Auth sign-up |
| `user_dashboard_careerflow_ai/` | Dashboard bento |
| `career_profile_careerflow_ai/` | Career Profile |
| `video_resume_match_job_careerflow_ai/` | Video Resume step 1 (form) |
| `video_resume_match_results_careerflow_ai/` | Video Resume match results (82% ring) |
| `video_resume_recorder_careerflow_ai/` | Recorder + teleprompter |
| `interview_coach_setup_careerflow_ai/` | Interview setup |
| `interview_coach_live_session_careerflow_ai/` | Interview live loop |
| `interview_coach_results_careerflow_ai/` | Interview results bento |
| `public_profile_careerflow_ai/` | Public profile variant A |
| `public_recruiter_profile_careerflow_ai/` | Public profile variant B |
| `simplified_public_profile_careerflow_ai/` | Public profile variant C |
| `simplified_resume_public_profile_careerflow_ai/` | **Canonical** minimal public profile (ADR-004) |

> **Do not edit `code.html` directly** — these are frozen references. UI implementation derives from `DESIGN_SYSTEM.md` tokens, not by copying HTML verbatim. See `docs/decisions/ADR-004-MINIMAL-PUBLIC-PROFILE.md` for the chosen public variant.

Historical docs still mention `dising stitch/` — treat as alias to this folder.
