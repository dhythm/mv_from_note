# 制作プロジェクト（Remotion、DOM／CSS の文字＋カード・光・吹き出し・歯車の層）

[企画書](../plan.html) と [制作依頼](../fable-brief.md) に沿って作った本編のプロジェクト一式。完成版は `out/final.mp4`（1920×1080・30fps・129.8 秒、H.264／AAC、ナレーション＋BGM＋効果音。Git 管理外）。

## 再現手順（このフォルダで）

1. Node.js（確認したのは v24）・Python 3（numpy・scipy・Pillow、`requirements.txt`。`python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`）・ffmpeg を用意し、`npm ci`。
2. 素材は `node tools/prepare-public.mjs` が企画フォルダの `../assets/fonts/NotoSansJP-wght.ttf`（SIL OFL 1.1。同じフォルダに許諾文）と `../assets/logo/okady-work-logo.svg` を `public/` へ写す。`render.mjs` が最初に実行する。
3. ナレーション: 完成版に使った `audio/voice/*.mp3`（13 区切り）と語の時刻 `audio/voice/words.json` を同梱している。再出力に API 呼び出しは不要。原稿（`audio/narration.json`）を変えたときだけ `python3 audio/tts.py`（ElevenLabs `eleven_v4`、声 Kouichi。キーは環境変数 `ELEVENLABS_API_KEY` かリポジトリ直下の `.env`。値は表示・保存しない）。一つの区切りだけ撮り直すなら `python3 audio/tts.py 07`。記録は `audio/voice/log.json`、利用文字数の確認は `python3 tools/el_usage.py`。
4. 読みの照合と語の時刻（声を作り直したとき）: faster-whisper の環境で `HF_HUB_OFFLINE=1 python tools/transcribe.py` → `audio/voice/words.json`（ローカルの Whisper large-v3。外部へは送らない）。
5. 声を置く: `python3 audio/place.py` → `audio/voice/placed.wav`・`placed.json`（読点では切らず元の読みのまま続け、句点の後ろだけで切って元の間を 0.55 秒まで残す。各文の始まりが `narration.json` の位置から最も離れないように置く。カットの終わりに食い込むと表示する）。
6. 音: `.venv/bin/python audio/bgm.py` → `audio/bgm.wav`（固定の種）。`.venv/bin/python audio/mix.py` → `public/mix.m4a`（BGM −8 dB、声のある間はさらに −9 dB、全体 −14 LUFS 付近）。曲の条件と展開は `audio/bgm.py` の冒頭。
7. 全編: `node render.mjs full` → `out/final.mp4`。映像のみは `node render.mjs silent` → `out/preview.mp4`。
8. 区間: `node render.mjs range <開始秒> <終了秒> <名前> [倍率] [1=音つき]` → `out/review/<名前>.mp4`。スチル: `node render.mjs stills 0.5 10,20`。
9. 文字の検査: `node render.mjs check 0.1` → `out/bounds.log`。範囲だけなら `node render.mjs check 0.1 58 66` → `out/bounds-58-66.log`。並列で回すときは `BUNDLE_DIR=.remotion/b1` のように束ね先を分ける。
10. 連続コマの一覧（目視用）: `python3 tools/strip.py out/final.mp4 <開始秒> <終了秒> <間隔秒> out/review/x.png`。型検査: `npx tsc --noEmit`。プレビュー画面: `npm run dev`。

尺を変えるときは `src/timeline.json`（カットの尺）と `narration.json`（各文の位置）を直し、5 → 6 → 7 をやり直す。`audio/bgm.py` の送りの音は `src/actC.tsx` の `DEP` と同じ式で置いている。

## 構成

- `src/timeline.json`: カットの尺（秒）。声の実測に合わせてある。`narration.json` が声の原稿と、各文を置く位置（全体の頭からの秒）。
- `audio/`: `narration.json`（生成用の区切りと設定）、`tts.py`、`place.py`、`bgm.py`、`mix.py`、`voice/`（声と記録）。
- `src/kit.tsx`: 文字と面の部品。`Line`（行のマスクから一文字ずつ入り、行ごと流す）、`Txt`（語の塊。着地・拡縮・回転は塊ごと）、`Plate`（色の面）、`Cam`（図の層だけのカメラ）、`DBlur`（一方向のぶれ）。
- `src/figs.tsx`: カード（ファイル）、暖色の円（注意力）、吹き出し、歯車、プラグ。同じ記号は全カットで同じ部品。
- `src/actAB.tsx`（01〜03）、`src/actC.tsx`（04〜07。同じ 30 枚のカードが形を変え続ける）、`src/actDEF.tsx`（08〜13）。各部品は全体の時刻 `T` だけから状態を計算する。
- `src/Main.tsx`: 書体の読み込み、13 → ロゴの押し出し、文字の検査（`Check` コンポジション）。
- `src/components/Logo.tsx`: エンドロゴ。20261018 で原本 SVG と照合済みのフレーム翻訳を、そのまま使っている（20261109 から写した）。
- 出発点は 20261109 の制作一式のうち、書き出し・検査の仕組み、`lib/anim.ts`、エンドロゴ。文字の部品は書き直し、図と場面はすべて新しく書いた。

## three.js を使わなかった理由

企画は、カード・薄まる光・寄るカメラを同じ空間で動かす候補として three.js を挙げていた。使っていない。この作品の図はすべて平らな矩形・円・輪郭で、動きは平面上の移動・拡縮・回転とカメラの寄り引き・横移動で足りる。DOM／CSS と SVG で組むと、カードの中の札の文字や吹き出しの中の語まで同じ層の文字として扱え、文字単位の外接矩形で「文字と図の重なり」を全コマ機械検査できる。three.js のキャンバスに図を置くと、図の外接矩形を別に投影計算する必要があり、検査が二重になる。

すべての動きは `useCurrentFrame` から計算し、実時間・前フレームの状態・順序依存の乱数は使っていない（乱数は整数の種から決まる `hash`）。

## 文字の検査の読み方

`out/bounds.log` の 1 行が 1 コマ。種類は次のとおり。

- `edge` / `fig` / `text`: 止まっている文字が、安全域（左右 80px・上下 64px）の外にある／図に重なる／別の行の文字に重なる。欠陥の候補。
- `transit-edge` / `transit-fig` / `transit-text`: 着地・退場・押し出し・カメラに付いた移動の途中の文字や図（`data-mv`、`data-fig="fly"`）。意図した出入りとして別に数える。
- 数えないもの: 吹き出し・札・色の面の中の語（`box`）と、その入れ物の重なり。行のマスクで 6 割以上隠れている文字。暖色の円（光）と文字の重なり。

## 保存対象

制作ソース・設定・依存関係の固定情報・点検スクリプト・`narration.json`・ナレーション音声と記録（`audio/voice/` の mp3 と json）を Git 管理する。`public/`、`out/`（完成動画・確認画像・検査ログ）、`.remotion/`、`node_modules/`、再生成できる音（`audio/bgm.wav`・`audio/mix.wav`・`audio/voice/placed.wav`）は管理対象外。
