import { NextResponse } from "next/server";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOWNLOAD_DIR = "/home/z/my-project/download";
const BUILD_PATTERN = /^(?:Aero|Aera)-(Setup|Portable)-(.+)\.exe$/i;
const VERSION_PATTERN = /\d+(?:\.\d+){0,3}/;

type BuildKind = "setup" | "portable";

interface DesktopBuild {
  name: string;
  kind: BuildKind;
  version: string;
  sizeBytes: number;
  mtime: string;
  downloadUrl: string;
}

function parseVersion(raw: string): string | null {
  const match = raw.match(VERSION_PATTERN);
  return match ? match[0] : null;
}

function versionKey(version: string): number[] {
  return version.split(".").map((part) => Number.parseInt(part, 10) || 0);
}

/** Descending semantic-ish version comparison ("2.10.0" > "2.9.5"). */
function compareVersionsDesc(a: string, b: string): number {
  const av = versionKey(a);
  const bv = versionKey(b);
  const length = Math.max(av.length, bv.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (av[i] ?? 0) - (bv[i] ?? 0);
    if (diff !== 0) return diff > 0 ? -1 : 1;
  }
  return 0;
}

function kindRank(kind: BuildKind): number {
  return kind === "setup" ? 0 : 1;
}

export async function GET() {
  let entries: string[];
  try {
    entries = await readdir(DOWNLOAD_DIR);
  } catch {
    // Directory missing or unreadable — treat as no builds available.
    return NextResponse.json({ ok: true, builds: [] });
  }

  const builds: DesktopBuild[] = [];

  for (const name of entries) {
    const match = name.match(BUILD_PATTERN);
    if (!match) continue;

    const version = parseVersion(match[2]);
    if (!version) continue;

    try {
      const info = await stat(path.join(DOWNLOAD_DIR, name));
      if (!info.isFile()) continue;

      const kind: BuildKind = match[1].toLowerCase() === "portable" ? "portable" : "setup";

      builds.push({
        name,
        kind,
        version,
        sizeBytes: info.size,
        mtime: info.mtime.toISOString(),
        downloadUrl: `/api/download/${encodeURIComponent(name)}`,
      });
    } catch {
      // File disappeared between readdir and stat — skip it.
      continue;
    }
  }

  builds.sort((a, b) => {
    const byVersion = compareVersionsDesc(a.version, b.version);
    if (byVersion !== 0) return byVersion;
    return kindRank(a.kind) - kindRank(b.kind);
  });

  return NextResponse.json({ ok: true, builds });
}
