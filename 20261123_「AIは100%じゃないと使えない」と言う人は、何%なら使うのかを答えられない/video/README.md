# 制作プロジェクト（Remotion。図は three.js、文字は DOM／CSS、生成動画は Seedance 2.5 Flash）

[企画書](../plan.html) を方向性として制作した本編一式。完成版は `out/final.mp4`（写しは `../output/final.mp4`。1920×1080・30fps・118.5 秒＝1:58.5、H.264／AAC、ナレーション＋BGM＋効果音。Git 管理外）。企画書から変えた点は [制作報告](../production-report.md)。

## 再現手順（このフォルダで）

1. Node.js（v24）・Python 3（numpy・scipy・Pillow、`requirements.txt`）・ffmpeg を用意し、`npm install`。Python は `.venv/bin/python` を使う。
2. 素材：`node tools/prepare-public.mjs` が `../assets/fonts/NotoSansJP-wght.ttf`（SIL OFL 1.1、許諾文同梱）と、採用した Seedance 2.5 Flash 動画 7 本（`../assets/videos/adopted/*.mp4`）を `public/` へ写す。`render.mjs` が最初に実行する。
3. ナレーション：完成版に使った `audio/voice/*.mp3`（7 区切り）と、文字ごとの時刻 `audio/voice/words.json` を同梱。再出力に API 呼び出しは不要。原稿（`audio/narration.json`）を変えたときだけ `.venv/bin/python audio/tts.py`（ElevenLabs `eleven_v4`、キーは環境変数 `ELEVENLABS_API_KEY` かリポジトリ直下の `.env`／`.env.local`）。
4. 声を置く：`.venv/bin/python audio/place.py` → `audio/voice/placed.wav`, `placed.json`。
5. 音：`.venv/bin/python audio/bgm.py` → `audio/bgm.wav`（120 BPM、C major／A minor）。`.venv/bin/python audio/mix.py` → `public/mix.m4a`（BGM −8 dB、声のある間はさらに −9 dB、全体 −14 LUFS 付近）。`NOBGM=1` を付けると声だけの `public/voice.m4a`。
6. 全編：`node render.mjs full` → `out/final.mp4`。区間：`node render.mjs range <開始秒> <終了秒> <名前> [倍率] [1=音つき]`。スチル：`node render.mjs stills 0.5 <秒,秒,...>`、一覧は `.venv/bin/python tools/sheet.py <出力png> <列数> <秒> ...`。
7. 文字の機械検査：`node render.mjs check 0.25` → `out/bounds.log`。型検査：`npx tsc --noEmit`。

## 構成

- `src/timeline.json` / `src/timeline.ts`：7 カット（120 BPM、226 拍＝113.0 秒）＋エンドロゴ（5.5 秒）。各カットの声の頭は 0.35 秒。
- `src/score.ts`：各カットの世界原点、カメラキー列（02 のドリーイン、05 のホイップパン）、速い振りのぼかし、動画インサート 7 本の区間・素材の開始秒・ワイプ・窓・ベール。
- `src/world.tsx`：three.js の図の層。01 の空の円、02 の点（10→100→1000、InstancedMesh）、03 の門と正方形、04 の目盛りと乗らない針、05 の二つの印と赤い帯、06 の届かない線と途中の印。動画が画面を覆うあいだは退く。
- `src/kit.tsx`：DOM／CSS の文字部品（`Line`, `Txt`, `slam`, `G`, `DBlur`）と色。
- `src/type.tsx`：画面の語（行のマスクから入る行、塊の着地、99%→99.9% の桁の追加）と、検査用の図の矩形。
- `src/Main.tsx`：紙色 → 動画インサート → three.js → 文字 → 紙の粒。安全域・重なりの検査、エンドロゴへの横振り。
- `src/components/Logo.tsx`：リポジトリ直下 `okady-work-logo.svg` のフレーム再現。
