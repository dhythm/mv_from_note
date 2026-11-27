# 制作プロジェクト（Remotion。図は three.js、文字は DOM／CSS、生成動画は Seedance 2.5 Flash）

[企画書](../plan.html) を方向性として制作した本編一式。完成版は `out/final.mp4`（写しは `../output/final.mp4`。1920×1080・30fps・179.5 秒＝2:59.5、H.264／AAC、ナレーション＋BGM＋効果音。Git 管理外）。企画書から変えた点は [制作報告](../production-report.md)。

## 再現手順（このフォルダで）

1. Node.js（v24）・Python 3（numpy・scipy・Pillow、`requirements.txt`）・ffmpeg を用意し、`npm install`。Python は `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`。
2. 素材：`node tools/prepare-public.mjs` が `../assets/fonts/NotoSansJP-wght.ttf`（SIL OFL 1.1、許諾文同梱）と、採用した生成動画 2 本（`../assets/videos/adopted/*.mp4`）を `public/` へ写す。`render.mjs` が最初に実行する。
3. ナレーション：完成版の `audio/voice/*.mp3`（8 区切り）と文字ごとの時刻 `audio/voice/words.json` を同梱。原稿（`audio/narration.json`）を変えたときだけ `.venv/bin/python audio/tts.py`（ElevenLabs `eleven_v4`、声 Koichi - Japanese Deep Calm Narrator。キーは環境変数 `ELEVENLABS_API_KEY` かリポジトリ直下の `.env`）。読み違いの照合は `tools/transcribe.py`（Gemini）。
4. 声を置く：`.venv/bin/python audio/place.py` → `audio/voice/placed.wav`。
5. 音：`.venv/bin/python audio/bgm.py` → `audio/bgm.wav`（120 BPM、D minor／F major、効果音つき）。`.venv/bin/python audio/mix.py` → `public/mix.m4a`。
6. 全編：`node render.mjs full` → `out/final.mp4`。区間・スチル・検査は `render.mjs` 冒頭のコメントを参照。
7. 文字の機械検査：`node render.mjs check 0.25` → `out/bounds.log`。型検査：`npx tsc --noEmit`。

## 構成

- `src/timeline.json` / `src/timeline.ts`：8 カット（120 BPM、348 拍＝174.0 秒）＋エンドロゴ（5.5 秒）。`vt(カット, 語)` が声の語の時刻を返し、画面の語と図の動きはこれに合わせる。
- `src/figs.ts`：図の設計図（柱・棒・ドミノの列・夢の字・10 本の列・帯と面）。03 の棒の高さの比は 33.9 : 55.5。04 の倒れはフレーム時刻から決まる角度。
- `src/score.ts`：世界原点、カメラキー（図の層だけ）、速い振りのぼかし、生成動画インサート 2 本の区間。
- `src/world.tsx`：three.js の図の層。`src/type.tsx`：画面の語と図のラベル。`src/kit.tsx`：文字部品と色。
- `src/Main.tsx`：紙色 → 動画インサート → three.js → ラベル → 文字 → 紙の粒。検査とエンドロゴへの横振り。`src/components/Logo.tsx`：`okady-work-logo.svg` のフレーム再現。
