# 制作プロジェクト（Remotion。図は three.js の一続きの 3D 空間、文字は DOM／CSS）

[企画書](../plan.html) を方向性として作った本編の一式。完成版は `out/final.mp4`（1920×1080・30fps・129.5 秒、H.264／AAC、ナレーション＋BGM＋効果音。Git 管理外）。

## 再現手順（このフォルダで）

1. Node.js（確認したのは v24）・Python 3（numpy・scipy・Pillow、`requirements.txt`）・ffmpeg を用意し、`npm ci`。
2. 素材は `node tools/prepare-public.mjs` が企画フォルダの `../assets/fonts/NotoSansJP-wght.ttf`（SIL OFL 1.1、許諾文を同梱）と `../assets/logo/okady-work-logo.svg` を `public/` へ写す。`render.mjs` が最初に実行する。
3. ナレーション: 完成版に使った `audio/voice/*.mp3`（10 区切り）を同梱している。再出力に API 呼び出しは不要。原稿（`audio/narration.json`）を変えたときだけ `python3 audio/tts.py`（ElevenLabs。キーは環境変数 `ELEVENLABS_API_KEY` かリポジトリ直下の `.env`。値は表示・保存しない）。一つだけ撮り直すなら `python3 audio/tts.py 07`。
4. 読みの照合と語の時刻（声を作り直したとき）: faster-whisper の環境で `HF_HUB_OFFLINE=1 python tools/transcribe.py` → `audio/voice/words.json`（ローカルの Whisper large-v3。外部へは送らない）。
5. 声を置く: `python3 audio/place.py`。区切りを切らずにそのまま、カットの頭＋`voice` 秒（`src/timeline.json`）に置く。
6. 音: `python3 audio/bgm.py` → `audio/bgm.wav`（固定の種。曲と効果音）。`python3 audio/mix.py` → `public/mix.m4a`（BGM −8 dB、声のある間はさらに −9 dB、全体 −14 LUFS 付近）。
7. 全編: `node render.mjs full` → `out/final.mp4`。映像のみは `node render.mjs silent 0.5` → `out/preview.mp4`。
8. 区間: `node render.mjs range <開始秒> <終了秒> <名前> [倍率] [1=音つき]`。スチル: `node render.mjs stills 0.33 10,20` → `python tools/sheet.py 10,20`。
9. 文字の検査: `node render.mjs check 0.25` → `out/bounds.log`。範囲だけなら `node render.mjs check 0.25 94 108`。
10. 連続コマの一覧（目視用）: `tools/sheets.sh out/final.mp4 1`。型検査: `npx tsc --noEmit`。

尺を変えるときは `src/timeline.json` を直し、5 → 6 → 7 をやり直す。`audio/bgm.py` の効果音は、`src/world.tsx`・`src/type.tsx` の時刻（カットの頭からの秒）と同じ数字で置いている。

## 構成

- `src/timeline.json`: カットの尺（秒）と、声を置く位置。id（01〜10）は制作上の識別子で、映像には出ない。
- `src/score.ts`: 場所（世界の x）、カメラのキー列、速い振りのぶれ。全体の時刻 `T` の純関数。
- `src/world.tsx`: 立体。仕組みの積みと琥珀のつまみ（01–02）、素材の帯 72 枚（03）、カード（04）、8 本＋2 本のバー（05–06）、枠（07）、境界と成果物（08）、文章の面と 20 本の線（09）、噛み合う二つの塊（10）。つや消しの面と、一つの光からの影。
- `src/dominoes.ts`: 06 の倒れ方。前のバーの角が次のバーの面を押す、という接触の拘束から角度の表を一度だけ作り、時刻から引く（実時間の物理ではない。シークしても同じ）。
- `src/kit.tsx`: 文字の部品。`Line`（行のマスクから入り、行ごと流す）、`Txt`＋`slam`（語の塊の着地）、`Plate`（色の面）。
- `src/type.tsx`: 画面の語。立体に付く語（仕組み、構成／収集／執筆、プロ／エンジニア、枠の中の語）は、カメラと同じ投影で位置と大きさを決める。検査用に、主な立体の外接を画面へ投影した見えない矩形（`data-fig`）も出す。
- `src/Main.tsx`: 層の重ね（紙 → three.js → 画面の語 → 紙の粒）、書体の読み込み、文字の検査、ロゴへの押し出し。
- `src/components/Logo.tsx`: エンドロゴ。原本 SVG の CSS アニメーションをフレーム時刻へ翻訳したもの（過去作で原本と照合済みの実装を流用）。
- 過去の制作（20261111）から流用したのは、書き出し・検査の配管、補間の関数、文字の部品、エンドロゴ、音声生成・ミックスのスクリプトと楽器の関数。絵・動き・構成・曲は今回書いた。

## 文字の検査の読み方

`out/bounds.log` の 1 行が 1 コマ。`edge` / `fig` / `text` は、止まっている文字が安全域（左右 64px・上下 48px）の外にある／立体の外接に重なる／別の行に重なる、という欠陥の候補。`transit-*` は着地・退場の途中。立体に付く語と枠の中の語（`box`）は、入れ物との重なりを数えない。立体の外接は軸に沿った箱の投影なので、斜めから見た場面では実際の形より広く出る。

## 保存対象

制作ソース・設定・依存関係の固定情報・点検スクリプト・`narration.json`・ナレーション音声と記録（`audio/voice/` の mp3 と json）を Git 管理する。`public/`、`out/`、`.remotion/`、`node_modules/`、再生成できる音（`audio/bgm.wav`・`audio/mix.wav`・`audio/voice/placed.wav`）は管理対象外。
