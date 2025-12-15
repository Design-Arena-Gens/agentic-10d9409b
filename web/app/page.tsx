"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Compass,
  Loader2,
  MapPin,
  MinusCircle,
  RefreshCcw,
  Sparkles,
  Upload,
  Waves
} from "lucide-react";
import type {
  JourneyMode,
  CameraMood,
  LensProfile
} from "@/lib/prompt";
import type { GenerationResult } from "@/lib/types";

type AspectRatio = "1:1" | "4:3" | "3:2" | "16:9";

interface LocalUpload {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
}

const DEFAULT_EMPHASIS = [
  "clean foam wake trails",
  "glassy water reflections",
  "premium upholstery details",
  "dealer skyline visible in background"
];

const MODES: { value: JourneyMode; label: string; description: string }[] = [
  {
    value: "running",
    label: "On the Run",
    description: "High-energy action shot cutting through the water."
  },
  {
    value: "anchored",
    label: "Waterfront Lounge",
    description: "Serene hero shot while the boat is moored."
  },
  {
    value: "showcase",
    label: "Dealer Showcase",
    description: "Cinematic frame-perfect composition."
  }
];

const MOODS: { value: CameraMood; label: string }[] = [
  { value: "sunrise", label: "Sunrise Gold" },
  { value: "midday", label: "Midday Crystal" },
  { value: "sunset", label: "Sunset Ember" },
  { value: "night", label: "Blue Hour Glow" }
];

const LENSES: { value: LensProfile; label: string; pitch: string }[] = [
  {
    value: "wide",
    label: "Ultra-Wide",
    pitch: "Makes interiors spacious while keeping proportions honest."
  },
  {
    value: "telephoto",
    label: "Telephoto Hero",
    pitch: "Compresses background for a powerful hull-forward profile."
  },
  {
    value: "immersive",
    label: "Immersive Mid",
    pitch: "Eye-level cinematic waterline vantage."
  }
];

