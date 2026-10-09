# Opus制作レポート — 技術が解決する前に、試す経験を積む

## 起動・環境（2026-10-09 制作開始）

- 実モデル: claude-opus-5-5（Opus 5.5）
- 権限: auto mode（claude-launch.json の `--permission-mode auto`。セッション内で自動審査による拒否を確認＝autoの審査が動作中）
- セッションID: 234ba293-a4b7-4aad-91a9-cd8ea27830c2（バックグラウンドジョブ 234ba293）
- cwd: /Users/yuta.okada/local/dev/mv_from_note/.claude/worktrees/opus-challenge-20261009（git worktree、ブランチは起動時のもの、HEAD 1493c34）
- 出力先: 同ワークツリー内 `20261009_「そんなの、そのうちできるようになる」前にチャレンジすることに価値がある/video-opus/`
- 隔離ガード: 解除・変更していない。通常コピーは読み取りのみ。Git commit/push はしない（依頼書の指示）。

## 資料確認

- [x] opus-production-request.md 全文（通常コピー）
- [x] ルート AGENTS.md / CLAUDE.md
- [x] 通常コピーの未コミットv2資料をワークツリーへコピーし、cmpで一致確認: plan.md / references.md（HEAD版を上書き）、feedback.md、effects-direction.md、reading-timeline.json、asset-manifest.md、music-brief.md、opus-production-request.md、claude-launch.json
- [x] assets/fonts（3書体＋OFL）、assets/type/experience-mask.png、assets/storyboard-v2 をコピー（diff -rq で一致）。assets/storyboard（v1）はHEADと同一
- [x] 原稿全文 .cache/production-input-20261009/source.md を読了。原本とSHA256一致（0be695cf…405d）を再確認。原稿はGit管理下・外部へ転載しない
- [x] v1 contact-sheet.jpg（質感・空間：暗い土、光る#d2ff1a溝、×、舗装帯、断面、経験の字形、ワイプ）と v2 contact-sheet.jpg（文言・読み順）を両方目視
- [x] okady-work-logo.svg のパス・キーフレーム・イージング・transform-origin を確認
- [x] 前作 20261008/video-opus の構成（Remotion 4＋@remotion/three）を技術参照として確認（上書きしない）

## 原稿上の必須条件（制作前の対応メモ）

- カット8: 「目標」「90%以上」と「現在」「99%以上」を別ラベルで出し、「私の場合」を数値より先に読ませる。連続グラフにしない
- 留保の4句（待つのも判断／切り替えていい／いらなくなった力もある／あとで奪われてもいい）は可読サイズで保持
- カット5「落ちるかもしれない」、カット9「教わり、そこしか試さない」を原文どおり
- カット2の待つ側は「この課題の溝」が増えないだけ。人印は残し、人そのものを否定しない
- カット10の「経験」はカット3・7・9と同一座標系の経路（×・枝を含む）がマスク内を辿って形成される

## 方針（実装手段）

- Remotion＋three.js（@remotion/three の ThreeCanvas）を採用。理由: 地面・溝・舗装・断面・カメラを同じ3D座標で保ち、カット間を連続したカメラ移動でつなげるため。文字は three の平面ではなくHTMLレイヤーに置き、three のカメラ投影から位置・回転を計算して地面と同期させる（日本語の可読性と書体の確実な描画のため）。全運動は useCurrentFrame から計算（useFrame・rAF・CSSアニメーション・順序依存乱数は不使用、乱数は固定seedのハッシュ関数）
- BGM: music-brief の A/B を試作で比較。結果は下記「BGM」と video-opus/MUSIC-SOURCE.md

## 進捗

