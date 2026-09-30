```javascript
/*
============================================================
NOVA CUT
PROCESSOR.JS
Video processing and cutting engine
============================================================
*/

import {
  getFFmpeg,
  resetFFmpeg
} from "./ffmpeg-loader.js";


/*
============================================================
Configuration
============================================================
*/

const OUTPUT_FILE_NAME = "nova-cut-output.mp4";


/*
============================================================
MAIN VIDEO PROCESSOR
============================================================
*/

export async function processVideo(
  videoFile,
  startTime,
  endTime,
  onProgress = function () {}
) {

  let ffmpeg = null;

  let inputName = "";
  let outputName = OUTPUT_FILE_NAME;

  let logHandler = null;
  let progressHandler = null;

  let lastLog = "";


  /*
  ------------------------------------------------------------
  Validate video
  ------------------------------------------------------------
  */

  if (!videoFile) {
    throw new Error("No video file selected.");
  }


  /*
  ------------------------------------------------------------
  Convert times
  ------------------------------------------------------------
  */

  const start = Number(startTime);
  const end = Number(endTime);


  /*
  ------------------------------------------------------------
  Validate times
  ------------------------------------------------------------
  */

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end)
  ) {
    throw new Error("Invalid start or end time.");
  }


  if (start < 0) {
    throw new Error("Start time cannot be negative.");
  }


  if (end <= start) {
    throw new Error(
      "End time must be greater than start time."
    );
  }


  const duration = end - start;


  if (duration <= 0) {
    throw new Error("Invalid selected duration.");
  }


  try {

    /*
    ----------------------------------------------------------
    Start
    ----------------------------------------------------------
    */

    onProgress(
      2,
      "Loading video engine..."
    );


    /*
    ----------------------------------------------------------
    Get FFmpeg
    ----------------------------------------------------------
    */

    ffmpeg = await getFFmpeg(
      function (progress, message) {

        let percent = Number(progress);

        if (!Number.isFinite(percent)) {
          percent = 0;
        }

        /*
        Loader can return either:
        0 - 1
        or
        0 - 100
        */

        if (percent <= 1) {
          percent *= 100;
        }

        percent = Math.max(
          0,
          Math.min(
            100,
            percent
          )
        );


        onProgress(
          percent,
          message || "Loading video engine..."
        );

      }
    );


    /*
    ----------------------------------------------------------
    Verify FFmpeg
    ----------------------------------------------------------
    */

    if (
      !ffmpeg ||
      !ffmpeg.loaded
    ) {
      throw new Error(
        "FFmpeg engine is not ready."
      );
    }


    /*
    ----------------------------------------------------------
    Create file names
    ----------------------------------------------------------
    */

    inputName =
      createInputFileName(
        videoFile
      );


    outputName =
      OUTPUT_FILE_NAME;


    /*
    ----------------------------------------------------------
    Event handlers
    ----------------------------------------------------------
    */

    logHandler =
      function (data) {

        if (!data) {
          return;
        }


        if (
          typeof data.message !==
          "undefined"
        ) {

          lastLog =
            String(
              data.message
            );

        } else {

          lastLog =
            String(data);

        }

      };


    progressHandler =
      function (data) {

        if (!data) {
          return;
        }


        const raw =
          Number(
            data.progress
          );


        if (
          !Number.isFinite(raw)
        ) {
          return;
        }


        const percent =
          Math.max(
            0,
            Math.min(
              100,
              raw * 100
            )
          );


        onProgress(
          percent,
          "Cutting video..."
        );

      };


    /*
    ----------------------------------------------------------
    Register events
    ----------------------------------------------------------
    */

    if (
      typeof ffmpeg.on === "function"
    ) {

      ffmpeg.on(
        "log",
        logHandler
      );


      ffmpeg.on(
        "progress",
        progressHandler
      );

    }


    /*
    ----------------------------------------------------------
    Read video
    ----------------------------------------------------------
    */

    onProgress(
      5,
      "Preparing video..."
    );


    const inputData =
      new Uint8Array(
        await videoFile.arrayBuffer()
      );


    if (
      !inputData ||
      inputData.length === 0
    ) {

      throw new Error(
        "The selected video is empty."
      );

    }


    /*
    ----------------------------------------------------------
    Remove old files
    ----------------------------------------------------------
    */

    await safeDelete(
      ffmpeg,
      inputName
    );


    await safeDelete(
      ffmpeg,
      outputName
    );


    /*
    ----------------------------------------------------------
    Write video into FFmpeg
    ----------------------------------------------------------
    */

    onProgress(
      10,
      "Loading video..."
    );


    await ffmpeg.writeFile(
      inputName,
      inputData
    );


    /*
    ----------------------------------------------------------
    Build FFmpeg command
    ----------------------------------------------------------
    */

    const safeDuration =
      Math.max(
        0.001,
        duration
      );


    const command = [

      "-ss",

      formatTime(
        start
      ),

      "-i",

      inputName,

      "-t",

      formatTime(
        safeDuration
      ),

      "-map",

      "0:v:0",

      "-map",

      "0:a:0?",

      "-c:v",

      "libx264",

      "-preset",

      "ultrafast",

      "-crf",

      "23",

      "-pix_fmt",

      "yuv420p",

      "-c:a",

      "aac",

      "-b:a",

      "128k",

      "-movflags",

      "+faststart",

      outputName

    ];


    /*
    ----------------------------------------------------------
    Start processing
    ----------------------------------------------------------
    */

    onProgress(
      15,
      "Cutting video..."
    );


    const exitCode =
      await ffmpeg.exec(
        command
      );


    /*
    ----------------------------------------------------------
    Check FFmpeg result
    ----------------------------------------------------------
    */

    if (
      typeof exitCode === "number" &&
      exitCode !== 0
    ) {

      throw new Error(
        "FFmpeg returned error code " +
        exitCode
      );

    }


    /*
    ----------------------------------------------------------
    Read output
    ----------------------------------------------------------
    */

    onProgress(
      90,
      "Preparing final video..."
    );


    const outputData =
      await ffmpeg.readFile(
        outputName
      );


    if (!outputData) {

      throw new Error(
        "FFmpeg did not create an output file."
      );

    }


    if (
      outputData.length === 0
    ) {

      throw new Error(
        "The output video is empty."
      );

    }


    /*
    ----------------------------------------------------------
    Create Blob
    ----------------------------------------------------------
    */

    const outputBytes =
      outputData instanceof Uint8Array
        ? outputData
        : new Uint8Array(
            outputData
          );


    const blob =
      new Blob(
        [outputBytes],
        {
          type:
            "video/mp4"
        }
      );


    /*
    ----------------------------------------------------------
    Finish
    ----------------------------------------------------------
    */

    onProgress(
      100,
      "Video ready."
    );


    return {

      blob:

        blob,

      filename:

        createOutputName(
          videoFile
        ),

      start:

        start,

      end:

        end,

      duration:

        safeDuration

    };


  } catch (error) {

    /*
    ----------------------------------------------------------
    Error handling
    ----------------------------------------------------------
    */

    console.error(
      "[NOVA CUT] Processor error:",
      error
    );


    throw new Error(
      createReadableError(
        error,
        lastLog
      )
    );


  } finally {

    /*
    ----------------------------------------------------------
    Remove event listeners
    ----------------------------------------------------------
    */

    try {

      if (
        ffmpeg &&
        typeof ffmpeg.off === "function"
      ) {

        if (logHandler) {

          ffmpeg.off(
            "log",
            logHandler
          );

        }


        if (progressHandler) {

          ffmpeg.off(
            "progress",
            progressHandler
          );

        }

      }

    } catch (error) {

      console.warn(
        "[NOVA CUT] Listener cleanup failed.",
        error
      );

    }


    /*
    ----------------------------------------------------------
    Delete temporary files
    ----------------------------------------------------------
    */

    await safeDelete(
      ffmpeg,
      inputName
    );


    await safeDelete(
      ffmpeg,
      outputName
    );

  }

}


/*
============================================================
CREATE INPUT FILE NAME
============================================================
*/

function createInputFileName(file) {

  const originalName =
    file &&
    file.name
      ? file.name
      : "input-video.mp4";


  const extension =
    getExtension(
      originalName
    );


  if (!extension) {
    return "input-video.mp4";
  }


  return (
    "input-video." +
    extension
  );

}


/*
============================================================
GET VIDEO EXTENSION
============================================================
*/

function getExtension(filename) {

  if (
    typeof filename !==
    "string"
  ) {

    return "";

  }


  const cleanName =
    filename
      .split("?")[0]
      .split("#")[0];


  const parts =
    cleanName.split(".");


  if (
    parts.length < 2
  ) {

    return "";

  }


  const extension =
    parts[
      parts.length - 1
    ]
      .trim()
      .toLowerCase();


  const allowed = [

    "mp4",
    "mov",
    "mkv",
    "webm",
    "avi",
    "m4v",
    "mpeg",
    "mpg",
    "3gp"

  ];


  if (
    allowed.includes(
      extension
    )
  ) {

    return extension;

  }


  return "mp4";

}


/*
============================================================
FORMAT TIME
============================================================
*/

function formatTime(seconds) {

  const value =
    Number(seconds);


  if (
    !Number.isFinite(value)
  ) {

    return "0.000";

  }


  return Math.max(
    0,
    value
  ).toFixed(3);

}


/*
============================================================
CREATE OUTPUT NAME
============================================================
*/

function createOutputName(file) {

  let name =
    file &&
    file.name
      ? file.name
      : "video";


  name =
    name.replace(
      /\.[^/.]+$/,
      ""
    );


  name =
    name
      .replace(
        /[<>:"/\\|?*\x00-\x1F]/g,
        "_"
      )
      .trim();


  if (!name) {
    name = "video";
  }


  return (
    name +
    "-NOVA-CUT.mp4"
  );

}


/*
============================================================
SAFE DELETE
============================================================
*/

async function safeDelete(
  ffmpeg,
  filename
) {

  if (
    !ffmpeg ||
    !filename
  ) {

    return;

  }


  try {

    await ffmpeg.deleteFile(
      filename
    );

  } catch (error) {

    /*
    Ignore cleanup errors.
    */

  }

}


/*
============================================================
CREATE READABLE ERROR
============================================================
*/

function createReadableError(
  error,
  lastLog
) {

  if (
    error &&
    error.message
  ) {

    const message =
      String(
        error.message
      );


    if (
      message.includes(
        "SharedArrayBuffer"
      )
    ) {

      return (
        "The browser blocked the video engine because of security settings."
      );

    }


    if (
      message.includes(
        "fetch"
      )
    ) {

      return (
        "The video engine files could not be downloaded."
      );

    }


    if (
      message.includes(
        "network"
      )
    ) {

      return (
        "Could not connect to the video engine."
      );

    }


    if (
      message.includes(
        "FFmpeg"
      )
    ) {

      return message;

    }


    return message;

  }


  if (lastLog) {
    return lastLog;
  }


  return (
    "An unknown error occurred while processing the video."
  );

}


/*
============================================================
END
============================================================
*/
```
