import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* TopNav — marketing variant */}
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-gutter h-16 bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-sm">
          <span className="text-headline-md font-bold text-primary">CareerFlow AI</span>
        </div>
        <div className="hidden md:flex gap-md items-center">
          <a href="#how-it-works" className="text-label-md text-on-surface-variant hover:bg-surface-container px-3 py-2 rounded transition-colors">
            How it Works
          </a>
          <a href="#features" className="text-label-md text-on-surface-variant hover:bg-surface-container px-3 py-2 rounded transition-colors">
            Features
          </a>
        </div>
        <div className="flex items-center gap-xs">
          <Link
            href="/login"
            className="hidden md:inline-flex text-label-md text-on-surface-variant hover:bg-surface-container px-4 py-2 rounded-lg transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-primary text-on-primary text-label-md font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="pt-24 pb-lg max-w-container-max mx-auto px-gutter md:px-lg w-full flex flex-col gap-xl">
        {/* Hero */}
        <section className="flex flex-col md:flex-row items-center gap-lg min-h-[600px]">
          <div className="flex-1 flex flex-col gap-md">
            <div className="inline-flex items-center gap-xs bg-surface-container-high px-3 py-1 rounded-full w-fit">
              <span className="w-2 h-2 bg-secondary rounded-full" />
              <span className="text-label-sm font-semibold text-secondary">Intelligent Career Partner</span>
            </div>
            <h1 className="text-display font-bold text-primary leading-tight">
              Turn Your Resume Into Your <span className="text-secondary">Career Advantage</span>
            </h1>
            <p className="text-body-lg text-on-surface-variant max-w-2xl">
              Create a recruiter-ready profile, practice interviews with AI, and improve your resume — all from one career profile.
            </p>
            <div className="flex flex-col sm:flex-row gap-sm mt-2">
              <Link
                href="/signup"
                className="bg-primary text-on-primary text-label-md font-semibold px-6 py-4 rounded-lg hover:opacity-90 transition-opacity text-center shadow-[0_4px_20px_rgba(15,23,42,0.1)]"
              >
                Create My Career Profile
              </Link>
              <a
                href="#features"
                className="bg-transparent border border-outline text-primary text-label-md font-medium px-6 py-4 rounded-lg hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">play_circle</span>
                See How It Works
              </a>
            </div>
            <div className="flex items-center gap-sm mt-2 text-body-sm text-on-surface-variant">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-surface-container border-2 border-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-xs">person</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-surface-container border-2 border-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-xs">person</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-surface-container border-2 border-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-xs">person</span>
                </div>
              </div>
              <span>Joined by 10,000+ professionals</span>
            </div>
          </div>

          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 bg-secondary/5 rounded-3xl blur-3xl rotate-3" />
            <div className="glass-panel rounded-2xl p-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10 ai-glow">
              <div className="w-full rounded-lg border border-outline-variant/30 aspect-video bg-surface-container-low flex items-center justify-center overflow-hidden">
                <div className="text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined fill text-[28px]">auto_awesome</span>
                  </div>
                  <p className="text-label-md font-semibold text-on-surface">Your career profile preview</p>
                  <p className="text-body-sm text-on-surface-variant mt-1">Resume AI + Video + Interview in one place</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex items-center gap-3 shadow-lg z-20">
              <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined">auto_awesome</span>
              </div>
              <div>
                <p className="text-label-sm text-on-surface-variant">Resume Score</p>
                <p className="text-headline-sm font-bold text-primary">94/100</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="flex flex-col gap-md mt-xl">
          <div className="text-center max-w-2xl mx-auto mb-lg">
            <h2 className="text-headline-lg font-semibold text-primary">Powerful Modules for Every Step</h2>
            <p className="text-body-md text-on-surface-variant mt-2">
              Our AI analyzes your unique career profile to provide personalized coaching and document generation.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-sm md:gap-md">
            <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant hover:shadow-level2 transition-shadow flex flex-col gap-sm md:col-span-2">
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-secondary mb-1">
                <span className="material-symbols-outlined">description</span>
              </div>
              <h3 className="text-headline-sm font-semibold text-primary">Resume AI</h3>
              <p className="text-body-sm text-on-surface-variant mb-2">
                Instantly tailor your resume to any job description. Our AI highlights your most relevant experience and suggests powerful action verbs.
              </p>
              <div className="mt-auto h-36 rounded-lg border border-outline-variant bg-surface-container-low flex items-center justify-center">
                <span className="text-label-sm text-on-surface-variant">AI scan visualization</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant hover:shadow-level2 transition-shadow flex flex-col gap-sm">
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-secondary mb-1">
                <span className="material-symbols-outlined">psychology</span>
              </div>
              <h3 className="text-headline-sm font-semibold text-primary">Interview Coach</h3>
              <p className="text-body-sm text-on-surface-variant mb-2">
                Practice with our AI interviewer. Get real-time feedback on your tone, pacing, and answer structure.
              </p>
              <div className="mt-auto bg-surface-container-highest p-3 rounded-lg border border-outline-variant/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-secondary text-sm">auto_awesome</span>
                  <span className="text-label-sm font-semibold text-secondary">AI Insight</span>
                </div>
                <p className="text-body-sm text-on-surface-variant text-xs italic">
                  &ldquo;Consider structuring your answer using the STAR method to provide more concrete examples.&rdquo;
                </p>
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant hover:shadow-level2 transition-shadow flex flex-col gap-sm">
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-secondary mb-1">
                <span className="material-symbols-outlined">video_camera_front</span>
              </div>
              <h3 className="text-headline-sm font-semibold text-primary">Video Resume</h3>
              <p className="text-body-sm text-on-surface-variant">Stand out with a polished video introduction. Teleprompter included.</p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant hover:shadow-level2 transition-shadow flex flex-col gap-sm md:col-span-2 bg-gradient-to-br from-surface-container-lowest to-surface-container">
              <div className="flex justify-between items-start">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-secondary mb-2 shadow-sm">
                    <span className="material-symbols-outlined">person_book</span>
                  </div>
                  <h3 className="text-headline-sm font-semibold text-primary">Unified Career Profile</h3>
                  <p className="text-body-sm text-on-surface-variant max-w-md">
                    Maintain a single, comprehensive record of your skills and experience. Every module draws from this central truth.
                  </p>
                </div>
                <Link
                  href="/signup"
                  className="bg-secondary text-on-secondary text-label-sm font-semibold px-4 py-2 rounded-full hover:bg-secondary/90 transition-colors hidden sm:block"
                >
                  Explore Profile
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant bg-surface-container-lowest py-6">
        <div className="max-w-container-max mx-auto px-gutter text-center text-body-sm text-on-surface-variant">
          © 2026 CareerFlow AI. The Intelligent Partner for your career journey.
        </div>
      </footer>
    </div>
  );
}
