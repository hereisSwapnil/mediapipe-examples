import React, { useEffect, useRef, useState } from "react";
import {
    FilesetResolver,
    FaceLandmarker
} from "@mediapipe/tasks-vision";

function FaceLandmarkDetection({ onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [landmarker, setLandmarker] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load FaceLandmarker
    useEffect(() => {
        async function init() {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );

                const faceLandmarker = await FaceLandmarker.createFromOptions(
                    vision,
                    {
                        baseOptions: {
                            modelAssetPath:
                                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
                        },
                        runningMode: "video",
                        numFaces: 1
                    }
                );

                setLandmarker(faceLandmarker);
                setIsLoading(false);
            } catch (error) {
                console.error("FaceLandmarker init error:", error);
                setIsLoading(false);
            }
        }

        init();

        return () => {
            if (landmarker) landmarker.close();
        };
    }, []);

    // Start webcam
    useEffect(() => {
        let stream = null;

        async function startCam() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (error) {
                console.error("Camera error:", error);
            }
        }

        startCam();

        return () => {
            if (stream) stream.getTracks().forEach((track) => track.stop());
        };
    }, []);

    // Face Landmark Loop
    useEffect(() => {
        if (!landmarker) return;
        if (!videoRef.current) return;

        const video = videoRef.current;
        let animationFrame;

        function start() {
            const detect = async (time) => {
                if (!video.videoWidth || !video.videoHeight) {
                    animationFrame = requestAnimationFrame(detect);
                    return;
                }

                const result = await landmarker.detectForVideo(video, time);
                draw(result);

                animationFrame = requestAnimationFrame(detect);
            };

            animationFrame = requestAnimationFrame(detect);
        }

        video.addEventListener("loadeddata", start);

        return () => {
            video.removeEventListener("loadeddata", start);
            if (animationFrame) cancelAnimationFrame(animationFrame);
        };
    }, [landmarker]);

    // Draw face landmark points & lines
    // FACEMESH connections from MediaPipe

    // These are the MediaPipe FaceMesh 468 landmark connections
    // Works with FaceLandmarker (Tasks Vision)

    const FACE_OVAL = [
        [10, 338], [338, 297], [297, 332], [332, 284], [284, 251],
        [251, 389], [389, 356], [356, 454], [454, 323], [323, 361],
        [361, 288], [288, 397], [397, 365], [365, 379], [379, 378],
        [378, 400], [400, 377], [377, 152], [152, 148], [148, 176],
        [176, 149], [149, 150], [150, 136], [136, 172], [172, 58],
        [58, 132], [132, 93], [93, 234], [234, 127], [127, 162],
        [162, 21], [21, 54], [54, 103], [103, 67], [67, 109],
        [109, 10]
    ];

    const LIPS = [
        [61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314],
        [314, 405], [405, 321], [321, 375], [375, 291], [61, 185],
        [185, 40], [40, 39], [39, 37], [37, 0], [0, 267],
        [267, 269], [269, 270], [270, 409], [409, 291]
    ];

    const LEFT_EYE = [
        [33, 7], [7, 163], [163, 144], [144, 145], [145, 153],
        [153, 154], [154, 155], [155, 133], [33, 246], [246, 161],
        [161, 160], [160, 159], [159, 158], [158, 157], [157, 173],
        [173, 133]
    ];

    const RIGHT_EYE = [
        [263, 249], [249, 390], [390, 373], [373, 374], [374, 380],
        [380, 381], [381, 382], [382, 362], [263, 466], [466, 388],
        [388, 387], [387, 386], [386, 385], [385, 384], [384, 398],
        [398, 362]
    ];

    const LEFT_EYEBROW = [
        [46, 53], [53, 52], [52, 65], [65, 55], [55, 107]
    ];

    const RIGHT_EYEBROW = [
        [276, 283], [283, 282], [282, 295], [295, 285], [285, 336]
    ];

    const LEFT_IRIS = [
        [474, 475], [475, 476], [476, 477], [477, 474]
    ];

    const RIGHT_IRIS = [
        [469, 470], [470, 471], [471, 472], [472, 469]
    ];

    const draw = (result) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (!canvas || !video) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Mirror canvas
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);

        if (!result.faceLandmarks) {
            ctx.restore();
            return;
        }

        result.faceLandmarks.forEach((landmarks) => {

            // helper to draw lines
            const drawConnectors = (arr, color) => {
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;

                arr.forEach(([start, end]) => {
                    const p1 = landmarks[start];
                    const p2 = landmarks[end];

                    ctx.beginPath();
                    ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
                    ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
                    ctx.stroke();
                });
            };

            // face oval (white)
            drawConnectors(FACE_OVAL, "#FFFFFF");

            // lips (pink)
            drawConnectors(LIPS, "#FF74A4");

            // eyebrows (yellow)
            drawConnectors(LEFT_EYEBROW, "#FFD966");
            drawConnectors(RIGHT_EYEBROW, "#FFD966");

            // eyes (cyan)
            drawConnectors(LEFT_EYE, "#00E5FF");
            drawConnectors(RIGHT_EYE, "#00E5FF");

            // iris (green)
            drawConnectors(LEFT_IRIS, "#00FF00");
            drawConnectors(RIGHT_IRIS, "#00FF00");

            // draw all points
            landmarks.forEach((p) => {
                ctx.fillStyle = "#4CC9F0";
                ctx.beginPath();
                ctx.arc(p.x * canvas.width, p.y * canvas.height, 2, 0, Math.PI * 2);
                ctx.fill();
            });
        });

        ctx.restore();
    };


    return (
        <div className="detection-component">
            <div className="detection-header">
                <h2>🙂 Face Landmark Detection</h2>
                <button onClick={onClose} className="close-btn">✕</button>
            </div>

            {isLoading && <div className="loading">Loading Face Model...</div>}

            <div className="video-container">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="video-feed"
                    style={{ transform: "scaleX(-1)" }}
                />

                <canvas ref={canvasRef} className="detection-canvas" />
            </div>
        </div>
    );
}

export default FaceLandmarkDetection;
