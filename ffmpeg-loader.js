```javascript
import { FFmpeg } from "https://esm.sh/@ffmpeg/ffmpeg@0.12.10";
import { toBlobURL } from "https://esm.sh/@ffmpeg/util@0.12.1";

let ffmpeg = null;

const BASE_URL =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

export async function getFFmpeg(onProgress) {
  if (ffmpeg && ffmpeg.loaded) {
    return ffmpeg;
  }

  const engine = new FFmpeg();

  engine.on("log", function(data) {
    console.log(data.message);
  });

  engine.on("progress", function(data) {
    if (onProgress) {
      onProgress(
        data.progress || 0,
        "Processing video..."
      );
    }
  });

  const coreURL = await toBlobURL(
    BASE_URL + "/ffmpeg-core.js",
    "text/javascript"
  );

  const wasmURL = await toBlobURL(
    BASE_URL + "/ffmpeg-core.wasm",
    "application/wasm"
  );

  await engine.load({
    coreURL: coreURL,
    wasmURL: wasmURL
  });

  ffmpeg = engine;

  if (onProgress) {
    onProgress(1, "FFmpeg ready");
  }

  return ffmpeg;
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
}

export function isFFmpegReady() {
  return ffmpeg !== null && ffmpeg.loaded;
}

export function getCurrentFFmpeg() {
  return ffmpeg;
}
```
