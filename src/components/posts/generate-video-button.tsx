"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

interface Props {
  hasVideo: boolean;
  enabled: boolean;
}

function Spinner() {
  return (
    <svg
      className="mr-2 h-3 w-3 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GenerateVideoButton({ hasVideo, enabled }: Props) {
  const { pending } = useFormStatus();
  const title = enabled
    ? "Render slideshow + voiceover via ffmpeg (~30–90s)"
    : "Set VIDEO_GENERATION_ENABLED=true and OPENAI_API_KEY in .env";
  return (
    <Button
      type="submit"
      variant="secondary"
      className="px-3 py-1 text-xs"
      disabled={!enabled || pending}
      title={title}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <Spinner />
          Generating video…
        </>
      ) : hasVideo ? (
        "Re-generate video"
      ) : (
        "Generate video"
      )}
    </Button>
  );
}