- 13:2x 資料確認・コピー完了、本レポート作成（制作開始）
- 13:25 video-opus/ に Remotion 4＋@remotion/three＋three 0.186（前作のロックファイルで npm ci）。Python 用に video-opus/.venv（numpy/scipy/Pillow/scikit-image、Git対象外）
- 13:26 経路の事前計算 tools/build_paths.py（固定seed 20261009）: experience-mask.png を14px格子に分け、白い格子1791個に「試行錯誤の木」を育てた（行き止まり336、×は85＋字形の外へ飛び出す失敗枝34、字画の島6つを短い渡り11格子で連結）。冒頭の回り道（舗装帯に沿うジグザグと南への寄り道・×）も同じ座標で定義し、終点が木の根（「経」の左下＝カット6の柱の位置）
- 13:40 10→11 を先に試作。スチルで溝が描かれない不具合（帯の向きの裏面カリング）を発見し修正。俯瞰で線が太すぎ字形が塗りつぶしに見えたため線幅の増し方を抑え、迷路と×が見える状態にした
- 13:45 BGM 3案（A/B/H）を audio/bgm_build.py でローカル合成。区間ごとの強弱を付け直した
- 13:50 試作3区間（a: 0〜44秒＝カット1〜4、b: 64〜98秒＝カット7〜8、c: 104〜123.5秒＝カット9〜11）を書き出し、各区間に A/B/H の BGM を重ねた比較動画9本を作成
- 13:53 1秒刻みの一覧でカット1・2・8の画面の動きが小さいと判断し、カメラの回り込み・振れ・文字群の移動量を増やした
- 13:56 全編の初版を書き出し。文字の画面外検査で31件（カット3の傾いた文字の上端、カット3・4・8の左端）→ 配置を直し、該当区間を0.25秒刻みで再検査して0件
- 14:05 エンドロゴの照合: 原本SVGのCSSアニメーションをChromeで各時刻に止めた画と、翻訳したLogo.tsxの画を0.1秒ごと55時刻で比較し、差の画素は最大0.11%（輪郭のアンチエイリアス程度）。シーク順序を変えた同フレーム一致: 14フレーム×3順序で一致
- 14:08 カット境界±1秒を0.2秒刻みで確認。66.2秒でカメラが柱を突き抜けて見えたため、柱をカット7の0.7秒前から沈めるよう修正
- 14:12 全編を最終書き出し。技術検証・文字の全編検査（0.25秒刻み472フレーム）・確認用の区間動画・BGM 3案の比較動画を作成
- 14:18 完成。本レポートと MUSIC-SOURCE.md、feedback.md の追記を作成

## 完成物

- 全編: `video-opus/out/challenge-full.mp4`（ワークツリー内。1280×720・30fps・H.264 High／AAC 48kHz ステレオ、123.5秒＝3705フレーム、73MB）
- 確認用（完成版から切り出し、音つき）: `video-opus/out/review/final/review-open-00-24.mp4`、`review-mid-54-90.mp4`、`review-late-96-123.mp4`、`review-logo-115-123.mp4`
- BGM 比較（完成映像に3案）: `video-opus/out/review/final/bgm{A,B,H}-{open,mid,end}.mp4`
- 1秒刻みの一覧: `video-opus/out/review/tile-final-1.png`（0〜61秒）、`tile-final-2.png`（62〜123秒）
- 試作（修正前の映像。経緯の記録）: `video-opus/out/review/proto-a-cut01-04_bgm*.mp4`、`proto-b-cut07-08_bgm*.mp4`、`proto-c-cut09-11_bgm*.mp4`

## 再現手順（video-opus/ で）

1. `npm ci`、`python3 -m venv .venv && .venv/bin/pip install numpy scipy pillow scikit-image`
2. 経路: `.venv/bin/python tools/build_paths.py`（→ src/lib/paths.json。固定seed）、尺: `.venv/bin/python tools/make_timeline.py`（企画の reading-timeline.json → src/lib/timeline.json）
3. BGM: `.venv/bin/python audio/bgm_build.py H` → `ffmpeg -i audio/bgm_H.wav -c:a aac -b:a 256k public/bgm.m4a`
4. 全編: `node render.mjs full`（スチル `node render.mjs stills 0.5 1,2,3`、区間 `node render.mjs range S E name 1 1`）
5. 検証: `npx tsc --noEmit`、`node render.mjs check 0 118 0.25`、`node tools/repro.mjs`、`node tools/logo_compare.mjs`、`.venv/bin/python tools/check_logo.py`、`.venv/bin/python tools/verify.py out/challenge-full.mp4`

