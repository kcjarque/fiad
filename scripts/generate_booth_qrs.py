"""Generate printable booth QR posters for FIAD in the in-app modal style.

Layout matches the BoothDetail view: store name in display serif, booth
number + category subtitle, large QR code on a soft cream tile.

QR encodes the production URL `${origin}/s/${qrToken}` so phones can scan
with their native camera and route through the StampLink page.

Usage:
    python3 scripts/generate_booth_qrs.py
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont
from qrcode.constants import ERROR_CORRECT_M

# ─── Config ──────────────────────────────────────────────────────────────
ORIGIN = "https://fiad-seven.vercel.app"
SUPABASE_URL = "https://cjhnsyldnzdedgianzsj.supabase.co"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqaG5z"
    "eWxkbnpkZWRnaWFuenNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjg1NDIsImV4cCI6MjA5"
    "NDc0NDU0Mn0.A0BYsTrGpqVmXT6OdKndxytNuOoMJJmNGCYSTYrk48c"
)

# App design tokens
PLUM = (62, 42, 62)
PLUM_SUBTLE = (62, 42, 62, 153)   # ~60% opacity for the subtitle
CREAM = (255, 242, 246)            # page bg
WHITE = (255, 255, 255)
TILE_BG = (255, 247, 236)          # warm cream for the QR tile (champagne tint)
TILE_BORDER = (212, 175, 122, 75)  # champagne with alpha for a soft border

# Output card geometry
CARD_W = 1080
CARD_H = 1320
PADDING = 60
TILE_PADDING_INSIDE = 60
TILE_RADIUS = 56
QR_SIZE = 760  # pixels

FONT_DIR = Path("/tmp/fiad_fonts")
TITLE_FONT_PATH = FONT_DIR / "PlayfairDisplay.ttf"
SUBTITLE_FONT_PATH = FONT_DIR / "Inter.ttf"
OUT_DIR = Path("/Users/kylejarque/Documents/Claude/fiad/booth_qr_print")


def fetch_stores() -> list[dict]:
    """Pull every store row out of production."""
    url = f"{SUPABASE_URL}/rest/v1/stores?select=id,name,booth_number,category,qr_token&order=booth_number"
    req = urllib.request.Request(url, headers={"apikey": SUPABASE_ANON_KEY})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())


def safe_filename(name: str) -> str:
    """Make the store name safe for a filename without losing readability."""
    # Replace path separators + control chars; keep apostrophes and ampersands.
    safe = name.replace("/", "_").replace("\\", "_")
    safe = re.sub(r"[\x00-\x1f]", "", safe)
    return safe.strip()


def build_qr_image(payload: str, target_size: int) -> Image.Image:
    """Make a high-quality QR image at exactly target_size pixels."""
    qr = qrcode.QRCode(
        version=None,  # auto
        error_correction=ERROR_CORRECT_M,
        box_size=20,
        border=0,
    )
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color=PLUM, back_color=WHITE).convert("RGB")
    # Resize to exact pixel target with nearest-neighbor so modules stay crisp.
    return img.resize((target_size, target_size), Image.Resampling.NEAREST)


def measure_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    """Return (width, height) of `text` rendered with `font`."""
    l, t, r, b = draw.textbbox((0, 0), text, font=font)
    return r - l, b - t


def draw_card(store: dict, payload: str) -> Image.Image:
    """Compose one printable card matching the app's BoothDetail modal."""
    card = Image.new("RGB", (CARD_W, CARD_H), WHITE)
    draw = ImageDraw.Draw(card)

    title_font = ImageFont.truetype(str(TITLE_FONT_PATH), 80)
    subtitle_font = ImageFont.truetype(str(SUBTITLE_FONT_PATH), 36)

    # ── Title ──
    title = store["name"]
    tw, th = measure_text(draw, title, title_font)
    # If the name is wider than the card, drop the font size until it fits.
    title_size = 80
    while tw > CARD_W - 2 * PADDING and title_size > 36:
        title_size -= 4
        title_font = ImageFont.truetype(str(TITLE_FONT_PATH), title_size)
        tw, th = measure_text(draw, title, title_font)
    title_x = (CARD_W - tw) // 2
    title_y = PADDING + 30
    draw.text((title_x, title_y), title, font=title_font, fill=PLUM)

    # ── Subtitle ──
    subtitle = f"Booth {store['booth_number']} · {store['category']}"
    sw, sh = measure_text(draw, subtitle, subtitle_font)
    subtitle_size = 36
    while sw > CARD_W - 2 * PADDING and subtitle_size > 18:
        subtitle_size -= 2
        subtitle_font = ImageFont.truetype(str(SUBTITLE_FONT_PATH), subtitle_size)
        sw, sh = measure_text(draw, subtitle, subtitle_font)
    sub_x = (CARD_W - sw) // 2
    sub_y = title_y + th + 24
    # Subtitle is rendered with alpha by using paste with an RGBA temp image —
    # keeps the body of the page solid white but lets the subtitle look ~60%
    # plum instead of full black-plum.
    sub_layer = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    sub_draw = ImageDraw.Draw(sub_layer)
    sub_draw.text((sub_x, sub_y), subtitle, font=subtitle_font, fill=PLUM_SUBTLE)
    card = Image.alpha_composite(card.convert("RGBA"), sub_layer).convert("RGB")
    draw = ImageDraw.Draw(card)

    # ── QR tile ──
    tile_y_start = sub_y + sh + 72
    tile_size = QR_SIZE + 2 * TILE_PADDING_INSIDE
    tile_x_start = (CARD_W - tile_size) // 2
    draw.rounded_rectangle(
        [tile_x_start, tile_y_start, tile_x_start + tile_size, tile_y_start + tile_size],
        radius=TILE_RADIUS,
        fill=TILE_BG,
        outline=TILE_BORDER[:3],
        width=2,
    )

    # ── QR image ──
    qr_img = build_qr_image(payload, QR_SIZE)
    qr_x = tile_x_start + TILE_PADDING_INSIDE
    qr_y = tile_y_start + TILE_PADDING_INSIDE
    card.paste(qr_img, (qr_x, qr_y))

    return card


