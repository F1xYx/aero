"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Package, RotateCw, type LucideIcon } from "lucide-react";

interface DesktopBuild {
  name: string;
  kind: "setup" | "portable";
  version: string;
  sizeBytes: number;
  mtime: string;
  downloadUrl: string;
}

type Status = "loading" | "ready" | "error";

const KIND_META: Record<DesktopBuild["kind"], { label: string; icon: LucideIcon }> = {
  setup: { label: "Setup-установщик", icon: Download },
  portable: { label: "Portable-версия", icon: Package },
};

function formatSizeMb(sizeBytes: number): string {
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function SkeletonCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
      {[0, 1].map((index) => (
        <div
          key={index}
          className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-white/10" />
            <div className="flex flex-col gap-2">
              <div className="h-3.5 w-36 animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-16 animate-pulse rounded-full bg-white/[0.06]" />
            </div>
          </div>
          <div className="mt-4 h-3 w-56 max-w-full animate-pulse rounded-full bg-white/[0.06]" />
          <div className="mt-2 h-3 w-40 animate-pulse rounded-full bg-white/[0.06]" />
          <div className="mt-5 h-11 animate-pulse rounded-xl bg-white/10" />
        </div>
      ))}
      <span className="sr-only">Загрузка списка сборок…</span>
    </div>
  );
}

export function DesktopDownloads() {
  const [builds, setBuilds] = useState<DesktopBuild[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const loadBuilds = useCallback(async (signal: AbortSignal) => {
    const response = await fetch("/api/desktop-builds", { signal });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data !== null &&
      (data as { ok?: unknown }).ok === true &&
      Array.isArray((data as { builds?: unknown }).builds)
    ) {
      return (data as { builds: DesktopBuild[] }).builds;
    }
    throw new Error("Unexpected response shape");
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadBuilds(controller.signal)
      .then((list) => {
        setBuilds(list);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load desktop builds:", error);
        setStatus("error");
      });

    return () => controller.abort();
  }, [loadBuilds, reloadKey]);

  const handleRetry = useCallback(() => {
    setBuilds([]);
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }, []);

  if (status === "loading") {
    return <SkeletonCards />;
  }

  if (status === "error") {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6"
      >
        <p className="text-[14.5px] text-zinc-300">
          Не удалось загрузить список сборок. Проверьте соединение и попробуйте ещё раз.
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-5 text-[13.5px] font-medium text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/[0.1]"
        >
          <RotateCw className="h-3.5 w-3.5" strokeWidth={1.8} />
          Повторить
        </button>
      </div>
    );
  }

  if (builds.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-[14.5px] text-zinc-500">
        Сборки скоро появятся — установщики Aero для Windows будут опубликованы здесь.
      </p>
    );
  }

  return (
    <div>
      <ul
        className="grid gap-4 sm:grid-cols-2"
        aria-label="Доступные сборки Aero для Windows"
      >
        {builds.map((build) => {
          const meta = KIND_META[build.kind];
          const Icon = meta.icon;
          return (
            <li
              key={build.name}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.05] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition-[border-color,background-color,transform] duration-500 hover:-translate-y-1 hover:border-violet-300/30 hover:bg-white/[0.07]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <Icon className="h-[18px] w-[18px] text-zinc-200" strokeWidth={1.6} />
                </span>
                <div className="min-w-0">
                  <p className="text-[14.5px] font-medium text-zinc-100">{meta.label}</p>
                  <p className="text-[12px] tabular-nums text-zinc-500">v{build.version}</p>
                </div>
              </div>
              <p className="mt-4 truncate text-[12px] text-zinc-500">{build.name}</p>
              <p className="mt-1 text-[12px] tabular-nums text-zinc-600">
                {formatSizeMb(build.sizeBytes)} · {formatDate(build.mtime)}
              </p>
              <a
                href={build.downloadUrl}
                download
                aria-label={`Скачать ${build.name}`}
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-zinc-950 shadow-[0_12px_40px_-12px_rgba(255,255,255,0.35)] transition-colors hover:bg-zinc-200"
              >
                <Download className="h-4 w-4" strokeWidth={2} />
                Скачать
              </a>
            </li>
          );
        })}
      </ul>
      <p className="mt-5 text-xs leading-relaxed text-zinc-600">
        Portable-версия не требует установки и запускается с любого носителя. Свежие сборки —
        вверху списка.
      </p>
    </div>
  );
}
