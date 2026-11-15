#!/usr/bin/env python3
"""Generate Aero installer art (welcome + finish banners).

Reads the app version from package.json so the version pill in the banner
always matches the build. Outputs 24-bit RGB BMPs sized for the NSIS page
banner control (100% x 50 dialog units) rendered at 3x for crispness and
consumed via NSD_SetStretchedImage.
"""

import json
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Control ≈ 501 x 81 px at 96 DPI (333u x 50u), render at 3x.
W, H = 1503, 246
LOGO_PATH = os.path.join(ROOT, "renderer", "assets", "logo-256.png")

INK = (29, 29, 31)          # #1D1D1F primary text
SUB = (110, 110, 115)       # #6E6E73 secondary text
PILL_BG = (238, 238, 242)   # #EEEEF2
AURORA_VIOLET = (196, 181, 253)
AURORA_TEAL = (153, 246, 228)
AURORA_PEACH = (254, 215, 170)


def find_font(bold=False, size=64):
    names = (
        ["DejaVuSans-Bold.ttf", "DejaVuSans.ttf"]
        if bold
        else ["DejaVuSans.ttf"]
    )
    for base in ("/usr/share/fonts/truetype/dejavu", "/usr/share/fonts"):
        for name in names:
            path = os.path.join(base, name)
            if os.path.exists(path):
                return ImageFont.truetype(path, size)
    raise SystemExit("no truetype font found")


def soft_blob(layer, cx, cy, rx, ry, color, alpha):
    """Elliptical aurora blob with heavy gaussian blur."""
    blob = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(blob)
    d.ellipse(
        (cx - rx, cy - ry, cx + rx, cy + ry),
        fill=color + (alpha,),
    )
    blob = blob.filter(ImageFilter.GaussianBlur(radius=90))
    layer.alpha_composite(blob)


def base_canvas(finish=False):
    img = Image.new("RGBA", (W, H), (255, 255, 255, 255))

    # very light vertical gradient (white -> #F7F7FA) that ends pure white
    grad = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(H):
        t = y / H
        v = int(250 - 6 * math.sin(t * math.pi))  # 250 -> 244 -> 250
        gd.line([(0, y), (W, y)], fill=(v, v, v + 2, 255))
    img.alpha_composite(grad)

    # aurora field (subtle, top-right heavy)
    aur = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    soft_blob(aur, int(W * 0.86), int(H * 0.30), 260, 150, AURORA_VIOLET, 120)
    soft_blob(aur, int(W * 1.00), int(H * 0.78), 220, 130, AURORA_TEAL, 110)
    soft_blob(aur, int(W * 0.62), int(H * 0.10), 170, 110, AURORA_PEACH, 90)
    if finish:
        soft_blob(aur, int(W * 0.10), int(H * 1.05), 240, 140, AURORA_TEAL, 90)
    img.alpha_composite(aur)

    # diagonal glass sheen
    sheen = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sheen)
    sd.polygon(
        [(int(W * 0.55), 0), (int(W * 0.75), 0), (int(W * 0.35), H), (int(W * 0.18), H)],
        fill=(255, 255, 255, 46),
    )
    img.alpha_composite(sheen)

    # fade bottom edge into page white (seamless transition)
    fade = Image.new("RGBA", (W, 60), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fade)
    for y in range(60):
        fd.line([(0, y), (W, y)], fill=(255, 255, 255, int(255 * y / 60)))
    img.alpha_composite(fade, (0, H - 60))
    return img


def draw_brand(img, finish=False):
    d = ImageDraw.Draw(img)
    x = 54  # ≈ 18px @1x

    logo = Image.open(LOGO_PATH).convert("RGBA")
    size = 118  # ≈ 39px @1x
    logo = logo.resize((size, size), Image.LANCZOS)
    img.alpha_composite(logo, (x, (H - size) // 2 - 4))
    x += size + 26

    word = "Aero"
    f_word = find_font(bold=True, size=78)
    tw = d.textbbox((0, 0), word, font=f_word)[2]
    ty = (H - (f_word.getbbox(word)[3] - f_word.getbbox(word)[1])) // 2 - 8
    d.text((x, ty), word, font=f_word, fill=INK)
    x += tw + 24

    version = json.load(open(os.path.join(ROOT, "package.json")))["version"]
    pill = "версия " + version if not finish else "установлено"
    f_pill = find_font(bold=False, size=34)
    pw = d.textbbox((0, 0), pill, font=f_pill)[2]
    ph = 54
    px, py = x, (H - ph) // 2 - 2
    d.rounded_rectangle((px, py, px + pw + 40, py + ph), radius=27, fill=PILL_BG)
    d.text((px + 20, py + (ph - 40) // 2), pill, font=f_pill, fill=SUB)

    if finish:
        # tiny sparkles for the "done" state
        f_sp = find_font(bold=False, size=40)
        for (sx, sy) in [(1120, 52), (1205, 120), (1310, 66), (1395, 150)]:
            d.text((sx, sy), "+", font=f_sp, fill=AURORA_VIOLET + (255,))
    return img


def main():
    os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
    for name, finish in (("installerLogo.bmp", False), ("installerFinishLogo.bmp", True)):
        img = draw_brand(base_canvas(finish), finish).convert("RGB")
        out = os.path.join(ROOT, "build", name)
        img.save(out, "BMP")
        print(f"OK {out} {img.size[0]}x{img.size[1]}")


if __name__ == "__main__":
    sys.exit(main())
