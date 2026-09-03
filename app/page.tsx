"use client";

import { useStudio } from "@/lib/useStudio";
import { StudioShell } from "@/components/creator/StudioShell";

export default function Page() {
  const studio = useStudio();
  return <StudioShell studio={studio} />;
}
