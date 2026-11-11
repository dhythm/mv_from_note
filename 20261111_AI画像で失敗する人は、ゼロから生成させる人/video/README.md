# 制作プロジェクト（Remotion。図は three.js の一続きの 3D 空間、文字は DOM／CSS）

[企画書](../plan.html) を方向性として作った本編の一式。完成版は `out/final.mp4`（1920×1080・30fps・147.3 秒、H.264／AAC、ナレーション＋BGM＋効果音。Git 管理外）。

## 再現手順（このフォルダで）

1. Node.js（確認したのは v24）・Python 3（numpy・scipy・Pillow、`requirements.txt`）・ffmpeg を用意し、`npm ci`。
2. 素材は `node tools/prepare-public.mjs` が企画フォルダの `../assets/fonts/`（Noto Sans JP、BIZ UDP明朝。どちらも SIL OFL 1.1、許諾文を同梱）と `../assets/logo/okady-work-logo.svg` を `public/` へ写す。`render.mjs` が最初に実行する。
3. ナレーション: 完成版に使った `audio/voice/*.mp3`（12 区切り）を同梱している。再出力に API 呼び出しは不要。原稿（`audio/narration.json`）を変えたときだけ `python3 audio/tts.py`（ElevenLabs。キーは環境変数 `ELEVENLABS_API_KEY` かリポジトリ直下の `.env`。値は表示・保存しない）。一つだけ撮り直すなら `python3 audio/tts.py 07`。記録は `audio/voice/log.json`。
4. 読みの照合と語の時刻（声を作り直したとき）: faster-whisper の環境で `HF_HUB_OFFLINE=1 python tools/transcribe.py` → `audio/voice/words.json`（ローカルの Whisper large-v3。外部へは送らない）。
5. 声を置く: `python3 audio/place.py` → `audio/voice/placed.wav`・`placed.json`。区切りを**切らずにそのまま**、カットの頭＋`voice` 秒（`src/timeline.json`）に置く。カットの終わりに食い込むと表示する。
6. 音: `python3 audio/bgm.py` → `audio/bgm.wav`（固定の種。曲と効果音）。`python3 audio/mix.py` → `public/mix.m4a`（BGM −8 dB、声のある間はさらに −9 dB、全体 −14 LUFS 付近）。
7. 全編: `node render.mjs full` → `out/final.mp4`。映像のみは `node render.mjs silent` → `out/preview.mp4`。
8. 区間: `node render.mjs range <開始秒> <終了秒> <名前> [倍率] [1=音つき]`。スチル: `node render.mjs stills 0.5 10,20`。
9. 文字の検査: `node render.mjs check 0.25` → `out/bounds.log`。範囲だけなら `node render.mjs check 0.25 58 66`。並列で回すときは `BUNDLE_DIR=.remotion/b1` のように束ね先を分ける。
10. 連続コマの一覧（目視用）: `tools/sheets.sh out/final.mp4 1`。型検査: `npx tsc --noEmit`。

尺を変えるときは `src/timeline.json`（カットの尺と、声を置く位置）を直し、5 → 6 → 7 をやり直す。`audio/bgm.py` の効果音は、`src/score.ts`・`src/type.tsx`・`src/typeB.tsx` の時刻（カットの頭からの秒）と同じ数字で置いている。

## 構成

- `src/timeline.json`: カットの尺（秒）。id（01〜12）は制作上の識別子で、映像には出ない。
- `src/cam.ts`: カメラ。キー列の補間、世界の点 → 画面の px（three.js の描画と同じ計算）、床の四角へ DOM を写す `matrix3d`。
- `src/score.ts`: 図の層の「楽譜」。カメラのキー、速い振りのぶれ、グラスの状態、折れた線、帯、光。すべて全体の時刻 `T` の純関数。
- `src/prims.tsx`: 3D の部品（面はトゥーンの段階色、輪郭は裏面を膨らませた墨の殻）。`src/glass.tsx`: フロートのグラス（全カット同じ部品。波打ち・嘘の緑・つや・光・さくらんぼを量で切り替える）。
- `src/world.tsx`（目盛り・折れた線・帯・光）、`src/sets.tsx`（街・部屋・客・額・人の手の帯）。
- `src/kit.tsx`: 文字の部品。`Line`（行のマスクから一文字ずつ入り、行ごと流す。縦組も）、`Txt`＋`slam`（語の塊の着地）、`Plate`（色の面）。
- `src/type.tsx`・`src/typeB.tsx`: 画面の語、床に描いた数字と札（`FloorLabel`。DOM のまま床の遠近へ写す）、緑の面、四隅の印、星。
- `src/Main.tsx`: 層の重ね（紙 → 色の面 → 床の文字 → three.js → 印 → 画面の語 → 紙の粒）、書体の読み込み、文字の検査、ロゴへの押し出し。
- `src/components/Logo.tsx`: エンドロゴ。原本 SVG の CSS アニメーションをフレーム時刻へ翻訳したもの（過去作で原本と照合済みの実装を流用）。
- 過去の制作から流用したのは、書き出し・検査の配管（`render.mjs`、検査のフック）、`lib/anim.ts`、エンドロゴ、音声生成・ミックスのスクリプトだけ。絵・動き・文字の部品・曲は今回書いた。

## three.js の使い方

企画の推奨どおり、図の層は three.js（`@remotion/three`）。0〜100 の目盛りを長さ 20 の床の定規として置き、グラス・折れた線・帯・街・部屋・客・額を同じ空間に立て、一台のカメラが飛び回る。カメラは `score.ts` のキー列から毎フレーム決まり、実時間や前フレームの状態は使わない（乱数は整数の種から決まる `hash`）。文字はテクスチャにしていない。画面の語は DOM、床の数字と札も DOM で、カメラと同じ投影から求めた `matrix3d` で床へ写している。速い振りのぶれは、図の層と床の文字にだけ一方向のぼかしを掛ける。

## 文字の検査の読み方

`out/bounds.log` の 1 行が 1 コマ。

- `edge` / `fig` / `text`: 止まっている文字が、安全域（左右 80px・上下 64px）の外にある／図（グラス・残る額の外接）に重なる／別の行の文字に重なる。欠陥の候補。
- `transit-*`: 着地・退場・押し出しの途中（`data-mv`）。意図した出入りとして別に数える。
- 数えないもの: 床に描いた数字と札（図の一部）。面や札の中の語（`box`）と入れ物の重なり。行のマスクで 6 割以上隠れている文字。グラスと額以外の立体（街・部屋・客・帯）と文字の重なりは、機械では見ていない（コマで目視）。

## 保存対象

制作ソース・設定・依存関係の固定情報・点検スクリプト・`narration.json`・ナレーション音声と記録（`audio/voice/` の mp3 と json）を Git 管理する。`public/`、`out/`、`.remotion/`、`node_modules/`、再生成できる音（`audio/bgm.wav`・`audio/mix.wav`・`audio/voice/placed.wav`）は管理対象外。
