<template>
  <div ref="chartRef" class="trend-chart" :style="{ height }"></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: String, default: '240px' },
});

const chartRef = ref(null);
let chartInstance = null;

function renderChart() {
  if (!chartRef.value) return;
  if (!chartInstance) chartInstance = echarts.init(chartRef.value);
  chartInstance.setOption(props.option, true);
}

function resizeChart() {
  if (chartInstance) chartInstance.resize();
}

watch(
  () => props.option,
  () => renderChart(),
  { deep: true, immediate: true },
);

onMounted(() => {
  renderChart();
  window.addEventListener('resize', resizeChart);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart);
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
});
</script>

<style scoped>
.trend-chart {
  width: 100%;
  min-height: 120px;
}
</style>
