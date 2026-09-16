import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowRight, BadgeCheck, BrainCircuit, Camera, CheckCircle2, ChevronRight,
  CircleAlert, Clock3, Download, Eye, FileCheck2, FileImage, HeartPulse, History,
  Home, Info, Languages, LoaderCircle, Menu, Microscope, RefreshCw, ScanEye,
  ShieldCheck, Sparkles, Stethoscope, Upload, Volume2, Waves, X, XCircle,
  Database, Trash2, Save, Play
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { DR_KNOWLEDGE, normalizeClass } from './clinicalKnowledge.js';

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'screen', label: 'Screening', icon: ScanEye },
  { id: 'history', label: 'History', icon: History },
  { id: 'training', label: 'Training data', icon: Database },
  { id: 'about', label: 'How it works', icon: Info }
];

const emptyPatient = {
  patientName: '', patientId: '', age: '', gender: '', eye: 'Right', diabetesYears: ''
};

function App() {
  const [page, setPage] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyToken, setHistoryToken] = useState(0);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(setHealth).catch(() => setHealth({ ok: false, model: { connected: false } }));
  }, [historyToken]);

  const navigate = (next) => {
    setPage(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate('home')}>
          <span className="brand-mark"><Eye size={23} /></span>
          <span className="brand-text"><strong>XplainaEye</strong><small>Explainable DR Screening</small></span>
        </button>
        <nav className={`nav ${menuOpen ? 'open' : ''}`}>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={page === id ? 'active' : ''} onClick={() => navigate(id)}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          <span className={`model-chip ${health?.model?.connected ? 'online' : 'offline'}`}>
            <span className="status-dot" /> {health?.model?.connected ? 'AI model connected' : 'Model not connected'}
          </span>
          <button className="mobile-menu" onClick={() => setMenuOpen(v => !v)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      <main>
        {page === 'home' && <HomePage onStart={() => navigate('screen')} modelConnected={Boolean(health?.model?.connected)} />}
        {page === 'screen' && <ScreeningPage modelConnected={Boolean(health?.model?.connected)} onSaved={() => setHistoryToken(v => v + 1)} />}
        {page === 'history' && <HistoryPage refreshToken={historyToken} onNew={() => navigate('screen')} />}
        {page === 'training' && <TrainingDataPage refreshToken={historyToken} onChanged={() => setHistoryToken(v => v + 1)} />}
        {page === 'about' && <AboutPage />}
      </main>

      <footer className="footer">
        <div><strong>XplainaEye</strong><span>Explainable retinal screening support</span></div>
        <p>Screening decision-support only. Results must be reviewed by a qualified eye-care professional and are not a confirmed diagnosis.</p>
      </footer>
    </div>
  );
}

