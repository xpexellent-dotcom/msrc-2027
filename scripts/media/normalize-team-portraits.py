"""MSRC team portraits v3 (needs rembg, opencv-python-headless<5, pillow, and the YuNet model
face_detection_yunet_2023mar.onnx from github.com/opencv/opencv_zoo saved beside this script as yunet.onnx): pure white background, tight head-and-shoulders, same eye spacing.

Faces are normalised by the distance between the eyes (more reliable than the
detector's face box, which grows with headwear), placed at the same height, and
cropped tight enough that every photo fills the frame with no fade.

Usage: python normalize3.py <src_dir> <out_dir> [slug=eyeLx,eyeLy,eyeRx,eyeRy ...]
"""
import os, sys, json
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter
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
PRECROP = {"akram-awan": (142, 140, 604, 755)}
OUT_W, OUT_H = 800, 1000
EYE_GAP = float(os.environ.get("EYE_GAP", "0.21"))  # distance between eye centres / output width
EYE_Y = float(os.environ.get("EYE_Y", "0.42"))      # eye line / output height
MAX_EYE_Y = 0.47                                     # lowest the eye line may move to avoid a gap

src, out = Path(sys.argv[1]), Path(sys.argv[2])
manual = {}
for arg in sys.argv[3:]:
    slug, pts = arg.split("=")
    manual[slug] = tuple(float(v) for v in pts.split(","))
out.mkdir(parents=True, exist_ok=True)
session = new_session("isnet-general-use")
report = {}


yunet = cv2.FaceDetectorYN.create(str(Path(__file__).with_name("yunet.onnx")), "", (320, 320), 0.6, 0.3, 5000)


def find_eyes(rgb):
    # YuNet is most accurate near its training scale, so detect on a ~900 px copy.
    h0, w0 = rgb.shape[:2]
    k = min(1.0, 900 / max(h0, w0))
    small = cv2.resize(rgb, (int(w0 * k), int(h0 * k)), interpolation=cv2.INTER_AREA) if k < 1 else rgb
    bgr = np.ascontiguousarray(small[:, :, ::-1])
    h, w = bgr.shape[:2]
    yunet.setInputSize((w, h))
    _, faces = yunet.detect(bgr)
    if faces is None:
        return None
    f = max(faces, key=lambda r: r[2] * r[3]).copy()
    f[:14] /= k
    # YuNet landmarks: right eye, left eye (subject), nose, mouth corners.
    (ax, ay), (bx, by) = (f[4], f[5]), (f[6], f[7])
    l, r = sorted([(ax, ay), (bx, by)])
    return (l[0], l[1], r[0], r[1], float(f[2])), "yunet"


for slug, name in SOURCES.items():
    img = ImageOps.exif_transpose(Image.open(src / name)).convert("RGB")
    if slug in PRECROP:
        x0, y0, w0, h0 = PRECROP[slug]
        img = img.crop((x0, y0, x0 + w0, y0 + h0))
    W, H = img.size
    if slug in manual:
        lx, ly, rx, ry = manual[slug]; how = "manual"; face_w = None
    else:
        found = find_eyes(np.array(img))
        if not found:
            report[slug] = "NO FACE"; continue
        (lx, ly, rx, ry, face_w), how = found
    cut = remove(img, session=session)
    alpha = np.array(cut)[:, :, 3]
    body_rows = np.where((alpha > 128).sum(axis=1) >= 0.12 * W)[0]
    H = int(body_rows[-1]) if len(body_rows) else H
    gap = float(np.hypot(rx - lx, ry - ly))
    ex, ey = (lx + rx) / 2, (ly + ry) / 2
    scale = EYE_GAP * OUT_W / gap
    if face_w:
        # A turned head shortens the eye gap; average with the face width (about 2.25 eye gaps).
        scale = float(np.sqrt(scale * (EYE_GAP * 2.25 * OUT_W / face_w)))
    eye_y = EYE_Y
    # Keep the frame inside the photo: lower the eye line a little, then zoom in, if needed.
    def bottom(s, ey_frac):
        return ey + (1 - ey_frac) * OUT_H / s
    while bottom(scale, eye_y) > H and eye_y < MAX_EYE_Y:
        eye_y += 0.005
    while bottom(scale, eye_y) > H:
        scale *= 1.01
    crop_w, crop_h = OUT_W / scale, OUT_H / scale
    left, top = ex - crop_w / 2, ey - eye_y * crop_h
    frame = Image.new("RGBA", (int(round(crop_w)), int(round(crop_h))), (255, 255, 255, 0))
    frame.paste(cut, (int(round(-left)), int(round(-top))), cut)
    frame = frame.resize((OUT_W, OUT_H), Image.LANCZOS)
    white = Image.new("RGB", frame.size, (255, 255, 255))
    white.paste(frame, mask=frame.split()[3])
    white = white.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
    white.save(out / f"{slug}-v3.jpg", "JPEG", quality=86, optimize=True, progressive=True)
    report[slug] = {"how": how, "eye_gap_src": round(gap), "zoom_vs_target": round(scale / (EYE_GAP * OUT_W / gap), 2), "face_ratio": round(face_w / gap, 2) if face_w else None, "eye_y": round(eye_y, 3), "src_px_per_out_px": round(1 / scale, 2)}

json.dump(report, open(out / "report.json", "w"), indent=1)
for k, v in report.items():
    print(k, v)
