#!/usr/bin/env python3
"""Original illustrated pointy-top hex tiles for Fronts, 1914.

Flat board-game sprites, drawn here. Not photos, not noise, not copied
from another game. Hex orientation matches Hex.corners / pathHex:
vertex angles 60*i - 30 degrees (pointy top).

Image contract used by js/game.js:
  RADIUS = 128 center-to-vertex
  PAD = 14
  height = 2*RADIUS + 2*PAD
  width = round(RADIUS * sqrt(3) + 2*PAD)
  hex centered, corners outside the hex fully transparent
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(ROOT, "art")

RADIUS = 128
PAD = 14
SS = 4  # supersample
RIM = 18  # stroke width at 1x; half sits inside the hex after masking

INK = (44, 42, 38, 255)


def tile_size():
    w = int(round(RADIUS * math.sqrt(3) + 2 * PAD))
    h = 2 * RADIUS + 2 * PAD
    return w, h


def hex_points(cx, cy, r):
    pts = []
    for i in range(6):
        a = math.radians(60 * i - 30)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def new_canvas():
    w, h = tile_size()
    return Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))


def center_radius(im):
    return im.size[0] / 2, im.size[1] / 2, RADIUS * SS


def mask_hex(im, cx, cy, r):
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).polygon(hex_points(cx, cy, r), fill=255)
    arr = np.asarray(im).astype(np.float32)
    ma = np.asarray(m).astype(np.float32) / 255.0
    arr[..., 3] *= ma
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def downscale(im):
    w, h = tile_size()
    src = np.asarray(im).astype(np.float32)
    alpha = src[..., 3:4] / 255.0
    prem = np.dstack([src[..., :3] * alpha, src[..., 3]])
    small = Image.fromarray(np.clip(prem, 0, 255).astype(np.uint8), "RGBA").resize(
        (w, h), Image.Resampling.LANCZOS
    )
    s = np.asarray(small).astype(np.float32)
    a = s[..., 3:4]
    scale = np.where(a > 0.5, 255.0 / np.maximum(a, 0.5), 0.0)
    rgb = np.clip(s[..., :3] * scale, 0, 255)
    out = np.dstack([rgb, np.clip(s[..., 3], 0, 255)])
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def paint_rim(im, cx, cy, r):
    rim = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(rim)
    pts = hex_points(cx, cy, r - SS * 0.4)
    d.line(pts + [pts[0]], fill=INK, width=RIM * SS, joint="curve")
    im.alpha_composite(rim)
    return mask_hex(im, cx, cy, r)


def blob(im, box, color):
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse(box, fill=color)
    im.alpha_composite(layer)


def finish(im, cx, cy, r):
    im = mask_hex(im, cx, cy, r)
    im = paint_rim(im, cx, cy, r)
    return downscale(im)


def draw_plains(im, cx, cy, r):
    d = ImageDraw.Draw(im)
    d.polygon(hex_points(cx, cy, r), fill=(111, 175, 74, 255))
    blob(im, [cx - r * 0.95, cy - r * 1.15, cx + r * 0.35, cy + r * 0.15], (150, 206, 112, 90))
    blob(im, [cx - r * 0.15, cy + r * 0.05, cx + r * 1.05, cy + r * 1.15], (78, 148, 52, 80))
    d = ImageDraw.Draw(im)
    marks = [(-0.34, 0.18), (0.08, 0.28), (0.36, -0.02), (-0.08, -0.22)]
    for dx, dy in marks:
        x, y = cx + r * dx, cy + r * dy
        col = (47, 94, 40, 255)
        w = max(2, int(SS * 1.4))
        d.line([(x - r * 0.045, y - r * 0.11), (x, y), (x + r * 0.05, y - r * 0.10)], fill=col, width=w, joint="curve")


def draw_forest(im, cx, cy, r):
    d = ImageDraw.Draw(im)
    d.polygon(hex_points(cx, cy, r), fill=(46, 96, 52, 255))
    blob(im, [cx - r * 0.9, cy + r * 0.15, cx + r * 1.0, cy + r * 1.25], (32, 74, 40, 80))

    def tree(x, base, h):
        """One pine. base is the trunk bottom. Kept narrow so neighbors stay separate."""
        trunk_w = max(SS, h * 0.07)
        trunk = (112, 74, 44, 255)
        ImageDraw.Draw(im).polygon(
            [
                (x - trunk_w, base),
                (x + trunk_w, base),
                (x + trunk_w * 0.7, base - h * 0.22),
                (x - trunk_w * 0.7, base - h * 0.22),
            ],
            fill=trunk,
        )
        dark = (18, 52, 28, 255)
        mid = (32, 86, 42, 255)
        top = base - h * 0.16
        span = h * 0.42
        ImageDraw.Draw(im).polygon(
            [(x, top - h * 0.28), (x - span, top + h * 0.16), (x + span, top + h * 0.16)],
            fill=dark,
        )
        span2 = h * 0.30
        ImageDraw.Draw(im).polygon(
            [(x, top - h * 0.62), (x - span2, top - h * 0.16), (x + span2, top - h * 0.16)],
            fill=mid,
        )

    # back tree first, then two shorter ones in front, with a gap between canopies
    tree(cx + r * 0.02, cy + r * 0.02, r * 0.70)
    tree(cx - r * 0.38, cy + r * 0.40, r * 0.50)
    tree(cx + r * 0.38, cy + r * 0.42, r * 0.46)


def draw_mountain(im, cx, cy, r):
    d = ImageDraw.Draw(im)
    d.polygon(hex_points(cx, cy, r), fill=(138, 142, 148, 255))
    blob(im, [cx - r * 1.1, cy + r * 0.05, cx + r * 1.1, cy + r * 1.3], (96, 100, 106, 110))
    # side ridge, lower, no snow so the main peak stays the landmark
    d = ImageDraw.Draw(im)
    d.polygon(
        [
            (cx + r * 0.08, cy + r * 0.08),
            (cx + r * 0.58, cy - r * 0.18),
            (cx + r * 0.62, cy + r * 0.48),
            (cx - r * 0.05, cy + r * 0.48),
        ],
        fill=(112, 116, 122, 255),
    )
    # main peak: left face, right face, snow cap
    apex = (cx - r * 0.06, cy - r * 0.62)
    left = (cx - r * 0.58, cy + r * 0.46)
    right = (cx + r * 0.42, cy + r * 0.46)
    d.polygon([apex, left, (cx - r * 0.02, cy + r * 0.46)], fill=(168, 172, 176, 255))
    d.polygon([apex, (cx - r * 0.02, cy + r * 0.46), right], fill=(104, 108, 114, 255))
    snow_l = (cx - r * 0.28, cy - r * 0.16)
    snow_r = (cx + r * 0.12, cy - r * 0.16)
    d.polygon([apex, snow_l, snow_r], fill=(244, 246, 248, 255))
    d.line([apex, (cx - r * 0.02, cy + r * 0.20)], fill=(210, 214, 218, 255), width=SS * 2)


def draw_hills(im, cx, cy, r):
    d = ImageDraw.Draw(im)
    d.polygon(hex_points(cx, cy, r), fill=(196, 176, 112, 255))
    blob(im, [cx - r * 1.05, cy - r * 1.15, cx + r * 0.5, cy + r * 0.05], (222, 206, 150, 90))

    def mound(mx, my, rx, ry, color):
        # top half of an ellipse: a low hump, not a peak
        ImageDraw.Draw(im).pieslice([mx - rx, my - ry, mx + rx, my + ry], 180, 360, fill=color)

    mound(cx - r * 0.22, cy + r * 0.28, r * 0.62, r * 0.40, (168, 154, 96, 255))
    mound(cx + r * 0.28, cy + r * 0.40, r * 0.50, r * 0.32, (124, 132, 72, 255))
    mound(cx - r * 0.02, cy + r * 0.08, r * 0.40, r * 0.26, (214, 196, 136, 255))
    # crease so the two rolls stay separate at small size
    d = ImageDraw.Draw(im)
    d.arc(
        [cx - r * 0.08, cy + r * 0.02, cx + r * 0.55, cy + r * 0.55],
        200, 330, fill=(110, 92, 58, 255), width=max(2, SS * 2)
    )


def draw_water(im, cx, cy, r):
    d = ImageDraw.Draw(im)
    d.polygon(hex_points(cx, cy, r), fill=(62, 134, 198, 255))
    blob(im, [cx - r * 1.2, cy - r * 1.35, cx + r * 1.2, cy - r * 0.05], (110, 176, 224, 80))
    blob(im, [cx - r * 1.1, cy + r * 0.25, cx + r * 1.1, cy + r * 1.3], (36, 104, 168, 90))
    d = ImageDraw.Draw(im)
    col = (232, 244, 252, 255)
    w = max(3, SS * 3)

    def wave(y, reach, amp):
        pts = []
        steps = 10
        for i in range(steps + 1):
            t = i / steps
            x = cx - reach + (2 * reach) * t
            yy = y + math.sin(t * math.pi * 2) * amp
            pts.append((x, yy))
        d.line(pts, fill=col, width=w, joint="curve")

    wave(cy - r * 0.14, r * 0.52, r * 0.055)
    wave(cy + r * 0.20, r * 0.42, r * 0.048)


def draw_trench(im, cx, cy, r):
    d = ImageDraw.Draw(im)
    d.polygon(hex_points(cx, cy, r), fill=(198, 164, 108, 255))
    blob(im, [cx - r * 1.1, cy + r * 0.1, cx + r * 1.1, cy + r * 1.25], (156, 118, 68, 100))
    blob(im, [cx - r * 0.9, cy - r * 1.1, cx + r * 0.3, cy - r * 0.1], (220, 196, 146, 80))
    # zigzag trench with a pale lip above the cut
    pts = []
    n = 4
    x0, x1 = cx - r * 0.58, cx + r * 0.58
    y = cy + r * 0.02
    amp = r * 0.16
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        yy = y - amp if i % 2 == 0 else y + amp
        pts.append((x, yy))
    lip = [(p[0], p[1] - r * 0.07) for p in pts]
    d = ImageDraw.Draw(im)
    d.line(lip, fill=(230, 208, 164, 255), width=SS * 5, joint="miter")
    d.line(pts, fill=(48, 38, 28, 255), width=SS * 8, joint="miter")


def draw_desert(im, cx, cy, r):
    d = ImageDraw.Draw(im)
    d.polygon(hex_points(cx, cy, r), fill=(232, 201, 122, 255))
    blob(im, [cx - r * 1.0, cy - r * 1.2, cx + r * 0.2, cy + r * 0.1], (244, 224, 164, 110))
    blob(im, [cx - r * 0.2, cy + r * 0.15, cx + r * 1.15, cy + r * 1.2], (214, 170, 90, 90))
    # one dune: a crescent ridge
    dune = Image.new("RGBA", im.size, (0, 0, 0, 0))
    dd = ImageDraw.Draw(dune)
    box = [cx - r * 0.55, cy - r * 0.08, cx + r * 0.55, cy + r * 0.62]
    dd.pieslice(box, 200, 340, fill=(186, 140, 64, 255))
    inner = [cx - r * 0.40, cy + r * 0.06, cx + r * 0.40, cy + r * 0.58]
    dd.pieslice(inner, 200, 340, fill=(232, 201, 122, 255))
    dd.arc(box, 200, 340, fill=(244, 226, 170, 255), width=SS * 3)
    im.alpha_composite(dune)


def draw_swamp(im, cx, cy, r):
    d = ImageDraw.Draw(im)
    d.polygon(hex_points(cx, cy, r), fill=(104, 112, 58, 255))
    # flat pool, wider than it is tall, so it does not read as a ring
    d.ellipse([cx - r * 0.42, cy + r * 0.18, cx + r * 0.38, cy + r * 0.48], fill=(58, 72, 44, 255))
    d.ellipse([cx - r * 0.22, cy + r * 0.26, cx + r * 0.10, cy + r * 0.36], fill=(150, 160, 96, 180))
    col = (26, 40, 20, 255)
    w = max(3, SS * 3)

    def reed(x, y, h):
        d.line([(x, y), (x, y - h)], fill=col, width=w)
        d.line([(x, y - h), (x + r * 0.09, y - h - r * 0.05)], fill=col, width=w)
        d.line([(x + r * 0.07, y), (x + r * 0.07, y - h * 0.72)], fill=col, width=max(2, SS * 2))

    reed(cx - r * 0.30, cy + r * 0.16, r * 0.55)
    reed(cx - r * 0.08, cy + r * 0.08, r * 0.62)
    reed(cx + r * 0.24, cy + r * 0.14, r * 0.48)


DRAW = {
    "plains": draw_plains,
    "forest": draw_forest,
    "mountain": draw_mountain,
    "hills": draw_hills,
    "water": draw_water,
    "trench": draw_trench,
    "desert": draw_desert,
    "swamp": draw_swamp,
}


def build_terrain(name):
    im = new_canvas()
    cx, cy, r = center_radius(im)
    DRAW[name](im, cx, cy, r)
    return finish(im, cx, cy, r)


def build_overlay(fill, edge):
    im = new_canvas()
    cx, cy, r = center_radius(im)
    d = ImageDraw.Draw(im)
    d.polygon(hex_points(cx, cy, r), fill=fill)
    im = mask_hex(im, cx, cy, r)
    rim = Image.new("RGBA", im.size, (0, 0, 0, 0))
    rd = ImageDraw.Draw(rim)
    pts = hex_points(cx, cy, r - SS * 0.4)
    rd.line(pts + [pts[0]], fill=edge, width=RIM * SS, joint="curve")
    im.alpha_composite(rim)
    im = mask_hex(im, cx, cy, r)
    return downscale(im)


def icon_canvas(n=256):
    return Image.new("RGBA", (n, n), (0, 0, 0, 0))


def stroke_poly(d, pts, fill, width):
    d.line(pts + [pts[0]], fill=fill, width=width, joint="curve")


def draw_city():
    n = 256
    im = icon_canvas(n)
    d = ImageDraw.Draw(im)
    ink = (44, 42, 38, 255)
    wall = (244, 232, 206, 255)
    roof = (122, 62, 42, 255)
    roof_d = (92, 44, 30, 255)
    door = (74, 48, 32, 255)
    win = (186, 210, 216, 255)
    # ground shadow
    d.ellipse([58, 176, 198, 214], fill=(44, 42, 38, 50))
    # walls
    d.rectangle([78, 118, 178, 188], fill=wall)
    stroke_poly(d, [(78, 118), (178, 118), (178, 188), (78, 188)], ink, 5)
    # roof
    roof_pts = [(64, 122), (128, 58), (192, 122)]
    d.polygon(roof_pts, fill=roof)
    stroke_poly(d, roof_pts, ink, 5)
    d.polygon([(128, 58), (192, 122), (168, 122), (128, 78)], fill=roof_d)
    # door
    d.rectangle([114, 146, 142, 188], fill=door)
    stroke_poly(d, [(114, 146), (142, 146), (142, 188), (114, 188)], ink, 4)
    # window
    d.rectangle([92, 136, 110, 154], fill=win)
    stroke_poly(d, [(92, 136), (110, 136), (110, 154), (92, 154)], ink, 3)
    d.line([(101, 136), (101, 154)], fill=ink, width=2)
    d.line([(92, 145), (110, 145)], fill=ink, width=2)
    # chimney
    d.rectangle([150, 74, 166, 100], fill=wall)
    stroke_poly(d, [(150, 74), (166, 74), (166, 100), (150, 100)], ink, 4)
    return im


def star_pts(cx, cy, r_out, r_in):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r_out if i % 2 == 0 else r_in
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts


def draw_capital():
    n = 256
    im = icon_canvas(n)
    d = ImageDraw.Draw(im)
    ink = (44, 42, 38, 255)
    wall = (236, 226, 204, 255)
    wall_d = (210, 196, 168, 255)
    roof = (90, 56, 48, 255)
    dome = (198, 164, 96, 255)
    dome_d = (154, 120, 62, 255)
    star = (242, 208, 96, 255)
    d.ellipse([36, 188, 220, 230], fill=(44, 42, 38, 45))
    # wings
    d.rectangle([40, 132, 78, 196], fill=wall_d)
    d.rectangle([178, 132, 216, 196], fill=wall_d)
    stroke_poly(d, [(40, 132), (78, 132), (78, 196), (40, 196)], ink, 4)
    stroke_poly(d, [(178, 132), (216, 132), (216, 196), (178, 196)], ink, 4)
    d.polygon([(34, 136), (59, 108), (84, 136)], fill=roof)
    stroke_poly(d, [(34, 136), (59, 108), (84, 136)], ink, 4)
    d.polygon([(172, 136), (197, 108), (222, 136)], fill=roof)
    stroke_poly(d, [(172, 136), (197, 108), (222, 136)], ink, 4)
    # main block
    d.rectangle([70, 108, 186, 200], fill=wall)
    stroke_poly(d, [(70, 108), (186, 108), (186, 200), (70, 200)], ink, 5)
    # columns
    for x in (84, 116, 148):
        d.rectangle([x, 128, x + 14, 198], fill=(250, 244, 230, 255))
        stroke_poly(d, [(x, 128), (x + 14, 128), (x + 14, 198), (x, 198)], ink, 3)
    # pediment
    d.polygon([(64, 112), (128, 74), (192, 112)], fill=roof)
    stroke_poly(d, [(64, 112), (128, 74), (192, 112)], ink, 5)
    # dome
    d.chord([104, 40, 152, 92], 180, 360, fill=dome)
    d.arc([104, 40, 152, 92], 180, 360, fill=ink, width=4)
    d.pieslice([112, 48, 144, 84], 200, 340, fill=dome_d)
    d.rectangle([124, 28, 132, 46], fill=dome)
    stroke_poly(d, [(124, 28), (132, 28), (132, 46), (124, 46)], ink, 3)
    # star above the dome
    pts = star_pts(128, 20, 16, 7)
    d.polygon(pts, fill=star)
    stroke_poly(d, pts, ink, 3)
    # door
    d.rectangle([116, 160, 140, 200], fill=(74, 48, 32, 255))
    stroke_poly(d, [(116, 160), (140, 160), (140, 200), (116, 200)], ink, 3)
    return im


def save(im, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "PNG")
    print("wrote", os.path.relpath(path, ROOT), im.size, im.mode)


def main():
    terrain_dir = os.path.join(ART, "terrain")
    for name in DRAW:
        save(build_terrain(name), os.path.join(terrain_dir, name + ".png"))
    # soft, obvious hints. Select stays a quiet brass wash.
    save(
        build_overlay((186, 232, 112, 185), (28, 118, 42, 245)),
        os.path.join(ART, "overlay_move.png"),
    )
    save(
        build_overlay((230, 62, 52, 205), (122, 22, 20, 250)),
        os.path.join(ART, "overlay_attack.png"),
    )
    save(
        build_overlay((210, 184, 96, 80), (150, 118, 48, 220)),
        os.path.join(ART, "overlay_select.png"),
    )
    sett = os.path.join(ART, "settlements")
    save(draw_city(), os.path.join(sett, "city.png"))
    save(draw_capital(), os.path.join(sett, "capital.png"))
    w, h = tile_size()
    print("tile", w, h, "radius_frac", RADIUS / h)


if __name__ == "__main__":
    main()
