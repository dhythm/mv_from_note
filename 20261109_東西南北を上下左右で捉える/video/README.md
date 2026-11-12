# 制作プロジェクト（Remotion、DOM／CSS の文字＋盤・地図の層）

[企画書](../plan.html) に従って作った動画のプロジェクト一式。完成版は `out/final.mp4`（1920×1080・30fps・118.5秒、H.264／AAC。Git 管理外）。

## 再現手順（このフォルダで）

1. Node.js・Python 3（numpy・scipy・Pillow、`requirements.txt`。`python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`）・ffmpeg を用意し、`npm ci`。
2. 素材: `node tools/prepare-public.mjs`（企画フォルダ `../assets/` の書体・ロゴ・地図・紙・十字キーを `public/` へ用意する。`render.mjs` も最初に実行する）。
3. ナレーション: 完成版に使った `audio/voice/*.mp3`（10区切り）を同梱。再出力に API 呼び出しは不要。原稿を変えたときだけ `python3 audio/tts.py`（ElevenLabs `eleven_v4`、声 Kouichi。キーは環境変数 `ELEVENLABS_API_KEY` かリポジトリ直下の `.env`）。記録は `audio/voice/log.json`。使用文字数の確認は `python3 tools/el_usage.py`。
4. 文間の無音を詰める: `python3 audio/tighten.py` → `audio/voice/<id>.tight.wav`（-40 dBFS 未満が 0.34 秒より長い区間だけを 0.34 秒に縮める。声の速さ・音程は変えない）。長さは `audio/voice/tight.json`。
5. 読みの照合と語の時刻（任意）: faster-whisper の環境で `HF_HUB_OFFLINE=1 python tools/transcribe.py`。ローカルの Whisper large-v3 で `*.tight.wav` を書き起こし、語の時刻を `audio/voice/words.json` に書く（外部へは送らない）。各カットの動きの時刻（`v`）はこの値に合わせた。
6. 音: `.venv/bin/python audio/bgm.py` → `audio/bgm.wav`・`public/bgm.m4a`（固定シード）。`.venv/bin/python audio/mix.py` → `public/mix.m4a`（BGM −8 dB、声のある間はさらに −9 dB、全体 −14 LUFS）。曲の条件と展開は `audio/bgm.py` の冒頭。
7. 全編: `node render.mjs full` → `out/final.mp4`。スチル `node render.mjs stills 0.5 10,20`、区間 `node render.mjs range S E name 0.5 [1]`、文字の検査 `node render.mjs check 0.1` → `out/bounds.log`。
8. 点検: `npx tsc --noEmit`、`.venv/bin/python tools/strip.py out/final.mp4 S E 0.5 out/review/x.png`（区間の連続コマ一覧）。

## 構成

- `src/figs.tsx`: 盤（青の固定盤／暖灰の回る盤、北の辺は太い）、ピクセル地図の窓、コマ、十字キー、矢印、区のブロック、折れ線。盤と地図は「中心・一辺・回転」の幾何で置き、縁のラベル（北、東＝右 など）はその幾何から画面座標を計算して、文字の層に正立で置く。`pivotGeo` はコマの位置を回転の中心にしたまま盤を回す（01・04 の「地図だけが回り、コマは同じ位置」）。
- `src/scenes.tsx`: 01〜10 の図と文字。図は自分のカットの区間だけ描き、境目の状態を前後で一致させて受け渡す（01→02 は同じ地図、02→03 は地図の上に格子を描いて固定盤へ、03→04 はコマへのズームの通過、04→05 は盤から地図へ、05→06 は地図から盤へ、06→07 は二つの盤をそのまま、08→09 はブロックが奥の盤の位置へ、09→10 は盤をそのまま）。
- `src/Main.tsx`: 地は共通の紙（動かさない）。文字の層はカットの前後 0.6 秒を重ねて受け渡す。画面全体のカメラ（全体の時刻だけで決まる連続の寄り引き・横移動）を図と文字に掛ける。10→ロゴは画面ごと上へ押し出す。文字の検査（画面端・図との重なり・文字どうし）。
- `src/components/Logo.tsx`: エンドロゴ。20261018 で原本 SVG と照合済みのフレーム翻訳と同一（20261108 から流用）。
- 出発点は 20261108 の制作一式（文字の部品・書き出し・音声の仕組み・エンドロゴ）。図・場面・曲は新しく書いた。

## three.js を使わなかった理由

企画は、固定盤とコマの高さを同じ空間で扱うために three.js を挙げていた。使っていない。この作品で動くのは、平面の盤の回転（回す）、平面上のコマの吸着、寄り引きで、どれも正面から見た 2D の変換で足りる。奥行きが要る箇所（05 の「見下ろし」で地図が手前へ倒れてから真上へ戻る）は CSS の `perspective` と `rotateX` で作った。コマの高さは影の離れと浮きで出した。文字は DOM の層に置き、盤の縁のラベルは盤の幾何から計算して正立で重ねている。three.js の層を足すと、この計算をカメラの投影と二重に持つことになる。

すべての動きは `useCurrentFrame` から計算し、実時間・順序依存の乱数は使っていない。

## 保存対象

制作ソース・設定・依存関係の固定情報・生成／点検スクリプト・ナレーション音声と記録（`audio/voice/`）を Git 管理する。`public/`、生成音源、書き出し・確認画像・キャッシュは管理対象外。
