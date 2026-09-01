"use client";

export function CopyLinkButton() {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {}
  };
  return (
    <button
      type="button"
      aria-label="Copy profile link"
      onClick={handleCopy}
      className="text-secondary hover:underline hidden md:inline"
    >
      Copy link
    </button>
  );
}
