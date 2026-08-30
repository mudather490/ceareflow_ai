"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { ParsedResumeDTO } from "@/lib/ai/services/resumeParser";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onExtracted: (data: ParsedResumeDTO, isScanned?: boolean) => void;
};

export function ResumeUploadModal({ isOpen, onClose, onExtracted }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a valid PDF file.");
      setFile(null);
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError("File exceeds 10 MB limit. Please upload a smaller PDF.");
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleUploadAndParse = async () => {
    if (!file) {
      setError("Please select a PDF resume to upload.");
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

      onExtracted(result.data.parsedData, result.data.isScanned);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full border border-outline-variant shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">upload_file</span>
            </div>
            <div>
              <h3 className="text-headline-sm font-semibold text-on-surface">Upload Resume</h3>
              <p className="text-body-sm text-on-surface-variant">Auto-populate your Career Profile with AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-on-surface-variant hover:text-primary p-1 rounded-md"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && <ErrorAlert message={error} />}

          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              file
                ? "border-secondary bg-secondary/5"
                : "border-outline-variant hover:border-secondary hover:bg-surface-container-low"
            } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-3 text-secondary">
              <span className="material-symbols-outlined text-[28px]">
                {file ? "description" : "cloud_upload"}
              </span>
            </div>

            {file ? (
              <div>
                <p className="text-label-md font-semibold text-primary">{file.name}</p>
                <p className="text-body-sm text-on-surface-variant mt-0.5">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze
                </p>
                <p className="text-label-sm text-secondary font-medium mt-2">Click to choose another file</p>
              </div>
            ) : (
              <div>
                <p className="text-label-md font-semibold text-primary">Click to upload your resume (PDF)</p>
                <p className="text-body-sm text-on-surface-variant mt-1">Text-based PDF up to 10 MB</p>
              </div>
            )}
          </div>

          <div className="p-3.5 bg-surface-container rounded-lg flex items-start gap-2.5 text-body-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-secondary mt-0.5">info</span>
            <p>
              Your PDF will be analyzed to stage career facts. You will have full opportunity to review and edit before anything is saved.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-outline-variant bg-surface-container-low flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUploadAndParse} disabled={!file || isUploading} className="min-w-[160px]">
            {isUploading ? (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                Parsing Resume…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                Extract & Review
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
