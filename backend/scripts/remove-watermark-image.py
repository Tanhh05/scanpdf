#!/usr/bin/env python3
import sys
import subprocess

import cv2
import numpy as np


def group_rows(rows):
    groups = []
    for row in rows:
        row = int(row)
        if not groups or row > groups[-1][1] + 2:
            groups.append([row, row])
        else:
            groups[-1][1] = row
    return groups


def build_smart_text_mask(image):
    height, width = image.shape[:2]
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Bright, low-saturation overlays are the most common watermark/caption style.
    # We score rows from thin bright edges first, then mask only the text strokes in
    # those rows. This avoids the old broad horizontal delogo band that smeared photos.
    bright_text = cv2.inRange(hsv, np.array([0, 0, 178]), np.array([180, 95, 255]))
    edges = cv2.Canny(gray, 40, 120)
    edge_text = cv2.bitwise_and(
        bright_text,
        cv2.dilate(edges, np.ones((2, 2), np.uint8), iterations=1),
    )

    row_counts = np.sum(edge_text > 0, axis=1).astype(np.float32)
    smoothed = np.convolve(row_counts, np.ones(9, dtype=np.float32) / 9, mode="same")
    threshold = max(width * 0.18, float(np.percentile(smoothed, 97)))
    candidate_rows = np.where(smoothed > threshold)[0]

    mask = np.zeros((height, width), dtype=np.uint8)
    for top, bottom in group_rows(candidate_rows):
        band_height = bottom - top + 1
        if band_height > max(72, int(height * 0.08)):
            continue

        y1 = max(0, top - 9)
        y2 = min(height, bottom + 10)
        band_edges = edge_text[y1:y2]
        band_bright = bright_text[y1:y2]

        # Keep bright pixels close to detected bright edges. On patterned clothing this
        # is imperfect, but it removes watermark strokes without painting a whole strip.
        stroke_neighborhood = cv2.dilate(
            band_edges,
            np.ones((5, 3), np.uint8),
            iterations=1,
        )
        stroke_mask = cv2.bitwise_and(band_bright, stroke_neighborhood)
        stroke_mask = cv2.morphologyEx(
            stroke_mask,
            cv2.MORPH_CLOSE,
            np.ones((3, 3), np.uint8),
            iterations=1,
        )
        mask[y1:y2] = cv2.bitwise_or(mask[y1:y2], stroke_mask)

    if cv2.countNonZero(mask) == 0:
        return mask

    return cv2.dilate(mask, np.ones((2, 2), np.uint8), iterations=1)


