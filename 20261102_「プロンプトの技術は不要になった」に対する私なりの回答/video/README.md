# 制作プロジェクト（Remotion、DOM／CSS のタイポグラフィー＋07 だけ three.js）

[企画書](../plan.html) に従って作った動画のプロジェクト一式。完成版は `out/final.mp4`（1920×1080・30fps・133.5秒＝4005フレーム、H.264／AAC 48kHz ステレオ。Git 管理外）。

## 再現手順（このフォルダで）

1. Node.js・Python 3・ffmpeg を用意し、`npm ci`、`python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`。
2. 素材: `node tools/prepare-public.mjs`（企画フォルダ `../assets/` の地層テクスチャ・ロゴと、20261031 の企画フォルダの書体を `public/` へ用意し、07 の円柱用に明るくしたテクスチャ `sediment-3d.png` を作る。`render.mjs` も最初に実行する）。
3. ナレーション: 完成版に使った `audio/voice/*.mp3`（10区切り）を同梱。そのまま再出力する場合は API 呼び出し不要。原稿変更時だけ `.venv/bin/python audio/tts.py`（ElevenLabs `eleven_v4`、声 Kouichi。`audio/narration.json` の原稿・設定が変わった区切りだけ生成。キーは環境変数 `ELEVENLABS_API_KEY` かリポジトリ直下の `.env`）。記録は `audio/voice/log.json`。
4. 読みの照合（任意）: `python3 -m venv .venv-asr && .venv-asr/bin/pip install faster-whisper numpy` のうえ `HF_HUB_OFFLINE=1 .venv-asr/bin/python tools/transcribe.py`。ローカルの Whisper large-v3 で書き起こし、語の時刻を `audio/voice/words.json` に書く（外部へは送らない）。場面の秒はこの語の時刻に合わせた。
5. BGM・効果音: `.venv/bin/python audio/bgm.py` → `audio/bgm.wav`、`public/bgm.m4a`（固定シード）。混ぜる: `.venv/bin/python audio/mix.py` → `public/mix.m4a`。
6. 全編: `node render.mjs full` → `out/final.mp4`。スチル `node render.mjs stills 0.5 10,20`、区間 `node render.mjs range S E name 0.5 [1]`、文字の検査 `node render.mjs check 0.25` → `out/bounds.log`。
7. 点検: `npx tsc --noEmit`、`.venv/bin/python tools/strip.py out/final.mp4 S E 0.5 out/review/x.png`（区間の連続コマ一覧）。

## 構成

- `src/timeline.json`: カットの尺・声の頭までの秒（vo）・切り替えの種類。尺はナレーション実測＋読む・見る時間で決め、120BPM の 2 拍（1 秒）単位。`audio/narration.json` の start／end もここから決める。
- `src/Main.tsx`: 書体の読み込み、カットの切り替え（`cut` は場面側で受け渡す: 02→03 の線、03→04 の Crane、05→06 の Roll、09→10 の Crane。`whip` は縦のぶれを伴う Whip pan。`up`・`left` は斜めの縁で押し入る）、エンドロゴ、音声、文字の検査。
- `src/kit.tsx`: 部品。`Line`（行のマスクから入る。読む間は形を崩さない）、`VLine`（縦組み）、`Lay`（層の移動・回転・拡縮）、`Strata`（地層の断面。境目は時刻から決まる正弦でうねり、テクスチャを乗算）、`Prompt`（一行の入力「› この機能を作って」とキャレット）、`VBlur`（縦だけのぶれ）、`Grid`、`DrawLine`、`kv`。
- `src/scenes1.tsx`（01–03）、`scenes2.tsx`（04–06）、`scenes3.tsx`（07–08）、`scenes4.tsx`（09–10）: 各カットはカットの頭からの秒だけで決まる。
- `src/components/Logo.tsx`: エンドロゴ。20261018 で原本 SVG と照合済みのフレーム翻訳と同一。
- 出発点は 20261031 の制作一式（部品・書き出し・音声の仕組み）。場面ファイルと曲は新規に書いた。

## three.js の採否

07 だけ採用（`@remotion/three`）。「同じ条件で厚みだけが違う」比較を、円柱の回り込み（Orbit）で量として見せるため。円柱の側面に地層テクスチャを貼り、ラベルは DOM の層に置いて 3D の点を同じカメラで投影した位置へ合わせた（文字にカメラの回転を掛けない）。

04・09・10 の地層は 2D の断面で描いた。企画は 04 にも 3D を推奨していたが、絵コンテの画は真横からの断面で、奥行きを足すと層の厚みとラベルの対応が読みにくくなるため。Crane の縦の視差は、境目ごとに動き出しと速さをずらして出した。08 の円柱も 2D（正面から見た到達線との比較で、帯・破線と高さを px で正確に合わせるため）。

すべての動きは `useCurrentFrame` から計算し、実時間・順序依存の乱数は使っていない。

## BGM

Python（numpy/scipy）で合成。音楽生成サービス（Lyria 等）は使っていない。理由: 03 の着水前の 0.4 秒の抜き、04・09 の Crane down のスイープ、層の差し込み・積み上がりなど約 40 か所へフレーム単位で合わせる必要があり、ローカル合成が速く確実で費用もかからないため。前作の曲は流用していない。

- 120BPM・4 拍子（0 秒起点）。F マイナーのミニマルな 4 つ打ち（Fm–D♭–A♭–E♭）。8 分で脈打つ低音、2・4 拍のクラップ、裏の 16 分の粒（アルペジオ）、和音のパッド（キックでポンプ）
- 02 は少し軽く、声の波形の区間は音楽全体を下げる。03 は「潜っただけ。」の着水の 0.45 秒前から音楽を抜き、着水で水音（とぷん）と低い打音
- 04 は Crane down に低音のスイープ、着地でスネア。06 の縦組みの区間はハーフタイム
- 07 は 16 分のハットで最も詰め、層の積み上がり 3 回と「明確な差。」に打音。08 の留保の 3 秒はキックとベースを抜いて持続の低音だけにする（刻みは残す）
- 09 の地盤で持続の低音とスイープ、着地に最も深い打音。10 で和音を開いてリードを足し、エンドロゴの最後の 1 秒で収める
- 混ぜ方: BGM を全体で −8 dB、声のある間はさらに −9 dB。全体を −14 LUFS に合わせる

## 保存対象

制作ソース・設定・依存関係の固定情報・生成／点検スクリプト・ナレーション音声と記録（`audio/voice/`）を Git 管理する。`public/` へ用意する素材、生成音源（bgm／mix）、書き出し・確認画像・キャッシュ、`.venv`・`.venv-asr` は管理対象外。
