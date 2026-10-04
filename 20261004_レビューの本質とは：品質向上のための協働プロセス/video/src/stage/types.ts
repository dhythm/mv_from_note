// 1フレームの舞台の状態。各カットは「時刻 → StageState」の純粋関数として書く。

export type HandId = "aL" | "aLrest" | "aR" | "aRcurl" | "aRpinch" | "aRwrite" | "bRpoint" | "bLsupport" | "bRrest";

export type HandState = {
  id: HandId;
  /** 基準画の位置からの移動（机の座標） */
  dx: number;
  dy: number;
  /** 回転（度）。pivot 周り。省略時は部品の下端中央付近 */
  rot?: number;
  pivot?: [number, number];
  /** 0 = 紙や机に触れている（影が近い）、1 = 浮いている */
  lift: number;
  /** つまんでいる道具 */
  holding?: "eraser" | "stamp";
  /** 机の座標での 2D 変換 [a, b, c, d, e, f]（あれば dx/dy/rot より優先） */
  matrix?: [number, number, number, number, number, number];
  opacity?: number;
};

export type EditState = {
  /** edits.json のキー（before__after） */
  name: string;
  page: number;
  erase: number;
  draw: number;
};

export type BookState = {
  /** 24 ページそれぞれの絵（pages.json のキー） */
  keys: string[];
  /** ページごとのめくり角度（0 = 平ら） */
  angles: number[];
  /** 表紙の角度（0 = 閉じている、FAN 付近 = 左の束） */
  cover: number;
  /** 表紙の印（0..1：押した直後に濃くなる） */
  seal: number;
  edit?: EditState;
  /** 下のページを透かして重ねる（薄紙越しの比較） */
  onion?: { page: number; amount: number };
  /** 一番上のページの右端を少し持ち上げる角度 */
  lift?: number;
  /** 持ち上げたページを透かして下のページを見る（薄い紙を光にかざす）。amount 0..1 */
  peek?: { page: number; amount: number };
  /** ページに重ねた薄紙（下描きつき）。x, y はページからのずれ */
  sheets?: SheetState[];
};

export type SheetState = { sketch: "rush" | "wait"; x: number; y: number; rot: number; draw: number; opacity?: number };

export type Camera = { cx: number; cy: number; zoom: number; blur?: number };

export type DeskProps = {
  pencil: boolean;
  eraser: boolean | [number, number];
  /** true = 置き場所、座標 = 部品の左上の位置（手で持っている） */
  stamp: boolean | [number, number];
};

export type StageState = {
  camera: Camera;
  book: BookState;
  /** 奥から手前の順 */
  hands: HandState[];
  desk: DeskProps;
  /** 机をよぎる影（B の移動など） 0..1 と位置 */
  passShadow?: { x: number; y: number; amount: number };
  /** 画面全体の暗さ（0 = そのまま） */
  fade?: number;
  /** 確認用の目印（机の座標） */
  markers?: [number, number][];
};
