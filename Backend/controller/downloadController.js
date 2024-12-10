const path = require("path");
const fs = require("fs");
const ffmpegPath = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");
const { execFile } = require("child_process");
const winston = require("winston");
require("dotenv").config(); // Load environment variables

ffmpeg.setFfmpegPath(ffmpegPath);

const logger = winston.createLogger({
  level: "error",
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: "error.log" })],
});

const execPromise = (cmd, args) =>
  new Promise((resolve, reject) => {
    execFile(cmd, args, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        console.log(error);
      } else {
        resolve(stdout);
        console.log(stdout);
      }
    });
  });

const clearDownloadsFolder = (folderPath) => {
  return new Promise((resolve, reject) => {
    fs.readdir(folderPath, (err, files) => {
      if (err) {
        reject(err);
        return;
      }

      Promise.all(
        files.map((file) => {
          const filePath = path.join(folderPath, file);
          return fs.promises.unlink(filePath); // Delete the file
        })
      )
        .then(() => resolve())
        .catch((error) => reject(error));
    });
  });
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const execWithRetry = async (cmd, args, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await execPromise(cmd, args);
    } catch (error) {
      if (
        error.message.includes("429") ||
        error.message.includes("rate-limit")
      ) {
        logger.error(`Rate limit reached. Retry attempt ${attempt}`, { error });
        const retryAfter = error.response?.headers?.["retry-after"];
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : attempt * 2000; // Exponential backoff
        await delay(delayMs);
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries reached");
};

exports.downloadController = async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res
      .status(400)
      .json({ error: "Invalid input. URL must be a string." });
  }

  const modifiedUrl = url.endsWith("/") ? url.slice(0, -1) : url;

  if (
    !modifiedUrl ||
    (!modifiedUrl.includes("youtube.com") &&
      !modifiedUrl.includes("youtu.be") &&
      !modifiedUrl.includes("instagram.com") &&
      !modifiedUrl.includes("facebook.com"))
  ) {
    return res.status(400).json({
      error: "Please provide a valid YouTube, Instagram, or Facebook URL",
    });
  }

  const videoId = modifiedUrl.substring(modifiedUrl.lastIndexOf("/") + 1);
  const sanitizedVideoId = videoId.replace(/\?/g, "");

  try {
    const timestamp = Date.now();
    const outputPath = path.resolve(__dirname, "../downloads");
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    try {
      await clearDownloadsFolder(outputPath);
    } catch (error) {
      logger.error("Error clearing downloads folder", { error });
      return res
        .status(500)
        .json({ error: "Failed to clear downloads folder" });
    }

    const outputTemplate = `${sanitizedVideoId}-${timestamp}`;
    const videoOutputFile = path.join(
      outputPath,
      `${outputTemplate}-video.mp4`
    );
    const audioOutputFile = path.join(
      outputPath,
      `${outputTemplate}-audio.m4a`
    );
    const finalOutputFile = path.join(outputPath, `${outputTemplate}.mp4`);

    const ytdlPath = path.resolve(
      __dirname,
      "../node_modules/youtube-dl-exec/bin/yt-dlp"
    );

    const videoArgs = [
      "--format",
      "bestvideo[ext=mp4]/best",
      "--output",
      videoOutputFile,
      modifiedUrl,
    ];

    const audioArgs = [
      "--format",
      "bestaudio[ext=m4a]/best",
      "--output",
      audioOutputFile,
      modifiedUrl,
    ];

    try {
      await Promise.all([
        execWithRetry(ytdlPath, videoArgs),
        execWithRetry(ytdlPath, audioArgs),
      ]);
    } catch (error) {
      logger.error("Error downloading video or audio", { error });
      if (error.message.includes("404")) {
        return res.status(404).json({
          error:
            "Content not found. The URL might be incorrect or the content is unavailable.",
        });
      } else if (error.message.includes("429")) {
        return res
          .status(429)
          .json({ error: "Rate limit reached. Please try again later." });
      } else {
        return res
          .status(500)
          .json({ error: "Failed to download video or audio" });
      }
    }

    if (!fs.existsSync(videoOutputFile) || !fs.existsSync(audioOutputFile)) {
      return res
        .status(500)
        .json({ error: "Failed to download necessary files" });
    }

    ffmpeg()
      .input(videoOutputFile)
      .input(audioOutputFile)
      .outputOptions("-c:v copy")
      .outputOptions("-c:a aac")
      .outputOptions("-b:a 192k")
      .output(finalOutputFile)
      .on("end", () => {
        try {
          fs.unlinkSync(videoOutputFile);
          fs.unlinkSync(audioOutputFile);
        } catch (err) {
          logger.error("Error cleaning up temporary files", { error: err });
          return res
            .status(500)
            .json({ error: "Failed to clean up temporary files" });
        }

        res.status(200).json({ file: path.basename(finalOutputFile) });
      })
      .on("error", (err) => {
        logger.error("Error merging video and audio", { error: err });
        res.status(500).json({ error: "Failed to merge video and audio" });
      })
      .run();
  } catch (error) {
    logger.error("Error processing request", { error });
    if (error.message.includes("No such format")) {
      return res.status(400).json({ error: "Invalid URL or format not found" });
    } else {
      return res
        .status(500)
        .json({ error: "Failed to process download request" });
    }
  }
};

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", { error });
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", { reason });
});
