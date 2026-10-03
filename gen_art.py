#!/usr/bin/env python3
"""Generate crisp illustrated sprites for Fronts, 1914."""
from PIL import Image, ImageDraw
import os, math

OUT = "/workspace/ww1-fronts/art"
os.makedirs(OUT, exist_ok=True)
SIZE = 64

def save(img, name):
    img.save(os.path.join(OUT, name), "PNG")
    print("wrote", name)

def hex_mask(draw, cx, cy, r, fill, outline=None, width=2):
    pts = []
    for i in range(6):
        a = math.pi/180 * (60*i - 30)
        pts.append((cx + r*math.cos(a), cy + r*math.sin(a)))
    draw.polygon(pts, fill=fill, outline=outline)
    if outline and width > 1:
        draw.line(pts+[pts[0]], fill=outline, width=width)

# --- Terrain tiles (pointy-top hex style square with hex drawn) ---
terrains = {
    "plains":  ((120, 160, 90), (90, 130, 60)),
    "forest":  ((50, 110, 55), (30, 80, 40)),
    "mountain":((140, 130, 120), (90, 85, 80)),
    "hills":   ((150, 155, 100), (110, 120, 70)),
    "water":   ((50, 100, 170), (30, 70, 140)),
    "trench":  ((110, 105, 80), (70, 65, 50)),
    "desert":  ((210, 190, 140), (180, 160, 110)),
    "swamp":   ((80, 110, 80), (50, 80, 55)),
}

for name, (fill, edge) in terrains.items():
    img = Image.new("RGBA", (SIZE, SIZE), (0,0,0,0))
    d = ImageDraw.Draw(img)
    hex_mask(d, 32, 32, 30, fill, edge, 2)
    if name == "forest":
        for ox,oy in [(20,28),(32,22),(44,30),(28,38)]:
            d.ellipse([ox-4,oy-6,ox+4,oy+2], fill=(20,70,30))
            d.rectangle([ox-1,oy,ox+1,oy+6], fill=(60,40,20))
    elif name == "mountain":
        d.polygon([(16,42),(32,12),(48,42)], fill=(170,165,155), outline=(80,75,70))
        d.polygon([(28,42),(40,22),(52,42)], fill=(130,125,120))
        d.polygon([(30,18),(32,12),(36,20)], fill=(240,240,245))
    elif name == "hills":
        d.ellipse([12,28,36,48], fill=(130,140,80))
        d.ellipse([28,24,52,46], fill=(145,150,90))
    elif name == "water":
        for y in (22,32,42):
            d.arc([10,y-4,54,y+8], 200, 340, fill=(180,220,255), width=2)
    elif name == "trench":
        d.line([(12,28),(52,28)], fill=(50,45,35), width=4)
        d.line([(14,36),(50,36)], fill=(40,35,28), width=3)
        d.rectangle([18,20,22,28], fill=(70,60,40))
        d.rectangle([40,20,44,28], fill=(70,60,40))
    elif name == "desert":
        d.ellipse([18,34,30,42], fill=(190,170,120))
        d.ellipse([36,30,48,40], fill=(200,175,125))
    elif name == "plains":
        for x in range(16,50,6):
            d.line([(x,40),(x+2,34)], fill=(90,140,60), width=1)
    elif name == "swamp":
        d.ellipse([18,34,28,42], fill=(40,70,50))
        d.ellipse([36,30,48,40], fill=(45,75,55))
        d.line([(20,28),(24,36)], fill=(30,60,35), width=2)
    save(img, f"terrain_{name}.png")

