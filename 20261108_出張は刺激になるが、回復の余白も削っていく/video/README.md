# 制作プロジェクト（Remotion、DOM／CSS の文字＋箱の層）

[企画書](../plan.html) に従って作った動画のプロジェクト一式。完成版は `out/final.mp4`（1920×1080・30fps・103秒、H.264／AAC。Git 管理外）。

## 再現手順（このフォルダで）

1. Node.js・Python 3（numpy・scipy・Pillow、`requirements.txt`）・ffmpeg を用意し、`npm ci`。
2. 素材: `node tools/prepare-public.mjs`（企画フォルダ `../assets/` の書体・ロゴ・07〜09 の採用イラストを `public/` へ用意する。`render.mjs` も最初に実行する）。
3. ナレーション: 完成版に使った `audio/voice/*.mp3`（10区切り）を同梱。再出力に API 呼び出しは不要。原稿を変えたときだけ `python3 audio/tts.py`（ElevenLabs `eleven_v4`、声 Kouichi。キーは環境変数 `ELEVENLABS_API_KEY` かリポジトリ直下の `.env.local`）。記録は `audio/voice/log.json`。使用文字数の確認は `python3 tools/el_usage.py`。
4. 読みの照合（任意）: faster-whisper の環境で `HF_HUB_OFFLINE=1 python tools/transcribe.py`。ローカルの Whisper large-v3 で書き起こし、語の時刻を `audio/voice/words.json` に書く（外部へは送らない）。
5. 音: `python audio/bgm.py` → `audio/bgm.wav`・`public/bgm.m4a`（固定シード）。`python audio/mix.py` → `public/mix.m4a`（BGM −8 dB、声のある間はさらに −9 dB、全体 −14 LUFS）。`NOBGM=1` で声だけの確認用。曲の条件と展開は `audio/bgm.py` の冒頭。
6. 全編: `node render.mjs full` → `out/final.mp4`。スチル `node render.mjs stills 0.5 10,20`、区間 `node render.mjs range S E name 0.5 [1]`、文字の検査 `node render.mjs check 0.25` → `out/bounds.log`。
7. 点検: `npx tsc --noEmit`、`node tools/box.test.ts`（箱の不変条件）、`python tools/strip.py out/final.mp4 S E 0.5 out/review/x.png`（区間の連続コマ一覧）。

## 構成

- `src/box.ts`: 箱（自分のキャパ）の配分。琥珀（得られたもの）・灰（移動・予定）・白（回復の余白）を全体の時刻から決める一つの関数。不変条件（琥珀は減らない、白は 06 で閉じる、08 で戻るのはごく細い白だけで 09・10 は広げない、合計 1）は `tools/box.test.ts`。
- `src/stage.ts`: 箱の画面上の位置・拡大・回転・縦横の大きさ（Catmull-Rom でつなぐキー）と、07〜09 の全面インサートの区間。
- `src/BoxFig.tsx`: 箱の描画（外枠は `data-fig`、中のラベルは検査対象外の `data-ch-in`）。
- `src/scenes.tsx`: 01〜10 の文字の層。箱の中に置く語（02・04 の内訳、05 の札）は `data-ch="box"`（画面端は検査、箱との重なりは数えない）。
- `src/Main.tsx`: 箱の層は全編で一つ。文字の層はカットの前後 0.6 秒を重ねて受け渡す。インサートは文字と箱の画面を横へ送り、イラストを斜めの縁で全面へ押し入れ、戻りは紙色の面が押し出す。10→ロゴは横の Whip pan。文字の検査。
- `src/components/Logo.tsx`: エンドロゴ。20261018 で原本 SVG と照合済みのフレーム翻訳と同一（20261105 から流用）。
- 出発点は 20261105 の制作一式（部品・書き出し・音声の仕組み・エンドロゴ）。場面・箱・曲は新規に書いた。

## three.js を使わなかった理由

企画は図の層に three.js を推奨していたが、使っていない。主役の図は正面から見た一つの横長の箱で、配分（境界の位置）を読むことが意味の中心になる。奥行きや透視を付けると境界の幅が比べにくくなる。画面の動きは、箱の層の移動・拡大・回転と縦横の変形（01 の Dolly in、02 の縦へ伸びて琥珀の面へ Truck、03 の右下への斜めの移動、04 の縦長への変形、10 の右上の隅への Zoom out）と、カメラに合わせて流れる背景のグリッドで出した。

すべての動きは `useCurrentFrame` から計算し、実時間・順序依存の乱数は使っていない。

## 保存対象

制作ソース・設定・依存関係の固定情報・生成／点検スクリプト・ナレーション音声と記録（`audio/voice/`）を Git 管理する。`public/`、生成音源、書き出し・確認画像・キャッシュは管理対象外。
