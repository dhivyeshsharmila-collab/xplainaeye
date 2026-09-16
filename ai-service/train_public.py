import json
import os
import random
import time
import urllib.request
from collections import Counter
from pathlib import Path

os.environ.setdefault("KERAS_BACKEND", "tensorflow")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import numpy as np
import tensorflow as tf
import keras
from datasets import load_dataset

APP_DIR = Path(__file__).resolve().parent
MODEL_PATH = Path(os.getenv("DR_MODEL_PATH", APP_DIR / "models" / "dr_model.keras"))
STATUS_PATH = Path(os.getenv("TRAINING_STATUS_FILE", APP_DIR / "training_status.json"))
DATASET_ID = os.getenv("DR_TRAIN_DATASET", "bumbledeep/aptos")
IMG_SIZE = int(os.getenv("DR_IMAGE_SIZE", "224"))
BATCH_SIZE = int(os.getenv("DR_TRAIN_BATCH", "16"))
EPOCHS = int(os.getenv("DR_TRAIN_EPOCHS", "8"))
FINE_TUNE_EPOCHS = int(os.getenv("DR_FINE_TUNE_EPOCHS", "3"))
SEED = int(os.getenv("DR_TRAIN_SEED", "42"))
MAX_SAMPLES = int(os.getenv("DR_TRAIN_MAX_SAMPLES", "0"))  # 0 = all
LABELS = ["No DR", "Mild DR", "Moderate DR", "Severe DR", "Proliferative DR"]

random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)


def status(state, message, **extra):
    payload = {"state": state, "message": message, "updatedAt": time.time(), "dataset": DATASET_ID, **extra}
    STATUS_PATH.write_text(json.dumps(payload, indent=2))
    print(f"[{state}] {message}", flush=True)


def label_of(row):
    for key in ("label_code", "label", "dr_grade", "diagnosis"):
        if key in row:
            value = row[key]
            if isinstance(value, str):
                lookup = {"No DR":0,"No_DR":0,"Mild":1,"Mild DR":1,"Moderate":2,"Moderate DR":2,"Severe":3,"Severe DR":3,"Proliferative DR":4,"Proliferative_DR":4,"PDR":4}
                if value in lookup:
                    return lookup[value]
            return int(value)
    raise KeyError("Dataset row does not contain a known DR label column")


def image_of(row):
    for key in ("image", "img", "fundus"):
        if key in row:
            return row[key]
    raise KeyError("Dataset row does not contain an image column")


def make_split(ds):
    by_class = {i: [] for i in range(5)}
    indices = list(range(len(ds)))
    if MAX_SAMPLES > 0 and len(indices) > MAX_SAMPLES:
        random.shuffle(indices)
        indices = indices[:MAX_SAMPLES]
    for idx in indices:
        y = label_of(ds[idx])
        if y in by_class:
            by_class[y].append(idx)
    train, val = [], []
    for cls, ids in by_class.items():
        random.shuffle(ids)
        n_val = max(1, round(len(ids) * 0.15)) if len(ids) > 2 else 1
        val += ids[:n_val]
        train += ids[n_val:]
    random.shuffle(train); random.shuffle(val)
    return train, val


def generator(ds, ids, augment=False):
    aug = keras.Sequential([
        keras.layers.RandomFlip("horizontal"),
        keras.layers.RandomRotation(0.04),
        keras.layers.RandomZoom(0.08),
        keras.layers.RandomContrast(0.08),
    ])
    for idx in ids:
        row = ds[idx]
        img = image_of(row).convert("RGB").resize((IMG_SIZE, IMG_SIZE))
        x = np.asarray(img, dtype=np.float32)
        if augment:
            x = aug(x[None, ...], training=True)[0].numpy()
        yield x, np.int32(label_of(row))


def make_tf_dataset(ds, ids, augment=False, shuffle=False):
    sig = (
        tf.TensorSpec(shape=(IMG_SIZE, IMG_SIZE, 3), dtype=tf.float32),
        tf.TensorSpec(shape=(), dtype=tf.int32),
    )
    out = tf.data.Dataset.from_generator(lambda: generator(ds, ids, augment), output_signature=sig)
    if shuffle:
        out = out.shuffle(min(len(ids), 1024), seed=SEED, reshuffle_each_iteration=True)
    return out.batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)


