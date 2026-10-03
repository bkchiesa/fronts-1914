#!/usr/bin/env python3
"""Painted pointy-top hex tiles for Fronts, 1914.

Miniature relief map, not a photo and not a flat icon. Soft light from the
upper left, low-frequency color, clear silhouettes. Hex orientation matches
Hex.corners / pathHex: vertex angles 60*i - 30 degrees (pointy top).

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
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter, map_coordinates

ROOT = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(ROOT, "art")

RADIUS = 128
PAD = 14
SS = 4
RIM = 15

INK = (32, 28, 24, 255)


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
    pts = hex_points(cx, cy, r - SS * 0.35)
    d.line(pts + [pts[0]], fill=INK, width=RIM * SS, joint="curve")
    im.alpha_composite(rim)
    return mask_hex(im, cx, cy, r)


def finish(im, cx, cy, r):
    im = mask_hex(im, cx, cy, r)
    im = paint_rim(im, cx, cy, r)
    return downscale(im)


def grids(im, cx, cy, r):
    h, w = im.size[1], im.size[0]
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    X = (xs - cx) / r
    Y = (ys - cy) / r
    return X, Y


def hex_metric(X, Y):
    ax = np.abs(X)
    ay = np.abs(Y)
    m_flat = ax / (math.sqrt(3) / 2)
    m_point = ay + ax / math.sqrt(3)
    return np.maximum(m_flat, m_point)


def put_rgb(im, rgb):
    a = np.array(im)
    a[..., 0] = np.clip(rgb[..., 0] * 255.0, 0, 255)
    a[..., 1] = np.clip(rgb[..., 1] * 255.0, 0, 255)
    a[..., 2] = np.clip(rgb[..., 2] * 255.0, 0, 255)
    a[..., 3] = 255
    im.paste(Image.fromarray(a.astype(np.uint8), "RGBA"))


def smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0 + 1e-8), 0, 1)
    return t * t * (3 - 2 * t)


def value_noise(shape, period, seed):
    h, w = shape
    rng = np.random.default_rng(seed)
    period = max(2.0, float(period))
    gh = int(math.ceil(h / period)) + 6
    gw = int(math.ceil(w / period)) + 6
    grid = rng.random((gh, gw)).astype(np.float32)
    yy = 2 + np.arange(h, dtype=np.float32) / period
    xx = 2 + np.arange(w, dtype=np.float32) / period
    Y, X = np.meshgrid(yy, xx, indexing="ij")
    # smooth the lattice before sampling so octaves stay soft
    grid = gaussian_filter(grid, 0.65)
    return map_coordinates(grid, [Y, X], order=1, mode="reflect").astype(np.float32)


def fbm(shape, period, octaves, seed, persistence=0.5, lacunarity=2.0):
    acc = np.zeros(shape, np.float32)
    amp = 1.0
    total = 0.0
    p = float(period)
    for i in range(octaves):
        acc += amp * value_noise(shape, max(2.0, p), seed + i * 29)
        total += amp
        amp *= persistence
        p /= lacunarity
    return acc / total


def shade(height, albedo, radius_px, relief=1.15, ambient=0.46, diffuse=0.70):
    height = np.nan_to_num(height.astype(np.float32), nan=0.0)
    albedo = np.nan_to_num(albedo.astype(np.float32), nan=0.0)
    gy, gx = np.gradient(height)
    gx = gx * radius_px * relief
    gy = gy * radius_px * relief
    nz = np.ones_like(gx)
    norm = np.sqrt(gx * gx + gy * gy + nz * nz) + 1e-6
    nx, ny, nz = -gx / norm, -gy / norm, nz / norm
    lx, ly, lz = -0.42, -0.62, 0.66
    L = math.sqrt(lx * lx + ly * ly + lz * lz)
    lx, ly, lz = lx / L, ly / L, lz / L
    ndotl = np.clip(nx * lx + ny * ly + nz * lz, 0, 1)
    wrap = ndotl * 0.82 + 0.18
    lit = ambient + diffuse * wrap
    return np.nan_to_num(albedo * lit[..., None], nan=0.0)


def apply_ao(rgb, height, radius_px, strength=0.55, sigma_frac=0.055):
    blur = gaussian_filter(height, radius_px * sigma_frac)
    delta = height - blur
    ao = np.clip(1.0 + delta * strength * 6.0, 0.58, 1.14)
    return rgb * ao[..., None]


def vignette(rgb, X, Y, amount=0.20):
    hd = hex_metric(X, Y)
    edge = smoothstep(0.72, 1.05, hd)
    return rgb * (1.0 - amount * edge)[..., None]


def lerp(a, b, t):
    t = t[..., None] if t.ndim == 2 else t
    return a * (1 - t) + b * t


def gauss2(X, Y, cx, cy, rx, ry):
    return np.exp(-(((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2))


def soft_ellipse(im, box, color, blur):
    x0, y0, x1, y1 = [int(v) for v in box]
    pad = int(blur * 3 + 4)
    rx0 = max(0, min(im.size[0] - 1, min(x0, x1) - pad))
    ry0 = max(0, min(im.size[1] - 1, min(y0, y1) - pad))
    rx1 = max(0, min(im.size[0], max(x0, x1) + pad))
    ry1 = max(0, min(im.size[1], max(y0, y1) + pad))
    if rx1 <= rx0 or ry1 <= ry0:
        return
    cw, ch = rx1 - rx0, ry1 - ry0
    mask = Image.new("L", (cw, ch), 0)
    ImageDraw.Draw(mask).ellipse([x0 - rx0, y0 - ry0, x1 - rx0, y1 - ry0], fill=255)
    if blur > 0:
        mask = mask.filter(ImageFilter.GaussianBlur(blur))
    layer = Image.new("RGBA", (cw, ch), (color[0], color[1], color[2], 0))
    layer.putalpha(mask)
    im.alpha_composite(layer, (rx0, ry0))


def clip01(rgb):
    return np.clip(rgb, 0, 1)


# ---------------------------------------------------------------- plains

def draw_plains(im, cx, cy, r):
    X, Y = grids(im, cx, cy, r)
    shape = X.shape
    n = fbm(shape, r * 0.42, 3, 11, 0.5)
    n2 = fbm(shape, r * 0.22, 2, 40, 0.45)
    h = (n - 0.5) * 0.10 + (n2 - 0.5) * 0.035
    # a few soft tuft mounds, not symbols
    h += 0.045 * gauss2(X, Y, -0.28, 0.10, 0.22, 0.16)
    h += 0.035 * gauss2(X, Y, 0.32, -0.18, 0.20, 0.14)
    h += 0.03 * gauss2(X, Y, 0.05, 0.34, 0.18, 0.12)
    meadow = np.array([0.36, 0.55, 0.20], np.float32)
    sun = np.array([0.58, 0.70, 0.30], np.float32)
    shade_c = np.array([0.20, 0.36, 0.12], np.float32)
    albedo = lerp(shade_c, meadow, 0.30 + 0.70 * n)
    albedo = lerp(albedo, sun, smoothstep(0.48, 0.82, n2) * 0.75)
    damp = gauss2(X, Y, 0.22, 0.28, 0.34, 0.22)
    albedo = lerp(albedo, np.array([0.24, 0.40, 0.16], np.float32), damp * 0.45)
    # broad clover-colored patches, still low frequency
    albedo = lerp(albedo, np.array([0.30, 0.48, 0.18], np.float32), gauss2(X, Y, -0.30, -0.10, 0.28, 0.20) * 0.35)
    rgb = shade(h, albedo, r, relief=1.8, ambient=0.48, diffuse=0.66)
    rgb = apply_ao(rgb, h, r, 0.45, 0.07)
    rgb = vignette(rgb, X, Y, 0.14)
    put_rgb(im, clip01(rgb))


def soft_stroke(im, x0, y0, x1, y1, color, width):
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.line([(x0, y0), (x1, y1)], fill=color, width=max(1, int(width)))
    layer = layer.filter(ImageFilter.GaussianBlur(max(0.6, SS * 0.35)))
    im.alpha_composite(layer)


# ---------------------------------------------------------------- forest

def draw_forest(im, cx, cy, r):
    X, Y = grids(im, cx, cy, r)
    shape = X.shape
    n = fbm(shape, r * 0.36, 3, 21, 0.5)
    h = (n - 0.5) * 0.04
    soil = np.array([0.15, 0.20, 0.09], np.float32)
    moss = np.array([0.22, 0.32, 0.13], np.float32)
    needle = np.array([0.20, 0.16, 0.08], np.float32)
    albedo = lerp(soil, moss, n)
    albedo = lerp(albedo, needle, gauss2(X, Y, 0.0, 0.15, 0.5, 0.35) * 0.35)
    rgb = shade(h, albedo, r, relief=1.0, ambient=0.48, diffuse=0.55)
    rgb = vignette(rgb, X, Y, 0.22)
    put_rgb(im, clip01(rgb))
    # ground shadows under the canopy masses
    shadows = [
        (-0.02, 0.02, 0.46, 0.34),
        (-0.36, 0.16, 0.30, 0.24),
        (0.34, 0.12, 0.32, 0.26),
        (0.02, 0.36, 0.28, 0.20),
    ]
    for sx, sy, rx, ry in shadows:
        soft_ellipse(
            im,
            [cx + (sx - rx) * r, cy + (sy - ry * 0.4) * r, cx + (sx + rx) * r, cy + (sy + ry) * r],
            (12, 22, 10),
            SS * 3.2,
        )
    trees = [
        (-0.22, -0.34, 0.46, "broad", 1),
        (0.20, -0.30, 0.42, "pine", 2),
        (-0.02, -0.08, 0.78, "pine", 3),
        (-0.40, 0.02, 0.58, "pine", 4),
        (0.36, 0.00, 0.62, "broad", 5),
        (-0.18, 0.22, 0.56, "broad", 6),
        (0.16, 0.26, 0.52, "pine", 7),
        (-0.42, 0.36, 0.40, "pine", 8),
        (0.40, 0.38, 0.44, "broad", 9),
        (0.00, 0.46, 0.38, "pine", 10),
    ]
    for tx, ty, th, kind, seed in sorted(trees, key=lambda t: t[1]):
        draw_tree(im, cx + tx * r, cy + ty * r, th * r, kind, seed)


def mix_col(a, b, t):
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))


def draw_tree(im, x, y, height, kind, seed):
    rng = np.random.default_rng(100 + seed)
    if kind == "pine":
        body = mix_col((22, 58, 30), (36, 86, 40), rng.random())
        if seed % 4 == 0:
            body = mix_col(body, (18, 46, 32), 0.45)
        trunk = (92, 64, 40)
        tw = max(SS, height * 0.055)
        th = height * 0.22
        soft_ellipse(im, [x - tw, y - th, x + tw, y + SS], trunk, SS * 0.4)
        layers = 5
        for i in range(layers):
            t = i / (layers - 1)
            yy = y - height * (0.16 + t * 0.70)
            rx = height * (0.40 - t * 0.24) * float(rng.uniform(0.92, 1.06))
            ry = height * (0.16 - t * 0.045)
            jx = float(rng.uniform(-0.04, 0.04)) * height
            dark = mix_col(body, (8, 24, 12), 0.55)
            hi = mix_col(body, (132, 156, 86), 0.42)
            soft_ellipse(im, [x + jx - rx * 0.95, yy - ry * 0.05, x + jx + rx * 1.02, yy + ry * 1.35], dark, SS * 0.8)
            soft_ellipse(im, [x + jx - rx, yy - ry, x + jx + rx * 0.92, yy + ry * 0.72], body, SS * 0.65)
            if i >= 2:
                hx = x + jx - rx * 0.36
                hy = yy - ry * 0.62
                soft_ellipse(
                    im,
                    [hx - rx * 0.22, hy - ry * 0.28, hx + rx * 0.10, hy + ry * 0.05],
                    hi,
                    SS * 0.7,
                )
    else:
        body = mix_col((40, 78, 30), (62, 104, 36), rng.random())
        if seed % 3 == 0:
            body = mix_col(body, (70, 96, 34), 0.4)
        trunk = (86, 58, 36)
        tw = max(SS, height * 0.06)
        soft_ellipse(im, [x - tw, y - height * 0.16, x + tw, y + SS], trunk, SS * 0.45)
        blobs = [(0.02, -0.52, 0.36, 0.26), (-0.24, -0.32, 0.24, 0.20), (0.22, -0.30, 0.22, 0.18), (0.0, -0.70, 0.18, 0.15)]
        for bi, (ox, oy, rx, ry) in enumerate(blobs):
            dark = mix_col(body, (12, 28, 10), 0.5)
            bx = x + ox * height
            by = y + oy * height
            soft_ellipse(
                im,
                [bx - rx * height, by - ry * height * 0.15, bx + rx * height * 1.02, by + ry * height * 1.2],
                dark,
                SS * 1.0,
            )
            soft_ellipse(
                im,
                [bx - rx * height * 0.96, by - ry * height, bx + rx * height * 0.9, by + ry * height * 0.85],
                body,
                SS * 0.8,
            )
        # one crown light, not a highlight on every lobe
        hi = mix_col(body, (150, 170, 96), 0.4)
        bx = x + 0.0 * height
        by = y - 0.70 * height
        soft_ellipse(im, [bx - height * 0.08, by - height * 0.08, bx + height * 0.02, by + height * 0.02], hi, SS * 0.6)


# ---------------------------------------------------------------- mountain

def draw_mountain(im, cx, cy, r):
    """Rocky peaks with snow caps. Faces are irregular, not a flat icon and not a gem."""
    X, Y = grids(im, cx, cy, r)
    shape = X.shape
    grain = fbm(shape, r * 0.20, 3, 51, 0.55)
    h = 0.18 * np.clip(0.15 - Y, 0, 1) + (grain - 0.5) * 0.05
    h += 0.08 * np.exp(-((X + 0.1) / 0.7) ** 2 - ((Y - 0.15) / 0.55) ** 2)
    rock_hi = np.array([0.48, 0.44, 0.39], np.float32)
    rock_lo = np.array([0.32, 0.29, 0.26], np.float32)
    albedo = lerp(rock_lo, rock_hi, grain)
    rgb = shade(h, albedo, r, relief=1.4, ambient=0.5, diffuse=0.55)
    rgb = vignette(rgb, X, Y, 0.12)
    put_rgb(im, clip01(rgb))

    def P(*pts):
        return [(cx + x * r, cy + y * r) for x, y in pts]

    # back peak, then the main mass, lit face on the upper left
    faces = [
        ([ (0.26, 0.02), (0.72, 0.40), (0.20, 0.52) ], (118, 112, 104)),
        ([ (0.26, 0.02), (0.50, -0.26), (0.72, 0.40) ], (154, 148, 140)),
        ([ (-0.74, 0.50), (-0.26, 0.06), (0.08, 0.58) ], (136, 126, 112)),
        ([ (0.08, 0.58), (0.34, 0.04), (0.70, 0.52) ], (82, 76, 70)),
        ([ (-0.26, 0.06), (0.00, -0.70), (0.12, 0.08) ], (188, 182, 172)),
        ([ (0.12, 0.08), (0.00, -0.70), (0.36, 0.00) ], (100, 94, 88)),
        ([ (-0.26, 0.06), (0.12, 0.08), (0.08, 0.58), (0.34, 0.04) ], (154, 144, 132)),
    ]
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for pts, col in faces:
        draw.polygon(P(*pts), fill=col + (255,))
    arr = np.array(layer).astype(np.float32)
    g = (0.80 + 0.34 * grain)[..., None]
    arr[..., :3] *= g
    # cool the shadow side a little
    arr[..., 0] = np.clip(arr[..., 0], 0, 255)
    arr[..., 1] = np.clip(arr[..., 1], 0, 255)
    arr[..., 2] = np.clip(arr[..., 2], 0, 255)
    layer = Image.fromarray(arr.astype(np.uint8), "RGBA")
    layer = layer.filter(ImageFilter.GaussianBlur(max(1, SS * 0.85)))
    im.alpha_composite(layer)

    # snow sits on the summits, with a blue-gray lee edge
    snow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(snow)
    sd.polygon(P((0.00, -0.70), (-0.18, -0.38), (0.05, -0.30), (0.18, -0.42)), fill=(236, 240, 244, 255))
    sd.polygon(P((0.00, -0.70), (0.05, -0.30), (0.18, -0.42)), fill=(176, 190, 202, 255))
    sd.polygon(P((0.50, -0.26), (0.38, -0.10), (0.58, -0.08)), fill=(226, 232, 236, 255))
    snow = snow.filter(ImageFilter.GaussianBlur(max(1, SS * 0.7)))
    im.alpha_composite(snow)

    # a couple of rock breaks, soft, not a starburst
    cracks = Image.new("RGBA", im.size, (0, 0, 0, 0))
    cd = ImageDraw.Draw(cracks)
    cd.line(P((0.00, -0.55), (0.06, -0.12)), fill=(64, 58, 52, 140), width=max(2, SS))
    cd.line(P((-0.16, 0.02), (-0.42, 0.28)), fill=(70, 62, 54, 110), width=max(2, SS))
    cracks = cracks.filter(ImageFilter.GaussianBlur(max(1, SS * 0.4)))
    im.alpha_composite(cracks)


def draw_hills(im, cx, cy, r):
    X, Y = grids(im, cx, cy, r)
    shape = X.shape
    n = fbm(shape, r * 0.38, 3, 90, 0.5)

    def ridge(cx0, cy0, ang, rx, ry, amp):
        ca, sa = math.cos(ang), math.sin(ang)
        dx, dy = X - cx0, Y - cy0
        lx = dx * ca + dy * sa
        ly = -dx * sa + dy * ca
        return amp * np.exp(-((lx / rx) ** 2 + (ly / ry) ** 2))

    h = (n - 0.5) * 0.04
    h += ridge(-0.12, -0.02, 0.40, 0.70, 0.13, 0.50)
    h += ridge(0.20, 0.32, -0.50, 0.58, 0.12, 0.42)
    h += ridge(-0.30, 0.36, 0.15, 0.34, 0.10, 0.26)
    h += ridge(0.08, -0.34, 0.25, 0.42, 0.10, 0.24)
    valley = np.array([0.42, 0.34, 0.16], np.float32)
    crest = np.array([0.55, 0.58, 0.26], np.float32)
    lee = np.array([0.26, 0.28, 0.12], np.float32)
    hn = np.clip(h / 0.55, 0, 1)
    albedo = lerp(valley, crest, hn)
    albedo = lerp(albedo, crest * np.array([1.05, 1.08, 0.9]), n * 0.25)
    # lee side slightly browner where slope faces down-right
    gy, gx = np.gradient(h)
    lee_m = smoothstep(0, 0.0015, gx * 0.6 + gy * 0.8)
    albedo = lerp(albedo, lee, lee_m * 0.35)
    rgb = shade(h, albedo, r, relief=1.85, ambient=0.44, diffuse=0.72)
    rgb = apply_ao(rgb, h, r, 0.5, 0.06)
    rgb = vignette(rgb, X, Y, 0.16)
    put_rgb(im, clip01(rgb))


# ---------------------------------------------------------------- water

def draw_water(im, cx, cy, r):
    X, Y = grids(im, cx, cy, r)
    shape = X.shape
    n = fbm(shape, r * 0.55, 3, 15, 0.55)
    n2 = fbm(shape, r * 0.28, 2, 33, 0.4)
    deep = np.array([0.04, 0.16, 0.36], np.float32)
    mid = np.array([0.10, 0.36, 0.60], np.float32)
    shallow = np.array([0.34, 0.64, 0.74], np.float32)
    # depth: lighter toward the top of the hex, a broad deeper pool, no speckles
    depth = np.clip(0.22 + 0.62 * ((Y + 0.35) / 1.5) + (n - 0.5) * 0.40, 0, 1)
    albedo = lerp(shallow, mid, smoothstep(0.15, 0.55, depth))
    albedo = lerp(albedo, deep, smoothstep(0.45, 0.9, depth))
    # one soft sun glint region, upper left, very broad
    glint = gauss2(X, Y, -0.28, -0.36, 0.55, 0.32)
    albedo = lerp(albedo, np.array([0.55, 0.75, 0.82], np.float32), glint * 0.28)
    albedo = albedo * (0.92 + 0.10 * n2)[..., None]
    # gentle wave height only for a soft light roll, not a chop
    wave_h = 0.015 * np.sin((Y * 9.0 + np.sin(X * 3.0) * 0.6)) * (0.65 + 0.35 * n)
    rgb = shade(wave_h, albedo, r, relief=2.2, ambient=0.62, diffuse=0.48)
    rgb = vignette(rgb, X, Y, 0.14)
    put_rgb(im, clip01(rgb))
    # long soft crests
    crests = [(-0.28, 0.50, 0.045), (0.02, 0.42, 0.038), (0.32, 0.36, 0.030)]
    for y0, reach, amp in crests:
        draw_wave(im, cx, cy, r, y0, reach, amp)


def draw_wave(im, cx, cy, r, y0, reach, amp):
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    overlay = np.zeros((im.size[1], im.size[0], 4), np.float32)
    ys, xs = np.mgrid[0:im.size[1], 0:im.size[0]].astype(np.float32)
    X = (xs - cx) / r
    Y = (ys - cy) / r
    span = np.clip(1 - (np.abs(X) / reach) ** 2, 0, 1)
    crest_y = y0 + amp * np.sin(X * math.pi * 2.2)
    dist = Y - crest_y
    band = np.exp(-(dist / 0.028) ** 2) * span
    trough = np.exp(-((dist - 0.045) / 0.03) ** 2) * span * 0.55
    overlay[..., 0] = 0.78 * band
    overlay[..., 1] = 0.88 * band
    overlay[..., 2] = 0.92 * band
    overlay[..., 3] = band * 0.38
    # darker trough just below the crest
    base = np.array(im)
    rgb = base[..., :3].astype(np.float32) / 255.0
    a = overlay[..., 3:4]
    rgb = rgb * (1 - a) + overlay[..., :3] * a
    rgb = rgb * (1 - trough[..., None] * 0.28)
    base[..., 0] = np.clip(rgb[..., 0] * 255, 0, 255)
    base[..., 1] = np.clip(rgb[..., 1] * 255, 0, 255)
    base[..., 2] = np.clip(rgb[..., 2] * 255, 0, 255)
    im.paste(Image.fromarray(base.astype(np.uint8), "RGBA"))
    # layer unused; waves are painted in place so they stay smooth
    del layer


# ---------------------------------------------------------------- trench

def poly_distance(X, Y, pts):
    dmin = np.full(X.shape, 1e6, np.float32)
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        vx, vy = x1 - x0, y1 - y0
        L2 = vx * vx + vy * vy + 1e-8
        t = np.clip(((X - x0) * vx + (Y - y0) * vy) / L2, 0, 1)
        px = x0 + t * vx
        py = y0 + t * vy
        dmin = np.minimum(dmin, np.hypot(X - px, Y - py))
    return dmin


TRENCH_PTS = [(-0.64, 0.10), (-0.34, -0.20), (-0.02, 0.12), (0.30, -0.18), (0.62, 0.10)]


def draw_trench(im, cx, cy, r):
    X, Y = grids(im, cx, cy, r)
    shape = X.shape
    n = fbm(shape, r * 0.34, 3, 61, 0.5)
    dist = poly_distance(X, Y, TRENCH_PTS)
    groove = 1 - smoothstep(0.018, 0.072, dist)
    bank = smoothstep(0.06, 0.10, dist) * (1 - smoothstep(0.11, 0.22, dist))
    h = (n - 0.5) * 0.05 - 0.62 * groove + 0.20 * bank
    # two shell holes
    h -= 0.16 * gauss2(X, Y, -0.36, -0.36, 0.12, 0.09)
    h -= 0.12 * gauss2(X, Y, 0.40, 0.36, 0.10, 0.08)
    earth = np.array([0.52, 0.38, 0.20], np.float32)
    dry = np.array([0.64, 0.50, 0.28], np.float32)
    mud = np.array([0.28, 0.18, 0.10], np.float32)
    albedo = lerp(earth, dry, n)
    albedo = lerp(albedo, dry * 1.08, bank * 0.65)
    albedo = lerp(albedo, mud, np.clip(groove * 1.15, 0, 1))
    # hole interiors
    holes = gauss2(X, Y, -0.36, -0.36, 0.10, 0.075) + gauss2(X, Y, 0.40, 0.36, 0.08, 0.065)
    albedo = lerp(albedo, mud * 0.7, np.clip(holes, 0, 1))
    rgb = shade(h, albedo, r, relief=1.35, ambient=0.44, diffuse=0.70)
    rgb = apply_ao(rgb, h, r, 0.7, 0.045)
    rgb = vignette(rgb, X, Y, 0.16)
    put_rgb(im, clip01(rgb))
    paint_duckboards(im, cx, cy, r)
    paint_sandbags(im, cx, cy, r)


def paint_duckboards(im, cx, cy, r):
    d = ImageDraw.Draw(im, "RGBA")
    pts = TRENCH_PTS
    planks = 6
    for i in range(planks):
        t = (i + 0.5) / planks
        # walk the polyline by approximate length
        x, y, ang = point_along(pts, t)
        px, py = cx + x * r, cy + y * r
        nx, ny = math.cos(ang + math.pi / 2), math.sin(ang + math.pi / 2)
        half = r * 0.055
        col = (92, 64, 40, 230)
        x0, y0 = px - nx * half, py - ny * half
        x1, y1 = px + nx * half, py + ny * half
        d.line([(x0, y0), (x1, y1)], fill=col, width=max(2, SS * 2))


def point_along(pts, t):
    segs = []
    total = 0.0
    for a, b in zip(pts[:-1], pts[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        segs.append((a, b, L))
        total += L
    goal = t * total
    acc = 0.0
    for a, b, L in segs:
        if acc + L >= goal or b == pts[-1]:
            u = 0 if L == 0 else (goal - acc) / L
            u = min(1, max(0, u))
            x = a[0] + (b[0] - a[0]) * u
            y = a[1] + (b[1] - a[1]) * u
            ang = math.atan2(b[1] - a[1], b[0] - a[0])
            return x, y, ang
        acc += L
    a, b = pts[-2], pts[-1]
    return b[0], b[1], math.atan2(b[1] - a[1], b[0] - a[0])


def paint_sandbags(im, cx, cy, r):
    # two clusters on the near (down-screen) lip
    clusters = [(0.18, 1), (0.62, -1)]
    for t, side in clusters:
        x, y, ang = point_along(TRENCH_PTS, t)
        nx, ny = math.cos(ang + math.pi / 2) * side, math.sin(ang + math.pi / 2) * side
        # push to the lower side of the cut
        if ny < 0:
            nx, ny = -nx, -ny
        bx = x + nx * 0.13
        by = y + ny * 0.13
        tx, ty = math.cos(ang), math.sin(ang)
        for k in range(4):
            ox = (k - 1.5) * 0.055
            oy = 0.012 if k % 2 else -0.008
            px = cx + (bx + tx * ox + nx * oy) * r
            py = cy + (by + ty * ox + ny * oy) * r
            rw, rh = r * 0.048, r * 0.030
            soft_ellipse(im, [px - rw, py - rh, px + rw, py + rh], (118, 92, 58), SS * 0.6)
            soft_ellipse(im, [px - rw * 0.7, py - rh * 0.85, px + rw * 0.15, py - rh * 0.05], (168, 140, 96), SS * 0.5)


# ---------------------------------------------------------------- desert

def draw_desert(im, cx, cy, r):
    X, Y = grids(im, cx, cy, r)
    shape = X.shape
    n = fbm(shape, r * 0.40, 3, 101, 0.5)

    def dunes(freq, phase, ang, curve):
        ca, sa = math.cos(ang), math.sin(ang)
        proj = X * ca + Y * sa
        cross = -X * sa + Y * ca
        proj = proj + curve * np.sin(cross * 2.2 + phase)
        t = np.mod(proj * freq + phase, 1.0)
        crest = 0.70
        u = np.clip(t / crest, 0, 1)
        v = np.clip((t - crest) / (1.0 - crest), 0, 1)
        rise = np.power(np.maximum(np.sin(u * np.pi * 0.5), 0), 1.15)
        fall = np.power(np.maximum(np.cos(v * np.pi * 0.5), 0), 1.85)
        return np.where(t < crest, rise, fall).astype(np.float32)

    profile = dunes(1.7, 0.15, 1.15, 0.10)
    profile2 = dunes(1.15, 0.55, 1.35, 0.06)
    h = 0.42 * profile + 0.12 * profile2 + (n - 0.5) * 0.035
    sand = np.array([0.86, 0.70, 0.38], np.float32)
    pale = np.array([0.95, 0.84, 0.55], np.float32)
    warm = np.array([0.70, 0.48, 0.22], np.float32)
    albedo = lerp(sand, pale, n * 0.55)
    albedo = lerp(albedo, warm, (1.0 - profile) * 0.38)
    rgb = shade(h, albedo, r, relief=1.55, ambient=0.50, diffuse=0.66)
    rgb = apply_ao(rgb, h, r, 0.4, 0.06)
    rgb = vignette(rgb, X, Y, 0.10)
    put_rgb(im, clip01(rgb))


def draw_swamp(im, cx, cy, r):
    X, Y = grids(im, cx, cy, r)
    shape = X.shape
    n = fbm(shape, r * 0.36, 3, 121, 0.5)
    h = (n - 0.5) * 0.035
    pool_a = gauss2(X, Y, 0.06, 0.12, 0.36, 0.20)
    pool_b = gauss2(X, Y, -0.34, -0.16, 0.22, 0.13)
    pool = np.clip(pool_a + 0.85 * pool_b, 0, 1)
    h -= 0.34 * pool
    mud = np.array([0.34, 0.36, 0.16], np.float32)
    wet = np.array([0.22, 0.28, 0.12], np.float32)
    water = np.array([0.05, 0.12, 0.09], np.float32)
    skim = np.array([0.34, 0.44, 0.28], np.float32)
    albedo = lerp(mud, wet, n * 0.8)
    albedo = lerp(albedo, water, smoothstep(0.35, 0.72, pool))
    shine = gauss2(X, Y, -0.04, 0.02, 0.14, 0.055) * smoothstep(0.55, 0.85, pool_a)
    albedo = lerp(albedo, skim, shine * 0.85)
    # low hummocks of wet grass between pools
    hum = gauss2(X, Y, -0.10, -0.34, 0.18, 0.10) + gauss2(X, Y, 0.36, 0.32, 0.16, 0.09)
    h += 0.08 * hum
    albedo = lerp(albedo, np.array([0.28, 0.38, 0.16], np.float32), np.clip(hum, 0, 1) * 0.55)
    rgb = shade(h, albedo, r, relief=1.1, ambient=0.48, diffuse=0.55)
    rgb = apply_ao(rgb, h, r, 0.45, 0.06)
    rgb = vignette(rgb, X, Y, 0.18)
    put_rgb(im, clip01(rgb))
    paint_reeds(im, cx, cy, r)


def paint_reeds(im, cx, cy, r):
    rng = np.random.default_rng(9)
    clusters = [(-0.22, 0.02), (0.22, 0.28), (-0.02, -0.28), (0.38, -0.02), (-0.46, 0.22)]
    d = ImageDraw.Draw(im, "RGBA")
    for cx0, cy0 in clusters:
        count = 6
        for k in range(count):
            jx = float(rng.normal(0, 0.03))
            jy = float(rng.normal(0, 0.018))
            x = cx + (cx0 + jx) * r
            y = cy + (cy0 + jy) * r
            hh = r * float(rng.uniform(0.16, 0.40))
            lean = r * float(rng.uniform(-0.06, 0.07))
            if k % 3 == 0:
                col = (88, 96, 42, 230)
            else:
                col = (32, 44, 20, 240)
            w = max(2, int(SS * (1.3 if k % 2 == 0 else 0.8)))
            d.line([(x, y + r * 0.02), (x + lean, y - hh)], fill=col, width=w)
            head_w = SS * 2.2
            d.ellipse(
                [x + lean - head_w, y - hh - head_w * 1.3, x + lean + head_w * 0.8, y - hh + head_w * 0.3],
                fill=(112, 100, 48, 230),
            )


# ---------------------------------------------------------------- overlays and settlements

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


def icon_canvas(n):
    return Image.new("RGBA", (n, n), (0, 0, 0, 0))


def vgrad(w, h, top, bot):
    h = max(1, int(h))
    w = max(1, int(w))
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    top = np.array(top, np.float32)
    bot = np.array(bot, np.float32)
    rgb = (1 - t) * top + t * bot
    # light from the left
    xs = np.linspace(0, 1, w, dtype=np.float32)[None, :, None]
    light = 1.08 - 0.22 * xs
    rgb = np.clip(rgb * light, 0, 255)
    arr = np.zeros((h, w, 4), np.uint8)
    arr[..., 0:3] = rgb.astype(np.uint8)
    arr[..., 3] = 255
    return Image.fromarray(arr, "RGBA")


def shade_of(col, mul):
    return tuple(int(max(0, min(255, c * mul))) for c in col[:3])


def paste_clip(im, sprite, xy, mask_img=None):
    im.paste(sprite, xy, sprite)


def plaster(w, h, top, bot, seed):
    img = vgrad(max(1, int(w)), max(1, int(h)), top, bot)
    a = np.array(img).astype(np.float32)
    hh, ww = a.shape[:2]
    if ww > 6 and hh > 6:
        n = fbm((hh, ww), max(8.0, ww / 2.4), 2, seed, 0.55)
        a[..., :3] *= (0.84 + 0.28 * n[..., None])
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA")


def draw_window(im, x0, y0, x1, y1):
    d = ImageDraw.Draw(im, "RGBA")
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    if x1 <= x0 + 2 or y1 <= y0 + 2:
        return
    d.rectangle([x0 - 1, y1, x1 + 2, y1 + max(2, (y1 - y0) // 8)], fill=(108, 94, 76, 255))
    d.rectangle([x0, y0, x1, y1], fill=(46, 34, 26, 255))
    gw = max(1, x1 - x0 - 4)
    gh = max(1, y1 - y0 - 4)
    glass = vgrad(gw, gh, (168, 184, 186), (52, 70, 80))
    im.paste(glass, (x0 + 2, y0 + 2), glass)


def fill_roof(im, left, peak, right, color):
    d = ImageDraw.Draw(im, "RGBA")
    d.polygon([left, peak, right], fill=color + (255,))
    base_mid = ((left[0] + right[0]) / 2.0, left[1])
    d.polygon([peak, right, base_mid], fill=shade_of(color, 0.72) + (255,))
    y0, y1 = peak[1], left[1]
    if y1 <= y0 + 4:
        return
    courses = 7
    for i in range(1, courses):
        y = y0 + (y1 - y0) * i / courses
        t = (y - y0) / (y1 - y0)
        xl = peak[0] + (left[0] - peak[0]) * t
        xr = peak[0] + (right[0] - peak[0]) * t
        col = shade_of(color, 0.80 if i % 2 else 0.92)
        d.line([(xl + 1, y), (xr - 1, y)], fill=col + (210,), width=max(2, int((y1 - y0) / 18)))
    d.line([peak, (peak[0], peak[1] + (y1 - y0) * 0.16)], fill=shade_of(color, 1.22) + (170,), width=2)


def draw_gabled(im, x, yb, w, wall_h, roof_h, wall, roof, floors, door, chimney, side=0, seed=1):
    """A small masonry house. yb is the base of the front wall. side > 0 shows the right wall."""
    d = ImageDraw.Draw(im, "RGBA")
    top = yb - wall_h
    d.ellipse([x + w * 0.05, yb - 4, x + w + side * 0.8, yb + w * 0.16], fill=(20, 16, 12, 60))
    wall_img = plaster(w, wall_h, shade_of(wall, 1.06), shade_of(wall, 0.84), seed)
    im.paste(wall_img, (int(x), int(top)), wall_img)
    d.rectangle([x, yb - wall_h * 0.10, x + w, yb], fill=shade_of(wall, 0.58) + (255,))
    if side > 0:
        d.polygon(
            [
                (x + w, yb),
                (x + w + side, yb - side * 0.42),
                (x + w + side, top - side * 0.42),
                (x + w, top),
            ],
            fill=shade_of(wall, 0.70) + (255,),
        )
    peak = (x + w * 0.50, top - roof_h)
    left = (x - w * 0.07, top + 3)
    right = (x + w + w * 0.06, top + 3)
    fill_roof(im, left, peak, right, roof)
    # eave shadow on the wall
    d.line([left, right], fill=(40, 28, 20, 100), width=max(2, int(w * 0.035)))
    if side > 0:
        d.polygon(
            [
                right,
                peak,
                (peak[0] + side * 0.72, peak[1] - side * 0.18),
                (right[0] + side * 0.82, right[1] - side * 0.40),
            ],
            fill=shade_of(roof, 0.58) + (255,),
        )
    if chimney:
        cw = max(4, w * 0.10)
        chx = x + w * 0.66
        chy = peak[1] + roof_h * 0.22
        d.rectangle([chx, chy, chx + cw, top - roof_h * 0.05], fill=(138, 72, 52, 255))
        d.rectangle([chx, chy, chx + cw * 0.38, top - roof_h * 0.05], fill=(168, 98, 72, 255))
        d.rectangle([chx - 2, chy - 5, chx + cw + 3, chy + 2], fill=(86, 52, 42, 255))
    slots = 2
    for row in range(floors):
        wy1 = top + wall_h * (0.12 + row * (0.32 if floors > 1 else 0.18))
        wy2 = wy1 + wall_h * (0.18 if floors > 1 else 0.22)
        for col in range(slots):
            if door and row == floors - 1 and col == 0:
                continue
            wx1 = x + w * (0.18 + col * 0.38)
            wx2 = wx1 + w * 0.18
            draw_window(im, wx1, wy1, wx2, wy2)
    if door:
        dx1 = x + w * 0.16
        dw = w * 0.22
        dy1 = yb - wall_h * 0.36
        d.rectangle([dx1, dy1, dx1 + dw, yb - 1], fill=(62, 40, 28, 255))
        d.rectangle([dx1 + dw * 0.12, dy1 + wall_h * 0.06, dx1 + dw * 0.88, yb - wall_h * 0.08], fill=(84, 56, 38, 255))
        d.rectangle([dx1 + dw * 0.12, dy1 + wall_h * 0.16, dx1 + dw * 0.88, dy1 + wall_h * 0.18], fill=(48, 32, 22, 255))
        d.ellipse([dx1 + dw * 0.72, yb - wall_h * 0.18, dx1 + dw * 0.84, yb - wall_h * 0.14], fill=(176, 148, 78, 255))


def draw_city():
    n = 768
    im = icon_canvas(n)
    s = n / 256.0
    d = ImageDraw.Draw(im, "RGBA")
    d.ellipse([24 * s, 188 * s, 236 * s, 232 * s], fill=(28, 22, 14, 55))
    street = plaster(int(210 * s), int(26 * s), (132, 106, 74), (92, 70, 46), 4)
    mask = Image.new("L", street.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 2, street.size[0] - 1, street.size[1] - 1], radius=14, fill=170)
    street.putalpha(mask)
    im.paste(street, (int(22 * s), int(196 * s)), street)
    draw_gabled(
        im, 22 * s, 204 * s, 68 * s, 64 * s, 40 * s,
        (198, 184, 162), (72, 82, 96), 2, True, False, side=0, seed=2,
    )
    draw_gabled(
        im, 86 * s, 208 * s, 84 * s, 86 * s, 52 * s,
        (222, 208, 184), (164, 74, 46), 2, True, True, side=0, seed=5,
    )
    draw_gabled(
        im, 166 * s, 204 * s, 58 * s, 54 * s, 34 * s,
        (206, 176, 118), (116, 54, 38), 2, True, False, side=16 * s, seed=8,
    )
    return im.resize((256, 256), Image.Resampling.LANCZOS)


def column_sprite(w, h):
    w = max(1, int(w))
    h = max(1, int(h))
    xs = np.linspace(0, 1, w, dtype=np.float32)
    light = 0.40 + 0.72 * np.exp(-((xs - 0.28) / 0.20) ** 2)
    light = light * (1.02 - 0.34 * xs)
    rgb = np.array([228, 218, 198], np.float32) * light[:, None]
    arr = np.zeros((h, w, 4), np.uint8)
    arr[..., :3] = np.clip(rgb, 0, 255)[None, :, :].astype(np.uint8)
    arr[..., 3] = 255
    return Image.fromarray(arr, "RGBA")


def paint_dome(im, cx, cy, rad):
    h, w = im.size[1], im.size[0]
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    dx = (xs - cx) / rad
    dy = (ys - cy) / rad
    rr = dx * dx + dy * dy
    m = (rr <= 1.0) & (dy < 0.22)
    dz = np.sqrt(np.clip(1 - rr, 0, 1))
    L = np.array([-0.38, -0.58, 0.72], np.float32)
    L = L / np.linalg.norm(L)
    ndotl = np.clip(dx * L[0] + dy * L[1] + dz * L[2], 0, 1)
    stone = np.array([0.86, 0.78, 0.60], np.float32)
    col = stone * (0.38 + 0.72 * ndotl)[..., None]
    # cooler shade
    col = col + np.array([0.0, 0.01, 0.03]) * (1 - ndotl)[..., None]
    edge = smoothstep(0.72, 1.0, np.sqrt(rr))
    col = col * (1 - 0.28 * edge)[..., None]
    src = np.array(im).astype(np.float32)
    a = m.astype(np.float32) * (1 - smoothstep(0.96, 1.0, np.sqrt(np.clip(rr, 0, 1))))
    # only the cap above the drum
    a = a * (dy < 0.22).astype(np.float32)
    a = a[..., None]
    src[..., :3] = src[..., :3] * (1 - a) + np.clip(col * 255, 0, 255) * a
    src[..., 3] = np.maximum(src[..., 3], a[..., 0] * 255)
    im.paste(Image.fromarray(np.clip(src, 0, 255).astype(np.uint8), "RGBA"))


def draw_capital():
    n = 768
    im = icon_canvas(n)
    s = n / 256.0
    d = ImageDraw.Draw(im, "RGBA")
    d.ellipse([28 * s, 198 * s, 230 * s, 240 * s], fill=(24, 18, 12, 50))
    stone = (214, 204, 184)
    stone_d = (162, 150, 130)
    slate = (58, 66, 76)
    # wings
    for i, wx in enumerate((22, 178)):
        wall = plaster(int(56 * s), int(58 * s), shade_of(stone, 1.02), shade_of(stone, 0.82), 12 + i)
        im.paste(wall, (int(wx * s), int(146 * s)), wall)
        d.polygon(
            [(wx * s - 3, 148 * s), ((wx + 28) * s, 124 * s), ((wx + 59) * s, 148 * s)],
            fill=slate + (255,),
        )
        d.polygon(
            [((wx + 28) * s, 124 * s), ((wx + 59) * s, 148 * s), ((wx + 44) * s, 148 * s)],
            fill=shade_of(slate, 0.68) + (255,),
        )
        draw_window(im, (wx + 8) * s, 160 * s, (wx + 22) * s, 182 * s)
        draw_window(im, (wx + 32) * s, 160 * s, (wx + 46) * s, 182 * s)
    # main block behind the portico
    main = plaster(int(156 * s), int(84 * s), shade_of(stone, 1.05), shade_of(stone, 0.80), 20)
    im.paste(main, (int(50 * s), int(118 * s)), main)
    # dome behind the pediment so the cap reads above the roof
    d.rectangle([100 * s, 100 * s, 156 * s, 124 * s], fill=(190, 176, 148, 255))
    d.rectangle([100 * s, 100 * s, 156 * s, 105 * s], fill=(154, 132, 90, 255))
    paint_dome(im, 128 * s, 112 * s, 46 * s)
    # pediment in front of the dome's lower half
    d.polygon([(44 * s, 122 * s), (128 * s, 86 * s), (212 * s, 122 * s)], fill=(188, 170, 142, 255))
    d.polygon([(128 * s, 86 * s), (212 * s, 122 * s), (172 * s, 122 * s)], fill=(148, 128, 104, 255))
    d.ellipse([114 * s, 98 * s, 142 * s, 118 * s], fill=(206, 190, 160, 230))
    # entablature
    d.rectangle([46 * s, 118 * s, 210 * s, 132 * s], fill=(198, 186, 162, 255))
    d.rectangle([46 * s, 128 * s, 210 * s, 133 * s], fill=(146, 126, 92, 255))
    # shadowed porch, then columns
    d.rectangle([68 * s, 132 * s, 188 * s, 198 * s], fill=(78, 66, 54, 255))
    d.pieslice([110 * s, 146 * s, 146 * s, 188 * s], 180, 360, fill=(42, 30, 24, 255))
    d.rectangle([110 * s, 166 * s, 146 * s, 198 * s], fill=(42, 30, 24, 255))
    col_w = 11 * s
    gap = 9.2 * s
    x0 = 72 * s
    for i in range(6):
        x = x0 + i * (col_w + gap)
        col = column_sprite(col_w, 62 * s)
        im.paste(col, (int(x), int(134 * s)), col)
        d.rectangle([x - 1, 130 * s, x + col_w + 1, 136 * s], fill=(226, 214, 190, 255))
        d.rectangle([x - 2, 192 * s, x + col_w + 2, 200 * s], fill=(186, 172, 148, 255))
    # steps, wider toward the viewer
    for i, inset in enumerate((0, 10, 18)):
        y = 200 * s + i * 8 * s
        x1 = (70 + inset) * s
        x2 = (186 - inset) * s
        d.rectangle([x1, y, x2, y + 8 * s], fill=shade_of(stone, 0.94 - i * 0.07) + (255,))
        d.rectangle([x1, y, x2, y + 2.5 * s], fill=shade_of(stone, 1.08) + (255,))
    # lantern on the dome
    d.rectangle([121 * s, 58 * s, 135 * s, 74 * s], fill=(206, 190, 156, 255))
    d.rectangle([119 * s, 56 * s, 137 * s, 60 * s], fill=(150, 124, 78, 255))
    d.polygon([(118 * s, 58 * s), (128 * s, 44 * s), (138 * s, 58 * s)], fill=(164, 136, 84, 255))
    return im.resize((256, 256), Image.Resampling.LANCZOS)


def save(im, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "PNG")
    print("wrote", os.path.relpath(path, ROOT), im.size, im.mode)


def paste_sprite(base, sprite, x, y):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    layer.paste(sprite, (int(x), int(y)), sprite)
    return Image.alpha_composite(base, layer)


def blit_hex_tile(base, tile, cx, cy, size):
    radius_px = tile.size[1] * (RADIUS / (2 * RADIUS + 2 * PAD))
    scale = (size * 1.012) / radius_px
    dw = max(1, int(round(tile.size[0] * scale)))
    dh = max(1, int(round(tile.size[1] * scale)))
    spr = tile.resize((dw, dh), Image.Resampling.LANCZOS)
    return paste_sprite(base, spr, cx - dw / 2, cy - dh / 2)


def write_proof(tiles, city, capital):
    """Small coast at roughly map scale: water, plains, forest, mountain, city, capital."""
    size = 64
    cells = [
        (0, 0, "water", None),
        (1, 0, "water", None),
        (2, 0, "water", None),
        (-1, 1, "water", None),
        (0, 1, "water", None),
        (1, 1, "plains", "city"),
        (2, 1, "forest", None),
        (0, 2, "plains", None),
        (1, 2, "mountain", None),
        (2, 2, "plains", "capital"),
    ]
    pts = []
    for q, r, _t, _s in cells:
        x = size * math.sqrt(3) * (q + r / 2)
        y = size * 1.5 * r
        pts.append((x, y))
    pad = 28
    minx = min(p[0] for p in pts) - size - pad
    maxx = max(p[0] for p in pts) + size + pad
    miny = min(p[1] for p in pts) - size - pad
    maxy = max(p[1] for p in pts) + size + pad
    W = int(math.ceil(maxx - minx))
    H = int(math.ceil(maxy - miny))
    base = Image.new("RGBA", (W, H), (42, 49, 36, 255))
    ox, oy = -minx, -miny
    for q, r, terrain, _s in cells:
        x = ox + size * math.sqrt(3) * (q + r / 2)
        y = oy + size * 1.5 * r
        base = blit_hex_tile(base, tiles[terrain], x, y, size)
    for q, r, _t, sett in cells:
        if not sett:
            continue
        x = ox + size * math.sqrt(3) * (q + r / 2)
        y = oy + size * 1.5 * r
        img = capital if sett == "capital" else city
        box = size * (0.96 if sett == "capital" else 0.68)
        bottom = y + size * (0.08 if sett == "capital" else 0.02)
        spr = img.resize((int(box), int(box)), Image.Resampling.LANCZOS)
        base = paste_sprite(base, spr, x - box / 2, bottom - box)
    path = os.path.join(ROOT, "map-tile-proof.png")
    base.save(path, "PNG")
    print("wrote", os.path.relpath(path, ROOT), base.size)


def main():
    terrain_dir = os.path.join(ART, "terrain")
    tiles = {}
    for name in DRAW:
        tiles[name] = build_terrain(name)
        save(tiles[name], os.path.join(terrain_dir, name + ".png"))
    # soft hints. Select stays a quiet brass wash.
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
    city = draw_city()
    capital = draw_capital()
    save(city, os.path.join(sett, "city.png"))
    save(capital, os.path.join(sett, "capital.png"))
    write_proof(tiles, city, capital)
    w, h = tile_size()
    print("tile", w, h, "radius_frac", RADIUS / h)


if __name__ == "__main__":
    main()
