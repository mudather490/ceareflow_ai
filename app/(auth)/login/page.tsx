import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Log in — CareerFlow AI",
};

export default function LoginPage() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 shadow-[0_4px_40px_rgba(15,23,42,0.04)]">
      <h2 className="text-headline-sm font-semibold text-on-surface mb-1">Welcome back</h2>
      <p className="text-body-sm text-on-surface-variant mb-6">Log in to continue your flow.</p>
      <Suspense fallback={<div className="text-body-sm text-on-surface-variant">Loading…</div>}>
        <LoginForm />
      </Suspense>
      <p className="text-center text-body-sm text-on-surface-variant mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-secondary font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
