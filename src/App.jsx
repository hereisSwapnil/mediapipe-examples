import React, { useState } from "react";
import "./App.css";

// Import detection components
import ObjectDetection from "./components/ObjectDetection";
import ImageClassification from "./components/ImageClassification";
import HandGestureRecognition from "./components/HandGestureRecognition";
import FaceLandmarkDetection from "./components/FaceLandmarkDetection";

// Detection options configuration - easily extendable
const DETECTION_OPTIONS = [
  {
    id: "object-detection",
    name: "Object Detection",
    icon: "🎯",
    description: "Detect and identify objects in real-time",
    component: ObjectDetection,
    color: "#00ff00"
  },
  {
    id: "image-classification",
    name: "Image Classification",
    icon: "📷",
    description: "Classify images in real-time",
    component: ImageClassification,
    color: "#00ff00"
  },
  {
    id: "hand-gesture-recognition",
    name: "Hand Gesture Recognition",
    icon: "✋",
    description: "Recognize hand gestures in real-time",
    component: HandGestureRecognition,
    color: "#00ff00"
  },
  {
    id: "face-landmark-detection",
    name: "Face Landmark Detection",
    icon: "💆‍♂️",
    description: "Detect and identify objects in real-time",
    component: FaceLandmarkDetection,
    color: "#00ff00"
  }
];

function App() {
  const [activeDetection, setActiveDetection] = useState(null);

  const handleSelectDetection = (detectionId) => {
    setActiveDetection(detectionId);
  };

  const handleCloseDetection = () => {
    setActiveDetection(null);
  };

  // Find the active detection component
  const activeOption = DETECTION_OPTIONS.find(opt => opt.id === activeDetection);
  const ActiveComponent = activeOption?.component;

  return (
    <div className="app-container">
      {!activeDetection ? (
        // Main Menu
        <div className="menu-container">
          <h1 className="app-title">
            <span className="title-icon">🔍</span>
            MediaPipe Detection Suite
          </h1>
          <p className="app-subtitle">Choose a detection type to get started</p>

          <div className="detection-grid">
            {DETECTION_OPTIONS.map((option) => (
              <button
                key={option.id}
                className="detection-card"
                onClick={() => handleSelectDetection(option.id)}
                style={{ "--accent-color": option.color }}
              >
                <span className="card-icon">{option.icon}</span>
                <h3 className="card-title">{option.name}</h3>
                <p className="card-description">{option.description}</p>
                <span className="card-arrow">→</span>
              </button>
            ))}
          </div>

          <p className="footer-text">
            Powered by Google MediaPipe
          </p>
        </div>
      ) : (
        // Active Detection Component
        <ActiveComponent onClose={handleCloseDetection} />
      )}
    </div>
  );
}

export default App;
