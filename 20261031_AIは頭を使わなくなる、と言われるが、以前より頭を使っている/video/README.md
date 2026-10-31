# 制作プロジェクト（Remotion、DOM／CSS のタイポグラフィー）

[企画書](../plan.html) に従って作った動画のプロジェクト一式。完成版は `../renders/final.mp4`（1920×1080・30fps・116.5秒＝3495フレーム、H.264／AAC 48kHz ステレオ。Git 管理外）。

## 再現手順（このフォルダで）

1. Node.js・Python 3・ffmpeg を用意し、`npm ci`、`python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`。
2. 素材: `node tools/prepare-public.mjs`（企画フォルダ `../assets/` の書体・ロゴをコピーし、素材動画 3 本を使用区間で切り出して色を合わせ `public/f04.mp4`・`f07.mp4`・`f10.mp4` に書く。`render.mjs` も最初に実行する。既にあれば作り直さない）。
3. ナレーション: 完成版に使った `audio/voice/*.mp3`（10区切り）を同梱。そのまま再出力する場合は API 呼び出し不要。原稿変更時だけ `.venv/bin/python audio/tts.py`（ElevenLabs `eleven_v4`、声 Kouichi。`audio/narration.json` の原稿・設定が変わった区切りだけ生成。キーは環境変数 `ELEVENLABS_API_KEY` かリポジトリ直下の `.env`／`.env.local`）。記録は `audio/voice/log.json`。
4. 読みの照合（任意）: faster-whisper を入れた環境で `HF_HUB_OFFLINE=1 <venv>/bin/python tools/transcribe.py`。ローカルの Whisper large-v3 で書き起こし、語の時刻を `audio/voice/words.json` に書く（外部へは送らない）。今回は 20261023 の `video/.venv-asr` を使った。
5. BGM・効果音: `.venv/bin/python audio/bgm.py` → `audio/bgm.wav`、`public/bgm.m4a`（固定シード）。混ぜる: `.venv/bin/python audio/mix.py` → `public/mix.m4a`。
6. 全編: `node render.mjs full` → `out/final.mp4`。スチル `node render.mjs stills 0.5 10,20`、区間 `node render.mjs range S E name 0.5 [1]`、文字の検査 `node render.mjs check 0.25` → `out/bounds.log`。
7. 点検: `npx tsc --noEmit`、`.venv/bin/python tools/strip.py out/final.mp4 S E 0.5 out/review/x.png`（区間の連続コマ一覧）。

## 構成

- `src/timeline.json`: カットの尺と切り替えの種類、声の頭までの秒（0.5秒）。尺はナレーションの実測＋読む時間で決め、120BPM の2拍（1秒）単位。`audio/narration.json` の start／end もここから決める。
- `src/Main.tsx`: 書体の読み込み、カットの切り替え（斜めの縁で押し入る／`cut` は場面側で受け渡す／`iris` は 09 の円から 10 の窓へ寄る）、エンドロゴ、音声、文字の検査（画面外と、線・矢印・点との重なり）。
- `src/kit.tsx`: 部品。`Line`（行のマスクから入る。読む間は形を崩さない）、`Lay`（層の移動・回転・拡縮）、`Card`（白い札）、`Circle`（領域の円）、`Footage`（素材動画の窓。本編の絶対秒と再生速度で同期）、`DrawLine`、`Dot`、`kv`（キー列の補間）。
- `src/scenes1.tsx`（01–03）、`scenes2.tsx`（04–06）、`scenes3.tsx`（07–10）: 各カットはカットの頭からの秒だけで決まる。
- `src/components/Logo.tsx`: エンドロゴ。20261018 で原本 SVG と照合済みのフレーム翻訳と同一。
- 出発点は 20261023 の制作一式（部品・書き出し・音声の仕組み）。場面ファイルと曲は新規に書いた。

## three.js の採否

不採用。画面全体の動き（Dolly out／Roll／Pan／Dolly in／Push in）はすべて 2D の層の移動・回転・拡縮で足り、3D は企画で不要と決まっている。07 の「爆速」の字形の窓は SVG の `clipPath`（`<text>`、読み込んだ Noto Sans JP）を HTML の層に `clip-path: url()` で掛けて作った。文字は行のマスク・詰め組（palt）が確実に効く DOM／CSS で組んだ。すべての動きは `useCurrentFrame` から計算し、実時間・順序依存の乱数は使っていない。

## 素材の使い方

| 素材 | 使用区間（本編） | 使い方 |
|---|---|---|
| `cut04-lamp-floor-tiles.mp4`（素材 0.75–7.75 秒） | 04: 31.35–43.0 秒 | 「未経験」の橙の円の窓 → 5 つの仕事が入るたびに紙色の余白 40px を残す角丸の大窓へ広がる。7 秒の区間を窓が開いている 11.7 秒へ 0.6 倍速で伸ばした（ループ・静止なし） |
| `cut07-tiles-rush.mp4`（素材 1.5–5.5 秒） | 07: 65.5–69.5 秒（06 からの切り替えを含む） | 「爆速」の字形の窓。等速。素材が終わる前（69.1〜69.45 秒）に字の中を灰で埋め、字ごと左上へ縮む |
| `cut10-lit-floor-crane.mp4`（素材 0–8.04 秒） | 10: 101.5–111.0 秒（09 からの寄りを含む） | 左右 60px・上下 40px の紙色を残す角丸の大窓。9.6 秒へ 0.84 倍速で伸ばした |
| Noto Sans JP（OFL） | 全編 | 見出し 900、補助文 700〜800。palt |
| okady.work SVG | 111.0–116.5 秒 | 規定の 4 秒の動き＋1.5 秒保持 |

色合わせ（y30）: 各素材の頭のコマと共通参照画像 `common_room-lamp_style-ref.webp` の RGB 平均を比べ、チャンネルごとの倍率（04: 1.029/1.037/1.035、07: 1.03/1.06/1.09、10: 0.985/0.99/0.99）を ffmpeg の `colorchannelmixer` で掛けた。時間とともに床が明るくなる変化は残している。

## BGM

Python（numpy/scipy）で合成。音楽生成サービス（Lyria 等）は使っていない。理由: 取り消し線・Roll・札の叩き込み・吹き出しの停止・「知らん。」・「移った。」など約40か所へフレーム単位で合わせる必要があり、ローカル合成が速く確実で費用もかからないため。前作の曲は流用していない。

- 120BPM・4拍子（0秒起点）。01–05 は D 長調の D–A/C#–Bm7–Gmaj7。キック、2・4拍のクラップ、裏拍のオープンハット、跳ねるベース、短い和音
- 06 は 57 秒から一度引いて（持続音だけ）、吹き出しが迫る 58.4〜61.45 秒に 16 分のハットとライザーで上がり、止まる瞬間に低い打音
- 07 は Bm–G–Em7–F#sus4 の 8 分の刻むベースと 16 分のハット、タムで最速
- 08–09 は D–Gmaj7–Bm7–A に戻してプラック。10 で Gmaj7–A–D/F#–D に開き、エレピ・持続音・リード。ロゴの保持の終わりの 1 秒で収める
- 混ぜ方: BGM を全体で −8 dB、声のある間はさらに −9 dB。全体を −14 LUFS に合わせる

## 保存対象

制作ソース・設定・依存関係の固定情報・生成／点検スクリプト・ナレーション音声と記録（`audio/voice/`）を Git 管理する。`public/` へ用意する素材、生成音源（bgm／mix）、書き出し・確認画像・キャッシュ、`.venv` は管理対象外。
