"""Render the fictional UI insert and placement previews for cut 05."""

from pathlib import Path
from io import BytesIO
import json
import math
import subprocess

from PIL import Image, ImageDraw, ImageFont


ASSETS = Path(__file__).resolve().parents[1]
FONT = ASSETS / "fonts/NotoSansJP-wght.ttf"
PAPER = "#f7f5ef"
BLUE = "#2b59ff"
INK = "#1a1a1a"
ORANGE = "#ff7a00"
BOUNDS = []


def font(size, weight=700):
    result = ImageFont.truetype(str(FONT), size)
    result.set_variation_by_axes([weight])
    return result


def text(draw, xy, content, size, fill=INK, weight=700):
    face = font(size, weight)
    draw.text(xy, content, font=face, fill=fill, anchor="lt")
    bounds = draw.textbbox(xy, content, font=face, anchor="lt")
    BOUNDS.append({"text": content, "box": bounds, "canvas": draw.im.size})


def smooth(start, end, time):
    value = max(0, min(1, (time - start) / (end - start)))
    return value * value * (3 - 2 * value)


def cursor(draw, x, y):
    points = [(x, y), (x, y + 34), (x + 9, y + 26),
              (x + 17, y + 42), (x + 25, y + 38),
              (x + 17, y + 23), (x + 29, y + 23)]
    draw.polygon(points, fill=INK, outline="white", width=2)


def window(draw, x, y, title, active):
    edge = BLUE if active else "#bec7e6"
    draw.rounded_rectangle((x + 6, y + 10, x + 514, y + 450),
                           radius=16, fill="#e2e1dd")
    draw.rounded_rectangle((x, y, x + 508, y + 440),
                           radius=16, fill="white", outline=edge, width=3)
    draw.rounded_rectangle((x, y, x + 508, y + 70), radius=16, fill=BLUE)
    draw.rectangle((x, y + 35, x + 508, y + 70), fill=BLUE)
    text(draw, (x + 28, y + 20), title, 29, "white")


def ui_frame(time):
    image = Image.new("RGB", (1200, 680), PAPER)
    draw = ImageDraw.Draw(image)
    travel = smooth(1, 1.7, time)
    returning = smooth(2.9, 3.7, time)
    left_y = round(104 - 8 * math.sin(time * 1.2))
    right_y = round(158 + 8 * math.sin(time * 1.2))
    left_active = time < 1.4 or time >= 3.3
    window(draw, 44, left_y, "集計", left_active)
    window(draw, 646, right_y, "整形", not left_active)

    text(draw, (74, left_y + 108), "処理結果", 24, "#666666", 400)
    draw.rounded_rectangle((74, left_y + 157, 522, left_y + 259),
                           radius=8, fill="#edf1ff", outline="#cad5ff", width=2)
    text(draw, (95, left_y + 193), "入力用データ", 32)
    draw.rounded_rectangle((314, left_y + 305, 520, left_y + 373),
                           radius=8, fill=BLUE)
    text(draw, (339, left_y + 325), "コピー", 27, "white")
    if time >= .8:
        text(draw, (74, left_y + 321), "コピー済み", 23, BLUE)

    text(draw, (676, right_y + 108), "入力", 24, "#666666", 400)
    draw.rounded_rectangle((676, right_y + 157, 1124, right_y + 259),
                           radius=8, fill="#edf1ff" if time >= 2 else "#fafafa",
                           outline=BLUE if time >= 1.6 else "#dddddd", width=2)
    if time >= 2:
        text(draw, (697, right_y + 193), "入力用データ", 32)
    else:
        text(draw, (697, right_y + 195), "ここに貼り付け", 27, "#777777", 400)
    draw.rounded_rectangle((916, right_y + 305, 1122, right_y + 373),
                           radius=8, fill=BLUE)
    text(draw, (941, right_y + 325), "貼り付け", 27, "white")
    if time >= 2:
        text(draw, (676, right_y + 321), "受け取り済み", 23, BLUE)

    x = 437 + (1010 - 437) * travel - (1010 - 437) * returning
    y = left_y + 347 + (right_y - left_y) * travel
    cursor(draw, x, y)
    text(draw, (44, 626), "操作イメージ・架空の画面", 22, "#666666", 400)
    return image


def encode_frames(path, frames, size, fps=30):
    command = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo",
               "-pix_fmt", "rgb24", "-s", f"{size[0]}x{size[1]}",
               "-r", str(fps), "-i", "-", "-an", "-c:v", "libx264",
               "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p",
               "-movflags", "+faststart", str(path)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    for frame in frames:
        process.stdin.write(frame.tobytes())
    process.stdin.close()
    if process.wait():
        raise RuntimeError("ffmpeg could not encode the UI asset")


