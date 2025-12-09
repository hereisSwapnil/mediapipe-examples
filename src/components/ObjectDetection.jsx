import React, { useEffect, useRef, useState } from "react";
import {
    FilesetResolver,
    ObjectDetector
} from "@mediapipe/tasks-vision";

function ObjectDetection({ onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const detectorRef = useRef(null);
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

        // Close detector
        if (detectorRef.current) {
            detectorRef.current.close();
            detectorRef.current = null;
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

    // Initialize MediaPipe Object Detector
    useEffect(() => {
        async function initDetector() {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );

                const objectDetector = await ObjectDetector.createFromOptions(
                    vision,
                    {
                        baseOptions: {
                            modelAssetPath: `https://storage.googleapis.com/mediapipe-tasks/object_detector/efficientdet_lite0_uint8.tflite`
                        },
                        scoreThreshold: 0.5,
                        runningMode: "video"
                    }
                );

                detectorRef.current = objectDetector;
                setIsLoading(false);
            } catch (error) {
                console.error("Error initializing object detector:", error);
                setIsLoading(false);
            }
        }

        initDetector();

        return cleanup;
    }, []);

    // Start webcam
    useEffect(() => {
        async function startCam() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true
                });
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

    // Run detection loop
    useEffect(() => {
        if (!detectorRef.current) return;
        if (!videoRef.current) return;

        const video = videoRef.current;
        const detector = detectorRef.current;

        function onVideoReady() {
            const detect = (time) => {
                if (!video.videoWidth || !video.videoHeight || !detectorRef.current) {
                    if (detectorRef.current) {
                        animationIdRef.current = requestAnimationFrame(detect);
                    }
                    return;
                }

                try {
                    const result = detector.detectForVideo(video, time);
                    drawResults(result);
                } catch (e) {
                    // Detector might be closed
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

    const drawResults = (result) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (!canvas || !video) return;
        if (!video.videoWidth || !video.videoHeight) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!result || !result.detections) return;

        ctx.lineWidth = 2;
        ctx.strokeStyle = "#00ff00";
        ctx.font = "14px Arial";

        result.detections.forEach(det => {
            const box = det.boundingBox;

            ctx.strokeRect(box.originX, box.originY, box.width, box.height);

            const label = det.categories[0].categoryName;
            const score = det.categories[0].score.toFixed(2);

            ctx.fillStyle = "#00ff00";
            ctx.fillText(`${label} ${score}`, box.originX, box.originY - 6);
        });
    };

    return (
        <div className="detection-component">
            <div className="detection-header">
                <h2>🎯 Object Detection</h2>
                <button onClick={handleClose} className="close-btn">✕</button>
            </div>

            {isLoading && (
                <div className="loading">Loading Object Detection Model...</div>
            )}

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

export default ObjectDetection;
