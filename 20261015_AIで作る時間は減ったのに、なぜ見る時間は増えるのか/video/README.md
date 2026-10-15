# 制作プロジェクト（Remotion＋three.js）

[企画書](../plan.html) に従って作った動画のプロジェクト一式。完成版は `../renders/final.mp4`（1920×1080・30fps・195秒＝5850フレーム、H.264／AAC 48kHz ステレオ）。

## 再現手順（このフォルダで）

1. Node.js・Python 3・ffmpeg を用意し、`npm ci`、`python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`、`npm run prepare:assets`。フォント・ロゴはリポジトリ内の原本から `public/` へコピーされる。
2. 素材のコマ: `sh tools/extract_clips.sh` → `public/clips/<id>/NNNN.jpg` と `public/stills/*.jpg`。企画側の採用動画（`../assets/blender/*.mp4`）と末尾画像から再生成できるため Git 管理外。
3. BGM: `.venv/bin/python audio/bgm.py` → `audio/bgm.wav`、`public/bgm.m4a`（固定シード。コミットしない）。
4. 全編: `node render.mjs full` → `out/final.mp4`（スチル `node render.mjs stills 0.4 10,20`、区間 `node render.mjs range S E name 0.5 [1]`）。
5. 点検: `npx tsc --noEmit`、`.venv/bin/python tools/review.py out/final.mp4`（1秒ごとの一覧と動きの量）、`.venv/bin/python tools/check_logo.py` と `node tools/logo_compare.mjs`（エンドロゴを原本SVGと照合）。

## 構成

- `src/cuts.tsx`: カット1–15。各カットは時刻からカメラ（画面全体の移動・ロール・拡縮）、HUD（主張の文字）、世界（素材パネル・図形）、画面固定（陰・札・帯）を返す純関数。
- `src/components/stage.tsx`: three.js の舞台。素材動画は1コマずつのJPEGをテクスチャとして読み込み、フレーム番号＝（本編の経過秒×30）で等速に再生する。追従ラベルは `../assets/blender/tracks/*.json` の正規化座標を、素材パネルと同じ親座標へ変換して置く。
- `src/components/prims.tsx`: 角丸の板・円・線・矢印・陰・追従ラベル・1文字ずつ動く文（Noto Sans JP をキャンバスで描いたテクスチャ）。
- `src/components/Logo.tsx`: エンドロゴ。`okady-work-logo.svg` のパスとCSSアニメーションをフレーム計算へ翻訳したもの（20261013 制作の同名ファイルと同一。`tools/check_logo.py` で原本と照合）。
- `audio/bgm.py`: BGM の合成。

## three.js の採否

採用（@remotion/three）。文字・図形・素材パネルを同じ px 座標の3D空間に置き、カメラの移動・ロール・ズームと、文字層（HUD）の独立した運動で画面全体を動かす。文書の層を奥行き方向へ開く（2）、領域パネルの回転（4）、格子面の傾き（14）、素材パネルの傾き（13・15）も同じ空間で行う。すべての動きは `useCurrentFrame` から計算し、`requestAnimationFrame`・実時間・順序依存の乱数は使っていない。

## 素材の使い方

| 素材 | 使用区間（本編） | 使い方 |
|---|---|---|
| `07_before.mp4` | 60.0–71.0 秒 | 全尺・等速。全画面（1.1倍）。レビューのラベルは追従座標、「制作」のラベルは素材のコマから測った球の出現位置 |
| `08_backlog.mp4` | 71.0–87.0 秒 | 全尺・等速。7 と同じ大きさ・同じレビュー拍（1.5秒周期、素材のゲート発光と同位相）。最後の3秒の引きは素材のまま |
| `stills/08_backlog-end.webp` | 87.0–100.0 秒 | 8 の最終コマと同じ位置から映像窓へ縮める |
| `13_quality_gates.mp4` | 141.0–157.0 秒 | 全尺・等速。右寄りのパネル。指示板・3つのゲートへ追従ラベル |
| `15_feedback_loop.mp4` | 171.0–183.0 秒 | 全尺・等速。指示板・レビューへ追従ラベル |
| `stills/15_feedback_loop-end.webp` | 183.0–189.5 秒 | 動く小窓として縮め、結論の文字と組む。動画の引き伸ばし・ループはしない |
| `okady-work-logo.svg` | 189.5–195.0 秒 | 原本のアニメーションをフレームから再現 |
| 書体 | 全編 | Noto Sans JP（SIL OFL 1.1） |

原本の素材は変更していない。

## BGM

Python（numpy/scipy）で合成。音楽生成サービスは使っていない。理由: 映像の出来事（数字の入れ替え、ワークスロップ、「球持ち」、問いの切れ目、ロゴの o の着地など約40か所）とレビューの拍（カット7・8で素材と同じ1.5秒周期）をフレーム単位で合わせる必要があり、ローカル合成が速く確実で費用もかからないため。

- 140BPM・4拍子（0秒起点、映像の拍と同じ格子）。Am–F–C–G の短いベースと乾いたキック・スネア・クラップ・ハット、輪郭のあるスタブ
- 7（60–71秒）は音数を減らし、8（71–87秒）は16分のハットとアルペジオで密度を上げる。レビューの金属音は両区間で同じ周期
- 11 の問い（113–128秒）は減音し、116.95–117.25秒を無音にする
- 15（171–189.5秒）は Fmaj7–G–Am7–C の明るい和音とパッドで解放感。ファンファーレにはしない
- エンドロゴの o の着地・スライド・.work に軽いアクセント。193.4秒からフェードし、195秒で収める
- 統合ラウドネス −14 LUFS、真のピーク約 −1 dBTP（AAC 書き出し前にリミッター）

## 保存対象

制作ソース・設定・依存関係の固定情報・生成／点検スクリプトを Git 管理する。素材のコマ・生成音源・原本からコピーするフォントとロゴ・書き出し・確認画像・キャッシュは管理対象外。完成動画は `../renders/final.mp4` にローカル保存する。
