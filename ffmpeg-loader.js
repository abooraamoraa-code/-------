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

  try {

    const engine = new FFmpeg();


    engine.on("log", ({ message }) => {

      console.log("[NOVA CUT / FFmpeg]", message);

    });


    engine.on("progress", ({ progress, time }) => {

      if (typeof onProgress === "function") {

        onProgress(
          Math.max(0, Math.min(1, progress)),
          "جاري معالجة الفيديو..."
        );

      }

    });


    console.log(
      "[NOVA CUT] تحميل محرك FFmpeg..."
    );


    const coreURL = await toBlobURL(
      `${BASE_URL}/ffmpeg-core.js`,
      "text/javascript"
    );


    const wasmURL = await toBlobURL(
      `${BASE_URL}/ffmpeg-core.wasm`,
      "application/wasm"
    );


    await engine.load({
      coreURL,
      wasmURL
    });


    console.log(
      "[NOVA CUT] تم تحميل FFmpeg بنجاح."
    );


    if (typeof onProgress === "function") {

      onProgress(
        0,
        "تم تحميل محرك معالجة الفيديو."
      );

    }


    return engine;


  } catch (error) {

    console.error(
      "[NOVA CUT] FFmpeg loading error:",
      error
    );


    throw new Error(
      "تعذر تحميل محرك معالجة الفيديو. تأكد من اتصال الإنترنت ثم حاول مرة أخرى."
    );

  }

}


export function resetFFmpeg() {

  if (ffmpeg) {

    try {

      ffmpeg.terminate();

    } catch (error) {

      console.warn(
        "تعذر إنهاء محرك FFmpeg:",
        error
      );

    }

  }

  ffmpeg = null;
  loadingPromise = null;

}


export function isFFmpegReady() {

  return Boolean(
    ffmpeg &&
    ffmpeg.loaded
  );

}


export function getCurrentFFmpeg() {

  return ffmpeg;

}
