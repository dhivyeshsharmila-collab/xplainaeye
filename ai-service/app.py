import base64
import io
import json
import os
from pathlib import Path

# Keras 3 running on the TensorFlow backend.
os.environ.setdefault("KERAS_BACKEND", "tensorflow")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import numpy as np
from PIL import Image
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from huggingface_hub import hf_hub_download

try:
    import tensorflow as tf
    import keras
except Exception as exc:
    tf = None
    keras = None
    ML_IMPORT_ERROR = str(exc)
else:
    ML_IMPORT_ERROR = ""

APP_DIR = Path(__file__).resolve().parent
LOCAL_MODEL_PATH = Path(os.getenv("DR_MODEL_PATH", APP_DIR / "models" / "dr_model.keras"))
HF_MODEL_ID = os.getenv("DR_HF_MODEL", "manudaza/retinal-triage-efficientnetb0").strip()
AUTO_DOWNLOAD = os.getenv("DR_AUTO_DOWNLOAD", "1").strip().lower() not in {"0", "false", "no"}
IMG_SIZE = int(os.getenv("DR_IMAGE_SIZE", "224"))
LABELS = ["No DR", "Mild DR", "Moderate DR", "Severe DR", "Proliferative DR"]
GRADCAM_LAYER = os.getenv("GRADCAM_LAYER", "").strip()

app = FastAPI(title="XplainaEye DR Model Service", version="2.0")
model = None
model_error = ""
model_source = ""


def load_model():
    global model, model_error, model_source
    if tf is None or keras is None:
        model_error = f"TensorFlow/Keras import failed: {ML_IMPORT_ERROR}"
        return

    try:
        if LOCAL_MODEL_PATH.exists():
            model = keras.saving.load_model(str(LOCAL_MODEL_PATH), compile=False)
            model_source = str(LOCAL_MODEL_PATH)
        elif AUTO_DOWNLOAD and HF_MODEL_ID:
            # This repository publishes one .keras artifact, not a Transformers-style
            # snapshot with config.json.
            model_file = hf_hub_download(
                repo_id=HF_MODEL_ID,
                filename="efficientnetb0_finetuned_patched.keras",
            )
            model = keras.saving.load_model(model_file, compile=False)
            model_source = f"Hugging Face: {HF_MODEL_ID}"
        else:
            model_error = f"Model file not found: {LOCAL_MODEL_PATH}"
            return
        model_error = ""
    except Exception as exc:
        model = None
        model_source = ""
        model_error = f"Could not load DR model: {exc}"


load_model()


def preprocess(image: Image.Image):
    """Preprocessing for the bundled public EfficientNetB0 DR model.

    The selected model expects 224x224 RGB input using Keras EfficientNet
    preprocessing. We intentionally do NOT divide by 255 here.
    """
    image = image.convert("RGB").resize((IMG_SIZE, IMG_SIZE))
    arr = np.asarray(image, dtype=np.float32)
    arr = tf.keras.applications.efficientnet.preprocess_input(arr)
    return np.expand_dims(arr, axis=0)




def fundus_likelihood(image: Image.Image):
    """Conservative retinal-image gate to prevent obvious non-fundus photos reaching the DR model.

    This is a safety heuristic, not a medical image-quality classifier. It uses the common
    circular retinal field, darker periphery and red/orange retinal colour distribution.
    """
    im = image.convert("RGB").resize((256, 256))
    arr = np.asarray(im, dtype=np.float32) / 255.0
    h, w, _ = arr.shape
    yy, xx = np.indices((h, w))
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    radius = min(h, w) / 2.0
    rr = np.sqrt(((xx - cx) / radius) ** 2 + ((yy - cy) / radius) ** 2)

    inner = rr <= 0.72
    outer = rr >= 0.90
    mid = (rr >= 0.20) & (rr <= 0.78)

    gray = arr.mean(axis=2)
    inner_mean = float(gray[inner].mean())
    outer_mean = float(gray[outer].mean())
    border_dark = float((gray[outer] < 0.28).mean())

    r = float(arr[..., 0][mid].mean())
    g = float(arr[..., 1][mid].mean())
    b = float(arr[..., 2][mid].mean())
    red_advantage = r - (g + b) / 2.0

    mx = arr.max(axis=2)
    mn = arr.min(axis=2)
    saturation = float(((mx - mn) / np.maximum(mx, 1e-6))[mid].mean())

    # Fundus photos are commonly a bright reddish circular field against a darker edge.
    radial_contrast = inner_mean - outer_mean
    score = 0.0
    score += np.clip((radial_contrast - 0.03) / 0.22, 0, 1) * 0.34
    score += np.clip((border_dark - 0.20) / 0.60, 0, 1) * 0.24
    score += np.clip((red_advantage - 0.015) / 0.18, 0, 1) * 0.22
    score += np.clip((saturation - 0.18) / 0.42, 0, 1) * 0.20

    # Extremely bright/flat images are unlikely to be valid fundus captures.
    if inner_mean > 0.90 or saturation < 0.08:
        score *= 0.35

    score = float(np.clip(score, 0, 1))
    return {
        "valid": score >= 0.48,
        "score": score,
        "metrics": {
            "innerBrightness": inner_mean,
            "outerBrightness": outer_mean,
            "borderDarkFraction": border_dark,
            "redAdvantage": red_advantage,
            "saturation": saturation,
        },
    }

def probabilities(raw):
    arr = np.asarray(raw).reshape(-1).astype(np.float64)
    if arr.size != 5:
        raise ValueError(f"Expected a 5-class DR model output, got shape {np.asarray(raw).shape}")
    if np.any(arr < 0) or abs(float(arr.sum()) - 1.0) > 0.05:
        exp = np.exp(arr - np.max(arr))
        arr = exp / exp.sum()
    return arr


