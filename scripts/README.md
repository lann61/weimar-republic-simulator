# 脚本

| 文件 | 用途 |
|---|---|
| `simulate.ts` | 运行历史基线推演（1918-11 → 1934-08），输出年度指标表与九次选举结果。用于校准与回归。 |
| `shot.mjs` / `shot2.mjs` / `shot3.mjs` | 用 Playwright + 本机 Edge 截图，检查界面。需先 `npm run dev`。 |

```bash
npx tsx scripts/simulate.ts
```