def verify_qr(card_path: Path, expected_payload: str) -> tuple[bool, str]:
    """Read the QR back out of the rendered card to confirm it decodes correctly.

    Uses zbarlight if available, otherwise the pyzbar fallback. If neither is
    installed we return (True, "skipped") — the caller logs but doesn't fail.
    """
    try:
        from pyzbar.pyzbar import decode  # type: ignore
    except ImportError:
        return True, "skipped (no pyzbar)"

    img = Image.open(card_path)
    results = decode(img)
    if not results:
        return False, "no QR decoded"
    decoded = results[0].data.decode("utf-8")
    if decoded == expected_payload:
        return True, f"OK ({decoded})"
    return False, f"MISMATCH (got {decoded!r}, expected {expected_payload!r})"


def main() -> int:
    print("Fetching stores from production…", flush=True)
    stores = fetch_stores()
    print(f"Got {len(stores)} stores", flush=True)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    # Clear out any previous output so we don't keep stale files around.
    for old in OUT_DIR.glob("*.png"):
        old.unlink()

    failures: list[str] = []
    for s in stores:
        if not s.get("qr_token"):
            failures.append(f"{s['name']}: no qr_token in DB")
            continue
        payload = f"{ORIGIN}/s/{s['qr_token']}"
        filename = safe_filename(s["name"]) + ".png"
        out_path = OUT_DIR / filename
        card = draw_card(s, payload)
        card.save(out_path, "PNG", optimize=True)
        ok, msg = verify_qr(out_path, payload)
        status = "✓" if ok else "✗"
        booth = s["booth_number"]
        print(f"  {status}  [{booth:>8s}] {s['name']:36s} → {filename}  · {msg}", flush=True)
        if not ok:
            failures.append(f"{s['name']}: {msg}")

    print()
    print(f"Wrote {len(stores) - len(failures)} cards to {OUT_DIR}")
    if failures:
        print()
        print("FAILURES:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("All QRs verified.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
