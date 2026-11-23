# 制作プロジェクト（Remotion。図は three.js、文字は DOM／CSS、生成動画は Seedance 2.5 Flash）

[企画書](../plan.html) を方向性として制作した本編一式。完成版は `out/final.mp4`（1920×1080・30fps・111.0 秒＝1:51.0、H.264／AAC、ナレーション＋BGM＋効果音。Git 管理外）。

## 再現手順（このフォルダで）

1. Node.js（v24）・Python 3（numpy・scipy・Pillow、`requirements.txt`）・ffmpeg を用意し、`npm ci`。
2. 素材：`node tools/prepare-public.mjs` が `../assets/fonts/NotoSansJP-wght.ttf`（SIL OFL 1.1、許諾文同梱）および採用済み Seedance 2.5 Flash 動画 5 本（`../assets/videos/adopted/*.mp4`）を `public/` へ写す。`render.mjs` が最初に実行する。
3. ナレーション：完成版に使った `audio/voice/*.mp3`（7 区切り）を同梱。再出力に API 呼び出しは不要。原稿（`audio/narration.json`）を変えたときだけ `python3 audio/tts.py`（ElevenLabs `eleven_v4`、キーは環境変数 `ELEVENLABS_API_KEY` かリポジトリ直下の `.env`／`.env.local`）。
4. 声を置く：`python3 audio/place.py` → `audio/voice/placed.wav`, `placed.json`。
5. 音：`python3 audio/bgm.py` → `audio/bgm.wav`（116 BPM、本作新規）。`python3 audio/mix.py` → `public/mix.m4a`（BGM −8 dB、声のある間はさらに −9 dB、全体 −14 LUFS 付近）。
6. 全編：`node render.mjs full` → `out/final.mp4`。区間：`node render.mjs range <開始秒> <終了秒> <名前> [倍率] [1=音つき]`。
7. 文字の機械検査：`node render.mjs check 0.25` → `out/bounds.log`。型検査：`npx tsc --noEmit`。

## 構成

- `src/timeline.json` / `src/timeline.ts`：7 カット（116 BPM、204 拍＝105.52 秒）＋エンドロゴ（5.50 秒）。
- `src/score.ts`：各カットの世界原点、カメラキー列、カット間の速い振り、Seedance 2.5 Flash 動画インサート 5 本の区間・ワイプ・ベール設計。
- `src/world.tsx`：Three.js の図の層（3 層パララックスの点の列、減速・ピント送り風の藍の点、広い余白、通り道の線と線に乗る琥珀の点、藍の弧、珊瑚の斜線、固まってほどける点群）。
- `src/kit.tsx`：DOM／CSS の文字部品（`Line`, `Txt`, `slam`, `G`, `DBlur`）。
- `src/type.tsx`：画面の語、一塊で弾み出る吹き出し（Three.js の藍の点の投影へ動的同期）、縦書き（04 右・05 左）、検査用 `data-fig`。
- `src/Main.tsx`：紙色 → Seedance 動画インサート → Three.js → DOM／CSS 文字 → 紙の粒、安全域・重なり検査、エンドロゴへの横押し出し。
- `src/components/Logo.tsx`：リポジトリ直下 `okady-work-logo.svg` のフレーム再現。
