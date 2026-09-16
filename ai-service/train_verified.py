import json
import os
import time
import urllib.request
from collections import Counter
from pathlib import Path

os.environ.setdefault("KERAS_BACKEND", "tensorflow")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import numpy as np
import tensorflow as tf
import keras
from PIL import Image

APP_DIR = Path(__file__).resolve().parent
PROJECT_DIR = APP_DIR.parent
DB_PATH = PROJECT_DIR / "backend" / "data" / "xplainaeye.sqlite"
UPLOADS_DIR = PROJECT_DIR / "backend" / "uploads"
MODEL_PATH = Path(os.getenv("DR_MODEL_PATH", APP_DIR / "models" / "dr_model.keras"))
STATUS_PATH = Path(os.getenv("TRAINING_STATUS_FILE", APP_DIR / "training_status.json"))
IMG_SIZE = int(os.getenv("DR_IMAGE_SIZE", "224"))
BATCH_SIZE = int(os.getenv("DR_TRAIN_BATCH", "8"))
EPOCHS = int(os.getenv("DR_VERIFIED_EPOCHS", "4"))
LABELS = ["No DR", "Mild DR", "Moderate DR", "Severe DR", "Proliferative DR"]
LABEL_TO_INDEX = {x:i for i,x in enumerate(LABELS)}


def status(state, message, **extra):
    payload={"state":state,"message":message,"updatedAt":time.time(),**extra}
    STATUS_PATH.write_text(json.dumps(payload, indent=2)); print(f"[{state}] {message}", flush=True)


def load_rows():
    import sqlite3
    con=sqlite3.connect(DB_PATH)
    rows=con.execute("""
      SELECT stored_name, verified_label FROM screenings
      WHERE fundus_valid=1 AND training_consent=1
        AND verified_label IS NOT NULL AND verified_label<>''
    """).fetchall(); con.close()
    out=[]
    for name,label in rows:
        p=UPLOADS_DIR/name
        if p.exists() and label in LABEL_TO_INDEX:
            out.append((p,LABEL_TO_INDEX[label]))
    return out


def make_ds(rows, training):
    def gen():
        for path,y in rows:
            im=Image.open(path).convert("RGB").resize((IMG_SIZE,IMG_SIZE))
            yield np.asarray(im,dtype=np.float32),np.int32(y)
    sig=(tf.TensorSpec((IMG_SIZE,IMG_SIZE,3),tf.float32),tf.TensorSpec((),tf.int32))
    ds=tf.data.Dataset.from_generator(gen,output_signature=sig)
    if training: ds=ds.shuffle(max(32,len(rows)))
    return ds.batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)


def try_reload():
    try:
        req=urllib.request.Request("http://127.0.0.1:8000/reload",data=b"{}",headers={"Content-Type":"application/json"},method="POST")
        return urllib.request.urlopen(req,timeout=4).status==200
    except Exception:return False


def main():
    if not MODEL_PATH.exists():
        raise RuntimeError("Train the public APTOS model first; no local base model exists.")
    rows=load_rows(); counts=Counter(y for _,y in rows)
    # Fine-tuning a 5-class medical model on a tiny or partial set can make it worse.
    if len(rows)<50 or len(counts)<5 or min(counts.values())<5:
        raise RuntimeError("Verified fine-tuning requires at least 50 approved images, all 5 DR classes, and at least 5 images per class.")
    rng=np.random.default_rng(42); idx=np.arange(len(rows)); rng.shuffle(idx)
    cut=max(5,int(len(rows)*0.85)); train=[rows[i] for i in idx[:cut]]; val=[rows[i] for i in idx[cut:]]
    status("training","Fine-tuning on clinician-verified local images.",trainSamples=len(train),valSamples=len(val),classCounts=dict(counts),epoch=0,totalEpochs=EPOCHS)
    model=keras.saving.load_model(MODEL_PATH,compile=False)
    # Conservative low-LR fine-tune.
    for layer in model.layers:
        layer.trainable=True
    model.compile(optimizer=keras.optimizers.Adam(5e-6),loss="sparse_categorical_crossentropy",metrics=["accuracy"])
    class CB(keras.callbacks.Callback):
        def on_epoch_end(self,epoch,logs=None):status("training",f"Verified-data epoch {epoch+1}/{EPOCHS}",epoch=epoch+1,totalEpochs=EPOCHS,metrics={k:float(v) for k,v in (logs or {}).items()})
    model.fit(make_ds(train,True),validation_data=make_ds(val,False),epochs=EPOCHS,callbacks=[CB(),keras.callbacks.EarlyStopping(monitor="val_loss",patience=2,restore_best_weights=True)],verbose=2)
    loss,acc=model.evaluate(make_ds(val,False),verbose=0)
    model.save(MODEL_PATH)
    report={"source":"clinician-verified local data","samples":len(rows),"classCounts":{LABELS[k]:int(v) for k,v in counts.items()},"validationAccuracy":float(acc),"validationLoss":float(loss),"researchOnly":True}
    (APP_DIR/"models"/"verified_training_report.json").write_text(json.dumps(report,indent=2))
    status("complete","Verified-data fine-tuning complete.",report=report,reloaded=try_reload())

if __name__=="__main__":
    try:main()
    except Exception as exc:
        status("error",f"Training failed: {exc}");raise
