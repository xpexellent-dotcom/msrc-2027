"""Normalize MSRC team portraits: white background, same face size and position.

Usage: python normalize.py <src_dir> <out_dir> [slug=x,y,w,h ...]
Face boxes come from OpenCV's Haar detector unless an override is given.
"""
import os, sys, json
from pathlib import Path
from PIL import Image, ImageOps
import numpy as np
import cv2
from rembg import remove, new_session

SOURCES = {
    "abdulrahman-ismail": "abdulrahman.jpg", "aishah-baothman": "aishah.jpg", "akram-awan": "akram.jpg",
    "amal-sayqal": "amal.jpg", "areen-youssef": "areen.jpg", "esraa-metwalli": "esraa.jpg",
    "hanadi-orayf": "hanadi.jpg", "heba-mousa": "heba.jpg", "lara-qawas": "lara.jpg",
    "majed-aljabri": "majed.jpg", "mohammad-alsayegh": "mohammad.jpg", "mohammed-almohmadi": "mohammed.jpg",
    "noor-alquait": "noor.jpg", "ola-altaib": "ola.jpg", "omar-alsaggaf": "omar.jpg",
    "reem-albeladi": "reem.jpg", "sara-qadi": "sara.jpg", "sulaf-alghamdi": "sulaf.jpg",
}
# Pre-crops for sources that carry screenshot margins (x, y, w, h in source pixels).
PRECROP = {"akram-awan": (142, 140, 604, 755)}
OUT_W, OUT_H = 640, 800
FACE_W = float(os.environ.get("FACE_W", "0.46"))    # face width as a share of output width
FACE_CY = float(os.environ.get("FACE_CY", "0.41"))  # face centre as a share of output height

src, out = Path(sys.argv[1]), Path(sys.argv[2])
overrides = {}
for arg in sys.argv[3:]:
    slug, box = arg.split("=")
    overrides[slug] = tuple(int(v) for v in box.split(","))
out.mkdir(parents=True, exist_ok=True)
session = new_session("isnet-general-use")
cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
report = {}


def continue_body(cut, needed_bottom):
    """Extend the torso straight down from where the body ends, smoothed so it reads as clothing."""
    arr = np.array(cut).astype(np.float32)
    H, W = arr.shape[:2]
    coverage = (arr[:, :, 3] > 128).sum(axis=1)
    rows = np.where(coverage >= 0.12 * W)[0]
    if len(rows) == 0:
        return cut, 0
    body_bottom = int(rows[-1]) - 2
    extra = max(0, needed_bottom - body_bottom)
    if extra <= 2:
        return cut, 0
    band = arr[max(0, body_bottom - 12):body_bottom]
    a = band[:, :, 3] / 255.0
    # Silhouette: solid between the outermost opaque pixels, so gaps in the cut-out do not become stripes.
    opaque = np.where(a.max(axis=0) > 0.5)[0]
    alpha = np.zeros(W, np.float32)
    if len(opaque):
        alpha[opaque[0]:opaque[-1] + 1] = 1.0
    alpha = cv2.GaussianBlur(alpha.reshape(1, W), (15, 1), 0).reshape(W) * 255
    # Colour by normalised convolution: average only real clothing pixels, then blur across gaps.
    k = max(5, int(W * 0.08) | 1)
    num = cv2.GaussianBlur((band[:, :, :3] * a[:, :, None]).sum(axis=0).reshape(1, W, 3), (k, 1), 0).reshape(W, 3)
    den = cv2.GaussianBlur(a.sum(axis=0).reshape(1, W), (k, 1), 0).reshape(W)
    colour = num / np.maximum(den[:, None], 1e-3)
    row = np.concatenate([colour, alpha[:, None]], axis=1)
    fill = np.repeat(row[None, :, :], extra, axis=0)
    out_arr = np.zeros((max(H, body_bottom + extra), W, 4), np.float32)
    out_arr[:body_bottom] = arr[:body_bottom]
    out_arr[body_bottom:body_bottom + extra] = fill
    return Image.fromarray(np.clip(out_arr, 0, 255).astype(np.uint8), "RGBA"), extra


for slug, name in SOURCES.items():
    img = ImageOps.exif_transpose(Image.open(src / name)).convert("RGB")
    if slug in PRECROP:
        x0, y0, w0, h0 = PRECROP[slug]
        img = img.crop((x0, y0, x0 + w0, y0 + h0))
    W, H = img.size
    if slug in overrides:
        x, y, w, h = overrides[slug]
    else:
        gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
        faces = cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=6, minSize=(max(40, W // 12), max(40, W // 12)))
        if len(faces) == 0:
            report[slug] = "NO FACE"
            continue
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    cut = remove(img, session=session)
    scale = FACE_W * OUT_W / w
    cx, cy = x + w / 2, y + h / 2
    crop_w, crop_h = OUT_W / scale, OUT_H / scale
    left, top = cx - crop_w / 2, cy - FACE_CY * crop_h
    extended = 0
    # Place the cut-out (with transparency) in the frame, then fade the bottom of the body to white.
    frame = Image.new("RGBA", (int(round(crop_w)), int(round(crop_h))), (255, 255, 255, 0))
    frame.paste(cut, (int(round(-left)), int(round(-top))), cut)
    frame = frame.resize((OUT_W, OUT_H), Image.LANCZOS)
    arr = np.array(frame).astype(np.float32)
    coverage = (arr[:, :, 3] > 128).sum(axis=1)
    rows = np.where(coverage >= 0.10 * OUT_W)[0]
    body_end = int(rows[-1]) if len(rows) else OUT_H
    fade_len = 110
    start = max(0, body_end - fade_len)
    ramp = np.ones(OUT_H, np.float32)
    ramp[start:body_end + 1] = np.linspace(1, 0, body_end + 1 - start) ** 1.4
    ramp[body_end + 1:] = 0
    arr[:, :, 3] *= ramp[:, None]
    a = arr[:, :, 3:4] / 255.0
    rgb = arr[:, :, :3] * a + 255 * (1 - a)
    final = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
    final.save(out / f"{slug}-v2.jpg", "JPEG", quality=82, optimize=True, progressive=True)
    report[slug] = {"face": [int(x), int(y), int(w), int(h)], "extended_out_px": int(extended * scale)}

json.dump(report, open(out / "report.json", "w"))
print(json.dumps({k: (v if isinstance(v, str) else v["extended_out_px"]) for k, v in report.items()}))
