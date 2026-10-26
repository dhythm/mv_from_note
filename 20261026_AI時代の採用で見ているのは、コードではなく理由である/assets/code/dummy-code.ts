// 画面用のダミーコード（企画側が書き下ろしたもの。実在のサービス・顧客のコードではない）
// 01・02・10 の「コードの壁」に使う。02 で寄る一行は HIGHLIGHT の行（指数バックオフの待ち時間）。

type Task = { id: string; run: () => Promise<Response> };

type RetryOptions = {
  retries: number;
  base: number;
  maxDelay: number;
  shouldRetry?: (res: Response) => boolean;
};

const DEFAULTS: RetryOptions = {
  retries: 5,
  base: 200,
  maxDelay: 8_000,
  shouldRetry: (res) => res.status === 429 || res.status >= 500,
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const jitter = (ms: number) => ms / 2 + Math.random() * (ms / 2);

export async function withRetry(task: Task, opts: Partial<RetryOptions> = {}) {
  const o = { ...DEFAULTS, ...opts };
  let last: Response | undefined;
  for (let attempt = 0; attempt <= o.retries; attempt++) {
    last = await task.run();
    if (last.ok) return last;
    if (!o.shouldRetry?.(last)) break;
    const delay = Math.min(o.base * 2 ** attempt, o.maxDelay); // HIGHLIGHT
    await sleep(jitter(delay));
  }
  throw new Error(`task ${task.id} failed: ${last?.status}`);
}

export async function runQueue(tasks: Task[], concurrency = 4) {
  const results = new Map<string, Response>();
  const queue = [...tasks];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const t = queue.shift();
      if (!t) return;
      results.set(t.id, await withRetry(t));
    }
  });
  await Promise.all(workers);
  return results;
}

export function summarize(results: Map<string, Response>) {
  const byStatus: Record<number, number> = {};
  for (const res of results.values()) {
    byStatus[res.status] = (byStatus[res.status] ?? 0) + 1;
  }
  return Object.entries(byStatus)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([status, n]) => `${status}: ${n}`)
    .join("\n");
}
