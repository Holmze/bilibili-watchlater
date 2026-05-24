from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "store"


def font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/Library/Fonts/Arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text(draw, xy, value, size=24, fill="#1f2328", bold=False):
    draw.text(xy, value, fill=fill, font=font(size, bold))


def icon(size):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pad = max(2, size // 12)
    rounded(d, (pad, pad, size - pad - 1, size - pad - 1), max(4, size // 6), "#fb7299")
    d.polygon(
        [(size * .39, size * .30), (size * .39, size * .70), (size * .72, size * .50)],
        fill="white",
    )
    r = size * .17
    cx = size * .28
    cy = size * .72
    width = max(1, size // 18)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline="white", width=width)
    d.line((cx, cy, cx, cy - r * .65), fill="white", width=width)
    d.line((cx, cy, cx + r * .55, cy), fill="white", width=width)
    return im


def paste_icon(im, xy, size):
    im.alpha_composite(icon(size), xy)


def draw_popup_mock(draw, x, y, w, h):
    rounded(draw, (x, y, x + w, y + h), 16, "#ffffff", "#d0d7de", 2)
    text(draw, (x + 28, y + 24), "Bilibili Watchlater", 28, bold=True)
    text(draw, (x + 28, y + 62), "Dry-run | Auto 30m | Ready | 8 UPs", 17, "#57606a")
    text(draw, (x + w - 116, y + 30), "Options", 18, "#0969da")
    rounded(draw, (x + 28, y + 98, x + w - 28, y + 158), 10, "#f6f8fa", "#d0d7de")
    text(draw, (x + 46, y + 117), "Dry-run | trigger=manual | dry_run=5 | added=0 | failed=0", 18, "#1f2328")
    button_y = y + 182
    labels = ["Sync now", "Pause auto", "Add page UP", "Diagnose"]
    for i, label in enumerate(labels):
        bx = x + 28 + (i % 2) * ((w - 68) // 2 + 12)
        by = button_y + (i // 2) * 52
        bw = (w - 68) // 2
        rounded(draw, (bx, by, bx + bw, by + 38), 8, "#0969da" if i == 0 else "#57606a")
        text(draw, (bx + 22, by + 9), label, 16, "white", bold=True)
    text(draw, (x + 28, y + 302), "Latest Results", 19, bold=True)
    rows = [
        ("dry_run", "睡前消息1056: 3万吨黄金 挡不住AI危机", "316568752"),
        ("skipped_seen", "科技周报: AI 工具与浏览器自动化", "UP Owner"),
        ("added", "新视频已加入稍后再看", "Another UP"),
    ]
    colors = {"dry_run": "#8250df", "skipped_seen": "#57606a", "added": "#1a7f37"}
    for i, (status, title, owner) in enumerate(rows):
        ry = y + 334 + i * 76
        rounded(draw, (x + 28, ry, x + w - 28, ry + 62), 10, "#ffffff", "#d8dee4")
        rounded(draw, (x + 44, ry + 18, x + 144, ry + 42), 12, colors[status])
        text(draw, (x + 57, ry + 21), status, 12, "white", bold=True)
        text(draw, (x + 162, ry + 12), title, 16, "#1f2328", bold=True)
        text(draw, (x + 162, ry + 36), owner, 13, "#57606a")


def draw_options_mock(draw, x, y, w, h):
    rounded(draw, (x, y, x + w, y + h), 18, "#ffffff", "#d0d7de", 2)
    text(draw, (x + 30, y + 26), "Bilibili Watchlater", 30, bold=True)
    text(draw, (x + 30, y + 66), "Manage UP owners, sync rules, and local settings.", 17, "#57606a")
    rounded(draw, (x + w - 128, y + 28, x + w - 30, y + 66), 8, "#0969da")
    text(draw, (x + w - 96, y + 38), "Save", 15, "white", bold=True)
    cards = [("Mode", "Dry-run"), ("Auto Sync", "30m"), ("UP Owners", "8"), ("Status", "Ready")]
    for i, (label, value) in enumerate(cards):
        cx = x + 30 + i * ((w - 78) // 4)
        cy = y + 106
        cw = (w - 118) // 4
        rounded(draw, (cx, cy, cx + cw, cy + 76), 10, "#f6f8fa", "#d0d7de")
        text(draw, (cx + 14, cy + 13), label, 13, "#57606a")
        text(draw, (cx + 14, cy + 36), value, 24, "#1f2328", bold=True)
    text(draw, (x + 30, y + 220), "UP Owners", 20, bold=True)
    owners = [
        ("影视飓风", "946974", "#fb7299"),
        ("睡前消息编辑部", "316568752", "#23ade5"),
        ("科技观察", "777536", "#1a7f37"),
    ]
    for i, (name, mid, color) in enumerate(owners):
        ry = y + 258 + i * 92
        rounded(draw, (x + 30, ry, x + w - 30, ry + 76), 10, "#ffffff", "#d8dee4")
        draw.ellipse((x + 48, ry + 14, x + 96, ry + 62), fill=color)
        text(draw, (x + 116, ry + 13), name, 18, bold=True)
        text(draw, (x + 116, ry + 40), f"mid {mid} | profile refreshed", 14, "#57606a")
        rounded(draw, (x + w - 142, ry + 21, x + w - 48, ry + 55), 8, "#57606a")
        text(draw, (x + w - 118, ry + 29), "Open", 14, "white", bold=True)


def screenshot_one():
    im = Image.new("RGBA", (1280, 800), "#f5f6f8")
    d = ImageDraw.Draw(im)
    paste_icon(im, (58, 50), 86)
    text(d, (162, 54), "Bilibili Watchlater", 42, bold=True)
    text(d, (164, 108), "Preview, sync, and manage Bilibili Watch Later automation from your browser.", 24, "#57606a")
    draw_popup_mock(d, 88, 190, 500, 540)
    draw_options_mock(d, 638, 164, 560, 566)
    im.convert("RGB").save(OUT / "screenshots" / "01-overview-1280x800.png", quality=95)


def screenshot_two():
    im = Image.new("RGBA", (1280, 800), "#ffffff")
    d = ImageDraw.Draw(im)
    text(d, (70, 54), "Manage UP owners with avatars", 42, bold=True)
    text(d, (72, 108), "Refresh Bilibili profile names and avatars, then sync only the creators you choose.", 24, "#57606a")
    draw_options_mock(d, 90, 164, 1100, 560)
    im.convert("RGB").save(OUT / "screenshots" / "02-owner-management-1280x800.png", quality=95)


def screenshot_three():
    im = Image.new("RGBA", (1280, 800), "#f5f6f8")
    d = ImageDraw.Draw(im)
    text(d, (72, 60), "Dry-run first, live sync when ready", 42, bold=True)
    text(d, (74, 116), "Automatic live sync requires a separate safety switch before videos are added.", 24, "#57606a")
    draw_popup_mock(d, 390, 180, 500, 540)
    im.convert("RGB").save(OUT / "screenshots" / "03-popup-results-1280x800.png", quality=95)


def promo_small():
    im = Image.new("RGBA", (440, 280), "#fb7299")
    d = ImageDraw.Draw(im)
    paste_icon(im, (28, 34), 82)
    text(d, (128, 42), "Bilibili", 34, "white", bold=True)
    text(d, (128, 82), "Watchlater", 34, "white", bold=True)
    text(d, (32, 150), "Auto-add selected UP owners' latest videos", 21, "white", bold=True)
    text(d, (32, 184), "Dry-run preview | Avatars | Local settings", 17, "#fff4f7")
    im.convert("RGB").save(OUT / "promo" / "small-promo-440x280.png", quality=95)


def promo_large():
    im = Image.new("RGBA", (1400, 560), "#f5f6f8")
    d = ImageDraw.Draw(im)
    paste_icon(im, (80, 92), 120)
    text(d, (230, 104), "Bilibili Watchlater", 58, bold=True)
    text(d, (234, 180), "Keep up with selected UP owners without manually hunting for new uploads.", 29, "#57606a")
    rounded(d, (235, 260, 450, 312), 12, "#0969da")
    text(d, (274, 274), "Dry-run first", 23, "white", bold=True)
    rounded(d, (470, 260, 700, 312), 12, "#57606a")
    text(d, (510, 274), "Auto sync safely", 23, "white", bold=True)
    draw_popup_mock(d, 820, 52, 480, 456)
    im.convert("RGB").save(OUT / "promo" / "large-promo-1400x560.png", quality=95)


def edge_logo():
    im = Image.new("RGBA", (300, 300), "#ffffff")
    paste_icon(im, (40, 40), 220)
    im.convert("RGB").save(OUT / "edge" / "logo-300x300.png", quality=95)


def main():
    for path in [OUT / "screenshots", OUT / "promo", OUT / "edge"]:
        path.mkdir(parents=True, exist_ok=True)
    screenshot_one()
    screenshot_two()
    screenshot_three()
    promo_small()
    promo_large()
    edge_logo()
    print(f"Generated store assets under {OUT}")


if __name__ == "__main__":
    main()
