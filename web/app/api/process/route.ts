import crypto from "crypto";
import { NextResponse } from "next/server";
import { buildPrompt, type JourneyMode, type CameraMood, type LensProfile } from "@/lib/prompt";
import { fileToBase64 } from "@/lib/file";
import { generateWithFal } from "@/lib/fal";
import { generateWithPollinations } from "@/lib/pollinations";
import { validateMarineScene } from "@/lib/validator";
import type { GenerationResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

function parseJsonArray(raw: FormDataEntryValue | null): string[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => String(entry).trim()).filter(Boolean);
    }
    if (typeof parsed === "string") {
      return parsed
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  } catch {
    return raw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

async function runGeneration({
  file,
  location,
  mode,
  lens,
  mood,
  emphasis,
  aspectRatio
}: {
  file: File;
  location: string;
  mode: JourneyMode;
  lens: LensProfile;
  mood: CameraMood;
  emphasis: string[];
  aspectRatio: "1:1" | "4:3" | "3:2" | "16:9";
}): Promise<GenerationResult> {
  const id = crypto.randomUUID();
  const originalName = file.name || `upload-${id}.png`;

  try {
    const { positive, negative } = buildPrompt({
      location,
      mode,
      lens,
      cameraMood: mood,
      emphasis
    });

    const base64 = await fileToBase64(file);

    let imageUrl: string | undefined;
    let usedEngine = "pollinations";

    if (process.env.FAL_KEY) {
      try {
        imageUrl = await generateWithFal({
          baseImageBase64: base64,
          prompt: positive,
          negativePrompt: negative,
          aspectRatio,
          strength: 0.42
        });
        usedEngine = "fal-ai/flux-pro";
      } catch (falError) {
        console.error("FAL generation failed, falling back:", falError);
      }
    }

    if (!imageUrl) {
      imageUrl = await generateWithPollinations({
        prompt: positive,
        negativePrompt: negative,
        aspectRatio
      });
    }

    const validation = await validateMarineScene({
      imageUrl,
      location,
      expectations: [
        `mode: ${mode}`,
        `lens profile: ${lens}`,
        `mood: ${mood}`,
        `engine: ${usedEngine}`
      ]
    });

    const status =
      validation.status === "flagged" ? ("failed" as const) : ("completed" as const);

    return {
      id,
      originalName,
      stage: status,
      imageUrl,
      validation: {
        status: validation.status,
        issues: validation.issues,
        reasoning: validation.reasoning
      },
      metadata: {
        mode,
        lens,
        mood,
        engine: usedEngine,
        location,
        aspectRatio
      }
    };
  } catch (error) {
    console.error("Generation error:", error);
    return {
      id,
      originalName,
      stage: "failed",
      error:
        error instanceof Error
          ? error.message
          : "Unknown generation error encountered."
    };
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const location =
    formData.get("location")?.toString().trim() || "local waterways";
  const mode = (formData.get("mode")?.toString() as JourneyMode) ?? "running";
  const lens = (formData.get("lens")?.toString() as LensProfile) ?? "wide";
  const mood = (formData.get("mood")?.toString() as CameraMood) ?? "sunrise";
  const emphasis = parseJsonArray(formData.get("emphasis"));
  const aspectRatioRaw = formData.get("aspectRatio")?.toString() ?? "3:2";
  const aspectRatio =
    aspectRatioRaw === "1:1" ||
    aspectRatioRaw === "4:3" ||
    aspectRatioRaw === "16:9"
      ? aspectRatioRaw
      : ("3:2" as const);

  const files = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File);

  if (!files.length) {
    return NextResponse.json(
      { error: "No images provided." },
      { status: 400 }
    );
  }

  const results: GenerationResult[] = [];

  for (const file of files) {
    const result = await runGeneration({
      file,
      location,
      mode,
      lens,
      mood,
      emphasis,
      aspectRatio
    });
    results.push(result);
  }

  return NextResponse.json({
    location,
    mode,
    lens,
    mood,
    results
  });
}
