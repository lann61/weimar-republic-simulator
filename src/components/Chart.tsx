import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart, ScatterChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkAreaComponent,
  DatasetComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkAreaComponent,
  DatasetComponent,
  CanvasRenderer,
]);

const AXIS = '#8b877f';
const LINE = 'rgba(185,154,98,0.18)';

export const baseTextStyle = {
  color: '#cfc6b4',
  fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
  fontSize: 11,
};

export function chartBase() {
  return {
    textStyle: baseTextStyle,
    grid: { left: 44, right: 18, top: 28, bottom: 28, containLabel: false },
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: 'rgba(26,25,22,0.96)',
      borderColor: 'rgba(185,154,98,0.4)',
      borderWidth: 1,
      textStyle: { color: '#f0e8d8', fontSize: 11.5 },
      axisPointer: { lineStyle: { color: 'rgba(185,154,98,0.4)' } },
    },
    xAxis: {
      type: 'category' as const,
      axisLine: { lineStyle: { color: LINE } },
      axisTick: { show: false },
      axisLabel: { color: AXIS, fontSize: 10 },
    },
    yAxis: {
      type: 'value' as const,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: 'rgba(185,154,98,0.08)' } },
      axisLabel: { color: AXIS, fontSize: 10 },
    },
  };
}

export function Chart({ option, height = 220 }: { option: Record<string, unknown>; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option as never, true);
  }, [option]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}
