# Opus制作レポート — メンテナンスされない（できない）モノは、いずれ負債になる

## 起動・環境

- 実モデル: claude-opus-5-5（Opus 5.5）
- 権限: auto mode（起動記録 --permission-mode auto）
- セッションID: 571256ea-85eb-4f15-8c14-5d610709b1e1（通常コピーの opus-session-id.txt による）
- cwd: /Users/yuta.okada/local/dev/mv_from_note/.claude/worktrees/opus-maintenance-20261008
- 出力先: 同ワークツリー内 `20261008_メンテナンスされない（できない）モノは、いずれ負債になる/video-opus/`
- 隔離ガード: 解除していない。通常コピーへは書き込まない（読み取りのみ）。

## 資料確認（2026-10-08 開始時）

- [x] ルート AGENTS.md / CLAUDE.md
- [x] 通常コピーの plan.md（v3追記あり）→ ワークツリーへコピー（旧版を更新）
- [x] feedback.md / references.md / opus-production-request.md → ワークツリーへコピー
- [x] 原稿全文（private-note PermanentNote 20261001）
- [ ] contact-sheet.jpg・個別コマ
- [ ] Remotion スキル

## 進捗

- 開始: 資料確認中
- [x] contact-sheet.jpg（20コマ）確認、Remotion スキル（SKILL.md / video-layout / 3d / audio / local-fonts）確認
- 環境: video-opus/ に Remotion 4 + @remotion/three + three 0.186（前作と同じロックファイルで npm ci）。BGM合成用に video-opus/.venv（numpy/scipy、Git対象外）
- ナレーション: ElevenLabs API `/v1/models` で eleven_v4（ja対応）を確認。声 Kouichi `S9yQN3065fl76yl0gxsW`（professional, calm, ja）を確認。
  - 原稿: video-opus/narration-script.md（生成前に保存）、送信文: video-opus/audio/narration-plan.json
  - 生成: 10カット×1回（with-timestamps、mp3_44100_192、stability 0.55 / similarity 0.75 / seed 20261008）。試験生成はカット1（本番採用）。
  - character-cost 合計 94（4+6+4+12+12+13+12+12+11+8）。アカウント使用量 188→282 で一致。request ID は video-opus/audio/narration/v4/cut-XX.json
  - 実尺 合計 140.98 秒。文の切れ目だけ 0.6〜0.9 秒の自然な間（読点ごとの無音なし）。速度加工なし。
- タイムライン: video-opus/src/lib/timeline.json（audio/timeline_build.py）。全尺 154.28 秒 / 4628 フレーム。核「現状維持じゃない」は 17.3〜19.5 秒。
  - 110秒前後から延長した理由: 原稿の留保（5の肯定、6の解決像、8の条件、9の循環）を声で落とさず、速度圧縮しないため。

## 試作（2026-10-08）

- 出力: video-opus/out/review/proto-a-cut01-03.mp4（0〜25.5秒）/ proto-b-cut04.mp4（23〜43.7秒）/ proto-c-cut09-10.mp4（116.5〜154.3秒）。1280x720・30fps・音声つき
- BGM: video-opus/public/bgm.wav（audio/bgm_build.py でローカル合成、155.5秒）。ミックス: public/mix.m4a（audio/mix_build.py、ダッキング -7.5dB）
- 自己確認: 0.5秒刻みのコマ一覧（tile-a/b/c.jpg）で静止画として確認。等速の連続再生・実試聴は未実施（モデルは音声を聴けない）

## ディレクターレビュー対応（director-review.md）

- 全編共通: 要点の文字(KText)を前面合成（depthTest off）。毎フレーム、カメラからの投影位置と幅を計算し、安全域（左右5%・上下8%）に収まるよう位置と大きさを補正（動き自体は維持）
- 背景の版番号・流れの線・補助の札は、画面中央の字面域で薄くなるシェーダー／係数を追加
- カット4: ライブラリの札は『ライブラリは古くなる』以降だけ表示し字面域を避ける。下段の文字を箱の下へ、カメラ距離を拡大。『見えないところで、腐食』を上段『実際は、見えないところで』と下段『腐食が進む』に分節し、スキャン帯の内部腐食を空ける
- カット9: 結びを上段『自分の道具を守る、』と下段『保険でもある』に分節、歯車をさらに右へ。対価→点検・修繕→道具の区間はカメラを引いて循環全体を観察できるようにした
- カット5〜8を実装（同じ前面合成・安全域補正・上下分節を適用）
- ナレーションは生成済み eleven_v4 音源のまま（再生成なし）

## 全編書き出し（進行中）

- 2026-10-08 全編 out/maintenance-full.mp4 を書き出し開始（ディレクターレビュー対応・カット5〜8実装後）
- 書き出し前のスチル確認（out/review/sheet-d.png）: 27秒の札被り・35秒の箱遮り・39.5秒の安全域超え・135秒『保険』の歯車遮りが解消。124〜126秒は循環の4ラベル（対価・人の時間・点検・修繕・道具）が画面内に収まる

## 完成（2026-10-08）

- 全編: /Users/yuta.okada/local/dev/mv_from_note/.claude/worktrees/opus-maintenance-20261008/20261008_メンテナンスされない（できない）モノは、いずれ負債になる/video-opus/out/maintenance-full.mp4（1280x720・30fps・h264＋AAC 48kHz ステレオ、154.28秒＝4628フレーム、141MB）
- 試作: video-opus/out/review/proto-a-cut01-03.mp4 / proto-b-cut04.mp4 / proto-c-cut09-10.mp4（レビュー前の版。修正後の確認は全編で行う）
- 点検用: out/review/check-full-lowres.mp4（修正途中の640x360無音版）、out/review/tile-final.jpg（完成版の1秒刻み一覧）、sheet-d.png（指摘時刻の修正後スチル）

