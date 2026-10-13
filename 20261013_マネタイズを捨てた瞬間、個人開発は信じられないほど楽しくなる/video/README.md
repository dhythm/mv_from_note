# 制作プロジェクト（Remotion＋three.js）

[制作指示書](../plan.md) に従って作った動画のプロジェクト一式。完成版は `../renders/final.mp4`（1280×720・30fps・50.5秒＝1515フレーム、H.264／AAC 48kHz ステレオ）。

## 再現手順（このフォルダで）

1. Node.js・Python 3・ffmpeg を用意し、`npm ci`、`python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`、`npm run prepare:assets`。フォント・ライセンス・ロゴはリポジトリ内の原本から `public/` へコピーされる。
2. 切り抜き素材: `.venv/bin/python tools/key.py` → `public/mascot/<id>/NNNN.webp`（RGBA）と `public/mascot/<id>.json`（切り取り範囲・手先の追跡）。Git 管理外の再生成物（連番・追跡JSONともコミットしない）
3. BGM: `.venv/bin/python audio/bgm.py` → `audio/bgm.wav`、`public/bgm.m4a`。固定シードで再生成できるため両方ともコミットしない。
4. 全編: `node render.mjs full` → `out/final.mp4`（スチル `node render.mjs stills 0.5 1,2,3`、区間 `node render.mjs range S E name 1 1`）
5. 点検: `npx tsc --noEmit`、`node render.mjs check 0 45 0.25`（文字の外周5%検査）、`.venv/bin/python tools/review.py out/final.mp4`（0.5秒ごとの一覧と動きの量）、`node tools/logo_compare.mjs` と `.venv/bin/python tools/check_logo.py`（エンドロゴを原本SVGと照合）

## 構成

- `src/cuts.tsx`: カット1–8。各カットが時刻からカメラ（画面全体の移動・ロール・拡縮）、HUD（主張の文字）、世界（看板・札・道具・キャラクター・図形）、画面固定（帯・ワイプ）を返す純関数。境目はフレーム番号で判定
- `src/components/stage.tsx`: three.js の舞台。カメラの姿勢をフレームから設定し、マスコットの連番を1コマずつテクスチャとして読み込む（読み込み後に R3F へ描かせてからフレームを確定）。道具の部品
- `src/components/prims.tsx`: 角丸の板・輪・円・文字（Noto Sans JP をキャンバスで描いたテクスチャ）・1文字ずつ動く文。重ね順は renderOrder で「背景 → 後景 → 道具・接地影 → キャラクター → 前景の札 → 主張の文字」
- `src/components/Logo.tsx`: エンドロゴ。`okady-work-logo.svg` のパスとCSSアニメーションをフレーム計算へ翻訳したもの（20261009制作の同名ファイルを流用、原本SVGと同一であることを確認済み）
- `tools/key.py`: 緑背景の除去（g−r による抜き、内部の緑かぶりの穴埋め、足元の床影除去、緑かぶり補正）と手先の追跡
- `audio/bgm.py`: BGM の合成（固定シード）

## three.js の採否

採用（@remotion/three）。文字・図形・切り抜いたマスコットを同じ px 座標の3D空間に置き、カメラの移動・ロール・ズームで画面全体を動かす。看板は奥行き方向から突進し、札や看板は層ごとの奥行きで視差がつく。すべての動きは `useCurrentFrame` から計算し、`requestAnimationFrame`・実時間・順序依存の乱数は本編の動きに使っていない。

## 使用素材と出所

| 素材 | 出所 | 使い方 |
|---|---|---|
| M1 | `../assets/videos/Mascot_showing_hesitation_animat…_20261013164946_2.mp4`（企画側採用） | 原本1.0–7.0秒 → 本編5.0–11.0秒 |
| M2 | `../assets/videos/Mascot_discovering_useful_thing_…_20261013164946.mp4` | 原本0.5–6.2秒 → 本編14.3–20.0秒 |
| M3 | `../assets/videos/Mascot_animating_on_green_screen_20261013164946_2.mp4` | 原本0.5–5.5秒 → 本編27.0–32.0秒、原本5.5–9.5秒 → 本編35.0–39.0秒 |
| 書体 | Noto Sans JP（可変、SIL OFL 1.1。`public/NotoSansJP-OFL.txt`） | 本編の文字 |
| ロゴ | リポジトリ直下 `okady-work-logo.svg` | 45.0–50.5秒 |
| BGM | `audio/bgm.py` による Python 合成（外部サービス・追加課金なし） | 全50.5秒 |

原本の音声トラックは使っていない。原本は変更していない。24fps の原本は ffmpeg の fps フィルタで30fpsへ変換（最近傍のコマの複製）。

## BGM

Python（numpy/scipy）で合成。音楽生成サービス（Lyria 等）は使っていない。理由: 0–11.0秒の重い反復、11.0–11.3秒の完全な無音、後半の軽快な打楽器、映像の出来事（看板の着地 3.24/4.04秒、つまみの反応 14.70秒、URLカード着地 20.7秒、○の記入、閉じる、「楽しさ」33.2秒、ロゴの o のバウンド等）へのアクセントをフレーム単位で合わせる必要があり、ローカル合成が速く確実だったため。

- 120BPM（0秒起点、映像の拍と同じ格子）。前半 Dマイナー（低音オスティナート・重いキック・時計のような金属音・スネアのロール）、後半 Cメジャー（シェイカー・クラップ・軽いキック・マリンバ風の旋律・弾むベース）
- 11.0秒で前半の残響ごと切り、11.0–11.3秒は全サンプル0
- 32.6–33.2秒は「静かに閉じる」間として打楽器を薄くする
- 49.2秒からフェードし、50.5秒（ロゴの終わり）で収める
- 統合ラウドネス −14.0 LUFS、ピーク約 −1.9 dBFS

## 保存対象

制作ソース・設定・依存関係の固定情報・生成／点検スクリプトをGit管理する。切り抜き連番・追跡JSON・生成音源・原本からコピーするフォントとロゴ・書き出し・確認画像・キャッシュは管理対象外。完成動画は `../renders/final.mp4` にローカル保存し、再書き出しには上の手順を使う。サムネイルは `../assets/thumbnail/thumbnail-v1.png`。
