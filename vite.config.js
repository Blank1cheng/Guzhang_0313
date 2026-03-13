import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/Guzhang_0313/',
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 5181,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue'],
          antd: ['ant-design-vue'],
          logicflow: ['@logicflow/core', '@logicflow/extension'],
          echarts: ['echarts'],
        },
      },
    },
  },
}));
