/** 日期工具：统一使用 YYYY-MM-DD 字符串，月度推进以「每月1日」为基准。 */

export const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export function parseDate(d: string): { y: number; m: number; day: number } {
  const [y, m, day] = d.split('-').map(Number);
  return { y, m, day: day || 1 };
}

export function formatDate(d: string): string {
  const { y, m } = parseDate(d);
  return `${y}年${MONTH_NAMES[m - 1]}`;
}

export function formatDateFull(d: string): string {
  const { y, m, day } = parseDate(d);
  return `${y}年${m}月${day}日`;
}

export function toISO(y: number, m: number, day = 1): string {
  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function addMonths(d: string, n: number): string {
  const { y, m, day } = parseDate(d);
  const total = (y * 12 + (m - 1)) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const maxDay = new Date(ny, nm, 0).getDate();
  return toISO(ny, nm, Math.min(day, maxDay));
}

/** 返回该月第一天的 ISO 日期 */
export function monthStart(d: string): string {
  const { y, m } = parseDate(d);
  return toISO(y, m, 1);
}

export function monthIndex(d: string): number {
  const { y, m } = parseDate(d);
  return y * 12 + (m - 1);
}

export function monthsBetween(a: string, b: string): number {
  return monthIndex(b) - monthIndex(a);
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.max(0, Math.round((db - da) / 86400000));
}

export function phaseOf(d: string): 1 | 2 | 3 | 4 | 5 | 6 {
  const { y, m } = parseDate(d);
  const key = y * 100 + m;
  if (key < 191909) return 1;
  if (key < 192401) return 2;
  if (key < 192901) return 3;
  if (key < 193004) return 4;
  if (key < 193301) return 5;
  return 6;
}

export const PHASE_LABELS: Record<number, string> = {
  1: 'I. 帝制崩溃与共和国诞生',
  2: 'II. 共和国承压与政治暴力',
  3: 'III. 相对稳定与文化繁荣',
  4: 'IV. 危机传导与议会失灵',
  5: 'V. 总统内阁与民主退化',
  6: 'VI. 权力移交与制度拆除',
};

export function phaseLabel(d: string): string {
  return PHASE_LABELS[phaseOf(d)];
}

export const SIM_START = '1918-11-01';
export const SIM_END = '1934-08-31';
