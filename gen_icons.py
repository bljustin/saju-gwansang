# -*- coding: utf-8 -*-
"""앱 아이콘 생성 — 오행 5색 원 + 중앙 '命'. Pillow로 직접 그림."""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "icons")
os.makedirs(OUT, exist_ok=True)

BG = (43, 38, 32)          # 먹빛
GOLD = (212, 175, 55)
OHAENG = [(46, 125, 91), (192, 57, 43), (184, 134, 11), (142, 154, 175), (31, 58, 95)]  # 목화토금수

def find_font(size):
    for p in [r"C:\Windows\Fonts\malgunbd.ttf", r"C:\Windows\Fonts\malgun.ttf",
              r"C:\Windows\Fonts\batang.ttc", r"C:\Windows\Fonts\gulim.ttc"]:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def draw_icon(size, maskable=False):
    S = size * 4  # 슈퍼샘플링
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = int(S * 0.06) if maskable else 0
    # 배경 라운드 사각형
    r = int(S * 0.22)
    d.rounded_rectangle([pad, pad, S - pad, S - pad], radius=r, fill=BG)
    # 오행 5색 점 (상단 호)
    import math
    cx, cy = S / 2, S / 2
    ring = S * 0.33
    dot = int(S * 0.045)
    for i, col in enumerate(OHAENG):
        ang = math.radians(-90 + i * 72)
        x = cx + ring * math.cos(ang)
        y = cy + ring * math.sin(ang)
        d.ellipse([x - dot, y - dot, x + dot, y + dot], fill=col)
    # 중앙 글자
    font = find_font(int(S * 0.42))
    txt = "命"
    bbox = d.textbbox((0, 0), txt, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((cx - tw / 2 - bbox[0], cy - th / 2 - bbox[1]), txt, font=font, fill=GOLD)
    return img.resize((size, size), Image.LANCZOS)

draw_icon(192).save(os.path.join(OUT, "icon-192.png"))
draw_icon(512).save(os.path.join(OUT, "icon-512.png"))
draw_icon(512, maskable=True).save(os.path.join(OUT, "icon-maskable-512.png"))
# 애플 터치 아이콘 (여백 없는 180px)
draw_icon(180).save(os.path.join(OUT, "apple-touch-icon.png"))
print("아이콘 4종 생성 완료:", OUT)
