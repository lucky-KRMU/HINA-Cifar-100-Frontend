import React, { useState, useEffect, useRef, useCallback } from 'react'
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
  Maximize2,
  ChevronRight
} from 'lucide-react'
import confetti from 'canvas-confetti'
import hinaLogo from './assets/hina-logo.jpg'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export default function App() {
  // Navigation & UI
  const [activeTab, setActiveTab] = useState('upload')
  const [dragOver, setDragOver] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [searchCatalog, setSearchCatalog] = useState('')
  const [selectedSuperclass, setSelectedSuperclass] = useState('all')
  const [pixelatedView, setPixelatedView] = useState(false)

  // Data States
  const [backendHealth, setBackendHealth] = useState(null)
  const [catalog, setCatalog] = useState({ fine_classes: [], superclasses: [] })
  const [selectedFile, setSelectedFile] = useState(null)
  const [currentImagePreview, setCurrentImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Webcam
  const [webcamActive, setWebcamActive] = useState(false)
  const videoRef = useRef(null)
  const [cameraStream, setCameraStream] = useState(null)
  const fileInputRef = useRef(null)

  const [topK] = useState(5)
  const [preprocessMode] = useState('resnet')

  // Initial data fetch — inlined to satisfy react(set-state-in-effect)
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/health`)
        if (!cancelled) {
          setBackendHealth(res.ok ? await res.json() : { status: 'offline' })
        }
      } catch {
        if (!cancelled) setBackendHealth({ status: 'offline' })
      }

      try {
        const res = await fetch(`${API_BASE}/api/classes`)
        if (res.ok && !cancelled) {
          setCatalog(await res.json())
        }
      } catch (err) {
        console.warn('Failed to load class catalog', err)
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  // Drag & Drop
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)
  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.[0]) handleFileSelected(e.dataTransfer.files[0])
  }

  const handleFileSelected = useCallback((file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WEBP).')
      return
    }
    setError(null)
    setSelectedFile(file)

    const reader = new FileReader()
    reader.onload = (e) => {
      setCurrentImagePreview(e.target.result)
      runPrediction({ file, mode: preprocessMode, k: topK })
    }
    reader.readAsDataURL(file)
  }, [preprocessMode, topK])

  // Webcam
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      })
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraStream(stream)
      setWebcamActive(true)
      setError(null)
    } catch (err) {
      setError('Webcam access denied or unavailable: ' + err.message)
    }
  }

  const stopWebcam = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop())
      setCameraStream(null)
    }
    setWebcamActive(false)
  }, [cameraStream])

  const captureWebcamSnapshot = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 320
    canvas.height = video.videoHeight || 240
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'webcam-snapshot.jpg', { type: 'image/jpeg' })
        stopWebcam()
        setActiveTab('upload')
        handleFileSelected(file)
      }
    }, 'image/jpeg', 0.95)
  }

  // Prediction
  const runPrediction = async ({ file, mode, k }) => {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const formData = new FormData()
      if (file) formData.append('file', file)
      formData.append('top_k', k || topK)
      formData.append('preprocess_mode', mode || preprocessMode)

      const res = await fetch(`${API_BASE}/api/predict`, { method: 'POST', body: formData })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Prediction failed')
      }
      const data = await res.json()
      setResult(data)

      if (data.top_prediction?.confidence > 65) {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#0ea5e9', '#00f0ff']
        })
      }
    } catch (err) {
      setError(err.message || 'Error during inference.')
    } finally {
      setLoading(false)
    }
  }

  const filteredClasses = (catalog.fine_classes || []).filter((c) => {
    const q = searchCatalog.toLowerCase()
    const matchesSearch = c.display_name.toLowerCase().includes(q) ||
      c.raw_name.toLowerCase().includes(q) ||
      c.superclass.toLowerCase().includes(q)
    const matchesSuper = selectedSuperclass === 'all' ||
      c.superclass.toLowerCase() === selectedSuperclass.toLowerCase()
    return matchesSearch && matchesSuper
  })

  const isOnline = backendHealth?.status === 'healthy'

  return (
    <div className="app-root">
      {/* ─── Header ─── */}
      <header className="site-header">
        <div className="header-brand">
          <div className="logo-ring">
            <img src={hinaLogo} alt="HINA" className="logo-img" />
          </div>
          <div className="brand-copy">
            <h1 className="brand-name">
              HINA <span className="brand-accent">Cifar 100</span>
            </h1>
            <p className="brand-sub">
              <span className="acronym-letter">H</span>ighRes{' '}
              <span className="acronym-letter">I</span>mage{' '}
              <span className="acronym-letter">N</span>etwork{' '}
              <span className="acronym-letter">A</span>rchitecture
            </p>
          </div>
        </div>

        <nav className="header-nav">
          <div className={`api-status ${isOnline ? 'online' : 'offline'}`}>
            <span className="pulse-dot" />
            <span>{isOnline ? 'ResNet-50 Online' : 'Connecting…'}</span>
          </div>
          <button className="nav-pill" onClick={() => setCatalogOpen(true)}>
            <BookOpen size={14} />
            <span>100 Classes</span>
          </button>
        </nav>
      </header>

      {/* ─── Architecture Ribbon ─── */}
      <section className="arch-ribbon">
        <div className="arch-pipeline">
          {[
            { label: 'Input', value: '32 × 32 px' },
            { label: 'HINA Upscaling', value: '224 × 224 HighRes' },
            { label: 'ResNet-50 Backbone', value: '23.8 M params' },
            { label: 'Classification', value: '100 Fine Classes' },
          ].map((node, i, arr) => (
            <React.Fragment key={node.label}>
              <div className="pipe-node">
                <span className="pipe-label">{node.label}</span>
                <span className="pipe-value">{node.value}</span>
              </div>
              {i < arr.length - 1 && (
                <ChevronRight size={16} className="pipe-arrow" />
              )}
            </React.Fragment>
          ))}
        </div>
        <p className="arch-caption">
          Trained on CIFAR-100 · <strong>High-Resolution ResNet-50</strong> feature extractor · Fine-grained 100-class softmax
        </p>
      </section>

      {/* ─── Main Workspace ─── */}
      <main className="workspace">

        {/* ── Left: Input Station ── */}
        <section className="work-card input-card">
          <div className="card-header">
            <div className="card-title">
              <Upload size={17} />
              <span>Input Station</span>
            </div>
            <div className="tab-switcher">
              <button
                className={`tab-btn ${activeTab === 'upload' ? 'tab-active' : ''}`}
                onClick={() => { stopWebcam(); setActiveTab('upload') }}
              >
                <Upload size={13} /> Upload
              </button>
              <button
                className={`tab-btn ${activeTab === 'webcam' ? 'tab-active' : ''}`}
                onClick={() => { setActiveTab('webcam'); startWebcam() }}
              >
                <Camera size={13} /> Webcam
              </button>
            </div>
          </div>

          {/* Upload Drop Zone */}
          {activeTab === 'upload' && (
            <div
              className={`dropzone ${dragOver ? 'drag-active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden-file-input"
                accept="image/*"
                onChange={(e) => { if (e.target.files?.[0]) handleFileSelected(e.target.files[0]) }}
              />
              <div className="dz-icon-ring">
                <Upload size={24} />
              </div>
              <div className="dz-copy">
                <p className="dz-heading">Drop image here</p>
                <p className="dz-sub">or click to browse · PNG, JPG, WEBP</p>
              </div>
              {selectedFile && (
                <div className="dz-filename">
                  <CheckCircle2 size={13} color="#10b981" />
                  <span>{selectedFile.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Webcam */}
          {activeTab === 'webcam' && (
            <div className="webcam-panel">
              <div className="webcam-frame">
                <video ref={videoRef} autoPlay playsInline muted />
                <div className="cam-reticle" />
              </div>
              <button className="capture-btn" onClick={captureWebcamSnapshot}>
                <Camera size={15} />
                Capture &amp; Analyse
              </button>
            </div>
          )}

          {/* Resolution Inspector */}
          {(currentImagePreview || result?.previews) && (
            <div className="res-inspector">
              <div className="res-inspector-header">
                <span>Multi-Resolution Inspector</span>
                <div className="res-toggle">
                  <button
                    className={`res-btn ${!pixelatedView ? 'res-active' : ''}`}
                    onClick={() => setPixelatedView(false)}
                  >Smooth</button>
                  <button
                    className={`res-btn ${pixelatedView ? 'res-active' : ''}`}
                    onClick={() => setPixelatedView(true)}
                  >Pixelated</button>
                </div>
              </div>
              <div className="res-grid">
                <div className="res-cell">
                  <div className="res-cell-label">
                    <Maximize2 size={11} />
                    Original {result?.metrics?.original_resolution
                      ? `(${result.metrics.original_resolution[0]}×${result.metrics.original_resolution[1]})`
                      : '(Source)'}
                  </div>
                  <div className="res-img-box">
                    <img src={result?.previews?.original || currentImagePreview} alt="Original" />
                  </div>
                </div>
                <div className="res-cell">
                  <div className="res-cell-label">
                    <Layers size={11} />
                    CIFAR Native (32 × 32)
                  </div>
                  <div className={`res-img-box ${pixelatedView ? 'pixelated' : ''}`}>
                    <img src={result?.previews?.cifar_32x32 || currentImagePreview} alt="CIFAR 32x32" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="error-notice">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* ── Right: Classification Engine ── */}
        <section className="work-card results-card">
          <div className="card-header">
            <div className="card-title">
              <Activity size={17} />
              <span>Classification Engine</span>
            </div>
            {loading && <span className="loader-ring" />}
          </div>

          {/* Empty State */}
          {!result && !loading && (
            <div className="empty-state">
              <div className="empty-icon">
                <Zap size={28} />
              </div>
              <h3>Awaiting Image Input</h3>
              <p>Upload or capture a photo to run real-time inference through HINA ResNet-50.</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="empty-state">
              <span className="loader-ring loader-lg" />
              <h3 style={{ color: 'var(--neon-blue)' }}>Running Inference…</h3>
              <p>Upscaling tensor → 224×224 · Computing 100-class softmax</p>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="results-content">

              {/* Winner Hero Card */}
              <div className="winner-card">
                <div className="winner-left">
                  <span className="winner-eyebrow">
                    <CheckCircle2 size={13} />
                    Top Prediction
                  </span>
                  <h2 className="winner-name">{result.top_prediction.display_name}</h2>
                  <div className="winner-tags">
                    <span className="tag-superclass">
                      {result.top_prediction.superclass.toUpperCase()}
                    </span>
                    <span className="tag-id">
                      Class #{result.top_prediction.class_id}
                    </span>
                  </div>
                </div>
                <div className="winner-right">
                  <div className="confidence-ring">
                    <span className="conf-number">{result.top_prediction.confidence}</span>
                    <span className="conf-unit">%</span>
                  </div>
                  <span className="conf-caption">Confidence</span>
                </div>
              </div>

              {/* Top-K Ranked List */}
              <div className="ranked-list">
                <div className="ranked-list-header">
                  <span>Ranked Top-{result.predictions.length} Predictions</span>
                  <span>Softmax Score</span>
                </div>
                <div className="ranked-items">
                  {result.predictions.map((pred, idx) => (
                    <div
                      key={pred.class_id}
                      className={`rank-item ${pred.rank === 1 ? 'rank-item-top' : ''}`}
                      style={{ '--anim-delay': `${idx * 60}ms` }}
                    >
                      <div className="rank-item-meta">
                        <span className={`rank-num ${pred.rank === 1 ? 'rank-num-gold' : ''}`}>
                          #{pred.rank}
                        </span>
                        <div className="rank-item-info">
                          <span className="rank-class">{pred.display_name}</span>
                          <span className="rank-super">{pred.superclass}</span>
                        </div>
                        <span className="rank-score">{pred.confidence}%</span>
                      </div>
                      <div className="score-track">
                        <div
                          className="score-fill"
                          style={{ width: `${Math.max(pred.confidence, 1.5)}%`, '--delay': `${idx * 80}ms` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Superclass Distribution */}
              {result.superclasses?.length > 0 && (
                <div className="superclass-section">
                  <div className="superclass-header">
                    <Layers size={13} />
                    <span>Coarse Category Distribution</span>
                  </div>
                  <div className="superclass-chips">
                    {result.superclasses.map((sc) => (
                      <div key={sc.raw_name} className="sc-pill">
                        <span className="sc-name">{sc.name}</span>
                        <strong className="sc-conf">{sc.confidence}%</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Telemetry Strip */}
              <div className="telemetry-strip">
                {[
                  { label: 'Latency', value: `${result.metrics?.latency_ms} ms` },
                  { label: 'Parameters', value: `${(result.metrics?.total_parameters / 1e6).toFixed(1)}M` },
                  { label: 'Input', value: '32 × 32 RGB' },
                  { label: 'Processed', value: '224 × 224' },
                ].map((stat) => (
                  <div key={stat.label} className="tele-stat">
                    <span className="tele-label">{stat.label}</span>
                    <span className="tele-value">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ─── Catalog Modal ─── */}
      {catalogOpen && (
        <div className="modal-backdrop" onClick={() => setCatalogOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <h2 className="modal-title">CIFAR-100 Knowledge Catalog</h2>
              <button className="modal-close" onClick={() => setCatalogOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-filters">
              <input
                type="text"
                placeholder="Search classes, categories…"
                className="modal-search"
                value={searchCatalog}
                onChange={(e) => setSearchCatalog(e.target.value)}
              />
              <select
                className="modal-select"
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

            <div className="modal-grid">
              {filteredClasses.map((item) => (
                <div key={item.index} className="catalog-item">
                  <span className="catalog-name">#{item.index} {item.display_name}</span>
                  <span className="catalog-super">{item.superclass}</span>
                </div>
              ))}
              {filteredClasses.length === 0 && (
                <div className="catalog-empty">No classes match your query.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
