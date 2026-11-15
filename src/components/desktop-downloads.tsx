"use client";

import { useCallback, useEffect, useState } from "react";

interface DesktopBuild {
  name: string;
  kind: "setup" | "portable";
  version: string;
  sizeBytes: number;
  mtime: string;
  downloadUrl: string;
}

type Status = "loading" | "ready" | "error";

const KIND_LABELS: Record<DesktopBuild["kind"], string> = {
  setup: "Setup-установщик",
  portable: "Portable-версия",
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

function SkeletonRows() {
  return (
    <div className="flex flex-col" aria-hidden="true">
      {[0, 1].map((index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-4 border-b border-white/[0.06] py-5"
        >
          <div className="flex flex-col gap-2">
            <div className="h-4 w-44 animate-pulse rounded-full bg-white/10" />
            <div className="h-3 w-64 max-w-full animate-pulse rounded-full bg-white/5" />
          </div>
          <div className="h-9 w-32 animate-pulse rounded-full bg-white/10" />
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
    return <SkeletonRows />;
  }

  if (status === "error") {
    return (
      <div role="alert" className="flex flex-col items-start gap-4 py-10">
        <p className="text-[15px] text-zinc-300">
          Не удалось загрузить список сборок. Проверьте соединение и попробуйте ещё раз.
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex h-10 items-center rounded-full border border-white/15 px-5 text-sm font-medium text-zinc-200 transition-colors hover:border-white/30 hover:text-white"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (builds.length === 0) {
    return (
      <p className="py-10 text-[15px] text-zinc-500">
        Сборки скоро появятся — установщики Aero для Windows будут опубликованы здесь.
      </p>
    );
  }

  return (
    <div>
      <ul className="flex flex-col" aria-label="Доступные сборки Aero для Windows">
        {builds.map((build) => (
          <li
            key={build.name}
            className="flex flex-col gap-3 border-b border-white/[0.06] py-5 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
          >
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-zinc-100">
                {KIND_LABELS[build.kind]}
                <span className="ml-2 text-zinc-600">v{build.version}</span>
              </p>
              <p className="mt-1 truncate text-[13px] text-zinc-500">
                {formatSizeMb(build.sizeBytes)} · {formatDate(build.mtime)} · {build.name}
              </p>
            </div>
            <a
              href={build.downloadUrl}
              download
              aria-label={`Скачать ${build.name}`}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-[#ff9f0a] px-5 text-sm font-semibold text-black transition-colors hover:bg-[#ffb340]"
            >
              Скачать
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs leading-relaxed text-zinc-600">
        Portable-версия не требует установки. Свежие сборки — вверху списка.
      </p>
    </div>
  );
}
