# Eleven v4ナレーション

現行版: `out/itsuka-cost-narrated-v4.mp4`（78秒・字幕追加なし）。元映像を無再圧縮で維持。

- モデル: **eleven_v4**、言語指定: **ja**
- 声: Kouichi - Calm Japanese Narrator / `S9yQN3065fl76yl0gxsW`
- 試聴1回＋本編7場面。API応答の費用合計47クレジット。
- 文章を場面ごとにまとめて生成。声の速度加工なし。場面単位で配置し、画面の各句への逐語同期は行っていない。
- 原音・原稿・生成設定・配置: `audio/narration/revision-v2/`（第2改訂のフォルダ名。モデルはv4）
- 声のみ: `public/narration-v4.wav`
- BGMとの完成ミックス: `public/narrated-mix-v4.m4a`
- Remotion: `ItsukaCostNarrated`

## 再作業

`python3 audio/narration_v4_mix.py` はローカル再ミックスだけを行う。
`python3 audio/narration_v4_generate.py` は不足原音をAPI生成する。キーはGit対象外のルート `.env` から読む。既存素材は再生成しない。

## 確認

試聴版についてユーザーから「いい感じ。進めてください。」との評価。本編の全編試聴は未確認。型検査成功、映像ストリームは元動画と同一、字幕ストリームなし、最終発話77.62秒まで。

## 初版

`out/itsuka-cost-narrated.mp4` は **eleven_multilingual_v2** による旧版。ユーザーから日本語のイントネーションが不自然と指摘され、不採用。旧版生成スクリプト・素材は履歴として保存している。

設定の根拠: [ElevenLabs TTS](https://elevenlabs.io/docs/overview/capabilities/text-to-speech)、[Create speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)。
