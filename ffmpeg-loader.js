```javascript
import { FFmpeg } from "https://esm.sh/@ffmpeg/ffmpeg@0.12.10";
import { toBlobURL } from "https://esm.sh/@ffmpeg/util@0.12.1";

let ffmpeg = null;
let loadingPromise = null;

const BASE_URL =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

/*
  NOVA CUT
  FFmpeg.wasm Loader
  الإصدار: 0.12.10
*/

export async function getFFmpeg(onProgress = null) {
  // إذا كان المحرك محمّلاً مسبقًا
  if (ffmpeg && ffmpeg.loaded) {
    return ffmpeg;
  }

  // منع تحميل المحرك مرتين في نفس الوقت
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = loadEngine(onProgress);

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

async function loadEngine(onProgress) {
  try {
    if (typeof onProgress === "function") {
      onProgress(0.02, "جاري الاتصال بمحرك الفيديو...");
    }

    const engine = new FFmpeg();

    // رسائل FFmpeg
    engine.on("log", ({ message }) => {
      console.log("[NOVA CUT / FFmpeg]", message);
    });

    // نسبة المعالجة
    engine.on("progress", ({ progress }) => {
      if (typeof onProgress === "function") {
        const safeProgress = Math.max(
          0,
          Math.min(1, Number(progress) || 0)
        );

        onProgress(
          safeProgress,
          `جاري قص الفيديو... ${Math.round(safeProgress * 100)}%`
        );
      }
    });

    if (typeof onProgress === "function") {
      onProgress(0.08, "جاري تحميل محرك الفيديو...");
    }

    /*
      ffmpeg-core.js
      ملف المحرك الأساسي
    */
    const coreURL = await toBlobURL(
      `${BASE_URL}/ffmpeg-core.js`,
      "text/javascript"
    );

    if (typeof onProgress === "function") {
      onProgress(0.35, "تم تحميل ملف المحرك الأساسي...");
    }

    /*
      ffmpeg-core.wasm
      ملف WebAssembly الذي يشغّل FFmpeg داخل المتصفح
    */
    const wasmURL = await toBlobURL(
      `${BASE_URL}/ffmpeg-core.wasm`,
      "application/wasm"
    );

    if (typeof onProgress === "function") {
      onProgress(0.65, "جاري تشغيل محرك الفيديو...");
    }

    /*
      الطريقة الرسمية للمحرك Single Thread
      @ffmpeg/core 0.12.10
    */
    await engine.load({
      coreURL,
      wasmURL
    });

    if (!engine.loaded) {
      throw new Error("FFmpeg لم يتم تحميله بشكل صحيح.");
    }

    if (typeof onProgress === "function") {
      onProgress(1, "تم تشغيل محرك الفيديو بنجاح.");
    }

    console.log("[NOVA CUT] FFmpeg جاهز للعمل.");

    return engine;

  } catch (error) {
    console.error("[NOVA CUT] FFmpeg loading error:", error);

    let message =
      "تعذر تشغيل محرك معالجة الفيديو.";

    if (error && error.message) {
      console.error(
        "[NOVA CUT] السبب:",
        error.message
      );
    }

    throw new Error(message);
  }
}

/*
  إعادة تشغيل المحرك
*/
export function resetFFmpeg() {
  try {
    if (ffmpeg) {
      ffmpeg.terminate();
    }
  } catch (error) {
    console.warn(
      "[NOVA CUT] خطأ أثناء إغلاق FFmpeg:",
      error
    );
  }

  ffmpeg = null;
  loadingPromise = null;
}

/*
  معرفة هل المحرك جاهز
*/
export function isFFmpegReady() {
  return !!(
    ffmpeg &&
    ffmpeg.loaded
  );
}

/*
  الحصول على المحرك الحالي
*/
export function getCurrentFFmpeg() {
  return ffmpeg;
}
```