def build_model():
    inputs = keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3), name="fundus")
    base = keras.applications.EfficientNetB0(include_top=False, weights="imagenet", input_tensor=inputs)
    base.trainable = False
    x = base.output
    x = keras.layers.GlobalAveragePooling2D()(x)
    x = keras.layers.Dropout(0.35)(x)
    outputs = keras.layers.Dense(5, activation="softmax", name="dr_grade")(x)
    model = keras.Model(inputs, outputs, name="xplainaeye_aptos_efficientnetb0")
    return model, base


def class_weights(ds, ids):
    counts = Counter(label_of(ds[i]) for i in ids)
    total = sum(counts.values())
    return {cls: total / (5 * max(1, counts.get(cls, 0))) for cls in range(5)}, counts


def try_reload_service():
    try:
        req = urllib.request.Request("http://127.0.0.1:8000/reload", data=b"{}", headers={"Content-Type":"application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=4) as r:
            return r.status == 200
    except Exception:
        return False


def main():
    status("downloading", "Downloading/loading the public APTOS retinal dataset from Hugging Face.")
    ds = load_dataset(DATASET_ID, split="train")
    train_ids, val_ids = make_split(ds)
    if not train_ids or not val_ids:
        raise RuntimeError("Could not create a train/validation split")
    weights, counts = class_weights(ds, train_ids)
    status("training", "Training 5-class EfficientNetB0 transfer-learning model.", trainSamples=len(train_ids), valSamples=len(val_ids), classCounts=dict(counts), epoch=0, totalEpochs=EPOCHS+FINE_TUNE_EPOCHS)

    train_ds = make_tf_dataset(ds, train_ids, augment=True, shuffle=True)
    val_ds = make_tf_dataset(ds, val_ids, augment=False, shuffle=False)
    model, base = build_model()
    model.compile(optimizer=keras.optimizers.Adam(1e-3), loss="sparse_categorical_crossentropy", metrics=["accuracy"])

    class StatusCallback(keras.callbacks.Callback):
        def on_epoch_end(self, epoch, logs=None):
            logs = logs or {}
            status("training", f"Training epoch {epoch+1}/{EPOCHS+FINE_TUNE_EPOCHS}", epoch=epoch+1, totalEpochs=EPOCHS+FINE_TUNE_EPOCHS, metrics={k: float(v) for k,v in logs.items()})

    callbacks = [
        StatusCallback(),
        keras.callbacks.EarlyStopping(monitor="val_loss", patience=3, restore_best_weights=True),
    ]
    history1 = model.fit(train_ds, validation_data=val_ds, epochs=EPOCHS, class_weight=weights, callbacks=callbacks, verbose=2)

    # Light fine-tuning of the last EfficientNet blocks.
    base.trainable = True
    for layer in base.layers[:-30]:
        layer.trainable = False
    model.compile(optimizer=keras.optimizers.Adam(1e-5), loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    history2 = model.fit(train_ds, validation_data=val_ds, epochs=EPOCHS+FINE_TUNE_EPOCHS, initial_epoch=EPOCHS, class_weight=weights, callbacks=callbacks, verbose=2)

    val_loss, val_acc = model.evaluate(val_ds, verbose=0)
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    model.save(MODEL_PATH)
    report = {
        "dataset": DATASET_ID,
        "labels": LABELS,
        "trainSamples": len(train_ids),
        "valSamples": len(val_ids),
        "validationAccuracy": float(val_acc),
        "validationLoss": float(val_loss),
        "classCounts": {str(k): int(v) for k,v in counts.items()},
        "researchOnly": True,
        "note": "Academic validation split only; not clinical validation.",
    }
    (APP_DIR / "models" / "training_report.json").write_text(json.dumps(report, indent=2))
    reloaded = try_reload_service()
    status("complete", "Public-dataset training complete. The local model was saved and the AI service reload was requested.", modelPath=str(MODEL_PATH), report=report, reloaded=reloaded)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        status("error", f"Training failed: {exc}")
        raise
