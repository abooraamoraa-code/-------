/*
============================================================
NOVA CUT
PROCESSOR.JS
مسؤول عن معالجة الفيديو
============================================================
*/

import {
  getFFmpeg,
  resetFFmpeg
} from "./ffmpeg-loader.js";


/*
============================================================
إعدادات عامة
============================================================
*/

const DEFAULT_OUTPUT_NAME =
  "nova-cut.mp4";


/*
============================================================
دالة معالجة الفيديو الرئيسية
============================================================
*/

export async function processVideo(
  videoFile,
  startTime,
  endTime,
  onProgress = function () {}
) {

  /*
  ----------------------------------------------------------
  التحقق من الملف
  ----------------------------------------------------------
  */

  if (!videoFile) {

    throw new Error(
      "لم يتم اختيار فيديو."
    );

  }


  /*
  ----------------------------------------------------------
  التحقق من الأوقات
  ----------------------------------------------------------
  */

  const start =
    Number(startTime);

  const end =
    Number(endTime);

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end)
  ) {

    throw new Error(
      "وقت البداية أو النهاية غير صحيح."
    );

  }


  if (start < 0) {

    throw new Error(
      "وقت البداية لا يمكن أن يكون سالبًا."
    );

  }


  if (end <= start) {

    throw new Error(
      "وقت النهاية يجب أن يكون بعد وقت البداية."
    );

  }


  const duration =
    end - start;


  if (duration <= 0) {

    throw new Error(
      "مدة الفيديو المحددة غير صحيحة."
    );

  }


  /*
  ----------------------------------------------------------
  بداية المعالجة
  ----------------------------------------------------------
  */

  onProgress(
    2,
    "جاري تشغيل محرك معالجة الفيديو..."
  );


  /*
  ----------------------------------------------------------
  الحصول على محرك FFmpeg
  ----------------------------------------------------------
  */

  const ffmpeg =
    await getFFmpeg(
      function(progress) {

        /*
        تحويل تقدم تحميل المحرك
        إلى نسبة تقريبية.
        */

        const value =
          Math.max(
            0,
            Math.min(
              100,
              progress
            )
          );

        onProgress(
          value,
          "جاري تحميل محرك الفيديو..."
        );

      }
    );


  /*
  ----------------------------------------------------------
  تسجيل رسائل المحرك
  ----------------------------------------------------------
  */

  let lastLog = "";

  const logHandler =
    function(data) {

      if (!data) {
        return;
      }

      lastLog =
        String(data);

      /*
      لا نعرض رسائل FFmpeg الخام للمستخدم
      لأنها قد تكون طويلة جدًا.
      */

    };


  /*
  ----------------------------------------------------------
  تسجيل تقدم المحرك
  ----------------------------------------------------------
  */

  const progressHandler =
    function(data) {

      if (!data) {
        return;
      }

      /*
      ffmpeg.wasm يعطي نسبة بين 0 و 1
      في الإصدارات التي تدعم progress.
      */

      if (
        typeof data.progress === "number"
      ) {

        const raw =
          data.progress * 100;

        const progress =
          Math.max(
            0,
            Math.min(
              100,
              raw
            )
          );

        onProgress(
          progress,
          "جاري قص الفيديو..."
        );

      }

    };


  /*
  ----------------------------------------------------------
  إضافة listeners
  ----------------------------------------------------------
  */

  try {

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
    اسم ملف الإدخال
    ----------------------------------------------------------
    */

    const inputName =
      createInputFileName(
        videoFile
      );


    const outputName =
      DEFAULT_OUTPUT_NAME;


    /*
    ----------------------------------------------------------
    تحويل الفيديو إلى بيانات
    ----------------------------------------------------------
    */

    onProgress(
      8,
      "جاري تجهيز ملف الفيديو..."
    );


    const inputData =
      new Uint8Array(
        await videoFile.arrayBuffer()
      );


    /*
    ----------------------------------------------------------
    كتابة الفيديو داخل محرك FFmpeg
    ----------------------------------------------------------
    */

    await ffmpeg.writeFile(
      inputName,
      inputData
    );


    onProgress(
      12,
      "تم تجهيز الفيديو..."
    );


    /*
    ----------------------------------------------------------
    تنظيف ملف قديم إن وجد
    ----------------------------------------------------------
    */

    try {

      await ffmpeg.deleteFile(
        outputName
      );

    } catch (error) {

      /*
      إذا لم يكن الملف موجودًا
      لا توجد مشكلة.
      */

    }


    /*
    ----------------------------------------------------------
    حساب مدة المقطع
    ----------------------------------------------------------
    */

    const safeDuration =
      Math.max(
        0.001,
        duration
      );


    /*
    ----------------------------------------------------------
    أوامر FFmpeg
    ----------------------------------------------------------

    نستخدم إعادة ترميز كاملة
    بدل القص السريع فقط.

    السبب:

    القص السريع قد يسبب مشاكل
    مع بعض أنواع الفيديو.

    إعادة الترميز أكثر توافقًا.
    ----------------------------------------------------------
    */

    const command = [

      "-ss",
      formatFFmpegTime(
        start
      ),

      "-i",
      inputName,

      "-t",
      formatFFmpegTime(
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
    بدء القص
    ----------------------------------------------------------
    */

    onProgress(
      15,
      "بدأ قص الفيديو..."
    );


    const result =
      await ffmpeg.exec(
        command
      );


    /*
    ----------------------------------------------------------
    التحقق من نتيجة التنفيذ
    ----------------------------------------------------------
    */

    if (
      typeof result === "number" &&
      result !== 0
    ) {

      throw new Error(
        "محرك FFmpeg أعاد رمز خطأ: " +
        result
      );

    }


    /*
    ----------------------------------------------------------
    قراءة الفيديو الناتج
    ----------------------------------------------------------
    */

    onProgress(
      92,
      "جاري تجهيز الملف النهائي..."
    );


    const outputData =
      await ffmpeg.readFile(
        outputName
      );


    /*
    ----------------------------------------------------------
    التحقق من وجود الناتج
    ----------------------------------------------------------
    */

    if (!outputData) {

      throw new Error(
        "لم يتم إنشاء ملف الفيديو الناتج."
      );

    }


    if (
      !outputData.length
    ) {

      throw new Error(
        "ملف الفيديو الناتج فارغ."
      );

    }


    /*
    ----------------------------------------------------------
    إنشاء Blob
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
    نجاح المعالجة
    ----------------------------------------------------------
    */

    onProgress(
      100,
      "تم قص الفيديو بنجاح."
    );


    /*
    ----------------------------------------------------------
    النتيجة
    ----------------------------------------------------------
    */

    return {

      blob,

      filename:
        createOutputName(
          videoFile
        ),

      start,

      end,

      duration:
        safeDuration

    };


  } catch (error) {

    /*
    ----------------------------------------------------------
    تسجيل الخطأ
    ----------------------------------------------------------
    */

    console.error(
      "NOVA CUT PROCESSOR ERROR:",
      error
    );


    /*
    ----------------------------------------------------------
    إعادة الخطأ للواجهة
    ----------------------------------------------------------
    */

    const message =
      createReadableError(
        error,
        lastLog
      );


    throw new Error(
      message
    );


  } finally {

    /*
    ----------------------------------------------------------
    إزالة listeners
    ----------------------------------------------------------
    */

    try {

      if (
        typeof ffmpeg.off === "function"
      ) {

        ffmpeg.off(
          "log",
          logHandler
        );

        ffmpeg.off(
          "progress",
          progressHandler
        );

      }

    } catch (error) {

      /*
      تجاهل خطأ التنظيف.
      */

    }


    /*
    ----------------------------------------------------------
    حذف ملف الإدخال والإخراج
    ----------------------------------------------------------
    */

    try {

      await safeDelete(
        ffmpeg,
        createInputFileName(
          videoFile
        )
      );

    } catch (error) {

      /*
      تجاهل أخطاء التنظيف.
      */

    }


    try {

      await safeDelete(
        ffmpeg,
        DEFAULT_OUTPUT_NAME
      );

    } catch (error) {

      /*
      تجاهل أخطاء التنظيف.
      */

    }

  }

}


/*
============================================================
إنشاء اسم ملف الإدخال
============================================================
*/

function createInputFileName(
  file
) {

  /*
  نستخدم امتدادًا شائعًا.
  FFmpeg يستطيع معرفة نوع الملف
  من محتواه في معظم الحالات.
  */

  const original =
    file &&
    file.name
      ? file.name
      : "input-video";


  const extension =
    getExtension(
      original
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
الحصول على امتداد الملف
============================================================
*/

function getExtension(
  filename
) {

  if (
    typeof filename !== "string"
  ) {

    return "";

  }


  const clean =
    filename
      .split("?")[0]
      .split("#")[0];


  const parts =
    clean.split(".");


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


  /*
  السماح فقط بامتدادات
  الفيديو الشائعة.
  */

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
تنسيق الوقت لـ FFmpeg
============================================================
*/

function formatFFmpegTime(
  seconds
) {

  const value =
    Number(seconds);


  if (
    !Number.isFinite(value)
  ) {

    return "0";

  }


  return Math.max(
    0,
    value
  ).toFixed(3);

}


/*
============================================================
إنشاء اسم الملف الناتج
============================================================
*/

function createOutputName(
  file
) {

  let name =
    file &&
    file.name
      ? file.name
      : "video";


  /*
  إزالة الامتداد القديم.
  */

  name =
    name.replace(
      /\.[^/.]+$/,
      ""
    );


  /*
  تنظيف الاسم.
  */

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
حذف ملف بأمان
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
    لا نوقف البرنامج
    بسبب مشكلة تنظيف.
    */

  }

}


/*
============================================================
إنشاء رسالة خطأ مفهومة
============================================================
*/

function createReadableError(
  error,
  lastLog
) {

  if (
    error instanceof Error &&
    error.message
  ) {

    /*
    لا نستخدم رسالة عامة فقط.
    */

    const message =
      error.message;


    if (
      message.includes(
        "SharedArrayBuffer"
      )
    ) {

      return (
        "المتصفح منع تشغيل محرك الفيديو بسبب إعدادات الأمان."
      );

    }


    if (
      message.includes(
        "fetch"
      )
    ) {

      return (
        "تعذر تحميل ملفات محرك الفيديو."
      );

    }


    if (
      message.includes(
        "network"
      )
    ) {

      return (
        "تعذر الاتصال بملفات محرك الفيديو."
      );

    }


    return message;

  }


  if (lastLog) {

    return lastLog;

  }


  return (
    "حدث خطأ غير معروف أثناء معالجة الفيديو."
  );

}


/*
============================================================
النهاية
============================================================
*/
