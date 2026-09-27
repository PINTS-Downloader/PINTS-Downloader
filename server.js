const express = require("express");
const { spawn } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(__dirname));

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "PINTS Downloader server is running"
    });
});

app.post("/api/search", (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({
            success: false,
            message: "Pinterest URL is required"
        });
    }

    const python = spawn("python", ["pinterest_api.py", url]);

    let output = "";
    let errorOutput = "";

    python.stdout.on("data", (data) => {
        output += data.toString();
    });

    python.stderr.on("data", (data) => {
        errorOutput += data.toString();
    });

    python.on("close", (code) => {
        if (code !== 0) {
            console.error(errorOutput);

            return res.status(500).json({
                success: false,
                message: "Failed to extract Pinterest video"
            });
        }

        try {
            const result = JSON.parse(output);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error("Invalid Python output:", output);

            res.status(500).json({
                success: false,
                message: "Invalid extractor response"
            });
        }
    });
});
app.post("/api/download", async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({
            success: false,
            message: "Video URL is required"
        });
    }

    const { spawn } = require("child_process");

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader(
        "Content-Disposition",
        'attachment; filename="pints-video.mp4"'
    );

    const ffmpeg = spawn("ffmpeg", [
        "-i", url,
        "-c:v", "copy",
        "-c:a", "aac",
        "-movflags", "frag_keyframe+empty_moov",
        "-f", "mp4",
        "pipe:1"
    ]);

    ffmpeg.stdout.pipe(res);

    ffmpeg.stderr.on("data", (data) => {
        console.log("FFmpeg:", data.toString());
    });

    ffmpeg.on("close", (code) => {
        if (code !== 0) {
            console.log("FFmpeg stopped with code:", code);
        }
    });

    ffmpeg.on("error", (error) => {
        console.error("FFmpeg error:", error);

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: "Video conversion failed"
            });
        }
    });
});
app.listen(PORT, () => {
    console.log(`PINTS Downloader running at http://localhost:${PORT}`);
});