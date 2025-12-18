import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VEHICLE_MODELS } from './constants';
import './index.css';

type RepeatMode = 'tile' | 'mirror' | 'stretch';

interface TransformState {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  opacity: number;
  flipH: boolean;
  flipV: boolean;
  repeatMode: RepeatMode;
}

function App() {
  const [selectedVehicle, setSelectedVehicle] = useState<typeof VEHICLE_MODELS[0] | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOutlines, setShowOutlines] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);
  const [isVehicleCollapsed, setIsVehicleCollapsed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [transform, setTransform] = useState<TransformState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    opacity: 1,
    flipH: false,
    flipV: false,
    repeatMode: 'tile'
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const carTemplateRef = useRef<HTMLImageElement | null>(null);
  const userImageRef = useRef<HTMLImageElement | null>(null);

  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  };

  const initVehicle = useCallback(async (vehicle: typeof VEHICLE_MODELS[0]) => {
    setIsProcessing(true);
    try {
      const templateImg = await loadImage(`/templates/${vehicle.id}/template.png`);
      carTemplateRef.current = templateImg;

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = 1024;
      maskCanvas.height = 1024;
      const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
      if (mCtx) {
        mCtx.drawImage(templateImg, 0, 0, 1024, 1024);
        const maskData = mCtx.getImageData(0, 0, 1024, 1024);
        const data = maskData.data;
        // Correct masking logic: Target white panels, ignore black lines
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const avg = (r + g + b) / 3;
          // If the pixel is white-ish, it's a panel.
          data[i + 3] = avg > 200 ? 255 : 0;
        }
        mCtx.putImageData(maskData, 0, 0);
        maskCanvasRef.current = maskCanvas;
      }
    } catch (err) {
      console.error("Error initializing vehicle:", err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1024;
    canvas.height = 1024;
    ctx.clearRect(0, 0, 1024, 1024);

    if (!carTemplateRef.current) return;

    if (uploadedImage && userImageRef.current && maskCanvasRef.current) {
      const userImg = userImageRef.current;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 1024;
      tempCanvas.height = 1024;
      const tCtx = tempCanvas.getContext('2d');
      if (!tCtx) return;

      const { scale, offsetX, offsetY, rotation, repeatMode, opacity, flipH, flipV } = transform;
      const imgWidth = userImg.width * scale;
      const imgHeight = userImg.height * scale;

      tCtx.save();
      tCtx.globalAlpha = opacity;
      tCtx.translate(512, 512);
      tCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      tCtx.translate(offsetX, offsetY);
      tCtx.rotate((rotation * Math.PI) / 180);

      if (repeatMode === 'stretch') {
        tCtx.drawImage(userImg, -512, -512, 1024, 1024);
      } else {
        const buffer = 1500;
        for (let x = -buffer; x < 1024 + buffer; x += imgWidth) {
          for (let y = -buffer; y < 1024 + buffer; y += imgHeight) {
            let drawX = x - 512 + (offsetX % imgWidth);
            let drawY = y - 512 + (offsetY % imgHeight);

            if (repeatMode === 'mirror') {
              const col = Math.floor(x / imgWidth);
              const row = Math.floor(y / imgHeight);
              tCtx.save();
              tCtx.translate(drawX + imgWidth / 2, drawY + imgHeight / 2);
              tCtx.scale(col % 2 === 0 ? 1 : -1, row % 2 === 0 ? 1 : -1);
              tCtx.drawImage(userImg, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
              tCtx.restore();
            } else {
              tCtx.drawImage(userImg, drawX, drawY, imgWidth, imgHeight);
            }
          }
        }
      }
      tCtx.restore();

      tCtx.globalCompositeOperation = 'destination-in';
      tCtx.drawImage(maskCanvasRef.current, 0, 0);
      tCtx.globalCompositeOperation = 'source-over';

      ctx.drawImage(tempCanvas, 0, 0);

      // Draw outlines on top for definition
      if (showOutlines) {
        const outlineCanvas = document.createElement('canvas');
        outlineCanvas.width = 1024;
        outlineCanvas.height = 1024;
        const oCtx = outlineCanvas.getContext('2d');
        if (oCtx) {
          oCtx.drawImage(carTemplateRef.current, 0, 0, 1024, 1024);
          oCtx.globalCompositeOperation = 'source-in';
          oCtx.fillStyle = '#2A2A2F';
          oCtx.fillRect(0, 0, 1024, 1024);
          ctx.drawImage(outlineCanvas, 0, 0);
        }
      }
    } else {
      ctx.globalAlpha = 0.2;
      const outlineCanvas = document.createElement('canvas');
      outlineCanvas.width = 1024;
      outlineCanvas.height = 1024;
      const oCtx = outlineCanvas.getContext('2d');
      if (oCtx) {
        oCtx.drawImage(carTemplateRef.current, 0, 0, 1024, 1024);
        oCtx.globalCompositeOperation = 'source-in';
        oCtx.fillStyle = '#ffffff';
        oCtx.fillRect(0, 0, 1024, 1024);
        ctx.drawImage(outlineCanvas, 0, 0);
      }
      ctx.globalAlpha = 1.0;
    }
  }, [uploadedImage, transform, showOutlines]);

  useEffect(() => {
    if (selectedVehicle) initVehicle(selectedVehicle);
    else {
      carTemplateRef.current = null;
      maskCanvasRef.current = null;
    }
  }, [selectedVehicle, initVehicle]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas, uploadedImage, transform, selectedVehicle, isProcessing, showOutlines]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        const img = await loadImage(dataUrl);
        userImageRef.current = img;
        setUploadedImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!uploadedImage) return;
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !uploadedImage) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const factor = 1024 / rect.width;
      setTransform(prev => ({
        ...prev,
        offsetX: prev.offsetX + dx * factor,
        offsetY: prev.offsetY + dy * factor
      }));
    }
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => { isDragging.current = false; };

  const nudge = (axis: 'x' | 'y', amount: number) => {
    setTransform(prev => ({
      ...prev,
      [axis === 'x' ? 'offsetX' : 'offsetY']: prev[axis === 'x' ? 'offsetX' : 'offsetY'] + amount
    }));
  };

  const downloadWrap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Tesla requirements: PNG format, < 1MB
    canvas.toBlob((blob) => {
      if (!blob) return;

      if (blob.size > 1024 * 1024) {
        alert("Warning: This design exceeds Tesla's 1MB limit for wrap images. Try reducing the pattern complexity or scale.");
      }

      const link = document.createElement('a');
      // Shorten name to stay under 30 chars: model_id.png
      const fileName = `${selectedVehicle?.id || 'custom_wrap'}.png`;
      link.download = fileName;
      link.href = URL.createObjectURL(blob);
      link.click();
    }, 'image/png');
  };

  return (
    <div className="app-container" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className={`sidebar ${isImmersive ? 'immersive' : ''}`}>
        <header>
          <h1>Design Workshop</h1>
          <p>Tesla Custom Wraps</p>
          <div className="credit-badge">
            <a href="https://github.com/teslamotors/custom-wraps" target="_blank" rel="noopener noreferrer">
              Official Template ↗
            </a>
          </div>
        </header>

        {/* Step 1: Model Selection */}
        <div className="collapsible-section">
          <div className="label-row-collapsible" onClick={() => setIsVehicleCollapsed(!isVehicleCollapsed)}>
            <span className="label-caps">1. Select Model</span>
            <span className="chevron-icon">{isVehicleCollapsed ? '＋' : '－'}</span>
          </div>
          <div className={`collapsible-content ${isVehicleCollapsed ? 'collapsed' : ''}`}>
            <div className="vehicle-strip">
              {VEHICLE_MODELS.map(model => (
                <div
                  key={model.id}
                  className={`v-card ${selectedVehicle?.id === model.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedVehicle(model);
                    setIsVehicleCollapsed(true);
                  }}
                >
                  <img src={`/templates/${model.id}/vehicle_image.png`} alt={model.name} />
                  <div className="v-name">{model.name}</div>
                </div>
              ))}
            </div>
          </div>
          {selectedVehicle && (
            <div className="collapsed-summary" onClick={() => setIsVehicleCollapsed(false)}>
              Selected: {selectedVehicle.name} <span style={{ opacity: 0.5 }}>— Change</span>
            </div>
          )}
        </div>

        {/* Step 2: Upload Pattern */}
        <div style={{ opacity: selectedVehicle ? 1 : 0.3, pointerEvents: selectedVehicle ? 'auto' : 'none' }}>
          <div className="label-row-collapsible">
            <span className="label-caps">2. Apply Pattern</span>
            {uploadedImage && <span className="status-badge">Ready</span>}
          </div>
          <div className={`upload-btn ${selectedVehicle && !uploadedImage ? 'highlight-pulse' : ''} ${uploadedImage ? 'has-image' : ''}`} onClick={() => fileInputRef.current?.click()}>
            {uploadedImage ? (
              <div className="upload-preview-container">
                <div className="thumbnail-wrapper">
                  <img src={uploadedImage} alt="Preview" />
                  <div className="edit-overlay">✎</div>
                </div>
                <span>Change Pattern</span>
              </div>
            ) : (
              <div className="upload-text">Upload Pattern Image</div>
            )}
            <input ref={fileInputRef} type="file" onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
          </div>
        </div>

        {/* Step 3: Transformation */}
        <div className={`control-stack ${!uploadedImage ? 'disabled' : ''}`}>
          <span className="label-caps">3. Adjust & Align</span>

          <div className="control-group">
            <div className="icon-label">
              <span>⤢ Scale</span>
              <span className="val-text">{Math.round(transform.scale * 100)}%</span>
            </div>
            <input type="range" min="0.01" max="5" step="0.01" value={transform.scale} onChange={(e) => setTransform(t => ({ ...t, scale: parseFloat(e.target.value) }))} />
          </div>

          <div className="control-group">
            <div className="icon-label">
              <span>↻ Rotate</span>
              <span className="val-text">{transform.rotation}°</span>
            </div>
            <input type="range" min="0" max="360" value={transform.rotation} onChange={(e) => setTransform(t => ({ ...t, rotation: parseInt(e.target.value) }))} />
          </div>

          <div className="control-group">
            <div className="icon-label"><span>⇄ Flip Image</span></div>
            <div className="flip-group">
              <button className={`pill-btn ${transform.flipH ? 'active' : ''}`} onClick={() => setTransform(t => ({ ...t, flipH: !t.flipH }))}>Horizontal</button>
              <button className={`pill-btn ${transform.flipV ? 'active' : ''}`} onClick={() => setTransform(t => ({ ...t, flipV: !t.flipV }))}>Vertical</button>
            </div>
          </div>

          <div className="control-group">
            <div className="icon-label"><span>⊕ Repeat Mode</span></div>
            <div className="mode-pill">
              {(['tile', 'mirror', 'stretch'] as RepeatMode[]).map(mode => (
                <button key={mode} className={`pill-btn ${transform.repeatMode === mode ? 'active' : ''}`} onClick={() => setTransform(t => ({ ...t, repeatMode: mode }))}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <div className="icon-label"><span>✛ Precision Nudge</span></div>
            <div className="nudge-grid">
              <button className="pill-btn" onClick={() => nudge('x', -1)}>←</button>
              <button className="pill-btn" onClick={() => nudge('x', 1)}>→</button>
              <button className="pill-btn" onClick={() => nudge('y', -1)}>↑</button>
              <button className="pill-btn" onClick={() => nudge('y', 1)}>↓</button>
            </div>
          </div>
          <div className="control-group">
            <div className="icon-label">
              <span>👁 Opacity</span>
              <span className="val-text">{Math.round(transform.opacity * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.01" value={transform.opacity} onChange={(e) => setTransform(t => ({ ...t, opacity: parseFloat(e.target.value) }))} />
          </div>
        </div>
      </div>

      <main className={`main-designer ${isImmersive ? 'immersive' : ''}`}>
        <div className="hud-top-right">
          <button className="hud-btn help-btn" title="How to use" onClick={() => setShowHelp(true)}>?</button>
          <button className={`hud-btn ${isImmersive ? 'active' : ''}`} title="Immersion" onClick={() => setIsImmersive(!isImmersive)}>⚡️</button>
          <button className={`hud-btn ${showOutlines ? 'active' : ''}`} title="Outlines" onClick={() => setShowOutlines(!showOutlines)}>👁</button>
          <button className="hud-btn" title="Reset Project" onClick={() => {
            setTransform({ scale: 1, offsetX: 0, offsetY: 0, rotation: 0, opacity: 1, flipH: false, flipV: false, repeatMode: 'tile' });
          }}>🔄</button>
        </div>

        <div
          className="canvas-scene"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onWheel={(e) => {
            if (!uploadedImage) return;
            const delta = e.deltaY > 0 ? 0.95 : 1.05;
            setTransform(prev => ({ ...prev, scale: Math.max(0.01, Math.min(10, prev.scale * delta)) }));
          }}
        >
          {isProcessing && <div className="loading-spinner"></div>}
          <canvas ref={canvasRef}></canvas>
          <div className="canvas-shadow"></div>

          {!uploadedImage && !isProcessing && (selectedVehicle ? (
            <div className="onboarding-minimal">
              <h2 className="hero" style={{ fontSize: '2.5rem' }}>{selectedVehicle.name}</h2>
              <div className="hero-sub">Upload a pattern below to apply your wrap</div>
            </div>
          ) : (
            <div className="onboarding-minimal">
              <h1 className="hero">Vision into Reality.</h1>
              <div className="hero-sub">Select a vehicle model to begin customization</div>
            </div>
          ))}
        </div >

      </main>

      <div className="floating-cta">
        <button className="download-pill" disabled={!uploadedImage} onClick={downloadWrap}>
          Download Design
        </button>
      </div>

      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowHelp(false)}>×</button>
            <div className="modal-content">
              <h2>How to Use Custom Wraps</h2>

              <section>
                <h3>1. Create Your Design</h3>
                <ul>
                  <li><strong>Download Template:</strong> Choose your Tesla model and download the 3D template.</li>
                  <li><strong>Apply Image:</strong> Upload your pattern or high-res image (PNG) in this designer.</li>
                  <li><strong>Adjust:</strong> Scale, rotate, and nudge your design until it fits perfectly.</li>
                </ul>
              </section>

              <section>
                <h3>2. Technical Requirements</h3>
                <ul>
                  <li><strong>Resolution:</strong> 512x512 to 1024x1024 pixels for best results.</li>
                  <li><strong>Size:</strong> Maximum 1 MB per image file.</li>
                  <li><strong>Format:</strong> Must be a <strong>PNG</strong> file.</li>
                  <li><strong>Name:</strong> Alphanumeric characters and spaces only (max 30 symbols).</li>
                </ul>
              </section>

              <section>
                <h3>3. Preparation (USB Drive)</h3>
                <ul>
                  <li><strong>Format:</strong> exFAT, FAT32, ext3, or ext4.</li>
                  <li><strong>Structure:</strong> Create a folder named <code>Wraps</code> at the root level.</li>
                  <li><strong>Upload:</strong> Place your exported design PNG files inside the <code>Wraps</code> folder.</li>
                </ul>
              </section>

              <section>
                <h3>4. Apply to Vehicle</h3>
                <p>Plug the USB drive into your Tesla and go to:</p>
                <div className="help-path">Toybox → Paint Shop → Wraps Tab</div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