function HomePage({ onStart, modelConnected }) {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15} /> AI + XAI + patient-friendly explanation</div>
            <h1>Retinal screening that <span>shows its reasoning.</span></h1>
            <p className="hero-lead">A clinic- and camp-ready workflow for diabetic retinopathy: a health worker captures the retina with a portable fundus camera, the system checks image quality, runs the connected AI model, visualizes model attention and explains the result to the patient.</p>
            <div className="hero-actions">
              <button className="btn primary large" onClick={onStart}>Start screening <ArrowRight size={18} /></button>
              <span className={`hero-status ${modelConnected ? 'good' : 'warn'}`}>
                {modelConnected ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
                {modelConnected ? 'Real model ready' : 'Connect model before screening'}
              </span>
            </div>
            <div className="trust-row">
              <span><ShieldCheck size={16} /> No fake predictions</span>
              <span><Languages size={16} /> English + Tamil explanation</span>
              <span><FileCheck2 size={16} /> Downloadable report</span>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="visual-orbit orbit-1" />
            <div className="visual-orbit orbit-2" />
            <div className="retina-card">
              <div className="retina-top"><span>Retinal analysis</span><span className="live-pill">LIVE</span></div>
              <div className="retina-art">
                <svg viewBox="0 0 520 360" role="img">
                  <defs>
                    <radialGradient id="retina" cx="48%" cy="50%" r="60%">
                      <stop offset="0%" stopColor="#ffb06a" />
                      <stop offset="42%" stopColor="#d85d4a" />
                      <stop offset="78%" stopColor="#7e2834" />
                      <stop offset="100%" stopColor="#301622" />
                    </radialGradient>
                    <filter id="glow"><feGaussianBlur stdDeviation="6" /></filter>
                  </defs>
                  <circle cx="260" cy="180" r="145" fill="url(#retina)" />
                  <circle cx="342" cy="172" r="23" fill="#ffd58d" opacity=".9" />
                  <circle cx="190" cy="182" r="16" fill="#6f2030" opacity=".85" />
                  <g fill="none" stroke="#ffd0a0" strokeWidth="4" opacity=".62" strokeLinecap="round">
                    <path d="M340 172 C300 155, 265 130, 210 98" />
                    <path d="M340 174 C295 180, 258 198, 208 236" />
                    <path d="M340 170 C300 130, 286 106, 260 78" />
                    <path d="M340 174 C308 214, 300 236, 270 268" />
                    <path d="M300 155 C270 160, 235 155, 205 142" />
                    <path d="M296 190 C262 190, 228 205, 190 218" />
                  </g>
                  <circle cx="224" cy="118" r="25" fill="#ffde5b" opacity=".2" filter="url(#glow)" />
                  <circle cx="224" cy="118" r="7" fill="#ffef9e" opacity=".75" />
                  <circle cx="174" cy="226" r="20" fill="#ff755e" opacity=".18" filter="url(#glow)" />
                  <circle cx="174" cy="226" r="6" fill="#ffd0a5" opacity=".65" />
                </svg>
                <div className="scan-line" />
                <div className="corner c1"/><div className="corner c2"/><div className="corner c3"/><div className="corner c4"/>
              </div>
              <div className="retina-stats">
                <div><small>Image quality</small><strong>Checked first</strong></div>
                <div><small>Prediction</small><strong>Model-derived</strong></div>
                <div><small>Explanation</small><strong>Patient-friendly</strong></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="section-wrap">
          <div className="section-title-row">
            <div><span className="section-kicker">One assisted workflow</span><h2>From retinal image to an understandable next step</h2></div>
            <p>Designed for rural and assisted screening: portable fundus camera, live capture guidance, quality gate, AI screening, explainability, voice and final report.</p>
          </div>
          <div className="workflow-grid">
            {[
              [Camera, '01', 'Fundus camera capture', 'Health worker captures the retina using a portable USB/UVC fundus camera, or imports an image exported by the device.'],
              [Activity, '02', 'Quality check', 'Resolution, brightness, contrast and focus are checked before inference.'],
              [BrainCircuit, '03', 'AI Screening', 'A connected DR model returns the stage and confidence score.'],
              [Microscope, '04', 'Explainable AI', 'Show the original image together with model-provided Grad-CAM or attention output.'],
              [FileCheck2, '05', 'Patient report', 'Explain what the stage means, urgency, next action and export a report.']
            ].map(([Icon, n, title, text]) => (
              <article className="workflow-card" key={n}>
                <div className="workflow-icon"><Icon size={22}/></div>
                <span className="workflow-num">{n}</span>
                <h3>{title}</h3><p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="why-section">
        <div className="section-wrap why-grid">
          <div>
            <span className="section-kicker">Built for understandable screening</span>
            <h2>Not just “positive” or “negative.”</h2>
            <p>The result page explains the predicted DR stage, what that stage usually means, common retinal signs associated with it, the model confidence, the model’s highlighted regions, and what the patient should do next.</p>
            <button className="text-link" onClick={onStart}>Open screening workflow <ChevronRight size={16}/></button>
          </div>
          <div className="why-cards">
            <div className="mini-card"><Stethoscope/><div><strong>Clinical context</strong><span>Stage-specific explanation without pretending the AI is a doctor.</span></div></div>
            <div className="mini-card"><Waves/><div><strong>Voice explanation</strong><span>Read the result aloud in English or Tamil using the browser voice engine.</span></div></div>
            <div className="mini-card"><ShieldCheck/><div><strong>Honest model behavior</strong><span>If the real AI service is offline, the website refuses to invent a result.</span></div></div>
          </div>
        </div>
      </section>
    </>
  );
}

function ScreeningPage({ modelConnected, onSaved }) {
  const [patient, setPatient] = useState(emptyPatient);
  const [captureMode, setCaptureMode] = useState('device');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [quality, setQuality] = useState(null);
  const [checking, setChecking] = useState(false);
  const [overrideQuality, setOverrideQuality] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [liveQuality, setLiveQuality] = useState(null);
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState(true);
  const [guidanceLanguage, setGuidanceLanguage] = useState('en');
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lastGuidanceRef = useRef({ key: '', at: 0 });

  useEffect(() => () => {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, [preview]);

  useEffect(() => {
    if (!cameraActive) return;
    const timer = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      try { setLiveQuality(await analyzeVideoElement(videoRef.current)); } catch { /* ignore transient frame errors */ }
    }, 900);
    return () => clearInterval(timer);
  }, [cameraActive]);

  useEffect(() => {
    if (!cameraActive || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => setError('Camera opened, but the live preview could not start. Click the browser camera permission icon and allow camera access.'));
  }, [cameraActive]);

  useEffect(() => {
    if (!cameraActive || !voiceGuidanceEnabled || !liveQuality) return;
    const instruction = getLiveInstruction(liveQuality, guidanceLanguage);
    if (!instruction?.key || !instruction?.text || !('speechSynthesis' in window)) return;
    const now = Date.now();
    const last = lastGuidanceRef.current;
    const changed = last.key !== instruction.key;
    if ((!changed && now - last.at < 4500) || (changed && now - last.at < 850)) return;

    const utterance = new SpeechSynthesisUtterance(instruction.text);
    utterance.lang = guidanceLanguage === 'ta' ? 'ta-IN' : 'en-IN';
    utterance.rate = guidanceLanguage === 'ta' ? 0.9 : 0.96;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    lastGuidanceRef.current = { key: instruction.key, at: now };
  }, [cameraActive, liveQuality, voiceGuidanceEnabled, guidanceLanguage]);

  const canRun = Boolean(file && quality && (quality.status === 'good' || overrideQuality) && !loading && modelConnected);

  const chooseFile = async (selected, source = captureMode) => {
    if (!selected) return;
    setError(''); setResult(null); setQuality(null); setOverrideQuality(false);
    if (!['image/jpeg','image/png','image/webp'].includes(selected.type)) {
      setError('Please use a JPG, PNG or WebP retinal image.'); return;
    }
    if (selected.size > 15 * 1024 * 1024) {
      setError('Image is larger than 15 MB.'); return;
    }
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    setCaptureMode(source);
    setFile(selected); setPreview(URL.createObjectURL(selected)); setChecking(true);
    try { setQuality(await analyzeImage(selected)); }
    catch { setError('Could not analyze image quality. Please choose another image.'); }
    finally { setChecking(false); }
  };

  const stopCamera = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    lastGuidanceRef.current = { key: '', at: 0 };
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false); setLiveQuality(null);
  };

  const startCamera = async (requestedDevice = selectedDevice) => {
    setError(''); setCameraBusy(true); stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot access connected cameras. Use Chrome/Edge or upload a retinal image instead.');
      setCameraBusy(false); return;
    }
    try {
      const constraints = {
        audio: false,
        video: requestedDevice
          ? { deviceId: { exact: requestedDevice }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { width: { ideal: 1920 }, height: { ideal: 1080 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      setDeviceLabel(track?.label || 'Connected camera');
      setCameraActive(true);
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter(d => d.kind === 'videoinput');
      setCameraDevices(videos);
      if (!requestedDevice && track?.getSettings?.().deviceId) setSelectedDevice(track.getSettings().deviceId);
    } catch (e) {
      setError(`Could not open the fundus camera: ${e.message}. If your device does not appear as a standard USB/UVC camera, use its vendor software to export the retinal image and choose “Upload retinal image”.`);
    } finally { setCameraBusy(false); }
  };

  const switchCamera = async (id) => {
    setSelectedDevice(id);
    if (cameraActive) await startCamera(id);
  };

  const captureFrame = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return setError('Camera frame is not ready yet.');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.96));
    if (!blob) return setError('Could not capture the camera frame.');
    const captured = new File([blob], `fundus-${Date.now()}.jpg`, { type: 'image/jpeg' });
    await chooseFile(captured, 'device');
    stopCamera();
  };

  const runScreening = async () => {
    if (!canRun) return;
    setLoading(true); setError('');
    const fd = new FormData();
    fd.append('image', file);
    Object.entries(patient).forEach(([k,v]) => fd.append(k, v));
    fd.append('quality', JSON.stringify(quality));
    fd.append('captureMethod', captureMode === 'device' ? 'Fundus camera' : 'Uploaded retinal image');
    fd.append('captureDevice', captureMode === 'device' ? (deviceLabel || 'Connected camera') : 'File upload');
    try {
      const r = await fetch('/api/screenings', { method: 'POST', body: fd });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || `Screening failed (${r.status}).`);
      body.classification = normalizeClass(body.classification);
      setResult(body); onSaved?.();
      setTimeout(() => document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const reset = () => {
    stopCamera(); setFile(null); setPreview(''); setQuality(null); setOverrideQuality(false); setResult(null); setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const liveGood = liveQuality?.status === 'good';
  const liveInstruction = liveQuality ? getLiveInstruction(liveQuality, guidanceLanguage) : null;

  return (
    <section className="screening-section">
      <div className="section-wrap">
        <div className="page-heading">
          <div><span className="section-kicker">Health-worker assisted retinal screening</span><h1>New screening</h1><p>Use a portable fundus camera at the clinic/camp. For development or model testing, a retinal image can also be uploaded.</p></div>
          <div className={`connection-card ${modelConnected ? 'connected' : 'disconnected'}`}>
            {modelConnected ? <BadgeCheck/> : <CircleAlert/>}
            <div><strong>{modelConnected ? 'AI model connected' : 'AI model required'}</strong><span>{modelConnected ? 'Ready for genuine model inference' : 'Configure MODEL_API_URL before running screening'}</span></div>
          </div>
        </div>

        <div className="stepper">
          {['Patient', 'Fundus capture', 'Quality', 'AI result', 'Report'].map((x,i) => <div key={x} className={`step ${result ? 'done' : (i <= 2 ? 'current' : '')}`}><span>{i+1}</span><b>{x}</b></div>)}
        </div>

        <div className="screen-grid">
          <article className="panel form-panel">
            <div className="panel-heading"><span className="panel-icon"><HeartPulse/></span><div><small>Step 1</small><h2>Patient details</h2></div></div>
            <div className="form-grid">
              <Field label="Patient name"><input value={patient.patientName} onChange={e => setPatient({...patient, patientName:e.target.value})} placeholder="e.g. R. Kumar" /></Field>
              <Field label="Patient / screening ID"><input value={patient.patientId} onChange={e => setPatient({...patient, patientId:e.target.value})} placeholder="Auto-generated if blank" /></Field>
              <Field label="Age"><input type="number" min="1" max="120" value={patient.age} onChange={e => setPatient({...patient, age:e.target.value})} placeholder="Age" /></Field>
              <Field label="Gender"><select value={patient.gender} onChange={e => setPatient({...patient, gender:e.target.value})}><option value="">Select</option><option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option></select></Field>
              <Field label="Eye"><select value={patient.eye} onChange={e => setPatient({...patient, eye:e.target.value})}><option>Right</option><option>Left</option></select></Field>
              <Field label="Years with diabetes"><input type="number" min="0" max="80" value={patient.diabetesYears} onChange={e => setPatient({...patient, diabetesYears:e.target.value})} placeholder="Optional" /></Field>
            </div>
          </article>

          <article className="panel upload-panel capture-panel">
            <div className="panel-heading"><span className="panel-icon"><Camera/></span><div><small>Step 2</small><h2>Fundus image acquisition</h2></div></div>
            <div className="capture-mode-tabs">
              <button className={captureMode === 'device' ? 'active' : ''} onClick={() => { setCaptureMode('device'); setError(''); }}><Camera/><strong>Connect fundus camera</strong><span>Real workflow</span></button>
              <button className={captureMode === 'upload' ? 'active' : ''} onClick={() => { stopCamera(); setCaptureMode('upload'); setError(''); }}><Upload/><strong>Upload retinal image</strong><span>Testing / imported capture</span></button>
            </div>

            {captureMode === 'device' ? (
              <div className="device-capture">
                {!cameraActive ? <div className="camera-connect-state">
                  <div className="camera-illustration"><Camera/></div>
                  <strong>Connect a portable fundus camera</strong>
                  <p>If the camera appears as a standard USB/UVC video device, the browser can capture directly. Dedicated cameras can export their image for upload.</p>
                  <button className="btn primary" disabled={cameraBusy} onClick={() => startCamera()}>{cameraBusy ? <><LoaderCircle className="spin"/> Opening camera…</> : <><Camera/> Open connected camera</>}</button>
                  <small>Camera access requires permission from the browser.</small>
                </div> : <>
                  <div className="camera-toolbar">
                    <div><span className="status-dot camera-dot"/><strong>{deviceLabel || 'Connected camera'}</strong></div>
                    {cameraDevices.length > 1 && <select value={selectedDevice} onChange={e => switchCamera(e.target.value)}>{cameraDevices.map((d,i)=><option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i+1}`}</option>)}</select>}
                    <button className="btn secondary compact-btn" onClick={stopCamera}>Disconnect</button>
                  </div>
                  <div className="live-capture-frame">
                    <video ref={videoRef} muted playsInline autoPlay />
                    <div className="retina-guide"><span>Center retinal field here</span></div>
                    <div className="capture-scan-line"/>
                    {liveInstruction && <div className={`direction-overlay ${liveInstruction.good ? 'good' : 'move'}`}><span className="direction-arrow">{liveInstruction.arrow}</span><strong>{liveInstruction.shortText}</strong></div>}
                    {liveQuality && <div className={`live-quality-badge ${liveGood ? 'good' : 'warn'}`}>{liveGood ? <CheckCircle2/> : <CircleAlert/>}<span><strong>{liveGood ? 'Image quality looks usable' : 'Adjust before capture'}</strong><small>Live quality {liveQuality.score}/100</small></span></div>}
                  </div>
                  <div className="live-guidance">
                    <div className="live-guidance-head">
                      <div><strong>Real-time voice guidance</strong><small>Position + focus + lighting guidance while the camera is open.</small></div>
                      <div className="voice-guidance-controls">
                        <label className="voice-toggle"><input type="checkbox" checked={voiceGuidanceEnabled} onChange={e => { setVoiceGuidanceEnabled(e.target.checked); if (!e.target.checked && 'speechSynthesis' in window) window.speechSynthesis.cancel(); }} /><span>{voiceGuidanceEnabled ? 'Voice on' : 'Voice off'}</span></label>
                        <select value={guidanceLanguage} onChange={e => { setGuidanceLanguage(e.target.value); lastGuidanceRef.current = { key: '', at: 0 }; }}><option value="en">English</option><option value="ta">தமிழ்</option></select>
                      </div>
                    </div>
                    <div className="guidance-chips">
                      <span className={liveQuality && liveQuality.positionOk ? 'ok' : ''}>Position</span>
                      <span className={liveQuality && liveQuality.brightness >= 45 && liveQuality.brightness <= 215 ? 'ok' : ''}>Lighting</span>
                      <span className={liveQuality && liveQuality.sharpness >= 7 ? 'ok' : ''}>Focus / steadiness</span>
                      <span className={liveQuality && liveQuality.contrast >= 28 ? 'ok' : ''}>Retinal contrast</span>
                    </div>
                    {liveInstruction ? <div className={`spoken-guidance ${liveInstruction.good ? 'good' : ''}`}><span>{liveInstruction.arrow}</span><div><strong>{liveInstruction.shortText}</strong><small>{liveInstruction.text}</small></div></div> : <p>Hold the camera steady while the retinal field is detected.</p>}
                    {liveQuality?.issues?.length > 0 && <ul>{liveQuality.issues.map(x=><li key={x}>{guidanceFor(x)}</li>)}</ul>}
                  </div>
                  <button className="btn primary camera-capture-btn" onClick={captureFrame}><Camera/> Capture retinal image</button>
                </>}
              </div>
            ) : (
              !preview ? <button className="dropzone" onClick={() => fileRef.current?.click()}>
                <span className="drop-icon"><Upload/></span><strong>Upload retinal / fundus image</strong><span>JPG, PNG or WebP · up to 15 MB</span><em>Choose retinal image</em>
              </button> : <div className="image-preview"><img src={preview} alt="Selected retinal image"/><button className="replace-button" onClick={() => fileRef.current?.click()}><RefreshCw size={15}/> Choose another</button></div>
            )}
            {captureMode === 'device' && preview && !cameraActive && <div className="captured-image-card"><img src={preview} alt="Captured retinal image"/><div><CheckCircle2/><span><strong>Fundus frame captured</strong><small>{deviceLabel || 'Connected camera'}</small></span><button className="replace-button" onClick={() => startCamera()}><RefreshCw size={15}/> Retake</button></div></div>}
            <input ref={fileRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => chooseFile(e.target.files?.[0], 'upload')}/>
          </article>

          <article className="panel quality-panel">
            <div className="panel-heading"><span className="panel-icon"><Activity/></span><div><small>Step 3</small><h2>Capture quality</h2></div></div>
            {checking && <div className="empty-state"><LoaderCircle className="spin"/><span>Checking retinal image quality…</span></div>}
            {!checking && !quality && <div className="empty-state"><FileImage/><span>Capture or upload a retinal image to check focus, lighting, contrast and resolution.</span></div>}
            {quality && <QualityCard quality={quality} overrideQuality={overrideQuality} setOverrideQuality={setOverrideQuality}/>}            
          </article>

          <div className="workflow-context">
            <div><Camera/><span><strong>{captureMode === 'device' ? 'Clinic / camp workflow' : 'Imported image workflow'}</strong><small>{captureMode === 'device' ? 'Health worker captures the retina using a connected fundus camera.' : 'Use images exported from a fundus camera or a validated retinal dataset during testing.'}</small></span></div>
            <ArrowRight/>
            <div><BrainCircuit/><span><strong>AI + XAI</strong><small>Only the connected real model can produce a DR stage and heatmap.</small></span></div>
            <ArrowRight/>
            <div><Languages/><span><strong>Explain to patient</strong><small>English/Tamil voice and final report explain the result and referral need.</small></span></div>
          </div>

          <div className="action-bar">
            <div><ShieldCheck/><span><strong>Safety gate</strong><small>{modelConnected ? 'Real model connected. Poor-quality captures should be retaken before inference.' : 'Capture workflow is ready, but no DR classification will be generated until a real AI model is connected.'}</small></span></div>
            <button className="btn primary" disabled={!canRun} onClick={runScreening}>{loading ? <><LoaderCircle className="spin"/> Running AI screening…</> : <><BrainCircuit/> Run AI screening</>}</button>
          </div>

          {error && <div className="alert error"><XCircle/><div><strong>Screening could not continue</strong><span>{error}</span></div></div>}
        </div>

        {result && <ResultView result={result} preview={preview} onReset={reset}/>}        
      </div>
    </section>
  );
}

function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }

function QualityCard({ quality, overrideQuality, setOverrideQuality }) {
  const good = quality.status === 'good';
  return (
    <div className={`quality-card ${good ? 'good' : 'retake'}`}>
      <div className="quality-status">{good ? <CheckCircle2/> : <CircleAlert/>}<div><strong>{good ? 'Image quality is good — proceed' : 'Retake recommended'}</strong><span>Quality score {quality.score}/100</span></div></div>
      <div className="quality-meter"><span style={{width:`${quality.score}%`}}/></div>
      <div className="quality-metrics">
        <div><strong>{quality.width}×{quality.height}</strong><span>Resolution</span></div>
        <div><strong>{quality.brightness}</strong><span>Brightness</span></div>
        <div><strong>{quality.contrast}</strong><span>Contrast</span></div>
        <div><strong>{quality.sharpness}</strong><span>Sharpness</span></div>
      </div>
      {quality.issues.length > 0 && <div className="guidance"><strong>Automatic guidance</strong><ul>{quality.issues.map(x => <li key={x}>{guidanceFor(x)}</li>)}</ul></div>}
      {!good && <label className="override"><input type="checkbox" checked={overrideQuality} onChange={e=>setOverrideQuality(e.target.checked)}/><span><strong>Operator override</strong><small>Use only if the operator has reviewed the image and accepts the quality limitation.</small></span></label>}
    </div>
  );
}

function guidanceFor(issue) {
  if (issue.includes('resolution')) return 'Move closer or use the fundus camera’s full-resolution capture.';
  if (issue.includes('dark')) return 'Improve lighting / exposure and keep the eye centered.';
  if (issue.includes('overexposed')) return 'Reduce glare or exposure.';
  if (issue.includes('contrast')) return 'Reposition the camera and improve retinal illumination.';
  if (issue.includes('focus')) return 'Hold the camera steady and adjust focus before retaking.';
  return issue;
}

function ResultView({ result, preview, onReset }) {
  const cls = normalizeClass(result.classification);
  const info = DR_KNOWLEDGE[cls] || {
    tone: 'medium', level: cls, short: 'AI model result', meaning: result.explanationEn, signs: [], action: result.recommendation, urgency: 'Professional review'
  };
  const pct = Math.round(Number(result.confidence || 0) * 100);
  const speak = (lang) => {
    if (!('speechSynthesis' in window)) return alert('Speech is not supported in this browser.');
    window.speechSynthesis.cancel();
    const text = lang === 'ta' ? (result.explanationTa || info.tamil) : (result.explanationEn || `${info.meaning} ${info.action}`);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-IN'; utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  };

  const downloadReport = async () => {
    const doc = new jsPDF();
    const left = 18; let y = 20;
    const addLines = (text, size=10, gap=5) => { doc.setFontSize(size); const lines = doc.splitTextToSize(String(text || ''), 172); doc.text(lines, left, y); y += lines.length * gap + 3; };
    doc.setFillColor(6,24,39); doc.rect(0,0,210,34,'F');
    doc.setTextColor(255,255,255); doc.setFontSize(20); doc.setFont(undefined,'bold'); doc.text('XplainaEye Screening Report', left, 20);
    doc.setFontSize(8); doc.setFont(undefined,'normal'); doc.text('Explainable diabetic-retinopathy screening support', left, 27);
    doc.setTextColor(20,35,50); y=45;
    doc.setFont(undefined,'bold'); addLines('Patient information', 12, 6); doc.setFont(undefined,'normal');
    addLines(`Patient: ${result.patientName}    ID: ${result.patientId}`);
    addLines(`Age: ${result.age ?? '-'}    Gender: ${result.gender || '-'}    Eye: ${result.eye || '-'}    Diabetes duration: ${result.diabetesYears ?? '-'} years`);
    addLines(`Image source: ${result.captureMethod || 'Retinal image'}${result.captureDevice ? `    Device: ${result.captureDevice}` : ''}`);
    y += 2; doc.setDrawColor(220,228,235); doc.line(left,y,192,y); y+=8;
    doc.setFont(undefined,'bold'); addLines('AI screening result',12,6); doc.setFont(undefined,'normal');
    addLines(`Classification: ${cls}`); addLines(`Confidence: ${pct}%`); addLines(`Model: ${result.modelName || 'Connected DR model'}`); addLines(`Urgency: ${info.urgency}`);
    y += 2; doc.setFont(undefined,'bold'); addLines('What this result means',12,6); doc.setFont(undefined,'normal'); addLines(info.meaning);
    if (result.findings?.length) {
      doc.setFont(undefined,'bold'); addLines('Model-reported findings',12,6); doc.setFont(undefined,'normal');
      result.findings.forEach(f => addLines(`• ${typeof f === 'string' ? f : (f.label || f.name || JSON.stringify(f))}`));
    } else {
      doc.setFont(undefined,'bold'); addLines('Common signs associated with this stage',12,6); doc.setFont(undefined,'normal');
      info.signs.forEach(s => addLines(`• ${s}`));
    }
    doc.setFont(undefined,'bold'); addLines('Patient-friendly explanation',12,6); doc.setFont(undefined,'normal'); addLines(result.explanationEn || info.short);
    doc.setFont(undefined,'bold'); addLines('Recommended next step',12,6); doc.setFont(undefined,'normal'); addLines(result.recommendation || info.action);
    if (y > 245) { doc.addPage(); y=22; }
    doc.setFillColor(246,248,250); doc.roundedRect(left,y,174,28,3,3,'F'); y+=8; doc.setFont(undefined,'bold'); addLines('Important',10,5); doc.setFont(undefined,'normal'); addLines('This is a screening decision-support result, not a confirmed medical diagnosis. An ophthalmologist must review concerning results and decide treatment.',9,4.5);
    doc.save(`XplainaEye-${result.patientId || 'report'}.pdf`);
  };

  const findings = result.findings?.length ? result.findings.map(f => typeof f === 'string' ? f : (f.label || f.name || f.description)).filter(Boolean) : info.signs;

  return (
    <section className="result-section" id="result">
      <div className={`result-hero ${info.tone}`}>
        <div className="result-check"><CheckCircle2/></div>
        <div><span className="result-kicker">AI SCREENING COMPLETE</span><h2>{cls}</h2><p>{info.short}</p></div>
        <div className="confidence-bubble"><strong>{pct}%</strong><span>confidence</span></div>
      </div>

      <div className="result-layout">
        <article className="panel xai-panel">
          <div className="panel-heading"><span className="panel-icon"><Microscope/></span><div><small>Explainable AI</small><h2>What influenced the model?</h2></div></div>
          <div className="compare-grid">
            <div><span className="image-label">Original retinal image</span><div className="result-image"><img src={result.imageUrl || preview} alt="Original retinal image"/></div></div>
            <div><span className="image-label">Model explanation</span><div className="result-image heatmap-frame">{result.heatmapUrl ? <img src={result.heatmapUrl} alt="Model Grad-CAM heatmap"/> : <div className="no-heatmap"><Microscope/><strong>No heatmap returned</strong><span>Connect a model that returns Grad-CAM or another validated explanation image.</span></div>}</div></div>
          </div>
          <div className="xai-note"><Info size={16}/><span>A heatmap shows where the model focused. It does not by itself prove that a highlighted spot is a specific lesion.</span></div>
        </article>

        <div className="result-stack">
          <article className="panel confidence-card"><div className="card-top"><span>Model confidence</span><BrainCircuit/></div><strong>{pct}%</strong><div className="progress"><span style={{width:`${pct}%`}}/></div><small>Confidence is not the same as diagnostic certainty.</small></article>
          <article className={`panel urgency-card ${info.tone}`}><div className="card-top"><span>Recommended urgency</span><Clock3/></div><h3>{info.urgency}</h3><p>{info.action}</p></article>
          <article className="panel patient-card"><div className="patient-row"><div><small>Patient</small><strong>{result.patientName}</strong></div><div><small>ID</small><strong>{result.patientId}</strong></div></div><div className="patient-row"><div><small>Eye</small><strong>{result.eye || '-'}</strong></div><div><small>Model</small><strong>{result.modelName || 'DR model'}</strong></div></div><div className="patient-row"><div><small>Image source</small><strong>{result.captureMethod || 'Retinal image'}</strong></div><div><small>Capture device</small><strong>{result.captureDevice || '-'}</strong></div></div></article>
        </div>
      </div>

      <div className="explanation-grid">
        <article className="panel explainer-card">
          <div className="explainer-title"><span className="gradient-icon"><Sparkles/></span><div><small>{result.explanationMode === 'genai' ? 'GenAI explanation' : 'Patient-friendly explanation'}</small><h2>What does this mean?</h2></div></div>
          <p className="explanation-lead">{result.explanationEn || info.meaning}</p>
          <div className="voice-row"><button className="btn secondary" onClick={() => speak('en')}><Volume2/> Listen in English</button><button className="btn secondary" onClick={() => speak('ta')}><Languages/> தமிழில் கேளுங்கள்</button></div>
        </article>
        <article className="panel findings-card">
          <div className="panel-heading compact"><span className="panel-icon"><Eye/></span><div><small>Clinical context</small><h2>{result.findings?.length ? 'Model-reported findings' : 'Common signs associated with this stage'}</h2></div></div>
          <ul>{findings.map((x,i)=><li key={i}><CheckCircle2/>{x}</li>)}</ul>
          {!result.findings?.length && <p className="small-note">These are stage-associated educational signs, not image-specific findings. Only show image-specific findings when your model returns them.</p>}
        </article>
      </div>

      <article className="panel action-report-card">
        <div><span className="section-kicker">Final screening report</span><h2>Explain the result, not just the label.</h2><p>The PDF includes the AI class, confidence, patient-friendly explanation, model findings or stage context, urgency and professional-review disclaimer.</p></div>
        <div className="report-actions"><button className="btn secondary" onClick={onReset}><RefreshCw/> New screening</button><button className="btn primary" onClick={downloadReport}><Download/> Download report</button></div>
      </article>
    </section>
  );
}

function HistoryPage({ refreshToken, onNew }) {
  const [items,setItems] = useState([]); const [stats,setStats]=useState({total:0,referable:0,avgConfidence:0}); const [loading,setLoading]=useState(true);
  useEffect(()=>{ setLoading(true); Promise.all([fetch('/api/screenings').then(r=>r.json()),fetch('/api/stats').then(r=>r.json())]).then(([a,b])=>{setItems(Array.isArray(a)?a:[]);setStats(b||{});}).catch(()=>{}).finally(()=>setLoading(false)); },[refreshToken]);
  return <section className="history-section"><div className="section-wrap"><div className="page-heading"><div><span className="section-kicker">Saved screenings</span><h1>Screening history</h1><p>Records are stored locally in SQLite on this computer.</p></div><button className="btn primary" onClick={onNew}>New screening <ArrowRight/></button></div><div className="stats-grid"><Stat icon={FileCheck2} label="Total screenings" value={stats.total||0}/><Stat icon={Stethoscope} label="Referable results" value={stats.referable||0}/><Stat icon={BrainCircuit} label="Average confidence" value={`${Math.round((stats.avgConfidence||0)*100)}%`}/></div><article className="panel history-table"><div className="history-head"><h2>Recent records</h2><span>{loading?'Loading…':`${items.length} shown`}</span></div>{!items.length&&!loading?<div className="empty-state tall"><History/><strong>No screenings yet</strong><span>Completed real-model screenings will appear here.</span></div>:<div className="table-wrap"><table><thead><tr><th>Patient</th><th>Date</th><th>Eye</th><th>Result</th><th>Confidence</th><th>Model</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td><strong>{x.patientName}</strong><small>{x.patientId}</small></td><td>{new Date(x.createdAt).toLocaleString()}</td><td>{x.eye||'-'}</td><td><span className={`table-pill ${DR_KNOWLEDGE[normalizeClass(x.classification)]?.tone||'medium'}`}>{normalizeClass(x.classification)}</span></td><td>{Math.round(Number(x.confidence||0)*100)}%</td><td>{x.modelName||'-'}</td></tr>)}</tbody></table></div>}</article></div></section>;
}

function Stat({icon:Icon,label,value}) { return <div className="stat-card"><span><Icon/></span><div><strong>{value}</strong><p>{label}</p></div></div>; }

function TrainingDataPage({ refreshToken, onChanged }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ distribution: {}, approved: 0, activeClasses: 0, verifiedTotal: 0, minimumSamples: 25, minimumClasses: 2 });
  const [reviewerName, setReviewerName] = useState('');
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [trainingStatus, setTrainingStatus] = useState({ state: 'idle', message: 'No training job has been started.' });
  const [startingTraining, setStartingTraining] = useState('');

  const loadTrainingStatus = async () => {
    try { const r = await fetch('/api/training/status'); if (r.ok) setTrainingStatus(await r.json()); } catch { /* backend may be restarting */ }
  };

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [a, b] = await Promise.all([
        fetch('/api/training-data').then(async r => { if (!r.ok) throw new Error((await r.json().catch(()=>({}))).error || 'Could not load training data.'); return r.json(); }),
        fetch('/api/training-stats').then(async r => { if (!r.ok) throw new Error((await r.json().catch(()=>({}))).error || 'Could not load training statistics.'); return r.json(); })
      ]);
      const list = Array.isArray(a) ? a : [];
      setItems(list); setStats(b || {});
      setDrafts(Object.fromEntries(list.map(x => [x.id, { verifiedLabel: x.verifiedLabel || normalizeClass(x.classification), trainingConsent: Boolean(x.trainingConsent) }])));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); loadTrainingStatus(); }, [refreshToken]);
  useEffect(() => { const t = setInterval(loadTrainingStatus, 4000); return () => clearInterval(t); }, []);

  const setDraft = (id, patch) => setDrafts(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));

  const saveVerified = async (item) => {
    if (!reviewerName.trim()) { setError('Enter the clinician / reviewer name before saving a verified label.'); return; }
    const draft = drafts[item.id] || {};
    setBusyId(item.id); setError('');
    try {
      const r = await fetch(`/api/training-data/${item.id}/verify`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reviewerName: reviewerName.trim(), verifiedLabel: draft.verifiedLabel, trainingConsent: Boolean(draft.trainingConsent) })
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || 'Could not save verified label.');
      await load(); onChanged?.();
    } catch (e) { setError(e.message); }
    finally { setBusyId(''); }
  };

  const remove = async (item) => {
    const ok = window.confirm('Delete this image permanently? This removes the image, screening record, verified label and training-data entry. This cannot be undone.');
    if (!ok) return;
    setBusyId(item.id); setError('');
    try {
      const r = await fetch(`/api/screenings/${item.id}`, { method: 'DELETE' });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || 'Could not delete this record.');
      setItems(prev => prev.filter(x => x.id !== item.id));
      await load(); onChanged?.();
    } catch (e) { setError(e.message); }
    finally { setBusyId(''); }
  };

  const labels = ['No DR', 'Mild DR', 'Moderate DR', 'Severe DR', 'Proliferative DR'];
  const canTrain = Number(stats.approved || 0) >= Number(stats.minimumSamples || 50) && Number(stats.activeClasses || 0) >= Number(stats.minimumClasses || 5);
  const trainingBusy = ['starting','downloading','training'].includes(trainingStatus?.state);

  const startTraining = async (mode) => {
    const question = mode === 'public'
      ? 'Train a new 5-class research model using the public APTOS retinal dataset? This downloads about 250 MB plus model weights and can take a long time on CPU.'
      : 'Fine-tune the local model using only clinician-verified, consented images?';
    if (!window.confirm(question)) return;
    setStartingTraining(mode); setError('');
    try {
      const r = await fetch(`/api/training/${mode}`, { method: 'POST' });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || 'Could not start training.');
      await loadTrainingStatus();
    } catch (e) { setError(e.message); }
    finally { setStartingTraining(''); }
  };

  return <section className="training-section"><div className="section-wrap">
    <div className="page-heading"><div><span className="section-kicker">Database → training set</span><h1>Verify retinal images</h1><p>Only genuine fundus images appear here. A clinician or qualified reviewer must provide the verified label before an image can be approved for model training.</p></div><button className="btn secondary" onClick={load}><RefreshCw/> Refresh</button></div>
    {error && <div className="error-banner"><CircleAlert/><span>{error}</span></div>}
    <div className="training-grid">
      <article className="panel training-list-panel">
        <div className="reviewer-row">
          <Field label="Clinician / reviewer name"><input value={reviewerName} onChange={e=>setReviewerName(e.target.value)} placeholder="Required before saving labels" /></Field>
          <div className="reviewer-note"><Stethoscope/><span>The verified label should come from an ophthalmologist/qualified reviewer or a trusted labelled dataset — not from the model itself.</span></div>
        </div>
        {loading ? <div className="empty-state tall"><LoaderCircle className="spin"/><strong>Loading training records…</strong></div> : !items.length ? <div className="empty-state tall"><Database/><strong>No eligible retinal images</strong><span>Only screenings that pass the fundus-image gate are eligible for verification.</span></div> : <div className="training-records">{items.map(item => {
          const d = drafts[item.id] || { verifiedLabel: normalizeClass(item.classification), trainingConsent: false };
          return <div className="training-record" key={item.id}>
            <div className="training-record-main">
              <img src={item.imageUrl} alt="Retinal screening"/>
              <div className="training-meta"><strong>{item.patientId || item.patientName || 'Screening'}</strong><span>Model: {normalizeClass(item.classification)} · {Math.round(Number(item.confidence||0)*100)}%</span><small>{new Date(item.createdAt).toLocaleString()}</small>{item.verifiedAt && <em>Verified by {item.reviewerName}</em>}</div>
            </div>
            <div className="training-controls">
              <Field label="Verified DR grade"><select value={d.verifiedLabel} onChange={e=>setDraft(item.id,{verifiedLabel:e.target.value})}>{labels.map(x=><option key={x}>{x}</option>)}</select></Field>
              <label className="consent-box"><input type="checkbox" checked={Boolean(d.trainingConsent)} onChange={e=>setDraft(item.id,{trainingConsent:e.target.checked})}/><span><strong>Consent / approval for model training</strong><small>Include only when use for training is permitted.</small></span></label>
              <button className="btn secondary save-verified" disabled={busyId===item.id} onClick={()=>saveVerified(item)}>{busyId===item.id?<LoaderCircle className="spin"/>:<Save/>} Save verified label</button>
              <button className="btn danger delete-record" disabled={busyId===item.id} onClick={()=>remove(item)}><Trash2/> Delete permanently</button>
            </div>
          </div>;
        })}</div>}
      </article>
      <aside className="training-sidebar">
        <article className="panel distribution-card"><div className="card-top"><span>Verified class distribution</span><Database/></div>{labels.map(label=>{const n=Number(stats.distribution?.[label]||0); const max=Math.max(1,...labels.map(x=>Number(stats.distribution?.[x]||0))); return <div className="dist-row" key={label}><div><span>{label}</span><b>{n}</b></div><div className="dist-bar"><i style={{width:`${(n/max)*100}%`}}/></div></div>;})}</article>
        <article className="panel training-ready-card">
          <div className="card-top"><span>Train XplainaEye model</span><BrainCircuit/></div>
          <h3>5-class DR transfer learning</h3>
          <p>Train your own research model from a labelled public retinal dataset, then optionally fine-tune it later with clinician-verified local images.</p>
          <div className={`training-status ${trainingStatus?.state || 'idle'}`}><span className="status-dot"/><div><strong>{trainingStatus?.state === 'complete' ? 'Training complete' : trainingStatus?.state === 'error' ? 'Training error' : trainingBusy ? 'Training in progress' : 'Ready to train'}</strong><small>{trainingStatus?.message || 'No training job has been started.'}</small>{trainingStatus?.epoch ? <small>Epoch {trainingStatus.epoch}/{trainingStatus.totalEpochs || '?'}</small> : null}</div></div>
          <button className="btn primary train-action" disabled={trainingBusy || startingTraining} onClick={()=>startTraining('public')}>{startingTraining==='public'?<LoaderCircle className="spin"/>:<Play/>} Train from public APTOS dataset</button>
          <div className="training-rule"><CircleAlert/><span>Local fine-tuning needs at least {stats.minimumSamples||50} approved images, all {stats.minimumClasses||5} DR classes, and consent for training.</span></div>
          <button className="btn secondary train-action" disabled={!canTrain || trainingBusy || startingTraining} onClick={()=>startTraining('verified')}>{startingTraining==='verified'?<LoaderCircle className="spin"/>:<BrainCircuit/>} Fine-tune with verified local data</button>
          <small className="research-training-note">Training metrics are academic validation metrics only. They do not establish clinical safety or diagnostic performance.</small>
        </article>
      </aside>
    </div>
  </div></section>;
}

function AboutPage() {
  return <section className="about-section"><div className="section-wrap"><div className="page-heading"><div><span className="section-kicker">Architecture</span><h1>How the real screening workflow works</h1><p>The patient does not need to provide a fundus photo. A trained health worker captures it using a portable fundus camera at a PHC, camp, clinic or mobile screening unit.</p></div></div><div className="architecture-flow"><Architecture icon={Camera} n="01" title="Fundus camera" text="Connect a portable camera that exposes a USB/UVC video feed, or import the image exported by dedicated vendor software."/><ChevronRight/><Architecture icon={Activity} n="02" title="Live guidance" text="The browser checks lighting, contrast, focus and resolution and asks the operator to retake poor frames."/><ChevronRight/><Architecture icon={BrainCircuit} n="03" title="DR model" text="Backend sends the accepted retinal image to MODEL_API_URL and waits for a genuine prediction."/><ChevronRight/><Architecture icon={Microscope} n="04" title="XAI" text="Model may return a Grad-CAM heatmap and image-specific findings."/><ChevronRight/><Architecture icon={Sparkles} n="05" title="Explanation" text="The result is explained in simple English/Tamil; optional GenAI can phrase the model-grounded findings."/><ChevronRight/><Architecture icon={FileCheck2} n="06" title="Referral report" text="Screening details, urgency and next steps are exported to PDF and saved in history."/></div><div className="about-cards"><article className="panel"><Camera/><h3>Realistic image acquisition</h3><p>Direct browser capture works with standard UVC cameras. For proprietary fundus cameras, export the image using the vendor application and upload it here.</p></article><article className="panel"><ShieldCheck/><h3>No fake medical output</h3><p>If the real model service is disconnected, screening stops instead of generating a random DR class.</p></article><article className="panel"><Languages/><h3>Explain to the patient</h3><p>Each DR stage includes meaning, model-grounded findings when available, urgency, English/Tamil voice and a report for referral.</p></article></div></div></section>;
}

function Architecture({icon:Icon,n,title,text}) { return <div className="arch-card"><span>{n}</span><Icon/><strong>{title}</strong><p>{text}</p></div>; }

async function analyzeVideoElement(video) {
  const width = video.videoWidth || 1, height = video.videoHeight || 1;
  const targetW = Math.min(width, 360), targetH = Math.max(1, Math.round(height * targetW / width));
  const c = document.createElement('canvas'); c.width = targetW; c.height = targetH;
  const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(video, 0, 0, targetW, targetH);
  return analyzePixels(ctx.getImageData(0, 0, targetW, targetH).data, targetW, targetH, width, height);
}

function analyzePixels(d, targetW, targetH, width, height) {
  const gray = new Float32Array(targetW * targetH); let sum = 0, sumSq = 0;
  let maskCount = 0, weightedX = 0, weightedY = 0, weightSum = 0;
  let minX = targetW, maxX = 0, minY = targetH, maxY = 0;
  for (let i=0,p=0;i<d.length;i+=4,p++) {
    const r=d[i], gg=d[i+1], b=d[i+2];
    const g=.299*r+.587*gg+.114*b; gray[p]=g; sum+=g; sumSq+=g*g;
    const mx=Math.max(r,gg,b), mn=Math.min(r,gg,b), sat=mx ? (mx-mn)/mx : 0;
    const redAdv=r-(gg+b)/2;
    const x=p%targetW, y=Math.floor(p/targetW);
    // Approximate red/orange retinal-field segmentation for live positioning only.
    if (r>48 && g>28 && redAdv>8 && sat>0.13) {
      const wgt=Math.max(1, redAdv) * (0.35 + sat);
      maskCount++; weightSum+=wgt; weightedX+=x*wgt; weightedY+=y*wgt;
      if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
    }
  }
  const count=gray.length, brightness=sum/count, contrast=Math.sqrt(Math.max(0,sumSq/count-brightness*brightness)); let edge=0,n=0;
  for(let y=1;y<targetH-1;y++) for(let x=1;x<targetW-1;x++){ const p=y*targetW+x; edge+=Math.abs(4*gray[p]-gray[p-1]-gray[p+1]-gray[p-targetW]-gray[p+targetW]); n++; }
  const sharpness=edge/Math.max(1,n), issues=[];
  if(width<512||height<512) issues.push('Low resolution');
  if(brightness<45) issues.push('Image may be too dark');
  if(brightness>215) issues.push('Image may be overexposed');
  if(contrast<28) issues.push('Low contrast');
  if(sharpness<7) issues.push('Possible focus issue');

  const retinaFraction=maskCount/Math.max(1,count);
  const retinaDetected=retinaFraction>=0.07 && weightSum>0;
  const retinaCenterX=retinaDetected ? (weightedX/weightSum)/Math.max(1,targetW-1) : 0.5;
  const retinaCenterY=retinaDetected ? (weightedY/weightSum)/Math.max(1,targetH-1) : 0.5;
  const bboxArea=retinaDetected ? Math.max(0,maxX-minX+1)*Math.max(0,maxY-minY+1) : 0;
  const retinaFill=bboxArea/Math.max(1,count);
  const positionOk=retinaDetected && retinaCenterX>=0.42 && retinaCenterX<=0.58 && retinaCenterY>=0.40 && retinaCenterY<=0.60 && retinaFill>=0.18 && retinaFill<=0.88;

  const score=Math.max(0,Math.min(100,100-(width<512||height<512?25:0)-(brightness<45||brightness>215?20:0)-(contrast<28?20:0)-(sharpness<7?35:0)));
  return {
    width,height,brightness:Math.round(brightness),contrast:Math.round(contrast),sharpness:Number(sharpness.toFixed(1)),score,status:issues.length?'retake':'good',issues,
    retinaDetected, retinaCenterX:Number(retinaCenterX.toFixed(3)), retinaCenterY:Number(retinaCenterY.toFixed(3)), retinaFill:Number(retinaFill.toFixed(3)), positionOk
  };
}

function getLiveInstruction(q, language='en') {
  if (!q) return null;
  const ta = language === 'ta';
  const say = (key, arrow, enShort, enText, taShort, taText, good=false) => ({ key, arrow, shortText: ta ? taShort : enShort, text: ta ? taText : enText, good });

  if (!q.retinaDetected) return say('find','◎','Center retina','Please center the retinal field inside the guide.','ரெட்டினாவை மையப்படுத்தவும்','ரெட்டினா பகுதியை வழிகாட்டி வட்டத்தின் மையத்தில் கொண்டு வரவும்.');
  if (q.retinaCenterX < 0.42) return say('left','←','Move left','Please move the camera slightly to the left.','இடப்பக்கம் நகர்த்தவும்','கேமராவை சிறிது இடப்பக்கம் நகர்த்தவும்.');
  if (q.retinaCenterX > 0.58) return say('right','→','Move right','Please move the camera slightly to the right.','வலப்பக்கம் நகர்த்தவும்','கேமராவை சிறிது வலப்பக்கம் நகர்த்தவும்.');
  if (q.retinaCenterY < 0.40) return say('up','↑','Move up','Please move the camera slightly up.','மேலே நகர்த்தவும்','கேமராவை சிறிது மேலே நகர்த்தவும்.');
  if (q.retinaCenterY > 0.60) return say('down','↓','Move down','Please move the camera slightly down.','கீழே நகர்த்தவும்','கேமராவை சிறிது கீழே நகர்த்தவும்.');
  if (q.retinaFill < 0.18) return say('closer','＋','Move closer','Please move the camera slightly closer to the eye.','அருகே நகர்த்தவும்','கேமராவை கண்ணுக்கு சிறிது அருகே நகர்த்தவும்.');
  if (q.retinaFill > 0.88) return say('back','−','Move back','Please move the camera slightly back.','சிறிது பின்னால் நகர்த்தவும்','கேமராவை சிறிது பின்னால் நகர்த்தவும்.');
  if (q.brightness < 45) return say('dark','☀','Increase light','The image is dark. Please improve the illumination.','ஒளியை அதிகரிக்கவும்','படம் இருண்டுள்ளது. ஒளியை சிறிது அதிகரிக்கவும்.');
  if (q.brightness > 215) return say('bright','☀','Reduce light','The image is too bright. Please reduce the illumination.','ஒளியை குறைக்கவும்','படம் மிக அதிகமாக வெளிச்சமாக உள்ளது. ஒளியை குறைக்கவும்.');
  if (q.sharpness < 7) return say('focus','◉','Hold steady','Please hold the camera steady and adjust focus.','அசையாமல் பிடிக்கவும்','கேமராவை அசையாமல் பிடித்து ஃபோகஸை சரிசெய்யவும்.');
  if (q.contrast < 28) return say('contrast','◐','Adjust angle','Please adjust the camera angle for better retinal contrast.','கோணத்தை சரிசெய்யவும்','ரெட்டினா தெளிவாகத் தெரிய கேமரா கோணத்தை சரிசெய்யவும்.');
  return say('ready','✓','Capture now','Position and image quality look good. Hold steady and capture now.','இப்போது படம் எடுக்கவும்','நிலை மற்றும் படத் தரம் நன்றாக உள்ளது. அசையாமல் பிடித்து இப்போது படம் எடுக்கவும்.',true);
}

async function analyzeImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});
    const width=img.naturalWidth,height=img.naturalHeight,targetW=Math.min(width,360),targetH=Math.max(1,Math.round(height*targetW/width));
    const c=document.createElement('canvas');c.width=targetW;c.height=targetH;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,targetW,targetH);const d=ctx.getImageData(0,0,targetW,targetH).data;
    return analyzePixels(d, targetW, targetH, width, height);
  } finally {URL.revokeObjectURL(url);}
}

export default App;
