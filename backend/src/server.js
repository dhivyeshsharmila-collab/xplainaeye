import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { insertScreening, getScreening, getScreenings, getStats, getTrainingData, verifyScreening, deleteScreening, getTrainingStats } from './db.js';
import { knowledge, normalizeClass } from './clinicalKnowledge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const uploadsDir = path.join(rootDir, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
const port = Number(process.env.PORT || 5000);
const modelBase = String(process.env.MODEL_API_URL || '').replace(/\/$/, '');
const genAiUrl = String(process.env.GENAI_API_URL || '').trim();

app.use(cors());
app.use(express.json({ limit: '3mb' }));
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Please upload a JPG, PNG or WebP retinal image.'));
    cb(null, true);
  }
});

async function modelHealth() {
  if (!modelBase) return { connected: false, reason: 'MODEL_API_URL is not configured.' };
  try {
    const r = await fetch(`${modelBase}/health`, { signal: AbortSignal.timeout(2500) });
    if (!r.ok) return { connected: false, reason: `Model service returned ${r.status}.` };
    const data = await r.json().catch(() => ({}));
    return { connected: Boolean(data.ready ?? data.ok ?? true), ...data };
  } catch (error) {
    return { connected: false, reason: error.message };
  }
}

app.get('/api/health', async (_req, res) => {
  const model = await modelHealth();
  res.json({ ok: true, service: 'xplainaeye-api', database: 'sqlite', model, genAi: Boolean(genAiUrl) });
});

app.get('/api/stats', (_req, res) => res.json(getStats()));
app.get('/api/screenings', (req, res) => res.json(getScreenings(req.query.limit)));
app.get('/api/screenings/:id', (req, res) => {
  const item = getScreening(req.params.id);
  if (!item) return res.status(404).json({ error: 'Screening not found.' });
  res.json(item);
});


app.get('/api/training-data', (req, res) => res.json(getTrainingData(req.query.limit)));
app.get('/api/training-stats', (_req, res) => res.json(getTrainingStats()));

const aiDir = path.resolve(rootDir, '../ai-service');
const trainingStatusFile = path.join(aiDir, 'training_status.json');
const trainingLogFile = path.join(aiDir, 'training.log');

function readTrainingStatus() {
  try { return JSON.parse(fs.readFileSync(trainingStatusFile, 'utf8')); }
  catch { return { state: 'idle', message: 'No training job has been started.' }; }
}

function startTraining(scriptName, mode) {
  const current = readTrainingStatus();
  if (current.state === 'training' || current.state === 'downloading') {
    const error = new Error('A model-training job is already running.'); error.status = 409; throw error;
  }
  const python = path.join(aiDir, '.venv', 'bin', 'python');
  const script = path.join(aiDir, scriptName);
  if (!fs.existsSync(python)) { const error = new Error('AI environment is not installed. Run npm run ai:setup first.'); error.status = 400; throw error; }
  if (!fs.existsSync(script)) { const error = new Error('Training script is missing.'); error.status = 500; throw error; }
  fs.writeFileSync(trainingStatusFile, JSON.stringify({ state: 'starting', mode, message: 'Starting training job…', updatedAt: Date.now()/1000 }, null, 2));
  const logFd = fs.openSync(trainingLogFile, 'a');
  const child = spawn(python, [script], { cwd: aiDir, env: { ...process.env, TRAINING_STATUS_FILE: trainingStatusFile }, detached: true, stdio: ['ignore', logFd, logFd] });
  child.unref();
  return { ok: true, pid: child.pid, mode };
}

app.get('/api/training/status', (_req, res) => res.json(readTrainingStatus()));
app.post('/api/training/public', (_req, res, next) => { try { res.status(202).json(startTraining('train_public.py', 'public-aptos')); } catch (e) { next(e); } });
app.post('/api/training/verified', (_req, res, next) => { try { res.status(202).json(startTraining('train_verified.py', 'verified-local')); } catch (e) { next(e); } });
app.patch('/api/training-data/:id/verify', (req, res) => {
  const reviewerName = String(req.body?.reviewerName || '').trim();
  const verifiedLabel = String(req.body?.verifiedLabel || '').trim();
  const allowed = new Set(['No DR', 'Mild DR', 'Moderate DR', 'Severe DR', 'Proliferative DR']);
  if (!reviewerName) return res.status(400).json({ error: 'Clinician / reviewer name is required.' });
  if (!allowed.has(verifiedLabel)) return res.status(400).json({ error: 'Choose a valid verified DR grade.' });
  const item = verifyScreening(req.params.id, {
    reviewerName,
    verifiedLabel,
    trainingConsent: Boolean(req.body?.trainingConsent)
  });
  if (!item) return res.status(404).json({ error: 'Training record not found or image is not a valid fundus image.' });
  res.json(item);
});

function removeStoredAsset(urlOrName) {
  if (!urlOrName) return;
  const name = path.basename(String(urlOrName));
  if (!name || name === '.' || name === '..') return;
  try { fs.unlinkSync(path.join(uploadsDir, name)); } catch (error) { if (error?.code !== 'ENOENT') console.warn('Could not delete asset:', error.message); }
}

app.delete('/api/screenings/:id', (req, res) => {
  const item = deleteScreening(req.params.id);
  if (!item) return res.status(404).json({ error: 'Screening not found.' });
  removeStoredAsset(item.storedName || item.imageUrl);
  removeStoredAsset(item.heatmapUrl);
  res.json({ ok: true, id: item.id });
});

