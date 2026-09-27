const videoUrlInput = document.getElementById("videoUrl");
const searchButton = document.getElementById("searchButton");
const loading = document.getElementById("loading");
const results = document.getElementById("results");
const videoPreview = document.getElementById("videoPreview");
const errorMessage = document.getElementById("errorMessage");

const downloadButtons = document.querySelectorAll(".download-button");

let hlsPlayer = null;
let currentVideoUrl = "";
let currentFormats = [];


async function searchPinterest() {
    const url = videoUrlInput.value.trim();

    if (!url) {
        showError("Please paste a Pinterest video link.");
        return;
    }

    loading.style.display = "block";
    results.style.display = "none";
    hideError();

    searchButton.disabled = true;

    try {
        const response = await fetch("/api/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url: url
            })
        });

        const result = await response.json();

        if (
            !response.ok ||
            !result.success ||
            !result.data ||
            !result.data.ok
        ) {
            let errorText = "Unable to extract this Pinterest video.";

            if (
                result.data &&
                typeof result.data.error === "string"
            ) {
                errorText = result.data.error;
            } else if (result.message) {
                errorText = result.message;
            } else if (
                result.data &&
                result.data.error
            ) {
                errorText = JSON.stringify(result.data.error);
            }

            throw new Error(errorText);
        }

        displayResult(result.data);

    } catch (error) {
        console.error("Search error:", error);

        showError(
            error.message || "Unable to load this Pinterest video."
        );

    } finally {
        loading.style.display = "none";
        searchButton.disabled = false;
    }
}


function displayResult(data) {
    const media = data.media || {};

    const formats = Array.isArray(media.video_formats)
        ? media.video_formats
        : [];

    const poster = media.poster || "";

    if (
        media.type !== "video" ||
        formats.length === 0
    ) {
        showError(
            "No video stream was found for this Pinterest Pin."
        );

        return;
    }

    currentFormats = formats;

    const firstFormat = formats[0];

    if (!firstFormat || !firstFormat.url) {
        showError("Video URL is not available.");
        return;
    }

    currentVideoUrl = firstFormat.url;


    /* Destroy old HLS player */

    if (hlsPlayer) {
        hlsPlayer.destroy();
        hlsPlayer = null;
    }


    /* Reset video */

    videoPreview.pause();

    videoPreview.removeAttribute("src");

    videoPreview.load();


    /* Poster / thumbnail */

    if (poster) {
        videoPreview.poster = poster;
    }


    /* Video controls */

    videoPreview.controls = true;
    videoPreview.playsInline = true;
    videoPreview.preload = "metadata";

    videoPreview.style.display = "block";


    /* HLS video */

    if (firstFormat.url.includes(".m3u8")) {

        if (
            videoPreview.canPlayType(
                "application/vnd.apple.mpegurl"
            )
        ) {

            videoPreview.src = firstFormat.url;

            videoPreview.load();

        } else if (
            typeof Hls !== "undefined" &&
            Hls.isSupported()
        ) {

            hlsPlayer = new Hls({
                enableWorker: true
            });

            hlsPlayer.loadSource(
                firstFormat.url
            );

            hlsPlayer.attachMedia(
                videoPreview
            );

            hlsPlayer.on(
                Hls.Events.MANIFEST_PARSED,
                function () {

                    console.log(
                        "Pinterest video is ready."
                    );

                }
            );

            hlsPlayer.on(
                Hls.Events.ERROR,
                function (event, data) {

                    console.error(
                        "HLS error:",
                        data
                    );

                    if (data.fatal) {

                        showError(
                            "The video stream could not be played."
                        );

                    }

                }
            );

        } else {

            showError(
                "This browser does not support this video stream."
            );

            return;
        }

    } else {

        /* Normal MP4 video */

        videoPreview.src =
            firstFormat.url;

        videoPreview.load();
    }


    /* Download buttons */

    downloadButtons.forEach(
        function (button, index) {

            const format = formats[index];

            if (
                !format ||
                !format.url
            ) {

                button.style.display =
                    "none";

                return;
            }


            button.style.display =
                "inline-flex";


            const width =
                format.width || "";

            const height =
                format.height || "";

            const quality =
                format.quality || "";


            if (width && height) {

                button.textContent =
                    width +
                    " × " +
                    height +
                    " • Download";

            } else if (quality) {

                button.textContent =
                    quality +
                    " • Download";

            } else {

                button.textContent =
                    "Download";
            }


            button.onclick =
                function () {

                    downloadVideo(format);
                };
        }
    );


    results.style.display =
        "block";
}


/* Download */

async function downloadVideo(format) {

    if (
        !format ||
        !format.url
    ) {

        showError(
            "Download URL is not available."
        );

        return;
    }


    const button =
        event && event.currentTarget
            ? event.currentTarget
            : null;


    if (button) {
        button.disabled = true;
        button.textContent =
            "Preparing...";
    }


    try {

        /*
         * Send the Pinterest video URL
         * to our Node server.
         *
         * The server will use FFmpeg
         * to convert HLS (.m3u8)
         * into MP4.
         */

        const response =
            await fetch(
                "/api/download",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        url: format.url
                    })
                }
            );


        if (!response.ok) {

            const errorData =
                await response.json()
                    .catch(function () {
                        return {};
                    });

            throw new Error(
                errorData.message ||
                "Download failed."
            );
        }


        const blob =
            await response.blob();


        const blobUrl =
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");


        link.href =
            blobUrl;

        link.download =
            "pints-video.mp4";


        document.body.appendChild(
            link
        );


        link.click();


        document.body.removeChild(
            link
        );


        URL.revokeObjectURL(
            blobUrl
        );


    } catch (error) {

        console.error(
            "Download error:",
            error
        );

        showError(
            error.message ||
            "Video download failed."
        );

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Download";
        }
    }
}


/* Error */

function showError(message) {

    errorMessage.textContent =
        message;

    errorMessage.style.display =
        "block";
}


function hideError() {

    errorMessage.textContent =
        "";

    errorMessage.style.display =
        "none";
}


/* Search button */

searchButton.addEventListener(
    "click",
    searchPinterest
);


/* Enter key */

videoUrlInput.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

            searchPinterest();
        }
    }
);