# --- City / capital ---
for kind, color in [("city",(200,180,100)), ("capital",(220,190,60))]:
    img = Image.new("RGBA", (SIZE, SIZE), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # base
    d.ellipse([10,40,54,56], fill=(80,70,50))
    # walls
    d.rectangle([16,28,48,46], fill=color, outline=(60,50,30), width=2)
    # towers
    for x in (14, 28, 42):
        d.rectangle([x,18,x+10,46], fill=color, outline=(60,50,30))
        d.polygon([(x,18),(x+5,10),(x+10,18)], fill=(180,50,40))
    if kind == "capital":
        d.rectangle([28,6,36,14], fill=(200,40,40))
        d.polygon([(28,6),(42,10),(28,14)], fill=(220,50,50))
    save(img, f"{kind}.png")

# --- Unit sprites ---
def draw_soldier(d, body, helmet, rifle=True):
    # shadow
    d.ellipse([18,48,46,58], fill=(0,0,0,60))
    # legs
    d.rectangle([26,40,32,52], fill=body)
    d.rectangle([34,40,40,52], fill=body)
    # torso
    d.rectangle([24,24,42,42], fill=body)
    # head
    d.ellipse([27,14,39,28], fill=(220,180,140))
    # helmet
    d.ellipse([25,12,41,22], fill=helmet)
    d.rectangle([25,18,41,22], fill=helmet)
    if rifle:
        d.line([(42,28),(54,18)], fill=(60,40,20), width=3)
        d.rectangle([50,14,56,18], fill=(40,40,40))

units = {
    "infantry": ((70,90,60), (50,70,40)),
    "cavalry": ((90,70,50), (60,45,30)),
    "artillery": ((80,80,70), (50,50,45)),
    "ship": ((40,50,70), (30,35,50)),
    "dreadnought": ((35,45,65), (20,25,40)),
    "artillery75": ((100,90,60), (70,60,40)),
    "stormtrooper": ((55,55,55), (35,35,35)),
    "mountain_inf": ((100,90,50), (70,60,35)),
    "mass_infantry": ((60,100,60), (40,70,40)),
    "fortified_inf": ((120,80,50), (90,50,30)),
    "alpini": ((50,90,70), (30,60,45)),
    "guerrilla": ((90,70,40), (60,50,25)),
    "fortress_gun": ((70,70,80), (40,40,50)),
    "fighter": ((160,160,170), (100,100,110)),
}

for name, (body, helm) in units.items():
    img = Image.new("RGBA", (SIZE, SIZE), (0,0,0,0))
    d = ImageDraw.Draw(img)
    if name in ("ship", "dreadnought"):
        d.ellipse([8,40,56,56], fill=(30,60,100,80))
        # hull
        hull = (40,50,70) if name=="ship" else (30,40,55)
        d.polygon([(8,38),(56,38),(50,48),(14,48)], fill=hull, outline=(20,25,35))
        d.rectangle([20,22,44,38], fill=hull)
        # smokestacks
        stacks = 2 if name=="ship" else 3
        for i in range(stacks):
            x = 22 + i*8
            d.rectangle([x,12,x+5,24], fill=(50,50,55))
            d.ellipse([x-1,8,x+6,14], fill=(120,120,130,150))
        # gun
        d.rectangle([44,30,58,34], fill=(40,40,40))
        if name=="dreadnought":
            d.rectangle([10,32,20,36], fill=(40,40,40))
            d.ellipse([24,26,32,34], fill=(60,60,65))
    elif name == "cavalry":
        # horse
        d.ellipse([12,34,48,52], fill=(90,60,40))
        d.ellipse([40,28,54,42], fill=(90,60,40))
        d.rectangle([16,48,20,58], fill=(70,50,30))
        d.rectangle([40,48,44,58], fill=(70,50,30))
        # rider
        d.rectangle([28,20,40,36], fill=body)
        d.ellipse([29,10,39,22], fill=(220,180,140))
        d.ellipse([27,8,41,16], fill=helm)
    elif name in ("artillery", "artillery75", "fortress_gun"):
        # gun carriage
        d.ellipse([12,42,28,56], fill=(40,40,40))
        d.ellipse([36,42,52,56], fill=(40,40,40))
        d.rectangle([18,34,46,46], fill=body)
        barrel_len = 58 if "75" in name or "fortress" in name else 52
        d.rectangle([30,24,barrel_len,32], fill=(50,50,50))
        if "75" in name:
            d.rectangle([46,20,52,28], fill=(180,150,50))  # brass accent
        if "fortress" in name:
            d.rectangle([14,28,28,40], fill=(80,80,90))  # shield
    elif name == "fighter":
        # biplane
        d.ellipse([20,30,48,42], fill=body)
        d.rectangle([8,28,56,32], fill=helm)  # upper wing
        d.rectangle([12,40,52,44], fill=helm)  # lower
        d.rectangle([44,26,58,36], fill=(200,180,140))  # nose
        d.polygon([(16,32),(4,20),(8,32)], fill=helm)  # tail
        d.line([(28,28),(28,20)], fill=(80,80,80), width=2)
        d.ellipse([26,16,34,24], fill=(100,100,100))  # prop blur
    elif name == "stormtrooper":
        draw_soldier(d, body, helm)
        # grenades / gear
        d.ellipse([20,30,26,36], fill=(60,80,50))
        d.rectangle([22,18,40,24], fill=(40,40,40))  # gas mask look
    elif name == "guerrilla":
        draw_soldier(d, body, (70,90,40), rifle=True)
        # camouflage blobs
        d.ellipse([26,26,34,32], fill=(50,80,40))
        d.ellipse([34,34,42,40], fill=(80,60,30))
    else:
        draw_soldier(d, body, helm)
        if name == "mountain_inf":
            d.polygon([(20,50),(28,36),(36,50)], fill=(160,160,170))  # mountain hint
        if name == "alpini":
            d.polygon([(30,8),(34,2),(38,8)], fill=(220,50,50))  # feather
        if name == "fortified_inf":
            d.rectangle([22,26,44,40], fill=(100,90,70,180))  # shield/armor
        if name == "mass_infantry":
            # second figure hint
            d.rectangle([14,28,24,44], fill=(50,90,50))
            d.ellipse([15,20,23,30], fill=(200,170,130))
    save(img, f"unit_{name}.png")

# Nation flags generated by gen_flags.py (run after terrain/units)

# UI icons
for name, color in [("star",(255,210,50)), ("tech",(100,180,255)), ("endturn",(80,180,100)), ("skull",(180,180,180))]:
    img = Image.new("RGBA", (32,32), (0,0,0,0))
    d = ImageDraw.Draw(img)
    if name == "star":
        cx,cy,r = 16,16,12
        pts = []
        for i in range(10):
            a = math.pi/2 + i*math.pi/5
            rr = r if i%2==0 else r*0.45
            pts.append((cx+rr*math.cos(a), cy-rr*math.sin(a)))
        d.polygon(pts, fill=color, outline=(180,140,20))
    elif name == "tech":
        d.ellipse([4,4,28,28], fill=color, outline=(40,80,140), width=2)
        d.ellipse([11,11,21,21], fill=(255,255,255))
    elif name == "endturn":
        d.ellipse([2,2,30,30], fill=color)
        d.polygon([(10,8),(24,16),(10,24)], fill=(255,255,255))
    elif name == "skull":
        d.ellipse([6,4,26,24], fill=color)
        d.rectangle([10,20,22,28], fill=color)
        d.ellipse([10,10,15,16], fill=(40,40,40))
        d.ellipse([17,10,22,16], fill=(40,40,40))
    save(img, f"icon_{name}.png")

# Selection / highlight overlays
for name, col in [("select",(255,255,100,120)), ("move",(80,180,255,100)), ("attack",(255,60,60,120))]:
    img = Image.new("RGBA", (SIZE, SIZE), (0,0,0,0))
    d = ImageDraw.Draw(img)
    hex_mask(d, 32, 32, 28, col, col[:3]+(200,), 2)
    save(img, f"overlay_{name}.png")

print("Done. Files:", len(os.listdir(OUT)))
