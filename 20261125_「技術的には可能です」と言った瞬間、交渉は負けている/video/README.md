# 制作プロジェクト（Remotion。図は three.js、文字は DOM／CSS、生成動画は Seedance 2.5 Flash）

[企画書](../plan.html) を方向性として制作した本編一式。完成版は `out/final.mp4`（写しは `../output/final.mp4`。1920×1080・30fps・160.5 秒＝2:40.5、H.264／AAC、ナレーション＋BGM＋効果音。Git 管理外）。企画書から変えた点は [制作報告](../production-report.md)。

## 再現手順（このフォルダで）

1. Node.js（v24）・Python 3（numpy・scipy・Pillow、`requirements.txt`）・ffmpeg を用意し、`npm install`。Python は `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt` で作り、`.venv/bin/python` を使う。
2. 素材：`node tools/prepare-public.mjs` が `../assets/fonts/NotoSansJP-wght.ttf`（SIL OFL 1.1、許諾文同梱）と、採用した Seedance 2.5 Flash 動画 4 本（`../assets/videos/adopted/*.mp4`）を `public/` へ写す。`render.mjs` が最初に実行する。
3. ナレーション：完成版に使った `audio/voice/*.mp3`（8 区切り）と、文字ごとの時刻 `audio/voice/words.json` を同梱。再出力に API 呼び出しは不要。原稿（`audio/narration.json`）を変えたときだけ `.venv/bin/python audio/tts.py`（ElevenLabs `eleven_v4`、声 Koichi - Japanese Deep Calm Narrator。キーは環境変数 `ELEVENLABS_API_KEY` かリポジトリ直下の `.env`）。
4. 声を置く：`.venv/bin/python audio/place.py` → `audio/voice/placed.wav`, `placed.json`。
5. 音：`.venv/bin/python audio/bgm.py` → `audio/bgm.wav`（120 BPM、D dorian／F major）。`.venv/bin/python audio/mix.py` → `public/mix.m4a`（BGM −8 dB、声のある間はさらに −9 dB、全体 −14 LUFS 付近）。`NOBGM=1` を付けると声だけの `public/voice.m4a`。
6. 全編：`node render.mjs full` → `out/final.mp4`。区間：`node render.mjs range <開始秒> <終了秒> <名前> [倍率] [1=音つき]`。スチル：`node render.mjs stills 0.5 <秒,秒,...>`、一覧は `.venv/bin/python tools/sheet.py <出力png> <列数> <秒> ...`、連続コマは `tools/strip.py`。
7. 文字の機械検査：`node render.mjs check 0.25` → `out/bounds.log`。型検査：`npx tsc --noEmit`。

## 構成

- `src/timeline.json` / `src/timeline.ts`：8 カット（120 BPM、310 拍＝155.0 秒）＋エンドロゴ（5.5 秒）。各カットの声の頭は 0.35 秒。`vt(カット, 語)` が声の語の時刻（`audio/voice/words.json`）を返し、画面の語と図の動きはこれに合わせる。原稿を変えて声を作り直すと、同期も追従する。
- `src/figs.ts`：図の設計図。札・棚・束・柱・線を、カットの枠の px と時刻から並べる純関数。描画・札の面の文字・検査用の矩形が同じ並びを使う。
- `src/score.ts`：各カットの世界原点、カメラキー列（03 の 2 秒のドリーインと 0.4 秒のホイップパン）、速い振りのぼかし、生成動画インサート 4 本の区間・素材の開始秒・ワイプ・ベール。
- `src/world.tsx`：three.js の図の層（角丸の札と影、裏返し、机の目の点）。
- `src/type.tsx`：画面の語（行のマスクから入る行、塊の着地）と、札の面の文字（図と同じカメラで投影する）。
- `src/kit.tsx`：DOM／CSS の文字部品（`Line`, `Txt`, `slam`, `G`, `DBlur`）と色。
- `src/Main.tsx`：紙色 → 動画インサート → three.js → 札の面 → 文字 → 紙の粒。振りのぼかしは図と札の面だけ。安全域・重なりの検査、エンドロゴへの横振り。
- `src/components/Logo.tsx`：リポジトリ直下 `okady-work-logo.svg` のフレーム再現。

## 道具

- `tools/voice_audition.py`：声の候補を同じ文で生成する（`audio/audition/`）。`tools/voice_judge.py`：候補を Gemini に聞かせて比べる。
- `tools/transcribe.py`：ナレーションの読み違いを Gemini で照合する（`audio/voice/transcript.json`）。
- `tools/when.py`：声の語の時刻を引く。`tools/still_spans.py`：動きの少ない区間を探す（静止を探す道具で、演出の合格基準ではない）。
