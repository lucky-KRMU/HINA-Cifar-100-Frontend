# HINA Cifar 100 — Frontend Web Application

> **Live Demo**: [https://lucky-krmu.github.io/HINA-Cifar-100-Frontend/](https://lucky-krmu.github.io/HINA-Cifar-100-Frontend/)

HighRes Image Network Architecture (**HINA**) interactive web dashboard for real-time CIFAR-100 image classification. Built with **React 19**, **Vite**, and styled with a custom aesthetic featuring neon green, sky blue, and neon electric blue gradients.

---

## Features

- **Dual-Mode Input Station**:
  - **Drag & Drop**: Seamlessly upload images (PNG, JPG, WEBP) from your device with active drop-target feedback.
  - **Live Webcam Capture**: Target objects using an interactive viewfinder reticle and capture photos directly for instant inference.
- **Multi-Resolution Inspector**:
  - Compares original uploaded dimensions against native CIFAR-100 $32 \times 32$ resolution.
  - Toggle between bilinear smooth and nearest-neighbor pixelated zoom to inspect CIFAR pixel granularity.
- **Classification Engine Visualizer**:
  - **Hero Prediction Card**: Prominent top predicted class name, confidence rating, class index, and coarse superclass badge.
  - **Ranked Top-$K$ Predictions**: Staggered animated probability bars with rank identifiers and softmax percentages.
  - **Coarse Superclass Distribution**: Coarse category breakdown grouping fine predictions into high-level categories.
  - **Diagnostic Telemetry**: Real-time stats on inference latency ($ms$), parameter count ($23.8\text{M}$), and tensor resolutions.
- **100-Class Knowledge Catalog**:
  - Modal overlay cataloging all 100 fine labels across the 20 CIFAR-100 superclasses.
  - Real-time search filtering and superclass dropdown selector.
- **Visual Design & Typography**:
  - Color palette: Neon Green (`#10b981`), Sky Blue (`#0ea5e9`), and Electric Blue (`#00f0ff`).
  - Google Fonts: `Sansation` for body UI, `Overlock SC` for headings/branding, and `JetBrains Mono` for metrics.

---

## Tech Stack

- **Framework**: React 19 + Vite
- **Icons**: [Lucide React](https://lucide.dev)
- **Effects**: [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
- **Fonts**: Google Fonts (`Sansation`, `Overlock SC`, `JetBrains Mono`)

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node.js 24)
- npm or yarn

### 2. Installation
```bash
# Navigate to the frontend directory
cd hina-cifar-100-frontend

# Install dependencies
npm install
```

### 3. Development Server
```bash
npm run dev
```
Open `http://localhost:5173` (or the port shown in terminal) in your browser.

### 4. Configuration
By default, the application connects to the backend at `http://localhost:8000`. You can configure a custom API URL using an environment variable:

```bash
# .env.local
VITE_API_BASE=http://localhost:8000
```

### 5. Production Build
```bash
# Compile and bundle for production
npm run build

# Preview the production build locally
npm run preview
```

---

## Directory Structure

```
hina-cifar-100-frontend/
├── public/
│   ├── favicon.png          # Circular HINA emblem browser tab icon
│   └── ...
├── src/
│   ├── assets/
│   │   └── hina-logo.jpg    # HINA brand emblem
│   ├── App.jsx              # Main dashboard component
│   ├── App.css              # Custom styling & animations
│   ├── index.css            # Global CSS variables & typography
│   └── main.jsx             # React entrypoint
├── index.html               # HTML template & font imports
├── vite.config.js           # Vite build configuration & dev proxy
├── package.json             # NPM dependencies & scripts
└── README.md                # Frontend documentation
```
