# Facial-Animation-System 🎭

> Real-time facial motion capture & 3D avatar animation web application powered by Google MediaPipe Face Mesh (468 landmarks) and HTML5 Canvas.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![MediaPipe](https://img.shields.io/badge/MediaPipe-FaceMesh-00d4ff?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## 📌 Overview

**Facial-Animation-System** is a client-side computer vision and 3D graphics application that tracks facial landmarks in real time through a standard webcam. It calculates facial blendshapes, estimates teeth exposure, and projects these expressions onto an interactive 3D procedural wireframe avatar.

---

## ✨ Key Features

- **468 3D Facial Keypoints**: High-fidelity facial geometry tracking using `@mediapipe/face_mesh`.
- **Teeth Visibility Detection**: Calculates normalized Euclidean distances across inner-lip landmarks (`12` upper, `15` lower) to render upper and lower teeth arches when smiling or talking.
- **Biometric Blendshape Mapping**:
  - **Eye Aspect Ratio (EAR)** for natural eye blink and openness detection.
  - **Eyebrow Raise & Furrow** distance monitoring.
  - **Mouth aperture, jaw drop, and smile curvature**.
- **3D Canvas Avatar**:
  - Perspective projection math engine running at 60 FPS in vanilla HTML5 Canvas without heavy external 3D libraries.
  - Procedural wireframe head geometry with lerped motion kinematics (`dt = 0.12`).
- **Interactive Preset Demos**: Test avatar expressions with presets for **Neutral**, **Smile**, **Surprised**, **Angry**, and **Blink**.
- **Cyberpunk Sci-Fi HUD**: Live FPS counter, active landmark count, diagnostic sub-canvases, and real-time parameter level bars.

---

## 🏗️ Project Architecture

```
facial-animation-system/
├── index.html         # Main application markup & HUD layout
├── css/
│   └── style.css      # Cyberpunk UI theme, animations & responsive grid
├── js/
│   ├── geometry.js    # 3D head vertices, edge topology & feature coordinates
│   ├── renderer.js    # Perspective projection, wireframe & teeth rendering
│   ├── tracker.js     # MediaPipe landmark analysis, EAR & blendshape math
│   └── app.js         # Camera stream lifecycle & main animation loop
├── LICENSE            # MIT License
└── README.md          # Project documentation
```

### Pipeline Flow

```mermaid
flowchart LR
    A[Webcam Input] --> B[MediaPipe Face Mesh]
    B --> C[Parameter Extraction]
    C --> D[Blendshape Mapping]
    D --> E[3D Canvas Avatar]
```

1. **Webcam Stream**: Captures video frames using `navigator.mediaDevices.getUserMedia`.
2. **Landmark Inference**: Processes frames with `@mediapipe/face_mesh` to locate 468 3D landmarks.
3. **Parameter Normalization**: Distances are scaled relative to face height (`forehead` to `chin`) for distance-invariant tracking.
4. **Procedural 3D Render**: Projects 3D mesh points onto the 2D canvas with customizable lighting, depth fading, and teeth visibility.

---

## 🚀 Getting Started

### Prerequisites
A modern web browser with camera access (Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari).

### Usage
1. Clone this repository:
   ```bash
   git clone https://github.com/Praveen061215/Facial-Animation-System.git
   cd Facial-Animation-System
   ```
2. Open `index.html` in your browser:
   - Double-click `index.html` to open directly, **OR**
   - Use a local development server:
     ```bash
     # With Node.js:
     npx serve .

     # With Python:
     python -m http.server 8000
     ```
3. Grant camera permissions and click **"▶ Start Camera"**.

---

## 🔬 Technical Specifications

| Feature | Implementation |
|---|---|
| **Landmark Model** | Google MediaPipe Face Mesh (`refineLandmarks: true`) |
| **Blink Estimation** | Eye Aspect Ratio (EAR) with thresholds (`openT = 0.32`, `thresh = 0.18`) |
| **Teeth Exposure** | Euclidean distance between landmarks `12` (upper inner lip) & `15` (lower inner lip) |
| **Smoothing** | Linear interpolation (`lerp`) factor `dt = 0.12` |
| **Projection** | Custom 3D-to-2D pinhole perspective projection (`fov = 2.2`) |

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
