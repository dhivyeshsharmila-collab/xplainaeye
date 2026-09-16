# XplainaEye — real AI connected build

This build keeps the health-worker + portable fundus-camera workflow and adds a **real 5-class diabetic-retinopathy research model** that can download automatically on first use.

## Model used by default

The AI service defaults to the public Keras model:

`manudaza/retinal-triage-efficientnetb0`

It is a 5-class EfficientNetB0 retinal-fundus model trained on APTOS 2019. It is intended for research/triage experimentation, **not clinical diagnosis or treatment decisions**. You can replace it later with your own validated model by setting `DR_MODEL_PATH`.

## First-time setup on your Mac

From the project root:

```bash
npm install
npm run install:all
cp backend/.env.example backend/.env
```

The website needs Node; the AI model service needs Python 3.11 or 3.12 because TensorFlow may not install on Python 3.14.

If you do not have Python 3.12:

```bash
brew install python@3.12
```

Then install the AI environment once:

```bash
npm run ai:setup
```

## Start everything

After the one-time setup:

```bash
npm run dev:full
```

Open:

- Website: http://localhost:5173
- Node API health: http://localhost:5001/api/health
- AI health: http://localhost:8000/health

On the **first** `npm run dev:full`, the AI service downloads and caches the public model from Hugging Face. This can take a little time. When `http://localhost:8000/health` shows `"ready": true`, refresh the website and the header changes to **AI model connected**.

## Run continuously on this Mac without signup

For a no-account deployment, install the app as two macOS `launchd` services. They start at login and restart after crashes. The Mac must remain powered on, and the app is available locally at `http://localhost:5001`.

```bash
npm run deploy:local
```

Logs are written to `/tmp/xplainaeye-ai.log` and `/tmp/xplainaeye-backend.log`. Remove the services with:

```bash
npm run undeploy:local
```

This is local-only deployment. Public 24/7 access requires a machine or hosting provider that remains online; that cannot be provided with zero account or signup.

## Screening workflow

```text
Patient
  → health worker
  → portable fundus camera / imported camera image
  → capture quality check
  → real 5-class DR model
  → confidence
  → Grad-CAM when available
  → simple English/Tamil explanation
  → PDF referral/screening report
```

## Use your own trained model later

Place your model at:

```text
ai-service/models/dr_model.keras
```

The local model is preferred automatically over the public model. Expected class order:

0. No DR
1. Mild DR
2. Moderate DR
3. Severe DR
4. Proliferative DR

If your model uses different preprocessing, update `preprocess()` in `ai-service/app.py`.

## Important safety note

This is an academic/research screening prototype. The bundled public model has not been prospectively validated for your target population, camera hardware, or clinical deployment. The output must not be presented as a confirmed diagnosis or used to prescribe treatment without professional review and appropriate validation.

## Safety update: delete + fundus validation

This build adds two protections requested for the Training data workflow:

1. **Permanent deletion** — every training record has a **Delete permanently** button. The API removes the SQLite record, the uploaded retinal image, the saved heatmap, the verified label and training-consent state.
2. **Non-fundus rejection** — the AI service runs a conservative fundus-image gate before DR classification. Obvious non-retinal photos (for example selfies/face photos) are rejected with `Invalid retinal image — fundus image required` and are not inserted into the database or training set.

Existing old records are not silently deleted. Open **Training data** and use **Delete permanently** for any incorrect record created before this update.

## New: real-time spoken camera positioning

When **Connect fundus camera** is open, the browser now analyzes each live frame and gives both visual and spoken guidance:

- Move left / right
- Move up / down
- Move closer / move back
- Increase / reduce illumination
- Hold steady and adjust focus
- Adjust camera angle for contrast
- “Position and image quality look good — capture now”

The operator can switch **Voice on/off** and choose **English or Tamil**. The live positioning uses a lightweight red/orange retinal-field centroid heuristic in the browser, so it is a practical capture aid rather than a clinically validated eye-tracking system. Final DR inference still uses the separate fundus-image gate and DR model service.

## New: train your own 5-class DR model

The Training data page now has two model-training paths.

### 1. Train from public APTOS data

Click **Train from public APTOS dataset** in the Training data page, or run:

```bash
npm run train:public
```

The script downloads `bumbledeep/aptos` from Hugging Face (APTOS 2019 retinal fundus images), makes a stratified train/validation split, trains an ImageNet-initialized EfficientNetB0 for the five DR grades, fine-tunes the final blocks, and saves:

```text
ai-service/models/dr_model.keras
ai-service/models/training_report.json
```

The local model automatically takes priority over the bundled public fallback model on future inference. The script also asks the running AI service to reload the newly saved model when possible.

The public dataset is roughly 250 MB, and training can take a while on a laptop CPU. Keep the Mac connected to power during training.

### 2. Fine-tune with your own verified images

The website stores only images that pass the fundus gate. A qualified reviewer must select the verified grade and explicitly approve the image for training. Once there are at least **50 approved images covering all five DR classes, with at least five images per class**, run:

```bash
npm run train:verified
```

or press **Fine-tune with verified local data** in the Training data page.

This deliberately refuses to fine-tune a five-class medical model on a tiny or partial dataset because that can make the model worse.

### Important

Training/validation accuracy in this project is an academic development metric. It is **not clinical validation**. Before any real clinical use, evaluate on an independent external dataset, the actual target camera hardware, and the intended patient population, with qualified eye-care review.
