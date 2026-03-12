import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import ffmpegStatic from "ffmpeg-static";

const MAX_VIDEO_BYTES = 120 * 1024 * 1024;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

function runFfmpeg(args: string[]) {
  const ffmpegBinary = ffmpegStatic || "ffmpeg";

  return new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegBinary, args, {
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

async function assertFfmpegAvailable() {
  await runFfmpeg(["-version"]);
}

export async function extractAudioFromVideoUrl(videoUrl: string) {
  await assertFfmpegAvailable();

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

  const workdir = await mkdtemp(path.join(os.tmpdir(), "tellr-ai-"));
  const videoPath = path.join(workdir, `${randomUUID()}.mp4`);
  const audioPath = path.join(workdir, `${randomUUID()}.wav`);

  try {
    await writeFile(videoPath, videoBuffer);

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
