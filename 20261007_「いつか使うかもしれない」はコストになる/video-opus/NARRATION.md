# Eleven v4ナレーション

現行版: `out/itsuka-cost-narrated-v4-synced.mp4`（78秒・字幕追加なし）。元映像を無再圧縮で維持。

- モデル: **eleven_v4**、言語指定: **ja**
- 声: Kouichi - Calm Japanese Narrator / `S9yQN3065fl76yl0gxsW`
- 試聴1回＋本編7場面。API応答の費用合計47クレジット。
- 文章を場面ごとにまとめて生成。声の速度加工なし。初回v4版の場面単位の配置で前半に先行が出たため、前半10句を文の間で分割して表示に合わせた。44秒以降は元の位置・ナレーション波形を維持。
- 原音・原稿・生成設定・配置: `audio/narration/revision-v2/`（第2改訂のフォルダ名。モデルはv4）
- 声のみ: `public/narration-v4-synced.wav`
- BGMとの完成ミックス: `public/narrated-mix-v4-synced.m4a`
- Remotion: `ItsukaCostNarrated`

## 再作業

`python3 audio/narration_v4_sync.py` は既存v4ナレーションの前半だけを再配置し、現行の同期版を書き出す。API利用なし。`audio/narration-v4-sync-plan.json` に配置を記録。

`python3 audio/narration_v4_mix.py` は修正前の場面単位のv4版を再ミックスする。
`python3 audio/narration_v4_generate.py` は不足原音をAPI生成する。キーはGit対象外のルート `.env` から読む。既存素材は再生成しない。

## 確認

試聴版についてユーザーから「いい感じ。進めてください。」との評価。本編の全編試聴は未確認。型検査成功、映像ストリームは元動画と同一、字幕ストリームなし、最終発話77.62秒まで。

## 初版

`out/itsuka-cost-narrated.mp4` は **eleven_multilingual_v2** による旧版。ユーザーから日本語のイントネーションが不自然と指摘され、不採用。旧版生成スクリプト・素材は履歴として保存している。

設定の根拠: [ElevenLabs TTS](https://elevenlabs.io/docs/overview/capabilities/text-to-speech)、[Create speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)。

## 前半の同期修正

「そう言って…」が約2秒、「同時に…」「多いほど…」が約3秒先行していた。前半10句を既存波形から切り出し、`src/lib/copy.ts` の表示時刻に合わせて配置。cut2の最後だけ読点の無音を約0.35秒詰め、21.77秒までに収めた。声の再生成・速度やピッチの変更・追加費用なし。切り出した区間のPCMは元と同一。44秒以降のナレーションPCMも元と同一。BGMのダッキングとAACミックスは再書き出し。

映像ストリーム同一、78秒・2340フレーム、型検査成功、発話の重なりなし。切り出し位置は既知の原稿の文順と無音検出から設定。完成動画の連続再生による聴感・同期評価は未実施。
