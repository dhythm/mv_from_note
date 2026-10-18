# 実行手順

この文書内の `$SKILL_DIR` は本スキルの絶対パス、`$BLENDER_BIN` は実際に確認したBlender実行ファイル。コードに個人のホームや制作日ディレクトリを固定しない。付属スクリプトはPython標準ライブラリとBlender同梱のbpy/numpyを使う。CLIの `--help` で全引数を確認できる。

## 最小の再利用

リポジトリ直下で実行する例。`new` はファイルコピーのみで、ユーザーのBlender画面には触れない。

```sh
SKILL_DIR="$PWD/.agents/skills/rounded-character-previs"
python3 "$SKILL_DIR/scripts/previs.py" check
python3 "$SKILL_DIR/scripts/previs.py" new --template walk --out-dir output/previs/walk-test
python3 "$SKILL_DIR/scripts/previs.py" render --blender "$BLENDER_BIN" \
  --blend output/previs/walk-test/scene.blend --frames 1,36,72 \
  --out-dir output/previs/walk-test/pose-checks --width 960 --height 540
```

同名出力は既定で上書きしない。修正は別の固有フォルダで行う。既存のblendを編集する場合も、ユーザーの指示と変更状況を確認してコピー先を選ぶ。

短歩行は1〜72f、30fps。非表示の `Rounded Humanoid — deformation rig` をOutlinerで再表示し、Pose Mode / Action Editorで編集する。表面補正は `Bend correction ###` シェイプキー。大きくポーズを変えたら補正も更新するか、その区間の補正値を0にして調整する。ボーン編集だけで自動再生成はされない。色は `Soft porcelain white`、構図は `Three quarter` カメラ。

## 連続レンダリングとMP4

代表姿勢・短動作を確認してから全フレームを出す。疎な3姿勢チェックを動画としてエンコードしない。`encode` は連続番号のフレームだけを受け付ける。

```sh
python3 "$SKILL_DIR/scripts/previs.py" render --blender "$BLENDER_BIN" \
  --blend output/previs/walk-test/scene.blend --frames all \
  --out-dir output/previs/walk-test/preview-frames
python3 "$SKILL_DIR/scripts/previs.py" encode \
  --frames-dir output/previs/walk-test/preview-frames --output output/previs/walk-test/preview.mp4
python3 "$SKILL_DIR/scripts/previs.py" inspect --blender "$BLENDER_BIN" \
  --blend output/previs/walk-test/scene.blend --audit output/previs/walk-test/retarget_audit.json \
  --output output/previs/walk-test/geometry-checks.json
```

`inspect` の画角は保存済みblendの解像度比を用いる。違う縦横比で描画するならblend側の設定も合わせて再検査する。

通常再生と隣接全フレームの視覚検品を行う。合格後の本出力では `render --width 1920 --height 1080 --samples 32` と別フォルダを指定する。最終MP4はffprobeで尺・fps・解像度・フレーム数を調べ、ffmpegのフルデコードでエラーや欠けを確認する。再生画面の表示落ちはファイルの欠けとは別に記録する。

## 新しい実測動作

既存の素材で足りない場合だけ、利用条件を確認した必要なBVHを取得する。自動ダウンロード機能は設けていない。CMU/cgspeed用の骨名・挿入Tポーズを前提にする。異なる骨名・軸のデータを黙って同一扱いしない。

```sh
python3 "$SKILL_DIR/scripts/previs.py" sample --blender "$BLENDER_BIN" \
  --bvh /path/to/trial.bvh --output output/previs/source/trial-sampled.json
python3 "$SKILL_DIR/scripts/previs.py" retarget --blender "$BLENDER_BIN" \
  --motion-json output/previs/source/trial-sampled.json --start 0 --duration 2 \
  --kind standard --camera 5 -6 2.8 --ortho-scale 5.55 --out-dir output/previs/new-action
```

取得元の表示名は `--source-label` で監査記録へ保存できる。表示名だけを取得元の検証済み証拠とはしない。

出力の `action/action.blend` と `retarget_audit.json`（action内）を編集・検査する。`--kind bend` は `pickup/pickup.blend`、`--kind overhead` は `stretch/stretch.blend` に出す。`pickup` は内部の処理名で、小道具がなければ「かがんで起きる」と説明する。

`bend` は実測足の向きでheadingを安定させ、短い胴向けに骨盤26°・胸43°・頭25°の傾き上限を使う。`overhead` は大きな頭の外へ腕を逃がす。どちらも実測そのものを無変更で表示する設定ではなく、適合後の視覚検査が必要。骨長・形状を変えた場合は現行の定数とウェイト帯も更新する。

## 統合blend

`shots.json` の例。相対パスはこのJSONから解決する。

```json
[
  {"name":"Walk", "blend":"walk-test/scene.blend"},
  {"name":"Turn", "blend":"turn/action/action.blend", "frame_start":1, "frame_end":60}
]
```

```sh
python3 "$SKILL_DIR/scripts/previs.py" assemble --blender "$BLENDER_BIN" \
  --manifest output/previs/shots.json --output output/previs/combined.blend
```

各ショットは30fpsで揃える。masterはVSE、各SHOTは編集可能な3Dシーン。3D編集へはSceneを切り替え、必要ならShift+F5で3Dビューにする。保存後に再読込し、データブロックの `.library` と未パックの外部ファイル依存を確認する。MP4は同一仕様で各クリップを出し、ffmpegのconcat等でつなぐかmasterをレンダリングする。

## 形状を再構築する場合

```sh
python3 "$SKILL_DIR/scripts/previs.py" rebuild-character --blender "$BLENDER_BIN" \
  --out-dir output/previs/character-rebuild
```

既定はモデル保存のみ。`--render` を付けると正面・斜めの軽量静止を出す。生成された中立形状は初期ウェイト段階なので、動作には `retarget` が行う `refine_skin.py` と姿勢補正を適用する。形状を変えていない再構築では基準頂点ハッシュを照合する。変えた場合は別形状としてユーザーに示し、承認済み形状のままと呼ばない。
