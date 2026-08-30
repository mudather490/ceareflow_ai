"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { ReviewExtractedDataSheet } from "@/components/career-profile/ReviewExtractedDataSheet";
import { ParsedResumeDTO } from "@/lib/ai/services/resumeParser";

export function OnboardingClient() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stagedData, setStagedData] = useState<ParsedResumeDTO | null>(null);
  const [isScanned, setIsScanned] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a standard PDF document.");
      setFile(null);
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError("File exceeds 10 MB limit.");
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleUploadAndParse = async () => {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/profile/resume", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error?.message || "Failed to process resume");
      }

      setStagedData(result.data.parsedData);
      setIsScanned(Boolean(result.data.isScanned));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaved = () => {
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-display font-bold text-on-surface">Let&apos;s build your Career Profile</h1>
        <p className="text-body-md text-on-surface-variant max-w-lg mx-auto">
          Upload your resume — our AI will extract your experience, skills, and background so you can review and save them in one place.
        </p>
      </header>

      {error && <ErrorAlert message={error} />}

      <Card className="p-8 border-dashed bg-surface-container-low/50 hover:bg-surface-container-low transition-colors">
        <div className="flex flex-col items-center text-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
            <span className="material-symbols-outlined text-[36px]">upload_file</span>
          </div>

          <div>
            <h3 className="text-headline-sm font-semibold text-on-surface">Upload Your Resume</h3>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Supports text-based PDF up to 10 MB • Stored privately & securely
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">folder_open</span>
              {file ? "Change PDF File" : "Choose PDF File"}
            </Button>

            {file && (
              <Button
                type="button"
                onClick={handleUploadAndParse}
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    Extracting Data…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    Extract & Review
                  </>
                )}
              </Button>
            )}
          </div>

          {file && (
            <p className="text-label-sm text-secondary font-medium">
              Selected: <span className="underline">{file.name}</span> ({(file.size / (1024 * 1024)).toFixed(2)} MB)
            </p>
          )}

          <p className="text-label-sm text-on-surface-variant pt-2 border-t border-outline-variant/60 w-full max-w-sm">
            Prefer to fill it manually?{" "}
            <Link href="/career-profile" className="text-secondary font-medium hover:underline">
              Go to blank profile
            </Link>
          </p>
        </div>
      </Card>

      <div className="flex justify-between items-center pt-2">
        <Link href="/dashboard" className="text-label-md text-on-surface-variant hover:text-primary transition-colors">
          Skip for now
        </Link>
        <Link href="/career-profile">
          <Button variant="ghost" className="text-label-md">
            Manual Entry <span className="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
          </Button>
        </Link>
      </div>

      {stagedData && (
        <ReviewExtractedDataSheet
          isOpen={Boolean(stagedData)}
          onClose={() => setStagedData(null)}
          stagedData={stagedData}
          isScanned={isScanned}
          onSaveSuccess={handleSaved}
        />
      )}
    </div>
  );
}
