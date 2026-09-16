import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'xplainaeye.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS screenings (
    id TEXT PRIMARY KEY,
    patient_name TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    eye TEXT,
    diabetes_years INTEGER,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    quality_json TEXT NOT NULL,
    classification TEXT NOT NULL,
    confidence REAL NOT NULL,
    referable INTEGER NOT NULL DEFAULT 0,
    findings_json TEXT NOT NULL,
    heatmap_url TEXT,
    recommendation TEXT NOT NULL,
    explanation_en TEXT NOT NULL,
    explanation_ta TEXT,
    explanation_mode TEXT NOT NULL,
    model_name TEXT,
    capture_method TEXT,
    capture_device TEXT,
    fundus_valid INTEGER NOT NULL DEFAULT 1,
    fundus_score REAL,
    verified_label TEXT,
    reviewer_name TEXT,
    training_consent INTEGER NOT NULL DEFAULT 0,
    verified_at TEXT,
    created_at TEXT NOT NULL
  )
`);

const existingColumns = new Set(db.prepare('PRAGMA table_info(screenings)').all().map(row => row.name));
const migrations = [
  ['capture_method', 'ALTER TABLE screenings ADD COLUMN capture_method TEXT'],
  ['capture_device', 'ALTER TABLE screenings ADD COLUMN capture_device TEXT'],
  ['fundus_valid', 'ALTER TABLE screenings ADD COLUMN fundus_valid INTEGER NOT NULL DEFAULT 1'],
  ['fundus_score', 'ALTER TABLE screenings ADD COLUMN fundus_score REAL'],
  ['verified_label', 'ALTER TABLE screenings ADD COLUMN verified_label TEXT'],
  ['reviewer_name', 'ALTER TABLE screenings ADD COLUMN reviewer_name TEXT'],
  ['training_consent', 'ALTER TABLE screenings ADD COLUMN training_consent INTEGER NOT NULL DEFAULT 0'],
  ['verified_at', 'ALTER TABLE screenings ADD COLUMN verified_at TEXT']
];
for (const [name, sql] of migrations) {
  if (!existingColumns.has(name)) db.exec(sql);
}

function safeJson(value, fallback) {
  try { return JSON.parse(value || ''); } catch { return fallback; }
}

function hydrate(row) {
  if (!row) return null;
  return {
    id: row.id,
    patientName: row.patient_name,
    patientId: row.patient_id,
    age: row.age,
    gender: row.gender,
    eye: row.eye,
    diabetesYears: row.diabetes_years,
    originalName: row.original_name,
    storedName: row.stored_name,
    imageUrl: row.image_url,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    quality: safeJson(row.quality_json, {}),
    classification: row.classification,
    confidence: Number(row.confidence || 0),
    referable: Boolean(row.referable),
    findings: safeJson(row.findings_json, []),
    heatmapUrl: row.heatmap_url || '',
    recommendation: row.recommendation,
    explanationEn: row.explanation_en,
    explanationTa: row.explanation_ta || '',
    explanationMode: row.explanation_mode,
    modelName: row.model_name || '',
    captureMethod: row.capture_method || '',
    captureDevice: row.capture_device || '',
    fundusValid: row.fundus_valid === null || row.fundus_valid === undefined ? true : Boolean(row.fundus_valid),
    fundusScore: row.fundus_score === null || row.fundus_score === undefined ? null : Number(row.fundus_score),
    verifiedLabel: row.verified_label || '',
    reviewerName: row.reviewer_name || '',
    trainingConsent: Boolean(row.training_consent),
    verifiedAt: row.verified_at || '',
    createdAt: row.created_at
  };
}

export function insertScreening(record) {
  db.prepare(`
    INSERT INTO screenings (
      id, patient_name, patient_id, age, gender, eye, diabetes_years,
      original_name, stored_name, image_url, mime_type, size_bytes,
      quality_json, classification, confidence, referable, findings_json,
      heatmap_url, recommendation, explanation_en, explanation_ta,
      explanation_mode, model_name, capture_method, capture_device,
      fundus_valid, fundus_score, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id,
    record.patientName,
    record.patientId,
    record.age ?? null,
    record.gender || null,
    record.eye || null,
    record.diabetesYears ?? null,
    record.originalName,
    record.storedName,
    record.imageUrl,
    record.mimeType,
    record.sizeBytes,
    JSON.stringify(record.quality || {}),
    record.classification,
    record.confidence,
    record.referable ? 1 : 0,
    JSON.stringify(record.findings || []),
    record.heatmapUrl || null,
    record.recommendation,
    record.explanationEn,
    record.explanationTa || null,
    record.explanationMode,
    record.modelName || null,
    record.captureMethod || null,
    record.captureDevice || null,
    record.fundusValid === false ? 0 : 1,
    record.fundusScore ?? null,
    record.createdAt
  );
}

export function getScreenings(limit = 50) {
  const n = Math.min(Math.max(Number(limit) || 50, 1), 200);
  return db.prepare('SELECT * FROM screenings ORDER BY created_at DESC LIMIT ?').all(n).map(hydrate);
}

export function getTrainingData(limit = 200) {
  const n = Math.min(Math.max(Number(limit) || 200, 1), 500);
  return db.prepare(`
    SELECT * FROM screenings
    WHERE fundus_valid = 1
    ORDER BY created_at DESC
    LIMIT ?
  `).all(n).map(hydrate);
}

export function getScreening(id) {
  return hydrate(db.prepare('SELECT * FROM screenings WHERE id = ?').get(id));
}

export function verifyScreening(id, { verifiedLabel, reviewerName, trainingConsent }) {
  const now = new Date().toISOString();
  const result = db.prepare(`
    UPDATE screenings
    SET verified_label = ?, reviewer_name = ?, training_consent = ?, verified_at = ?
    WHERE id = ? AND fundus_valid = 1
  `).run(verifiedLabel, reviewerName, trainingConsent ? 1 : 0, now, id);
  if (!result.changes) return null;
  return getScreening(id);
}

export function deleteScreening(id) {
  const existing = getScreening(id);
  if (!existing) return null;
  db.prepare('DELETE FROM screenings WHERE id = ?').run(id);
  return existing;
}

export function getStats() {
  const total = db.prepare('SELECT COUNT(*) AS c FROM screenings').get().c;
  const referable = db.prepare('SELECT COUNT(*) AS c FROM screenings WHERE referable = 1').get().c;
  const avgConfidence = Number(db.prepare('SELECT AVG(confidence) AS v FROM screenings').get().v || 0);
  return { total, referable, avgConfidence };
}

export function getTrainingStats() {
  const rows = db.prepare(`
    SELECT verified_label, COUNT(*) AS c
    FROM screenings
    WHERE fundus_valid = 1
      AND verified_label IS NOT NULL
      AND verified_label <> ''
      AND training_consent = 1
    GROUP BY verified_label
  `).all();
  const distribution = {
    'No DR': 0,
    'Mild DR': 0,
    'Moderate DR': 0,
    'Severe DR': 0,
    'Proliferative DR': 0
  };
  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(distribution, row.verified_label)) distribution[row.verified_label] = Number(row.c || 0);
  }
  const approved = Object.values(distribution).reduce((a, b) => a + b, 0);
  const activeClasses = Object.values(distribution).filter(v => v > 0).length;
  const verifiedTotal = Number(db.prepare(`
    SELECT COUNT(*) AS c FROM screenings
    WHERE fundus_valid = 1 AND verified_label IS NOT NULL AND verified_label <> ''
  `).get().c || 0);
  return { distribution, approved, activeClasses, verifiedTotal, minimumSamples: 50, minimumClasses: 5 };
}
