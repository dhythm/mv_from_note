# 制作プロジェクト（Remotion。図は three.js、文字は DOM／CSS）

[企画書](../plan.html) を方向性として作った本編の一式。完成版は `out/final.mp4`（1920×1080・30fps・144.8 秒、H.264／AAC、ナレーション＋BGM＋効果音。Git 管理外）。

## 再現手順（このフォルダで）

1. Node.js（確認したのは v24）・Python 3（numpy・scipy・Pillow、`requirements.txt`）・ffmpeg を用意し、`npm ci`。
2. 素材: `node tools/prepare-public.mjs` が企画フォルダの `../assets/fonts/NotoSansJP-wght.ttf`（SIL OFL 1.1、許諾文を同梱）を `public/` へ写す。`render.mjs` が最初に実行する。画像・動画の素材は使っていない。
3. ナレーション: 完成版に使った `audio/voice/*.mp3`（9 区切り）を同梱している。再出力に API 呼び出しは不要。原稿（`audio/narration.json`）を変えたときだけ `python3 audio/tts.py`（ElevenLabs。キーは環境変数 `ELEVENLABS_API_KEY` かリポジトリ直下の `.env`／`.env.local`。値は表示・保存しない）。一つだけ撮り直すなら `python3 audio/tts.py 07`。
4. 読みの照合と語の時刻（声を作り直したとき）: faster-whisper の入った環境で `HF_HUB_OFFLINE=1 python tools/transcribe.py` → `audio/voice/words.json`（ローカルの Whisper large-v3。外部へは送らない）。
5. 声を置く: `python3 audio/place.py`。区切りを切らずにそのまま、カットの頭＋`voice` 秒（`src/timeline.json`）に置く。
6. 音: `python3 audio/bgm.py` → `audio/bgm.wav`（固定の種。曲と効果音）。`python3 audio/mix.py` → `public/mix.m4a`（BGM −8 dB、声のある間はさらに −9 dB、全体 −14 LUFS 付近）。
7. 全編: `node render.mjs full` → `out/final.mp4`。区間: `node render.mjs range <開始秒> <終了秒> <名前> [倍率] [1=音つき]`。スチル: `node render.mjs stills 0.33 10,20` → `python tools/sheet.py 10,20`。
8. 文字の検査: `node render.mjs check 0.25` → `out/bounds.log`。範囲だけなら `node render.mjs check 0.25 36 57`。
9. 連続コマの一覧（目視用）: `tools/sheets.sh out/final.mp4 1`。型検査: `npx tsc --noEmit`。

尺を変えるときは `src/timeline.json`（拍の数。112BPM）を直し、5 → 6 → 7 をやり直す。`audio/bgm.py` の効果音は、`src/world.tsx`・`src/type.tsx`・`src/score.ts` の時刻（カットの頭からの秒）と同じ数字で置いている。

## 構成

- `src/timeline.json`: カットの尺（拍）と、声を置く位置。id（01〜09）は制作上の識別子で、映像には出ない。
- `src/score.ts`: 場所（世界の原点）、カメラのキー列、カット間の速い振りと語の層の流し方、03 の増える行、07 の基準線の高さ。全体の時刻 `T` の純関数。図は画面の px で設計し、`wx`／`wy` で世界座標へ直す。
- `src/world.tsx`: 図。広がり続ける範囲の輪と止める藍の輪（02）、短くなる手順と増え続ける行・基準線・まだ短くならない一本（03）、渡る手順と人によって違う速さで厚くなる層（05）、端の見えない線 → 括った区間 → 基準線（06–07）、二つの面が一つの基礎になり共有される（08）、両立の線と小さな輪（09）。
- `src/kit.tsx`: 文字の部品。`Line`（行のマスクから入り、行ごと流す）、`Txt`＋`slam`（語の塊の着地）、`G`（塊の移動・拡縮）。
- `src/type.tsx`: 画面の語。図に付く語（02 の範囲の名前、07 の線の上の語）は、カメラと同じ投影で位置を決める。検査用に、図の外接を画面へ投影した見えない矩形（`data-fig`）も出す。
- `src/Main.tsx`: 層の重ね（紙 → three.js → 画面の語 → 紙の粒）、書体の読み込み、文字の検査、ロゴへの押し出し。
- `src/components/Logo.tsx`: エンドロゴ。原本 SVG の CSS アニメーションをフレーム時刻へ翻訳したもの（過去作で原本と照合済みの実装を流用）。
- 過去の制作（20261113）から流用したのは、書き出し・検査の配管、補間の関数、文字の部品、カメラの補間と投影、エンドロゴ、音声生成・ミックスのスクリプトと楽器の関数。絵・動き・構成・曲は今回書いた。

## 文字の検査の読み方

`out/bounds.log` の 1 行が 1 コマ。`edge` / `fig` / `text` は、止まっている文字が安全域（左右 64px・上下 48px）の外にある／図の外接に重なる／別の行に重なる、という欠陥の候補。`transit-*` は着地・退場・速い振りの途中。`box` の語（02 の範囲の名前、04 の写し）は、図や他の語との重なりを数えない（画面端は数える）。02 の輪は語を囲む図なので、外接を出していない。

## 保存対象

制作ソース・設定・依存関係の固定情報・点検スクリプト・`narration.json`・ナレーション音声と記録（`audio/voice/` の mp3 と json）を Git 管理する。`public/`、`out/`、`.remotion/`、`.venv/`、`node_modules/`、再生成できる音（`audio/bgm.wav`・`audio/mix.wav`・`audio/voice/placed.wav`）は管理対象外。
