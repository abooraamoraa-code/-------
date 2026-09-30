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

  loadingPromise = loadFFmpeg(onProgress);

  try {
    ffmpeg = await loadingPromise;
    return ffmpeg;
  } catch (error) {
    ffmpeg = null;
    throw error;
  } finally {
    loadingPromise = null;
  }
}

async function loadFFmpeg(onProgress) {
  const engine = new FFmpeg();

  try {
    if (onProgress) {
      onProgress(0, "جاري تحميل محرك الفيديو...");
    }

    engine.on("log", ({ message }) => {
      console.log("[NOVA CUT]", message);
    });

    engine.on("progress", ({ progress }) => {
      if (onProgress) {
        const value = Math.max(0, Math.min(1, progress || 0));
        onProgress(
          value,
          "جاري معالجة الفيديو..."
        );
      }
    });

    const coreURL = await toBlobURL(
      BASE_URL + "/ffmpeg-core.js",
      "text/javascript"
    );

    if (onProgress) {
      onProgress(0.4, "تم تحميل محرك الفيديو...");
    }

    const wasmURL = await toBlobURL(
      BASE_URL + "/ffmpeg-core.wasm",
      "application/wasm"
    );

    if (onProgress) {
      onProgress(0.7, "جاري تشغيل المحرك...");
    }

    await engine.load({
      coreURL: coreURL,
      wasmURL: wasmURL
    });

    if (!engine.loaded) {
      throw new Error("FFmpeg لم يعمل.");
    }

    if (onProgress) {
      onProgress(1, "تم تشغيل محرك الفيديو.");
    }

    console.log("[NOVA CUT] FFmpeg READY");

    return engine;

  } catch (error) {
    console.error(
      "[NOVA CUT] FFmpeg ERROR:",
      error
    );

    throw new Error(
      "تعذر تحميل محرك معالجة الفيديو."
    );
  }
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
