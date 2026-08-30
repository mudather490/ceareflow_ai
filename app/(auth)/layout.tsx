export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-secondary/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30vw] h-[30vw] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
      <div className="w-full max-w-[480px] z-10 relative">
        <div className="text-center mb-lg">
          <h1 className="text-headline-lg font-bold text-primary tracking-tight">CareerFlow AI</h1>
          <p className="text-body-md text-on-surface-variant mt-1">The Intelligent Partner for your career journey.</p>
        </div>
        {children}
        <p className="text-center text-label-sm text-on-surface-variant mt-6">
          By continuing, you agree to our{" "}
          <a href="#" className="underline hover:text-on-surface">Terms</a> and{" "}
          <a href="#" className="underline hover:text-on-surface">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
