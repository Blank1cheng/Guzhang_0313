export function buildLineChartOption({ xAxis, series, showArea = false }) {
  return {
    animation: false,
    grid: { top: 30, left: 42, right: 12, bottom: 28 },
    tooltip: { trigger: 'axis' },
    legend: { top: 0, right: 0, itemWidth: 10, textStyle: { color: '#4c658b', fontSize: 11 } },
    xAxis: {
      type: 'category',
      data: xAxis,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#c5dbff' } },
      axisLabel: { color: '#7388a7', fontSize: 11 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#7388a7', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(91, 133, 194, 0.18)' } },
    },
    series: series.map((item) => ({
      name: item.name,
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: item.data,
      lineStyle: { color: item.color, width: item.width || 2.4 },
      areaStyle: showArea ? {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: `${item.color}33` },
            { offset: 1, color: `${item.color}05` },
          ],
        },
      } : undefined,
    })),
  };
}
