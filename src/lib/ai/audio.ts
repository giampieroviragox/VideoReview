import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { mkdtemp, readFile, rm, stat, writeFile, access, chmod } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import ffmpegStatic from "ffmpeg-static";

const MAX_VIDEO_BYTES = 120 * 1024 * 1024;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const requireFromModule = createRequire(import.meta.url);

function resolveDirectTranscriptionFormat(
  contentType: string | null,
  videoUrl: string
) {
  const normalizedContentType = (contentType || "").toLowerCase();
  if (normalizedContentType.includes("webm")) {
    return "webm" as const;
  }
  if (normalizedContentType.includes("mp4")) {
    return "mp4" as const;
  }

  const normalizedUrl = videoUrl.toLowerCase();
  if (normalizedUrl.endsWith(".webm")) {
    return "webm" as const;
  }

  return "mp4" as const;
}

async function canExecute(binaryPath: string) {
  if (!binaryPath || binaryPath === "ffmpeg") {
    return true;
  }

  try {
    await access(binaryPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function getFfmpegCandidates() {
  const candidates = new Set<string>();

  if (ffmpegStatic) {
    candidates.add(ffmpegStatic);
  }

  try {
    const packageJsonPath = requireFromModule.resolve("ffmpeg-static/package.json");
    const packageDir = path.dirname(packageJsonPath);
    const binaryName =
      ffmpegStatic && path.basename(ffmpegStatic).toLowerCase().startsWith("ffmpeg")
        ? path.basename(ffmpegStatic)
        : process.platform === "win32"
          ? "ffmpeg.exe"
          : "ffmpeg";
    candidates.add(path.join(packageDir, binaryName));
  } catch {
    // Package resolution fallback to PATH.
  }

  candidates.add("ffmpeg");

  const resolved: string[] = [];
  for (const candidate of candidates) {
    if (await canExecute(candidate)) {
      resolved.push(candidate);
    }
  }

  if (resolved.length === 0) {
    resolved.push("ffmpeg");
  }

  return resolved;
}

function runFfmpegWithBinary(binaryPath: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(binaryPath, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

async function runFfmpeg(args: string[]) {
  const binaries = await getFfmpegCandidates();
  const errors: string[] = [];

  for (const binaryPath of binaries) {
    try {
      if (binaryPath !== "ffmpeg") {
        try {
          await chmod(binaryPath, 0o755);
        } catch {
          // Continue; spawn will fail if the binary remains not executable.
        }
      }

      await runFfmpegWithBinary(binaryPath, args);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("ENOENT")) {
        errors.push(`${binaryPath}: not found`);
        continue;
      }

      errors.push(`${binaryPath}: ${message}`);
    }
  }

  throw new Error(
    errors.length > 0
      ? `ffmpeg unavailable. ${errors.join(" | ")}`
      : "ffmpeg unavailable."
  );
}

export async function extractAudioFromVideoUrl(videoUrl: string) {
  const response = await fetch(videoUrl, {
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    throw new Error(`Failed to download video for AI processing (${response.status}).`);
  }

  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = contentLengthHeader
    ? Number.parseInt(contentLengthHeader, 10)
    : NaN;

  if (Number.isFinite(contentLength) && contentLength > MAX_VIDEO_BYTES) {
    throw new Error("Video file too large for AI transcription.");
  }

  const videoBuffer = Buffer.from(await response.arrayBuffer());
  if (videoBuffer.length > MAX_VIDEO_BYTES) {
    throw new Error("Video file too large for AI transcription.");
  }
  const directFormat = resolveDirectTranscriptionFormat(
    response.headers.get("content-type"),
    videoUrl
  );

  const workdir = await mkdtemp(path.join(os.tmpdir(), "tellr-ai-"));
  const videoPath = path.join(workdir, `${randomUUID()}.mp4`);
  const audioPath = path.join(workdir, `${randomUUID()}.wav`);

  try {
    await writeFile(videoPath, videoBuffer);

    try {
      await runFfmpeg([
        "-y",
        "-i",
        videoPath,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        audioPath,
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const ffmpegUnavailable =
        message.includes("ffmpeg unavailable") ||
        message.includes("ENOENT") ||
        message.toLowerCase().includes("not found");

      if (!ffmpegUnavailable) {
        throw error;
      }

      if (videoBuffer.length > MAX_AUDIO_BYTES) {
        throw new Error(
          "ffmpeg unavailable and source video is too large for direct transcription."
        );
      }

      return {
        audioBase64: videoBuffer.toString("base64"),
        format: directFormat,
        sizeBytes: videoBuffer.length,
      };
    }

    const audioStats = await stat(audioPath);
    if (audioStats.size > MAX_AUDIO_BYTES) {
      throw new Error("Extracted audio is too large for AI transcription.");
    }

    const audioBuffer = await readFile(audioPath);
    const audioBase64 = audioBuffer.toString("base64");

    return {
      audioBase64,
      format: "wav" as const,
      sizeBytes: audioStats.size,
    };
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}