def build_ocr_text_mask(image, input_path):
    height, width = image.shape[:2]
    mask = np.zeros((height, width), dtype=np.uint8)
    try:
        result = subprocess.run(
            ["tesseract", input_path, "stdout", "--psm", "11", "tsv"],
            check=False,
            capture_output=True,
            text=True,
            timeout=45,
        )
    except Exception:
        return mask

    if result.returncode != 0 or not result.stdout.strip():
        return mask

    lines = result.stdout.splitlines()
    if not lines:
        return mask
    header = lines[0].split("\t")
    columns = {name: index for index, name in enumerate(header)}
    required = ["left", "top", "width", "height", "conf", "text"]
    if any(name not in columns for name in required):
        return mask

    image_area = width * height
    candidates = []
    for line in lines[1:]:
        parts = line.split("\t")
        if len(parts) < len(header):
            continue
        text = parts[columns["text"]].strip()
        if len(text) < 2:
            continue
        try:
            conf = float(parts[columns["conf"]])
            x = int(parts[columns["left"]])
            y = int(parts[columns["top"]])
            w = int(parts[columns["width"]])
            h = int(parts[columns["height"]])
        except ValueError:
            continue
        if conf < 5 or w <= 0 or h <= 0:
            continue
        area = w * h
        if area < max(20, image_area * 0.00002) or area > image_area * 0.08:
            continue

        roi = image[max(0, y):min(height, y + h), max(0, x):min(width, x + w)]
        if roi.size == 0:
            continue
        hsv_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        bright_ratio = float(np.mean((hsv_roi[:, :, 2] > 150) & (hsv_roi[:, :, 1] < 130)))
        if bright_ratio < 0.12:
            continue

        candidates.append((x, y, w, h))

    if not candidates:
        return mask

    # Keep only repeated text-like boxes that share a horizontal baseline. This avoids
    # treating bright clothing patterns, lamps, and flowers as watermark text.
    bands = []
    for box in sorted(candidates, key=lambda item: item[1] + item[3] / 2):
      x, y, w, h = box
      center_y = y + h / 2
      placed = False
      for band in bands:
        if abs(center_y - band["center"]) <= max(10, h * 0.9):
          band["boxes"].append(box)
          centers = [item[1] + item[3] / 2 for item in band["boxes"]]
          band["center"] = sum(centers) / len(centers)
          placed = True
          break
      if not placed:
        bands.append({"center": center_y, "boxes": [box]})

    for band in bands:
        boxes = band["boxes"]
        if len(boxes) < 3:
            continue
        left = min(x for x, _y, _w, _h in boxes)
        right = max(x + w for x, _y, w, _h in boxes)
        top = min(y for _x, y, _w, _h in boxes)
        bottom = max(y + h for _x, y, _w, h in boxes)
        spread = right - left
        median_height = float(np.median([h for _x, _y, _w, h in boxes]))
        if spread < width * 0.22:
            continue
        if bottom - top > max(72, median_height * 4):
            continue
        for x, y, w, h in boxes:
            pad_x = max(4, int(w * 0.18))
            pad_y = max(3, int(h * 0.45))
            cv2.rectangle(
                mask,
                (max(0, x - pad_x), max(0, y - pad_y)),
                (min(width - 1, x + w + pad_x), min(height - 1, y + h + pad_y)),
                255,
                -1,
            )

    return cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=1)


def build_text_mask(image):
    height, width = image.shape[:2]
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Watermarks are commonly bright, low-saturation text or semi-transparent logos.
    bright = cv2.inRange(hsv, np.array([0, 0, 165]), np.array([180, 95, 255]))
    edges = cv2.Canny(gray, 50, 150)
    mask = cv2.bitwise_and(bright, cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1))

    # Connect strokes into word-sized components without turning a whole row into one block.
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 3), np.uint8), iterations=1)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    component_mask = np.zeros((height, width), dtype=np.uint8)
    image_area = width * height
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h
        if area < max(18, image_area * 0.000015):
            continue
        if area > image_area * 0.008:
            continue
        if h < max(5, height * 0.006) or h > height * 0.14:
            continue
        if w < max(5, width * 0.006) or w > width * 0.22:
            continue
        aspect = w / max(1, h)
        if aspect > 24:
            continue
        pad_x = max(3, int(w * 0.10))
        pad_y = max(2, int(h * 0.28))
        cv2.rectangle(
            component_mask,
            (max(0, x - pad_x), max(0, y - pad_y)),
            (min(width - 1, x + w + pad_x), min(height - 1, y + h + pad_y)),
            255,
            -1,
        )

    # Slight expansion lets inpaint cover anti-aliased edges without smearing large areas.
    component_mask = cv2.dilate(component_mask, np.ones((3, 3), np.uint8), iterations=1)
    return component_mask


def main():
    if len(sys.argv) != 3:
        print("Usage: remove-watermark-image.py <input> <output>", file=sys.stderr)
        return 2

    input_path, output_path = sys.argv[1], sys.argv[2]
    image = cv2.imread(input_path, cv2.IMREAD_COLOR)
    if image is None:
        print("Cannot read input image", file=sys.stderr)
        return 1

    mask = build_smart_text_mask(image)
    if cv2.countNonZero(mask) == 0:
        mask = build_ocr_text_mask(image, input_path)
    if cv2.countNonZero(mask) == 0:
        image.tofile(output_path)
        return 0

    result = cv2.inpaint(image, mask, 2, cv2.INPAINT_TELEA)
    ok, encoded = cv2.imencode(".png", result)
    if not ok:
        print("Cannot encode output image", file=sys.stderr)
        return 1
    encoded.tofile(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
