import Link from "next/link";
import { SignupForm } from "./SignupForm";

export const metadata = {
  title: "Sign up — CareerFlow AI",
};

export default function SignupPage() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 shadow-[0_4px_40px_rgba(15,23,42,0.04)]">
      <h2 className="text-headline-sm font-semibold text-on-surface mb-1">Create your account</h2>
      <p className="text-body-sm text-on-surface-variant mb-6">Start your intelligent career flow in seconds.</p>
      <SignupForm />
      <p className="text-center text-body-sm text-on-surface-variant mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-secondary font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