### 検証（実施したもの）

- 型検査 tsc --noEmit: 成功
- 技術検証 tools/verify.py → out/verify.json: 映像4628フレーム、音声154.28秒、ピーク -0.87 dBFS、クリップ0、1秒ごとの無音ブロック(-50dB未満)なし、字幕ストリームなし
- 同フレーム再現 tools/repro.mjs → out/repro.json: フレーム600/1200/3200/4500 を順序を変えて2回ずつ描画し、PNGのハッシュが一致
- ミックス: audio/mix-report.json。発話の重なり・カット越えなし（検査で停止する仕組み）。発話中の声 約-17.4dB / BGM 約-28.5dB
- 文字の欠損・はみ出し: 全編を1秒刻み・指摘区間を0.5秒刻みのコマ一覧とスチルで目視。要点の文字は前面合成＋毎フレームの安全域補正

### 未実施・未確認（合格扱いにしない）

- 等速の連続再生による動きの確認: 未実施（コマ一覧・スチルの静止画検査のみ）
- 実試聴（ナレーションの抑揚、BGMの音色・ノリ、ダッキングの聴感）: 未実施。モデルは音声を聴取できない
- 料金の金額換算: 未確認（クレジット94のみ確認）

### 既知の軽微な点

- カットの境目（約0.3秒）で、前の舞台の退場と次の舞台の入場が重なる瞬間がある（流れに引き渡す演出として残した）
- カット1の約7秒で『今のまま？』の退場と『止まらずに、』の入場が一瞬重なる
- 全尺は110秒前後から154秒へ延長（ナレーション実尺141秒を速度圧縮しないため）

### 成果物一覧（video-opus/）

- narration-script.md / NARRATION.md / MUSIC-SOURCE.md
- audio/: narration-plan.json, narration_generate.py, eleven_check.py, eleven_common.py, timeline_build.py, bgm_build.py, mix_build.py, narration/v4/cut-01〜10.mp3＋json
- public/: bgm.wav, narration.wav, mix.wav, mix.m4a, NotoSansJP（OFL）
- src/: Remotion＋three.js（@remotion/three）。全運動はフレーム時刻から計算（requestAnimationFrame・useFrame・CSSアニメーション不使用）
- 自動審査での停止: 複合シェルコマンド（変数を含むsed・ヒアドキュメント2回・forループ）が隔離ガードで計4回拒否 → ファイル作成ツールとPythonスクリプトへ置き換え。権限の拡大・ガード解除はしていない

## C08『生涯保証』札の暗い横線の修正（2026-10-08）

- 症状（ユーザー指摘）: 黄色い『生涯保証』の札の上部を暗い横線が横切る。
- 原因: 開いた蓋（箱の奥の辺を軸に約72°立ち上がる）の上端が y≈2.5・z≈-0.6 にあり、札（中心 y=2.2・z=-0.6）と同じ奥行きで3D交差していた。修正前の全編104秒のフレームで線を確認（out/review/before_plate_104.png）。
- 修正（C08.tsx のみ、局所的）: 札を蓋より手前 z=1.0（PLATE_Z）へ移動。高さは元の y=2.2（PLATE_Y）を維持。落下は手前方向（z=1.0→4.0）へ向け、閉じる蓋と箱の前面（z=1.6）にめり込まないようにした。共通の Label・depthTest は変更していない。
  - 途中で y=2.6 に上げた案は、111〜112秒で上段の文字『事業者が倒れれば、』に近づいたため不採用。蓋より手前に置けば元の高さでも交差しないことを確認して戻した。
- 確認:
  - 型検査 tsc --noEmit: 成功（終了コード0）
  - スチル（out/review/sheet-plate-after2.png）: 99.8/101.5/104/108.5/110.9/111.6/112.2/112.6/113.2秒。点灯・保持・明滅・落下の全時刻で暗い線なし。修正後の全編104秒（out/review/after_plate_104.png）でも線なし
  - C07→08→09の接続: スチル（out/review/sheet-plate-after.png の97.3/97.9/117.3/117.8秒）と区間映像 out/review/cut07-09-plate-fix.mp4（95〜120秒、音声つき）を0.25秒刻みのコマ一覧（tile-cut07-09.jpg）で確認。札の登場→明滅→手前への落下、隣接カットへの流れは修正前と同じ
  - 全編再書き出し out/maintenance-full.mp4: 4628フレーム・154.28秒、ピーク -0.87 dBFS、クリップ0、無音ブロックなし、字幕ストリームなし（out/verify.json）
  - 修正前（out/maintenance-full-before-plate-fix.mp4 に退避）との比較: 音声ストリームの MD5 が一致（既存の mix.m4a のまま）。120秒以降の映像は PSNR 無限大（完全一致）。0〜95秒は 18.7〜24.2秒（カット3の粒子の組み替え）に PSNR 40〜56dB の画素単位の差があり、差分画像では密集した加算合成の粒子に点状の差が出るだけで目視上の変化はない。札の修正とは無関係の、粒子の描画の非決定性とみられる（以前の同フレーム再現テストの4フレームには含まれていなかった区間）
- 未実施: 等速の連続再生・実試聴（従来どおり）
