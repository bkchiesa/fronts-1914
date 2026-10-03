#!/usr/bin/env python3
"""1914-era national flag PNGs for Fronts, 1914 (filenames flag_<nation>.png)."""
from PIL import Image, ImageDraw
import math, os

OUT = "/workspace/ww1-fronts/art"
SIZE = 64
CX0, CY0, CX1, CY1 = 10, 10, 64, 42
CW, CH = CX1 - CX0, CY1 - CY0

def new():
    return Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

def pole(d):
    d.rectangle([6, 8, 10, 56], fill=(90, 70, 45))
    d.ellipse([5, 6, 11, 12], fill=(120, 95, 55))

def cloth_box():
    return CX0, CY0, CX1, CY1

def save(img, name):
    path = os.path.join(OUT, f"flag_{name}.png")
    img.save(path, "PNG")
    print("wrote", path)

def dist_to_line(px, py, x1, y1, x2, y2):
    A = px - x1; B = py - y1; C = x2 - x1; D = y2 - y1
    len_sq = C * C + D * D
    t = max(0, min(1, (A * C + B * D) / len_sq))
    return math.hypot(px - (x1 + t * C), py - (y1 + t * D))

def flag_britain():
    img = new(); d = ImageDraw.Draw(img); pole(d)
    w, h = CW, CH
    cloth = Image.new("RGBA", (w, h), (1, 33, 105, 255))
    px = cloth.load()
    white_w = max(2.0, h * 0.12)
    red_w = max(1.0, h * 0.05)
    for y in range(h):
        for x in range(w):
            d1 = dist_to_line(x + 0.5, y + 0.5, 0, 0, w - 1, h - 1)
            d2 = dist_to_line(x + 0.5, y + 0.5, 0, h - 1, w - 1, 0)
            if d1 < white_w or d2 < white_w:
                px[x, y] = (255, 255, 255, 255)
            if d1 < red_w or d2 < red_w:
                px[x, y] = (200, 16, 46, 255)
    cd = ImageDraw.Draw(cloth)
    mx, my = w // 2, h // 2
    hw, hr = max(2, int(h * 0.18)), max(1, int(h * 0.09))
    cd.rectangle([mx - hw, 0, mx + hw, h], fill=(255, 255, 255, 255))
    cd.rectangle([0, my - hw, w, my + hw], fill=(255, 255, 255, 255))
    cd.rectangle([mx - hr, 0, mx + hr, h], fill=(200, 16, 46, 255))
    cd.rectangle([0, my - hr, w, my + hr], fill=(200, 16, 46, 255))
    img.paste(cloth, (CX0, CY0), cloth)
    save(img, "britain")

def flag_france():
    img = new(); d = ImageDraw.Draw(img); pole(d)
    x0, y0, x1, y1 = cloth_box()
    third = CW // 3
    d.rectangle([x0, y0, x0 + third, y1], fill=(0, 35, 149))
    d.rectangle([x0 + third, y0, x0 + 2 * third, y1], fill=(255, 255, 255))
    d.rectangle([x0 + 2 * third, y0, x1, y1], fill=(237, 41, 57))
    d.rectangle([x0, y0, x1 - 1, y1 - 1], outline=(40, 40, 40))
    save(img, "france")

def flag_germany():
    """German Empire 1871-1918: black-white-red."""
    img = new(); d = ImageDraw.Draw(img); pole(d)
    x0, y0, x1, y1 = cloth_box()
    band = CH // 3
    d.rectangle([x0, y0, x1, y0 + band], fill=(0, 0, 0))
    d.rectangle([x0, y0 + band, x1, y0 + 2 * band], fill=(255, 255, 255))
    d.rectangle([x0, y0 + 2 * band, x1, y1], fill=(221, 0, 0))
    d.rectangle([x0, y0, x1 - 1, y1 - 1], outline=(40, 40, 40))
    save(img, "germany")

def flag_austria():
    """Habsburg black-gold."""
    img = new(); d = ImageDraw.Draw(img); pole(d)
    x0, y0, x1, y1 = cloth_box()
    mid = (y0 + y1) // 2
    d.rectangle([x0, y0, x1, mid], fill=(0, 0, 0))
    d.rectangle([x0, mid, x1, y1], fill=(255, 204, 0))
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    d.ellipse([cx - 8, cy - 3, cx - 2, cy + 2], fill=(255, 220, 80))
    d.ellipse([cx + 2, cy - 3, cx + 8, cy + 2], fill=(255, 220, 80))
    d.ellipse([cx - 6, cy - 5, cx + 6, cy + 5], outline=(120, 90, 0), width=1)
    d.rectangle([x0, y0, x1 - 1, y1 - 1], outline=(40, 40, 40))
    save(img, "austria")