const ASPECTS: { value: AspectRatio; label: string }[] = [
  { value: "3:2", label: "3:2 Marina Catalog" },
  { value: "16:9", label: "16:9 Widescreen" },
  { value: "4:3", label: "4:3 Legacy" },
  { value: "1:1", label: "1:1 Square" }
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseTags(input: string): string[] {
  return input
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default function Page() {
  const [files, setFiles] = useState<LocalUpload[]>([]);
  const [location, setLocation] = useState("Fort Lauderdale, Florida");
  const [mode, setMode] = useState<JourneyMode>("running");
  const [mood, setMood] = useState<CameraMood>("sunrise");
  const [lens, setLens] = useState<LensProfile>("wide");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("3:2");
  const [emphasisInput, setEmphasisInput] = useState(DEFAULT_EMPHASIS.join("\n"));
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const mapped = acceptedFiles.map<LocalUpload>((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
      size: file.size
    }));
    setFiles((current) => [...current, ...mapped]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/heic": [".heic"]
    }
  });

  useEffect(() => {
    return () => {
      files.forEach((file) => URL.revokeObjectURL(file.preview));
    };
  }, [files]);

  const hasUploads = files.length > 0;

  const emphasisTags = useMemo(() => {
    const tags = parseTags(emphasisInput);
    if (!tags.length) {
      return DEFAULT_EMPHASIS;
    }
    return tags;
  }, [emphasisInput]);

  const handleProcess = useCallback(async () => {
    if (!files.length) {
      setError("Drop a set of trailer photos first.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResults([]);

    const body = new FormData();
    files.forEach((entry) => body.append("images", entry.file));
    body.append("location", location);
    body.append("mode", mode);
    body.append("mood", mood);
    body.append("lens", lens);
    body.append("aspectRatio", aspectRatio);
    body.append("emphasis", JSON.stringify(emphasisTags));

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        body
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error ?? "Generation failed.");
      }

      const payload = (await response.json()) as {
        results: GenerationResult[];
      };

      setResults(payload.results);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error occurred.";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [files, location, mode, mood, lens, aspectRatio, emphasisTags]);

  const resetWorkspace = useCallback(() => {
    setFiles((current) => {
      current.forEach((file) => URL.revokeObjectURL(file.preview));
      return [];
    });
    setResults([]);
    setError(null);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 lg:px-10">
        <section className="grid gap-10 lg:grid-cols-[2fr_1.2fr]">
          <div className="space-y-8">
            <header className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-ocean-500/15 px-4 py-1 text-sm font-medium text-ocean-200 ring-1 ring-inset ring-ocean-400/40">
                <Sparkles className="h-4 w-4 text-ocean-200" />
                MarinaVision Studio · AI Waterway Composer
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Transform trailer lot photos into on-water hero shots.
              </h1>
              <p className="max-w-2xl text-lg text-slate-300">
                Upload bulk lot photography, choose the dealership&apos;s local
                waterways, and let the agent rebuild each frame with premium
                cinematic water scenes tailored to your brand.
              </p>
            </header>

            <div
              {...getRootProps({
                className: [
                  "glass relative flex h-60 cursor-pointer flex-col items-center justify-center rounded-3xl border-dashed transition-all",
                  isDragActive
                    ? "border-ocean-400 bg-ocean-500/10"
                    : "border-white/10"
                ].join(" ")
              })}
            >
              <input {...getInputProps()} />
              <Upload className="mb-3 h-12 w-12 text-ocean-200" />
              <p className="text-lg font-medium text-white">
                Drop trailer photos or click to browse
              </p>
              <p className="mt-2 text-sm text-slate-400">
                High-resolution JPG, PNG, or HEIC up to 15MB each.
              </p>
              {hasUploads && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    resetWorkspace();
                  }}
                  className="absolute right-5 top-5 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              )}
            </div>

            {hasUploads && (
              <div className="glass rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    Batch queue
                  </h2>
                  <span className="text-sm text-slate-400">
                    {files.length} source photo{files.length > 1 ? "s" : ""}
                  </span>
                </div>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {files.map((file) => (
                    <li
                      key={file.id}
                      className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/5"
                    >
                      <Image
                        src={file.preview}
                        alt={file.name}
                        width={400}
                        height={240}
                        className="h-40 w-full object-cover"
                      />
                      <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-200">
                        <div className="flex flex-1 flex-col">
                          <span className="truncate font-medium">
                            {file.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatBytes(file.size)}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-200 transition hover:bg-red-500/80 hover:text-white"
                          onClick={() => {
                            URL.revokeObjectURL(file.preview);
                            setFiles((current) =>
                              current.filter((item) => item.id !== file.id)
                            );
                          }}
                        >
                          <MinusCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="glass h-fit rounded-3xl border-white/10 p-6">
            <h2 className="text-lg font-semibold text-white">
              Waterway intelligence
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Calibrate the on-water composition to match your local market and
              dealership storytelling.
            </p>

            <div className="mt-6 space-y-6">
              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <MapPin className="h-4 w-4 text-ocean-300" />
                  Dealer waterfront
                </span>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Marina, city, or waterway"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-ocean-300 focus:outline-none focus:ring-2 focus:ring-ocean-300/40"
                />
              </label>

              <fieldset className="space-y-2">
                <legend className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Compass className="h-4 w-4 text-ocean-300" />
                  Scene direction
                </legend>
                <div className="grid gap-2">
                  {MODES.map((option) => {
                    const active = mode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setMode(option.value)}
                        className={[
                          "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition",
                          active
                            ? "border-ocean-400 bg-ocean-500/15 text-white"
                            : "border-white/10 bg-white/5 text-slate-200 hover:border-ocean-300/60"
                        ].join(" ")}
                      >
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-semibold">
                            {option.label}
                          </p>
                          <p className="text-xs text-slate-400">
                            {option.description}
                          </p>
                        </div>
                        {active && (
                          <CheckCircle2 className="h-4 w-4 text-ocean-200" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <Waves className="h-4 w-4 text-ocean-300" />
                    Lighting & water
                  </span>
                  <select
                    value={mood}
                    onChange={(event) =>
                      setMood(event.target.value as CameraMood)
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-ocean-400 focus:outline-none focus:ring-2 focus:ring-ocean-400/30"
                  >
                    {MOODS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <Camera className="h-4 w-4 text-ocean-300" />
                    Lens profile
                  </span>
                  <select
                    value={lens}
                    onChange={(event) =>
                      setLens(event.target.value as LensProfile)
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-ocean-400 focus:outline-none focus:ring-2 focus:ring-ocean-400/30"
                  >
                    {LENSES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} · {option.pitch}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-2">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Sparkles className="h-4 w-4 text-ocean-300" />
                  Focus highlights
                </span>
                <textarea
                  value={emphasisInput}
                  onChange={(event) => setEmphasisInput(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-ocean-400 focus:outline-none focus:ring-2 focus:ring-ocean-400/30"
                />
                <p className="text-[11px] text-slate-500">
                  One idea per line — the agent uses these to accentuate local
                  identifiers and brand styling.
                </p>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Aspect preference
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ASPECTS.map((option) => {
                    const active = option.value === aspectRatio;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAspectRatio(option.value)}
                        className={[
                          "rounded-xl border px-4 py-3 text-left text-sm transition",
                          active
                            ? "border-ocean-400 bg-ocean-500/15 text-white"
                            : "border-white/10 bg-white/5 text-slate-200 hover:border-ocean-300/60"
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </label>

              <button
                type="button"
                disabled={isProcessing || !files.length}
                onClick={handleProcess}
                className={[
                  "w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-ocean-400/40",
                  files.length
                    ? "bg-ocean-500 hover:bg-ocean-400 disabled:cursor-not-allowed disabled:opacity-70"
                    : "cursor-not-allowed bg-white/10 text-slate-400"
                ].join(" ")}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing batch…
                  </span>
                ) : (
                  "Launch waterway rebuild"
                )}
              </button>

              {error && (
                <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                    <p>{error}</p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </section>

        {isProcessing && (
          <section className="glass rounded-3xl border-white/10 px-8 py-10">
            <div className="flex items-center gap-3 text-ocean-200">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm font-medium uppercase tracking-wide">
                Synthesizing on-water scenes…
              </p>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              Upload → Water physics simulation → Scenic regeneration → Vision
              QA. Larger batches can take up to a minute.
            </p>
          </section>
        )}

        {results.length > 0 && (
          <section className="space-y-6">
            <header className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold text-white">
                Delivery gallery
              </h2>
              <p className="text-sm text-slate-400">
                Every final frame passes the vision double-check to confirm no
                trailer artifacts remain.
              </p>
            </header>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {results.map((result) => (
                <article
                  key={result.id}
                  className="glass flex flex-col overflow-hidden rounded-3xl border border-white/10"
                >
                  <div className="relative aspect-[3/2] w-full">
                    {result.imageUrl ? (
                      <Image
                        src={result.imageUrl}
                        alt={result.originalName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-white/5 text-sm text-slate-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {result.originalName}
                      </h3>
                      <p className="text-xs uppercase tracking-wide text-ocean-200">
                        {result.metadata?.engine ?? "agent"} ·{" "}
                        {result.metadata?.mode}
                      </p>
                    </div>

                    {result.validation && (
                      <div
                        className={[
                          "rounded-xl border px-4 py-3 text-sm",
                          result.validation.status === "approved"
                            ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                            : result.validation.status === "skipped"
                              ? "border-slate-400/30 bg-slate-500/10 text-slate-200"
                              : "border-red-400/40 bg-red-500/10 text-red-100"
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                          {result.validation.status === "approved" && (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          {result.validation.status === "flagged" && (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          {result.validation.status === "skipped" && (
                            <Compass className="h-4 w-4" />
                          )}
                          QC Status · {result.validation.status}
                        </div>
                        {result.validation.reasoning && (
                          <p className="mt-1 text-xs leading-relaxed">
                            {result.validation.reasoning}
                          </p>
                        )}
                        {result.validation.issues?.length ? (
                          <ul className="mt-2 space-y-1 text-xs text-red-100">
                            {result.validation.issues.map((issue) => (
                              <li key={issue}>• {issue}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    )}

                    {result.stage === "failed" && result.error && (
                      <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-xs text-red-100">
                        {result.error}
                      </div>
                    )}

                    <a
                      href={result.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-xl border border-ocean-400/50 px-4 py-2 text-xs font-medium text-ocean-100 transition hover:border-ocean-300 hover:text-white"
                    >
                      Open full-resolution
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