## 構成（ソース）

- `src/lib/anim.ts`: 時刻の道具（イージング、CSS 互換の cubic-bezier、固定ハッシュ、Hermite 補間）
- `src/lib/world.ts`: 世界の配置と「時刻 → 掘った深さ・回り道の進み・舗装の先端・キー／柱／断面の出入り」
- `src/lib/camera.ts`: カット別のカメラ姿勢関数と境目の混合、全編のうねり。文字を地面の点へ沿わせる投影も同じ関数
- `src/components/World.tsx`: 地面（手続きの土・格子）、溝（インスタンスの帯＋カプセル距離のシェーダー、掘りたての先端が白く光る、俯瞰後の光の走行）、×、字形の下の光（マスク×掘った深さ）、舗装A/B（先端のローラー）、測量線、成功の点線、人印、キー、波形、柱と衝撃輪、断面の板（地層と光るジグザグ）、土の粒
- `src/components/Texts.tsx`＋`Kinetic.tsx`: 26文節の文字群。1文字ずつの登場（flip/slam/scatter/drop/type/slide/rise/×→字）と退場、読む区間も止まらない群の運動（移動・回転・3D 傾き・拡縮・行の組み替え）、縦書きの柱、「力」「宝」の持ち越し・拡大
- `src/components/Logo.tsx`: エンドロゴ（SVG のパスをそのまま使い、キーフレーム・イージング・transform-origin を翻訳）
- 検査用: `BoundsCheck.tsx`（ChallengeCheck）、`LogoCompare.tsx`（LogoOrig／LogoMine）

## three.js の採否

採用（@remotion/three）。地面・溝・舗装・断面・柱・カメラを同じ3D座標で保ち、カット3・7・9で近くから見た枝と×が、カット10の俯瞰でそのまま「経験」の字形になる因果を一つの世界で成立させるため。文字は可読性と書体の確実な描画のため HTML レイヤーに置き、カメラ投影で溝・舗装・柱に沿わせた（カット2の「待つ／試す」、カット3の並走、カット4の舗装の先端、カット6の柱、カット10の進行方向）。

## 原稿上の必須条件の対応

- 「私の場合：」を数値より先に出し、輪の中央の見出しを「目標」（破線の輪、90%以上）→「現在」（塗りの輪、99%以上）に切り替え。一の位を回すが、連続した実測の推移としては描かない
- 留保4句（待つのも、判断ではある／対応されたら、そっちへ切り替える。それでいい／いらなくなった力もある／その領域は、あとで奪われてもいい）を可読サイズで画面に残した。「落ちるかもしれない」「教わり、そこしか試さない」は原文どおり
- カット2の待つ側は、この課題の溝だけが増えない（人印はそのまま）。カット10以降は待つ側を再登場させず、俯瞰では試した軌跡と舗装A（下）・舗装B（左）が共存する
- カット10の「経験」は、カット6の柱の根から育った同じ木の枝・行き止まり×・外への失敗枝が俯瞰で字形を成すもの。字形の PNG を表示してフェードする使い方はしていない（マスクは経路の設計と、掘られた格子だけを内側から灯す下地にのみ使用）
- ナレーション・TTS・APIキー不使用。章表示・字幕帯・末尾の元記事表示なし

## 検証の結果