def flag_russia():
    img = new(); d = ImageDraw.Draw(img); pole(d)
    x0, y0, x1, y1 = cloth_box()
    band = CH // 3
    d.rectangle([x0, y0, x1, y0 + band], fill=(255, 255, 255))
    d.rectangle([x0, y0 + band, x1, y0 + 2 * band], fill=(0, 57, 166))
    d.rectangle([x0, y0 + 2 * band, x1, y1], fill=(213, 43, 30))
    d.rectangle([x0, y0, x1 - 1, y1 - 1], outline=(40, 40, 40))
    save(img, "russia")

def flag_ottoman():
    img = new(); d = ImageDraw.Draw(img); pole(d)
    x0, y0, x1, y1 = cloth_box()
    d.rectangle([x0, y0, x1, y1], fill=(200, 16, 46))
    cx = x0 + CW * 0.40
    cy = (y0 + y1) / 2
    r = 9
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255))
    d.ellipse([cx - r + 4, cy - r + 1.5, cx + r + 3, cy + r - 1.5], fill=(200, 16, 46))
    sx, sy, sr = cx + 12, cy - 0.5, 4.2
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rr = sr if i % 2 == 0 else sr * 0.4
        pts.append((sx + rr * math.cos(ang), sy + rr * math.sin(ang)))
    d.polygon(pts, fill=(255, 255, 255))
    save(img, "ottoman")

def flag_italy():
    img = new(); d = ImageDraw.Draw(img); pole(d)
    x0, y0, x1, y1 = cloth_box()
    third = CW // 3
    d.rectangle([x0, y0, x0 + third, y1], fill=(0, 146, 70))
    d.rectangle([x0 + third, y0, x0 + 2 * third, y1], fill=(255, 255, 255))
    d.rectangle([x0 + 2 * third, y0, x1, y1], fill=(206, 43, 55))
    d.rectangle([x0, y0, x1 - 1, y1 - 1], outline=(40, 40, 40))
    save(img, "italy")

def flag_usa():
    """48-star US flag (1912-1959)."""
    img = new(); d = ImageDraw.Draw(img); pole(d)
    x0, y0, x1, y1 = cloth_box()
    stripe_h = CH / 13
    for i in range(13):
        y = y0 + int(i * stripe_h)
        y2 = y0 + int((i + 1) * stripe_h)
        color = (178, 34, 52) if i % 2 == 0 else (255, 255, 255)
        d.rectangle([x0, y, x1, y2], fill=color)
    canton_h = int(7 * stripe_h)
    canton_w = int(CW * 0.42)
    d.rectangle([x0, y0, x0 + canton_w, y0 + canton_h], fill=(0, 40, 104))
    for r in range(6):
        for c in range(8):
            sx = x0 + 3 + c * (canton_w - 4) / 8
            sy = y0 + 2 + r * (canton_h - 3) / 6
            d.ellipse([sx, sy, sx + 2, sy + 2], fill=(255, 255, 255))
    d.rectangle([x0, y0, x1 - 1, y1 - 1], outline=(40, 40, 40))
    save(img, "usa")

def flag_serbia():
    """Red-blue-white with simple Serbian cross shield."""
    img = new(); d = ImageDraw.Draw(img); pole(d)
    x0, y0, x1, y1 = cloth_box()
    band = CH // 3
    d.rectangle([x0, y0, x1, y0 + band], fill=(198, 54, 60))
    d.rectangle([x0, y0 + band, x1, y0 + 2 * band], fill=(12, 64, 118))
    d.rectangle([x0, y0 + 2 * band, x1, y1], fill=(255, 255, 255))
    cx = x0 + int(CW * 0.35)
    cy = (y0 + y1) // 2
    d.polygon([(cx - 5, cy - 7), (cx + 5, cy - 7), (cx + 5, cy + 2), (cx, cy + 7), (cx - 5, cy + 2)],
              fill=(198, 54, 60), outline=(255, 215, 0))
    d.rectangle([cx - 1, cy - 5, cx + 1, cy + 3], fill=(255, 255, 255))
    d.rectangle([cx - 4, cy - 2, cx + 4, cy], fill=(255, 255, 255))
    for dx, dy in [(-3, -4), (3, -4), (-3, 1), (3, 1)]:
        d.point((cx + dx, cy + dy), fill=(255, 255, 255))
    d.rectangle([x0, y0, x1 - 1, y1 - 1], outline=(40, 40, 40))
    save(img, "serbia")

def flag_belgium():
    img = new(); d = ImageDraw.Draw(img); pole(d)
    x0, y0, x1, y1 = cloth_box()
    third = CW // 3
    d.rectangle([x0, y0, x0 + third, y1], fill=(0, 0, 0))
    d.rectangle([x0 + third, y0, x0 + 2 * third, y1], fill=(253, 218, 36))
    d.rectangle([x0 + 2 * third, y0, x1, y1], fill=(239, 51, 64))
    d.rectangle([x0, y0, x1 - 1, y1 - 1], outline=(40, 40, 40))
    save(img, "belgium")

if __name__ == "__main__":
    flag_britain()
    flag_france()
    flag_germany()
    flag_austria()
    flag_russia()
    flag_ottoman()
    flag_italy()
    flag_usa()
    flag_serbia()
    flag_belgium()
    print("All flags regenerated.")
