import React, { useState, useEffect, useRef } from 'react'
import {
  Upload,
  Camera,
  Layers,
  Activity,
  Zap,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  X,
  Search,
  Sparkles,
  Maximize2,
  RefreshCw,
  Cpu,
  Eye
} from 'lucide-react'
import confetti from 'canvas-confetti'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export default function App() {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState('upload') // 'upload' | 'webcam'
  const [dragOver, setDragOver] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [searchCatalog, setSearchCatalog] = useState('')
  const [selectedSuperclass, setSelectedSuperclass] = useState('all')

  // Data & Prediction States
  const [backendHealth, setBackendHealth] = useState(null)
  const [samples, setSamples] = useState([])
  const [catalog, setCatalog] = useState({ fine_classes: [], superclasses: [] })
  
  const [currentImagePreview, setCurrentImagePreview] = useState(null)
  const [selectedSampleId, setSelectedSampleId] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Options
  const [topK, setTopK] = useState(5)
  const [preprocessMode, setPreprocessMode] = useState('resnet')
  const [pixelatedView, setPixelatedView] = useState(false)

  // Webcam Refs & State
  const videoRef = useRef(null)
  const [webcamActive, setWebcamActive] = useState(false)
  const [cameraStream, setCameraStream] = useState(null)
  const fileInputRef = useRef(null)

  // Fetch initial system data
  useEffect(() => {
    checkHealth()
    fetchSamples()
    fetchClasses()
  }, [])

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/health`)
      if (res.ok) {
        const data = await res.json()
        setBackendHealth(data)
      } else {
        setBackendHealth({ status: 'offline' })
      }
    } catch {
      setBackendHealth({ status: 'offline' })
    }
  }

  const fetchSamples = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/samples`)
      if (res.ok) {
        const data = await res.json()
        const enriched = (data.samples || []).map(s => ({
          ...s,
          url: s.url.startsWith('http') ? s.url : `${API_BASE}${s.url}`
        }))
        setSamples(enriched)
      }
    } catch (err) {
      console.warn('Failed to load sample presets', err)
    }
  }

  const fetchClasses = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/classes`)
      if (res.ok) {
        const data = await res.json()
        setCatalog(data)
      }
    } catch (err) {
      console.warn('Failed to load class catalog', err)
    }
  }

  // Handle Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0])
    }
  }

  const handleFileSelected = (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WEBP).')
      return
    }
    setError(null)
    setSelectedSampleId(null)
    setSelectedFile(file)

    const reader = new FileReader()
    reader.onload = (e) => {
      setCurrentImagePreview(e.target.result)
      runPrediction({ file, mode: preprocessMode, k: topK })
    }
    reader.readAsDataURL(file)
  }

  // Handle Preset Sample Selection
  const handleSelectSample = (sample) => {
    setError(null)
    setSelectedFile(null)
    setSelectedSampleId(sample.id)
    setCurrentImagePreview(sample.url)
    runPrediction({ sampleId: sample.id, mode: preprocessMode, k: topK })
  }

  // Webcam Management
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraStream(stream)
      setWebcamActive(true)
      setError(null)
    } catch (err) {
      setError('Webcam access was denied or is unavailable: ' + err.message)
    }
  }

  const stopWebcam = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
    setWebcamActive(false)
  }

  const captureWebcamSnapshot = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 320
    canvas.height = video.videoHeight || 240
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'webcam-snapshot.jpg', { type: 'image/jpeg' })
        stopWebcam()
        setActiveTab('upload')
        handleFileSelected(file)
      }
    }, 'image/jpeg', 0.95)
  }

  // Trigger Prediction Request
  const runPrediction = async ({ file, sampleId, mode, k }) => {
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      if (file) {
        formData.append('file', file)
      } else if (sampleId) {
        formData.append('sample_id', sampleId)
      }
      formData.append('top_k', k || topK)
      formData.append('preprocess_mode', mode || preprocessMode)

      const res = await fetch(`${API_BASE}/api/predict`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Prediction failed')
      }

      const data = await res.json()
      setResult(data)

      // Confetti celebration if high confidence
      if (data.top_prediction && data.top_prediction.confidence > 65) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.65 },
          colors: ['#10b981', '#0ea5e9', '#00f0ff']
        })
      }
    } catch (err) {
      setError(err.message || 'Error occurred while running inference.')
    } finally {
      setLoading(false)
    }
  }

  // Filter Catalog
  const filteredClasses = (catalog.fine_classes || []).filter((c) => {
    const matchesSearch =
      c.display_name.toLowerCase().includes(searchCatalog.toLowerCase()) ||
      c.raw_name.toLowerCase().includes(searchCatalog.toLowerCase()) ||
      c.superclass.toLowerCase().includes(searchCatalog.toLowerCase())
    const matchesSuper =
      selectedSuperclass === 'all' || c.superclass.toLowerCase() === selectedSuperclass.toLowerCase()
    return matchesSearch && matchesSuper
  })

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo-wrap">
            <Layers size={28} color="#00f0ff" />
          </div>
          <div className="brand-titles">
            <h1>
              HINA <span style={{ color: '#38bdf8' }}>Cifar 100</span>
            </h1>
            <p>
              <span className="hina-acronym">H</span>ighRes{' '}
              <span className="hina-acronym">I</span>mage{' '}
              <span className="hina-acronym">N</span>etwork{' '}
              <span className="hina-acronym">A</span>rchitecture
            </p>
          </div>
        </div>

        <div className="header-actions">
          <div
            className={`status-badge ${
              backendHealth?.status === 'healthy' ? 'online' : 'offline'
            }`}
            title="Backend API Status"
          >
            <span className="status-dot"></span>
            <span>
              {backendHealth?.status === 'healthy'
                ? 'ResNet-50 Online'
                : 'Connecting API...'}
            </span>
          </div>

          <button
            className="catalog-btn"
            onClick={() => setCatalogOpen(true)}
            title="Browse all 100 CIFAR categories"
          >
            <BookOpen size={16} />
            <span>100 Classes</span>
          </button>
        </div>
      </header>

      {/* Model Architecture Pipeline Explainer */}
      <section className="architecture-banner">
        <div className="arch-flow">
          <div className="arch-node">
            <span>Input Scale</span>
            <span>32 × 32 px</span>
          </div>
          <span className="arch-arrow">➔</span>
          <div className="arch-node">
            <span>HINA Upscaling</span>
            <span>224 × 224 HighRes</span>
          </div>
          <span className="arch-arrow">➔</span>
          <div className="arch-node">
            <span>Deep Backbone</span>
            <span>ResNet-50 (23.8M)</span>
          </div>
          <span className="arch-arrow">➔</span>
          <div className="arch-node">
            <span>Classification</span>
            <span>100 Fine Classes</span>
          </div>
        </div>

        <div className="arch-tagline">
          Trained on CIFAR-100 with <strong>High-Resolution ResNet-50</strong> feature extractors for fine-grained object recognition.
        </div>
      </section>

      {/* Main Grid: Input Station & Inference Visualizer */}
      <main className="workspace-grid">
        {/* Left Column: Image Inputs */}
        <section className="glass-panel">
          <div className="panel-title-row">
            <h2 className="panel-title">
              <Upload size={20} />
              Input Station
            </h2>
            <div className="input-tabs">
              <button
                className={`input-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => {
                  stopWebcam()
                  setActiveTab('upload')
                }}
              >
                <Upload size={14} />
                Upload
              </button>
              <button
                className={`input-tab-btn ${activeTab === 'webcam' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('webcam')
                  startWebcam()
                }}
              >
                <Camera size={14} />
                Webcam
              </button>
            </div>
          </div>

          {/* Upload Mode */}
          {activeTab === 'upload' && (
            <div
              className={`dropzone-container ${dragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="file-input-hidden"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelected(e.target.files[0])
                  }
                }}
              />
              <div className="dropzone-icon-wrap">
                <Upload size={26} />
              </div>
              <div className="dropzone-text">
                <h3>Drag & Drop Image Here</h3>
                <p>or click to browse from your device (PNG, JPG, WEBP)</p>
              </div>
            </div>
          )}

          {/* Webcam Mode */}
          {activeTab === 'webcam' && (
            <div className="webcam-container">
              <div className="webcam-video-wrap">
                <video ref={videoRef} autoPlay playsInline muted />
                <div className="camera-reticle"></div>
              </div>
              <div className="webcam-actions">
                <button className="btn-capture" onClick={captureWebcamSnapshot}>
                  <Camera size={16} />
                  Capture Photo
                </button>
              </div>
            </div>
          )}

          {/* Quick Preset Samples */}
          <div className="preset-section">
            <div className="preset-title-row">
              <span>Quick Test Samples (CIFAR-100 Presets)</span>
              <Sparkles size={14} color="#00f0ff" />
            </div>

            <div className="preset-chips-grid">
              {samples.map((sample) => (
                <button
                  key={sample.id}
                  className={`preset-chip ${
                    selectedSampleId === sample.id ? 'active' : ''
                  }`}
                  onClick={() => handleSelectSample(sample)}
                >
                  <img
                    src={sample.url}
                    alt={sample.name}
                    className="preset-thumb"
                  />
                  <div className="preset-meta">
                    <span>{sample.name}</span>
                    <span>{sample.superclass}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Resolution Inspector (Original vs 32x32 CIFAR Native) */}
          {(currentImagePreview || result?.previews) && (
            <div className="resolution-inspector">
              <div className="res-header">
                <span>Multi-Resolution Inspector</span>
                <div className="res-pill-nav">
                  <button
                    className={`res-nav-btn ${!pixelatedView ? 'active' : ''}`}
                    onClick={() => setPixelatedView(false)}
                  >
                    Smooth
                  </button>
                  <button
                    className={`res-nav-btn ${pixelatedView ? 'active' : ''}`}
                    onClick={() => setPixelatedView(true)}
                  >
                    Pixelated Zoom
                  </button>
                </div>
              </div>

              <div className="res-stage">
                <div className="res-card">
                  <div className="res-card-label">
                    <Maximize2 size={12} />
                    Original ({result?.metrics?.original_resolution ? `${result.metrics.original_resolution[0]}×${result.metrics.original_resolution[1]}` : 'Source'})
                  </div>
                  <div className="res-preview-box">
                    <img
                      src={result?.previews?.original || currentImagePreview}
                      alt="Original input"
                    />
                  </div>
                </div>

                <div className="res-card">
                  <div className="res-card-label">
                    <Layers size={12} />
                    CIFAR Native (32 × 32 px)
                  </div>
                  <div
                    className={`res-preview-box ${
                      pixelatedView ? 'pixelated' : ''
                    }`}
                  >
                    <img
                      src={result?.previews?.cifar_32x32 || currentImagePreview}
                      alt="CIFAR native resolution"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '12px',
                color: '#fca5a5',
                fontSize: '0.85rem',
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* Right Column: Prediction Visualizer */}
        <section className="glass-panel">
          <div className="panel-title-row">
            <h2 className="panel-title">
              <Activity size={20} />
              Classification Engine
            </h2>
            {loading && <div className="spinner"></div>}
          </div>

          {/* Empty / Initial State */}
          {!result && !loading && (
            <div className="empty-results-state">
              <div className="empty-icon-wrap">
                <Zap size={32} />
              </div>
              <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>
                Awaiting Image Input
              </h3>
              <p style={{ maxWidth: '340px', fontSize: '0.86rem' }}>
                Upload an image or select a preset sample above to execute real-time inference through HINA ResNet-50.
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="empty-results-state">
              <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
              <h3 style={{ color: 'var(--neon-blue)', fontSize: '1.05rem', marginTop: '12px' }}>
                Running HINA ResNet-50 Inference...
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Upscaling tensor to 224×224 and computing 100-class softmax
              </p>
            </div>
          )}

          {/* Results Display */}
          {result && !loading && (
            <>
              {/* Winner Top-1 Card */}
              <div className="top-prediction-card">
                <div className="winner-info">
                  <div className="winner-sub">
                    <CheckCircle2 size={15} color="#10b981" />
                    Top Prediction Match
                  </div>
                  <div className="winner-title">
                    {result.top_prediction.display_name}
                  </div>
                  <div className="winner-tags">
                    <span className="superclass-tag">
                      {result.top_prediction.superclass.toUpperCase()}
                    </span>
                    <span className="class-id-tag">
                      Class ID #{result.top_prediction.class_id}
                    </span>
                  </div>
                </div>

                <div className="winner-metric">
                  <div className="confidence-big">
                    {result.top_prediction.confidence}%
                  </div>
                  <span className="confidence-label">Confidence</span>
                </div>
              </div>

              {/* Top-5 Predictions List */}
              <div className="predictions-list">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                  }}
                >
                  <span>Ranked Top-{result.predictions.length} Classes</span>
                  <span>Softmax Score</span>
                </div>

                {result.predictions.map((pred) => (
                  <div key={pred.class_id} className="prediction-bar-item">
                    <div className="bar-meta-row">
                      <div className="bar-class-name">
                        <span
                          className={`rank-badge ${
                            pred.rank === 1 ? 'top-rank' : ''
                          }`}
                        >
                          #{pred.rank}
                        </span>
                        <span>{pred.display_name}</span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-dim)',
                            textTransform: 'capitalize',
                          }}
                        >
                          ({pred.superclass})
                        </span>
                      </div>
                      <span className="bar-value">{pred.confidence}%</span>
                    </div>

                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.max(pred.confidence, 1.5)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Superclass Distribution */}
              {result.superclasses && result.superclasses.length > 0 && (
                <div className="superclass-distribution">
                  <div className="sc-header">
                    <Layers size={14} color="#10b981" />
                    <span>Top Superclasses (Coarse Categories)</span>
                  </div>
                  <div className="sc-chips">
                    {result.superclasses.map((sc) => (
                      <div key={sc.raw_name} className="sc-chip">
                        <span>{sc.name}:</span>
                        <strong>{sc.confidence}%</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Real-Time Diagnostic Telemetry */}
              <div className="telemetry-row">
                <div className="telemetry-node">
                  <span>Latency</span>
                  <span>{result.metrics?.latency_ms} ms</span>
                </div>
                <div className="telemetry-node">
                  <span>Parameters</span>
                  <span>{(result.metrics?.total_parameters / 1e6).toFixed(1)}M</span>
                </div>
                <div className="telemetry-node">
                  <span>CIFAR Shape</span>
                  <span>32×32 RGB</span>
                </div>
                <div className="telemetry-node">
                  <span>HINA Upscaled</span>
                  <span>224×224</span>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Catalog Modal (All 100 Classes) */}
      {catalogOpen && (
        <div className="modal-overlay" onClick={() => setCatalogOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>CIFAR-100 Knowledge Catalog (100 Classes)</h2>
              <button
                className="modal-close-btn"
                onClick={() => setCatalogOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-search-bar">
              <input
                type="text"
                placeholder="Search classes or categories (e.g., rocket, lion, aquatic)..."
                className="modal-input"
                value={searchCatalog}
                onChange={(e) => setSearchCatalog(e.target.value)}
              />

              <select
                className="modal-input"
                style={{ maxWidth: '240px' }}
                value={selectedSuperclass}
                onChange={(e) => setSelectedSuperclass(e.target.value)}
              >
                <option value="all">All Superclasses (20)</option>
                {(catalog.superclasses || []).map((sc) => (
                  <option key={sc.raw_name} value={sc.raw_name}>
                    {sc.name} ({sc.count})
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-body">
              {filteredClasses.map((item) => (
                <div key={item.index} className="class-grid-item">
                  <span>#{item.index} {item.display_name}</span>
                  <span>{item.superclass}</span>
                </div>
              ))}
              {filteredClasses.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-dim)', padding: '24px' }}>
                  No classes match your search query.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