def _shape_len(layer):
    try:
        shape = tuple(layer.output.shape)
        return len(shape)
    except Exception:
        return 0


def find_conv_layer():
    if model is None:
        return None
    if GRADCAM_LAYER:
        try:
            return model.get_layer(GRADCAM_LAYER)
        except Exception:
            pass

    # First try top-level layers. EfficientNet is often nested as one layer whose
    # output remains 4-D, which is sufficient for Grad-CAM.
    for layer in reversed(model.layers):
        if _shape_len(layer) == 4:
            return layer

    # Then inspect nested models if needed.
    for outer in reversed(model.layers):
        nested = getattr(outer, "layers", None)
        if not nested:
            continue
        for layer in reversed(nested):
            if _shape_len(layer) == 4:
                return layer
    return None


def gradcam(input_tensor, class_index, original_image):
    layer = find_conv_layer()
    if layer is None:
        return None
    try:
        grad_model = keras.Model(inputs=model.inputs, outputs=[layer.output, model.output])
        with tf.GradientTape() as tape:
            conv_output, preds = grad_model(input_tensor, training=False)
            class_score = preds[:, class_index]
        grads = tape.gradient(class_score, conv_output)
        if grads is None:
            return None
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        heatmap = tf.reduce_sum(conv_output[0] * pooled_grads, axis=-1)
        heatmap = tf.maximum(heatmap, 0)
        max_value = tf.reduce_max(heatmap)
        if float(max_value) <= 0:
            return None
        heatmap = (heatmap / max_value).numpy()

        h = Image.fromarray(np.uint8(heatmap * 255)).resize(original_image.size)
        hm = np.asarray(h, dtype=np.float32) / 255.0
        base = np.asarray(original_image.convert("RGB"), dtype=np.float32)
        color = np.zeros_like(base)
        color[..., 0] = 255 * hm
        color[..., 1] = 175 * np.clip(hm * 1.2, 0, 1)
        alpha = (0.52 * hm)[..., None]
        overlay = np.clip(base * (1 - alpha) + color * alpha, 0, 255).astype(np.uint8)
        out = io.BytesIO()
        Image.fromarray(overlay).save(out, format="PNG")

        weights = heatmap + 1e-8
        yy, xx = np.indices(heatmap.shape)
        cx = float((xx * weights).sum() / weights.sum()) / max(1, heatmap.shape[1] - 1)
        cy = float((yy * weights).sum() / weights.sum()) / max(1, heatmap.shape[0] - 1)
        horizontal = "left" if cx < 0.4 else ("right" if cx > 0.6 else "central")
        vertical = "upper" if cy < 0.4 else ("lower" if cy > 0.6 else "middle")
        if horizontal == "central" and vertical == "middle":
            region = "central portion"
        elif horizontal == "central":
            region = f"{vertical}-central portion"
        elif vertical == "middle":
            region = f"middle-{horizontal} portion"
        else:
            region = f"{vertical}-{horizontal} portion"
        attention = (
            f"Grad-CAM attention was strongest in the {region} of this retinal image. "
            "This describes model attention, not a confirmed lesion."
        )
        return {"base64": base64.b64encode(out.getvalue()).decode("ascii"), "attention": attention}
    except Exception:
        return None


@app.get("/health")
def health():
    report = None
    report_path = APP_DIR / "models" / "training_report.json"
    if report_path.exists():
        try:
            report = json.loads(report_path.read_text())
        except Exception:
            report = None
    return {
        "ok": True,
        "ready": model is not None,
        "modelSource": model_source or None,
        "modelName": HF_MODEL_ID if model is not None and model_source.startswith("Hugging Face") else (LOCAL_MODEL_PATH.name if model is not None else None),
        "error": model_error or None,
        "trainingReport": report,
        "researchOnly": True,
    }


@app.post("/reload")
def reload_model():
    load_model()
    return health()


@app.post("/predict")
async def predict(image: UploadFile = File(...), metadata: str = Form("{}")):
    if model is None:
        raise HTTPException(status_code=503, detail=model_error or "DR model is not loaded")
    try:
        raw_bytes = await image.read()
        original = Image.open(io.BytesIO(raw_bytes)).convert("RGB")

        fundus_gate = fundus_likelihood(original)
        if not fundus_gate["valid"]:
            raise HTTPException(
                status_code=422,
                detail="Invalid retinal image — fundus image required. Use a fundus camera capture or a verified retinal image export."
            )

        tensor = preprocess(original)
        raw = model.predict(tensor, verbose=0)
        probs = probabilities(raw)
        class_index = int(np.argmax(probs))
        confidence = float(probs[class_index])
        heatmap = gradcam(tensor, class_index, original)
        try:
            parsed_metadata = json.loads(metadata or "{}")
        except Exception:
            parsed_metadata = {}
        image_findings = [heatmap["attention"]] if heatmap and heatmap.get("attention") else []
        return {
            "classification": LABELS[class_index],
            "classIndex": class_index,
            "confidence": confidence,
            "probabilities": {LABELS[i]: float(probs[i]) for i in range(5)},
            "findings": image_findings,
            "heatmapBase64": heatmap.get("base64", "") if heatmap else "",
            "modelName": HF_MODEL_ID if model_source.startswith("Hugging Face") else LOCAL_MODEL_PATH.stem,
            "fundusValid": True,
            "fundusScore": float(fundus_gate["score"]),
            "metadataReceived": bool(parsed_metadata),
            "researchOnly": True,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}")