def block(draw, x, y, width=230, height=125):
    draw.rectangle((x, y, x + width, y + height), fill=BLUE)
    draw.rectangle((x, y + height * .35, x + 24, y + height * .65), fill=PAPER)
    draw.rectangle((x + width, y + height * .35,
                    x + width + 24, y + height * .65), fill=BLUE)


def placement_frame(time):
    image = Image.new("RGB", (1920, 1080), PAPER)
    draw = ImageDraw.Draw(image)
    text(draw, (80, 54), "量が増えると、", 55, "#666666")
    image.paste(ui_frame(time).resize((1164, 660)), (60, 150))
    draw.rectangle((1270, 208, 1889, 769), fill=PAPER, outline="#dedbd4", width=2)
    text(draw, (1270, 786), "AI生成のイメージ / Created with Grok", 22, "#666666", 400)
    text(draw, (80 + round(18 * time), 870), "手で渡すのが重い。", 90)
    return image


def storyboard_end():
    image = Image.new("RGB", (1920, 1080), PAPER)
    draw = ImageDraw.Draw(image)
    for x in (200, 825, 1450):
        block(draw, x, 200)
    draw.line([(435, 270), (750, 475), (1450, 275)], fill=ORANGE, width=7)
    draw.line([(1080, 275), (530, 490)], fill=ORANGE, width=7)
    text(draw, (845, 430), "？", 190, ORANGE)
    text(draw, (260, 830), "どれに、何を入れた？", 90)
    return image


def storyboard_six():
    image = Image.new("RGB", (1920, 1080), PAPER)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((575, 180, 1345, 650), radius=18, fill=BLUE)
    crack = [(930, 180), (1000, 300), (885, 385), (1050, 470), (975, 650)]
    draw.line(crack, fill="#e5322d", width=13)
    draw.line([(885, 385), (740, 420), (675, 530)], fill="#e5322d", width=9)
    draw.line([(1050, 470), (1190, 380), (1285, 410)], fill="#e5322d", width=9)
    text(draw, (260, 830), "一か所が、全体に響く。", 90)
    return image


if __name__ == "__main__":
    target = ASSETS / "footage/cut05-manual-transfer-ui.mp4"
    encode_frames(target, (ui_frame(frame / 30) for frame in range(120)), (1200, 680))
    encode_frames(ASSETS / "review/cut05-layout-base.mp4",
                  (placement_frame(frame / 30) for frame in range(120)), (1920, 1080))
    ui_frame(2.5).save(ASSETS / "footage/cut05-ui-poster.webp", quality=93)
    storyboard_end().resize((1280, 720)).save(
        ASSETS / "storyboard/cut-05-end.webp", quality=93)
    storyboard_six().resize((1280, 720)).save(
        ASSETS / "storyboard/cut-06-end.webp", quality=93)
    source_video = ASSETS / "source/cut05-hand-mouse-grok-source.mp4"
    if source_video.exists():
        hand_video = ASSETS / "footage/cut05-hand-mouse-4s.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "0.5", "-i",
                        str(source_video), "-t", "4", "-map", "0:v:0", "-an",
                        "-c:v", "libx264", "-crf", "18", "-preset", "fast",
                        "-movflags", "+faststart", str(hand_video)], check=True)
        composite = ASSETS / "review/cut05-placement-4s.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i",
                        str(ASSETS / "review/cut05-layout-base.mp4"), "-i", str(hand_video),
                        "-filter_complex",
                        "[1:v]scale=1000:562,crop=620:562:240:0[h];"
                        "[0:v][h]overlay=1270:208:shortest=1[v]",
                        "-map", "[v]", "-an", "-c:v", "libx264", "-crf", "18",
                        "-preset", "fast", "-movflags", "+faststart", str(composite)], check=True)
        for time, target, resize in [
                (1.5, ASSETS / "review/cut05-placement.webp", None),
                (0, ASSETS / "storyboard/cut-05-start.webp", (1280, 720))]:
            encoded = subprocess.check_output([
                "ffmpeg", "-v", "error", "-ss", str(time), "-i", str(composite),
                "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"])
            still = Image.open(BytesIO(encoded))
            if resize:
                still = still.resize(resize)
            still.save(target, quality=94)
    violations = [row for row in BOUNDS
                  if row["box"][0] < 30 or row["box"][1] < 20
                  or row["box"][2] > row["canvas"][0] - 30
                  or row["box"][3] > row["canvas"][1] - 20]
    (ASSETS / "review/ui-bounds.json").write_text(
        json.dumps({"checked_text_instances": len(BOUNDS),
                    "edge_violations": violations}, ensure_ascii=False, indent=2))
