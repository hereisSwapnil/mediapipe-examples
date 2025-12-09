import React, { useEffect, useRef, useState } from "react";
import {
    FilesetResolver,
    GestureRecognizer,
} from "@mediapipe/tasks-vision";

function ObjectDetection({ onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [recognizer, setRecognizer] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load Gesture Recognizer
    useEffect(() => {
        async function init() {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );

                const gestureRecognizer = await GestureRecognizer.createFromOptions(
                    vision,
                    {
                        baseOptions: {
                            modelAssetPath:
                                "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task",
                        },
                        runningMode: "video",
                        numHands: 2,
                    }
                );

                setRecognizer(gestureRecognizer);
                setIsLoading(false);
            } catch (error) {
                console.error("Failed to initialize gesture recognizer:", error);
                setIsLoading(false);
            }
        }

        init();

        return () => {
            if (recognizer) recognizer.close();
        };
    }, []);

    // Start camera
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
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    // Gesture recognition loop
    useEffect(() => {
        if (!recognizer) return;
        if (!videoRef.current) return;

        const video = videoRef.current;
        let animationId;

        function onVideoReady() {
            const detect = async (time) => {
                if (!video.videoWidth || !video.videoHeight) {
                    animationId = requestAnimationFrame(detect);
                    return;
                }

                const result = await recognizer.recognizeForVideo(video, time);
                draw(result);

                animationId = requestAnimationFrame(detect);
            };

            animationId = requestAnimationFrame(detect);
        }

        video.addEventListener("loadeddata", onVideoReady);

        return () => {
            video.removeEventListener("loadeddata", onVideoReady);
            if (animationId) cancelAnimationFrame(animationId);
        };
    }, [recognizer]);

    const HAND_CONNECTIONS = [
        // Thumb
        [1, 2], [2, 3], [3, 4],
        // Index
        [5, 6], [6, 7], [7, 8],
        // Middle
        [9, 10], [10, 11], [11, 12],
        // Ring
        [13, 14], [14, 15], [15, 16],
        // Pinky
        [17, 18], [18, 19], [19, 20],
        // Palm lines
        [0, 1], [0, 5], [5, 9], [9, 13], [13, 17], [17, 0]
    ];

    const draw = (result) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (!canvas || !video) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Flip for landmarks so they match mirrored video
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);

        // Draw hand skeleton
        if (result.landmarks) {
            result.landmarks.forEach(hand => {
                ctx.strokeStyle = "white";
                ctx.lineWidth = 3;

                HAND_CONNECTIONS.forEach(([s, e]) => {
                    const p1 = hand[s];
                    const p2 = hand[e];

                    ctx.beginPath();
                    ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
                    ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
                    ctx.stroke();
                });

                // Draw dots
                ctx.fillStyle = "#4CC9F0";
                hand.forEach((p) => {
                    ctx.beginPath();
                    ctx.arc(p.x * canvas.width, p.y * canvas.height, 5, 0, Math.PI * 2);
                    ctx.fill();
                });
            });
        }

        ctx.restore(); // stop mirroring before drawing text

        // Draw gesture text (upright)
        if (result.gestures?.length) {
            const top = result.gestures[0][0];
            ctx.fillStyle = "cyan";
            ctx.font = "28px Arial";
            ctx.fillText(`Gesture: ${top.categoryName}`, 20, 40);
        }
    };

    return (
        <div className="detection-component">
            <div className="detection-header">
                <h2>✋ Hand Gesture Recognition</h2>
                <button onClick={onClose} className="close-btn">✕</button>
            </div>

            {isLoading && <div className="loading">Loading Model...</div>}

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

export default ObjectDetection;
