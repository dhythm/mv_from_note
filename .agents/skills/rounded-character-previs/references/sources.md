# 出典と利用条件

キャラクターはローカルで自作した一般的な丸頭人型。市販キャラクターのモデル形状、購入素材、外部商品ファイルは含めていない。承認済み静止モデルと歩行の編集データを最小限同梱して再利用する。

実測動作は [CMU Motion Capture Database](https://mocap.cs.cmu.edu/) のデータを [Bruce Hahne / cgspeedのMotionBuilder-friendly BVH変換版](https://sites.google.com/a/cgspeed.com/cgspeed/motion-capture/the-motionbuilder-friendly-bvh-conversion-release-of-cmus-motion-capture-database) から利用した。利用条件と変換上の制約は `assets/SOURCE_README.txt` に原文を同梱する。原データと当変換には利用制限を追加しない旨が記載され、研究・商用の利用が可能。特定のCCライセンス名へ置き換えない。

今回同梱するBVHはSubject 07 / Trial 01（短歩行）1本のみ。公開ミラーは [una-dinosauria/cmu-mocap](https://github.com/una-dinosauria/cmu-mocap)、固定コミットは `09a07f54f3bbb58797325f009282d0b2048a2871`。

取得ファイル:
`https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/09a07f54f3bbb58797325f009282d0b2048a2871/data/007/07_01.bvh`

SHA-256: `f8d82ea6ed1aab0cb7d9ee680f476b65471e2322e1da84add8a8527a2cb0b9a2`

`walk_sampled.json` はこの試行の短い区間を原速で30fpsへサンプルしたデータ。`approved_walk.blend` には体格・接地・ウェイト・関節表面の適合を含む。BVHの指/親指は実測されておらず、肩の軸やTポーズにも変換時の推定が含まれる。ノイズのないデータとして扱わない。

19.5秒の応用例で確認した追加試行は36_02（歩行・方向転換）、111_37（手振り）、111_17（前屈・持ち上げ）、111_32（伸び・あくび）。スキルにはこれらの大きな素材や動画は同梱しない。必要な動作が新しく求められたときだけ、出典と利用条件を確認し、取得URL・サイズ・ハッシュ・採用区間・実測からの変更を出力案件に記録する。

クレジット:

> The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217.

BVH conversion by Bruce Hahne (cgspeed).

assets/manifest.jsonには同梱ファイルのサイズとSHA-256がある。外部へ素材を送信する機能や自動ダウンロードはない。別のデータへ差し替える場合は、そのデータ自身の条件を確認する。
