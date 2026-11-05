# 制作プロジェクト（Remotion、DOM／CSS の文字＋2D の図の層とカメラ）

[企画書](../plan.html) に従って作った動画のプロジェクト一式。完成版は `out/final.mp4`（1920×1080・30fps・136.5秒、H.264／AAC。Git 管理外）。

## 再現手順（このフォルダで）

1. Node.js・Python 3（numpy・scipy）・ffmpeg を用意し、`npm ci`。
2. 素材: `node tools/prepare-public.mjs`（企画フォルダ `../assets/` の書体・ロゴ・05 の模擬画面と手元動画を `public/` へ用意し、模擬画面の最初と最後のコマを書き出す。`render.mjs` も最初に実行する）。
3. ナレーション: 完成版に使った `audio/voice/*.mp3`（11区切り）を同梱。再出力に API 呼び出しは不要。原稿を変えたときだけ `python3 audio/tts.py`（ElevenLabs `eleven_v4`、声 Kouichi。`audio/narration.json` の原稿・設定が変わった区切りだけ生成。キーは環境変数 `ELEVENLABS_API_KEY` かリポジトリ直下の `.env`）。記録は `audio/voice/log.json`。
4. 読みの照合（任意）: faster-whisper の環境で `HF_HUB_OFFLINE=1 python tools/transcribe.py`。ローカルの Whisper large-v3 で書き起こし、語の時刻を `audio/voice/words.json` に書く（外部へは送らない）。場面の秒はこの語の時刻に合わせた。
5. 音: numpy・scipy の環境で `python audio/bgm.py` → `audio/bgm.wav`・`public/bgm.m4a`（固定シード）。`python audio/mix.py` → `public/mix.m4a`（ナレーションを `src/timeline.json` のカットの頭＋vo に置き、BGM を −8 dB、声のある間はさらに −9 dB 下げ、全体を −14 LUFS に合わせる）。曲の条件と展開は `audio/bgm.py` の冒頭。
6. 全編: `node render.mjs full` → `out/final.mp4`。スチル `node render.mjs stills 0.5 10,20`、区間 `node render.mjs range S E name 0.5 [1]`、文字の検査 `node render.mjs check 0.25` → `out/bounds.log`。
7. 点検: `npx tsc --noEmit`、`python3 tools/strip.py out/final.mp4 S E 0.5 out/review/x.png`（区間の連続コマ一覧）。

## 構成

- `src/timeline.json`: カットの尺・声の頭までの秒（vo）・切り替えの種類。尺はナレーション実測＋読む・見る時間。
- `src/Main.tsx`: 書体の読み込み、カットの切り替え（`cut` は場面の側で受け渡す、`whip`／`whipx` は縦／横のぶれを伴う Whip pan、`up`・`left` は斜めの縁で押し入る）、エンドロゴ、音声、文字の検査。
- `src/kit.tsx`: 部品。`Line`（行のマスクから入る。読む間は形を崩さない）、`Lay`（層の移動・回転・拡縮）、`Koma`（左が入口の凹・右が出口の凸の青いコマ。紙色の細い縁で継ぎ目を見せる）、`Particle`（オレンジの粒と約0.3秒の残像）、`Cam`（図の層だけに掛けるカメラ）、`proj`（世界座標→画面座標。文字の層を図の位置へ合わせる）、`CamGrid`（カメラに合わせて流れる薄いグリッド）、`slam`（塊ごとの叩き込み）。
- `src/scenes1.tsx`（01–04）、`scenes2.tsx`（05–07）、`scenes3.tsx`（08–11）: 各カットはカットの頭からの秒と声の頭からの秒だけで決まる。
- `src/components/Logo.tsx`: エンドロゴ。20261018 で原本 SVG と照合済みのフレーム翻訳と同一（20261102 から流用）。
- 出発点は 20261102 の制作一式（部品・書き出し・音声の仕組み）。場面ファイルは新規に書いた。

## three.js を使わなかった理由

企画は three.js を推奨していたが、使っていない。主役のコマは絵コンテどおり正面から見た平らな記号で、奥行きを付けると凹凸（入口・出口）の噛み合いが読みにくくなる。Dolly・Truck・Crane・Zoom out・Whip pan は、図の層だけに掛ける 2D のカメラ（移動・拡縮・回転）と、カメラに合わせて流れる背景のグリッドで出した。文字は DOM の層に置き、図の位置は `proj` で合わせた（文字にカメラの回転を掛けない）。

すべての動きは `useCurrentFrame` から計算し、実時間・順序依存の乱数は使っていない。09 の粒の加速は速さの式を時刻で積分した値で決めている。

## 保存対象

制作ソース・設定・依存関係の固定情報・生成／点検スクリプト・ナレーション音声と記録（`audio/voice/`）を Git 管理する。`public/`、生成音源、書き出し・確認画像・キャッシュは管理対象外。
