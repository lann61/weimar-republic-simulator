/** 可复现随机数生成器（mulberry32）。相同种子 + 相同调用序列 = 相同结果。 */
export class RNG {
  private state: number;
  calls = 0;

  constructor(seed: number) {
    this.state = seed >>> 0 || 0x9e3779b9;
  }

  next(): number {
    this.calls++;
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** 近似正态，均值0，标准差1 */
  normal(): number {
    const u = Math.max(this.next(), 1e-9);
    const v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** 快进 n 次调用：用于从种子 + 调用次数还原状态（可复现性） */
  fastForward(n: number) {
    for (let i = 0; i < n; i++) this.next();
  }
}

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const clamp01 = (v: number) => clamp(v, 0, 100);
export const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