function saveHeatmap(base64, id) {
  if (!base64) return '';
  const clean = String(base64).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  try {
    const buffer = Buffer.from(clean, 'base64');
    if (!buffer.length) return '';
    const filename = `heatmap-${id}.png`;
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);
    return `/uploads/${filename}`;
  } catch {
    return '';
  }
}

async function callModel(file, metadata) {
  if (!modelBase) {
    const error = new Error('Real AI model is not connected. Set MODEL_API_URL in backend/.env and start your inference service.');
    error.status = 503;
    throw error;
  }

  const data = new FormData();
  const buffer = fs.readFileSync(file.path);
  data.append('image', new Blob([buffer], { type: file.mimetype }), file.originalname);
  data.append('metadata', JSON.stringify(metadata));

  let response;
  try {
    response = await fetch(`${modelBase}/predict`, { method: 'POST', body: data, signal: AbortSignal.timeout(45000) });
  } catch (cause) {
    const error = new Error(`Could not reach the AI model service: ${cause.message}`);
    error.status = 503;
    throw error;
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof body.detail === 'string' ? body.detail : (body.detail?.message || body.error);
    const error = new Error(detail || `AI model service returned ${response.status}.`);
    error.status = response.status === 422 ? 422 : 502;
    throw error;
  }

  const classification = normalizeClass(body.classification ?? body.label, body.classIndex);
  const confidence = Number(body.confidence ?? body.probability ?? 0);
  if (!classification || !Number.isFinite(confidence)) {
    const error = new Error('AI model response is missing a valid classification or confidence value.');
    error.status = 502;
    throw error;
  }

  return {
    classification,
    confidence: Math.max(0, Math.min(1, confidence)),
    findings: Array.isArray(body.findings) ? body.findings : [],
    heatmapBase64: body.heatmapBase64 || body.gradcamBase64 || '',
    heatmapUrl: body.heatmapUrl || '',
    modelName: body.modelName || body.model || 'Connected DR model',
    fundusValid: body.fundusValid !== false,
    fundusScore: Number.isFinite(Number(body.fundusScore)) ? Number(body.fundusScore) : null
  };
}

async function callGenAi(payload) {
  if (!genAiUrl) return null;
  try {
    const r = await fetch(genAiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data.explanationEn && !data.explanation) return null;
    return { en: data.explanationEn || data.explanation, ta: data.explanationTa || '', mode: 'genai' };
  } catch {
    return null;
  }
}

app.post('/api/screenings', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Please upload a retinal image.' });

    const quality = JSON.parse(req.body.quality || '{}');
    const patient = {
      patientName: String(req.body.patientName || '').trim() || 'Patient',
      patientId: String(req.body.patientId || '').trim() || `XP-${Date.now().toString().slice(-7)}`,
      age: req.body.age ? Number(req.body.age) : null,
      gender: String(req.body.gender || ''),
      eye: String(req.body.eye || ''),
      diabetesYears: req.body.diabetesYears ? Number(req.body.diabetesYears) : null
    };

    const capture = {
      captureMethod: String(req.body.captureMethod || 'Retinal image'),
      captureDevice: String(req.body.captureDevice || '')
    };

    const inference = await callModel(req.file, { quality, patient, capture });
    const classInfo = knowledge[inference.classification];
    const id = crypto.randomUUID();
    const heatmapUrl = inference.heatmapBase64 ? saveHeatmap(inference.heatmapBase64, id) : inference.heatmapUrl;

    const imageContext = inference.findings.length ? `For this uploaded retinal image, ${inference.findings.join(' ')}` : 'The model did not return a separate image-specific finding beyond the DR classification and explanation heatmap.';
    const fallbackEn = `${classInfo.english} Model confidence: ${Math.round(inference.confidence * 100)}%. ${imageContext} ${classInfo.recommendation}`;
    const generated = await callGenAi({
      classification: inference.classification,
      confidence: inference.confidence,
      findings: inference.findings,
      recommendation: classInfo.recommendation,
      patient,
      instruction: 'Explain the screening result in simple, non-diagnostic language. Do not claim certainty or prescribe treatment.'
    });

    const record = {
      id,
      ...patient,
      ...capture,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      imageUrl: `/uploads/${req.file.filename}`,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      quality,
      classification: inference.classification,
      confidence: inference.confidence,
      referable: classInfo.referable,
      findings: inference.findings,
      heatmapUrl,
      recommendation: classInfo.recommendation,
      explanationEn: generated?.en || fallbackEn,
      explanationTa: generated?.ta || classInfo.tamil,
      explanationMode: generated?.mode || 'clinical-knowledge',
      modelName: inference.modelName,
      fundusValid: inference.fundusValid,
      fundusScore: inference.fundusScore,
      createdAt: new Date().toISOString()
    };

    insertScreening(record);
    res.status(201).json(record);
  } catch (error) {
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch (cleanupError) { if (cleanupError?.code !== 'ENOENT') console.warn('Upload cleanup failed:', cleanupError.message); }
    }
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.message || 'Unexpected server error.' });
});

const frontendDist = path.resolve(rootDir, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

app.listen(port, () => {
  console.log(`XplainaEye API: http://localhost:${port}`);
  console.log(`Database: SQLite`);
  console.log(`AI model: ${modelBase || 'NOT CONNECTED'}`);
  console.log(`GenAI: ${genAiUrl ? 'connected' : 'optional / not configured'}`);
});
