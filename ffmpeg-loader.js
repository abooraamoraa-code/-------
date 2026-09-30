```javascript
import { FFmpeg } from "https://esm.sh/@ffmpeg/ffmpeg@0.12.10";
import { toBlobURL } from "https://esm.sh/@ffmpeg/util@0.12.1";

let ffmpeg = null;
let loadingPromise = null;

const BASE_URL =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

export async function getFFmpeg(onProgress = null) {

  if (ffmpeg && ffmpeg.loaded) {
    return ffmpeg;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = startFFmpeg(onProgress);

  try {
    ffmpeg = await loadingPromise;
    return ffmpeg;
  } finally {
    loadingPromise = null;
  }
}

async function startFFmpeg(onProgress) {

  const engine = new FFmpeg();

  engine.on("log", function(data) {
    console.log("[NOVA CUT]", data.message);
  });

  engine.on("progress", function(data) {

    if (onProgress) {

      const progress =
        Math.max(
          0,
          Math.min(1, data.progress || 0)
        );

      onProgress(
        progress,
        "Processing video..."
      );
    }
  });

  if (onProgress) {
    onProgress(0.1, "Loading FFmpeg...");
  }

  const coreURL = await toBlobURL(
    BASE_URL + "/ffmpeg-core.js",
    "text/javascript"
  );

  if (onProgress) {
    onProgress(0.4, "Loading FFmpeg core...");
  }

  const wasmURL = await toBlobURL(
    BASE_URL + "/ffmpeg-core.wasm",
    "application/wasm"
  );

  if (onProgress) {
    onProgress(0.7, "Starting FFmpeg...");
  }

  await engine.load({
    coreURL: coreURL,
    wasmURL: wasmURL
  });

  if (!engine.loaded) {
    throw new Error("FFmpeg failed to load.");
  }

  if (onProgress) {
    onProgress(1, "FFmpeg ready.");
  }

  console.log("[NOVA CUT] FFmpeg READY");

  return engine;
}

export function resetFFmpeg() {

  if (ffmpeg) {

    try {
      ffmpeg.terminate();
    } catch (error) {
      console.log(error);
    }

  }

  ffmpeg = null;
  loadingPromise = null;
}

export function isFFmpegReady() {

  return !!(
    ffmpeg &&
    ffmpeg.loaded
  );
}

export function getCurrentFFmpeg() {

  return ffmpeg;
}
```
