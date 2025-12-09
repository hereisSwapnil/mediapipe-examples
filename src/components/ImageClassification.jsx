import React, { useEffect, useRef, useState } from "react";
import {
    FilesetResolver,
    ImageClassifier
} from "@mediapipe/tasks-vision";

function ImageClassification({ onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const classifierRef = useRef(null);
    const animationIdRef = useRef(null);

    const [isLoading, setIsLoading] = useState(true);

    // Cleanup function to stop everything immediately
    const cleanup = () => {
        // Stop animation loop
        if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current);
            animationIdRef.current = null;
        }

        // Stop camera stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // Close classifier
        if (classifierRef.current) {
            classifierRef.current.close();
            classifierRef.current = null;
        }

        // Clear video source
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    // Handle close button click
    const handleClose = () => {
        cleanup();
        onClose();
    };

    // Initialize MediaPipe ImageClassifier
    useEffect(() => {
        async function initClassifier() {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
                );

                const imageClassifier = await ImageClassifier.createFromOptions(
                    vision,
                    {
                        baseOptions: {
                            modelAssetPath:
                                "https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/float32/1/efficientnet_lite0.tflite"
                        },
                        runningMode: "video"
                    }
                );

                classifierRef.current = imageClassifier;
                setIsLoading(false);
            } catch (error) {
                console.error("Error initializing image classifier:", error);
                setIsLoading(false);
            }
        }

        initClassifier();

        return cleanup;
    }, []);

    // Start camera
    useEffect(() => {
        async function startCam() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error("Error accessing camera:", error);
            }
        }

        startCam();

        return cleanup;
    }, []);

    // Classification loop
    useEffect(() => {
        if (!classifierRef.current) return;
        if (!videoRef.current) return;

        const video = videoRef.current;
        const classifier = classifierRef.current;

        function onVideoReady() {
            const detect = async (time) => {
                if (!video.videoWidth || !video.videoHeight || !classifierRef.current) {
                    if (classifierRef.current) {
                        animationIdRef.current = requestAnimationFrame(detect);
                    }
                    return;
                }

                try {
                    const result = await classifier.classifyForVideo(video, time);
                    drawResults(result);
                } catch (e) {
                    // Classifier might be closed
                    return;
                }

                animationIdRef.current = requestAnimationFrame(detect);
            };

            animationIdRef.current = requestAnimationFrame(detect);
        }

        video.addEventListener("loadeddata", onVideoReady);

        return () => {
            video.removeEventListener("loadeddata", onVideoReady);
        };
    }, [isLoading]);

    // Draw classification label
    const drawResults = (result) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (!canvas || !video) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!result || !result.classifications || !result.classifications[0]?.categories[0]) return;

        const top = result.classifications[0].categories[0];

        ctx.fillStyle = "#00ff00";
        ctx.font = "24px Arial";
        ctx.fillText(`${top.categoryName} (${top.score.toFixed(2)})`, 20, 40);
    };

    return (
        <div className="detection-component">
            <div className="detection-header">
                <h2>📷 Image Classification</h2>
                <button onClick={handleClose} className="close-btn">✕</button>
            </div>

            {isLoading && <div className="loading">Loading Image Classifier...</div>}

            <div className="video-container">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="video-feed"
                    style={{ transform: "scaleX(-1)" }}
                />
                <canvas
                    ref={canvasRef}
                    className="detection-canvas"
                />
            </div>
        </div>
    );
}

export default ImageClassification;