| 項目 | 結果 | 記録 |
|---|---|---|
| 型検査 `tsc --noEmit` | エラー0 | — |
| 尺・フレーム | 3705フレーム（期待値一致）、映像123.5秒、音声123.52秒 | `out/verify.json` |
| 音声 | ピーク −0.93 dBFS、クリップ0、−45dB 未満の0.5秒ブロックなし、最後の0.1秒 −72.4 dB（自然に収束） | `out/verify.json` |
| 字幕ストリーム | なし | `out/verify.json` |
| 文字の画面外（左右60px・上下40px）・文字群同士の重なり・書体の欠損 | 0〜118秒を0.25秒刻み472フレームで0件 | `out/bounds-0-118.log` |
| シーク順序を変えた同フレーム一致 | 14フレーム×3順序で全一致 | `out/repro.json` |
| エンドロゴ | 原本 SVG のパス・数値の照合 OK、原本の CSS アニメーションと55時刻で差0.11%以下、122.5秒の背景 RGB(209,253,24)≈#d2ff1a（H.264 の丸め） | `out/logo-check.json`、`out/logo-compare.json` |
| 等速の連続再生 | **未実施**（モデルは動画を等速で視聴できない）。代わりに1秒刻みの全編一覧、カット境界±1秒の0.2秒刻み、ロゴ区間0.5秒刻みのコマ検査を実施 | `out/review/tile-final-*.png`、`out/review/bnd-*.png`、`out/review/tile-proto-c.png` |
| 実試聴 | **未実施**（モデルは音声を聴取できない）。BGM の採用は暫定 | `video-opus/MUSIC-SOURCE.md` |

コマ検査は再生確認の代わりではない。動き・音・つなぎの合否は、上記の確認用区間動画と全編で人が確認してほしい。

## 素材の来歴

- 書体: 企画の assets/fonts（Noto Sans JP、BIZ UDPMincho、DotGothic16、各 OFL）を video-opus/public へコピーして使用
- 字形マスク: 企画の assets/type/experience-mask.png（経路の設計と下地の光にのみ使用）
- エンドロゴ: リポジトリ直下 okady-work-logo.svg（パスを Logo.tsx へ転記、検査用に public へコピー）
- 地面・溝・×・舗装・人印・キー・柱・断面・粒子: すべて three.js の手続き生成（外部画像・動画・テクスチャなし）
- BGM: ローカル作曲（video-opus/audio/bgm_build.py）。外部音源なし
- 絵コンテ画像（v1/v2）は参照のみで本編に貼っていない
- クレジット消費・有料生成・購入・公開・第三者連絡: なし

## 企画からの変更（feedback.md にも追記）

- 柱の着地＝枝の発火を61.6秒→61.5秒（拍に合わせた）
- カット2に「待つ」「試す」の軸の名前を人印の足元に表示（カット表の動き欄の記述に基づく）
- 道B（舗装の2本目）をカット7「あとで奪われてもいい」で字形の左に敷き、終盤の俯瞰で舗装A・Bと軌跡が共存する構図にした
- カット8の断面は字形の北（俯瞰の画角外）でせり上がり、「資料作成では、もう困っていない」で左右に開く
- ロゴの o は SVG の枠の上から落ちてくる。原本は SVG の枠で切れるが、画面全体が同じ背景色のため枠外も描いた（overflow visible）。キーフレーム・タイミングは変えていない
- 尺は v2 の123.5秒のまま（延長なし）

## 残る課題・未確認

- 等速の連続再生・実試聴による動き・BGM の合否（上記）
- カット1（0〜5秒）は暗い地面と人印・引用だけで、ほかの区間より画面の情報量が少ない。カメラの回り込みと文字群の傾き・移動はあるが、等速で弱く感じる場合は地面の明るさ・粒子・格子の明滅を足す余地がある
- 文字の切り替わりの瞬間（例: 85.0秒前後、88秒前後）に0.2〜0.3秒ほど読む文字が画面にない間がある（輪や断面は動いている）
- 中間 WAV（audio/bgm_A/B/H.wav、各21MB）は bgm_build.py から再生成できる。Git に含めるかは統合時に判断を（採用版は public/bgm.m4a 4.5MB）
- 隔離ワークツリーから通常コピーへは書き戻していない（Codex が統合）
