import { createApp } from 'vue';
import Antd from 'ant-design-vue';

import 'ant-design-vue/dist/reset.css';
import '@logicflow/core/es/index.css';
import '@logicflow/extension/lib/style/index.css';

import App from './App.vue';
import './styles/base.css';

document.title = '故障注入平台 · EXP_0312';

const app = createApp(App);
app.use(Antd);
app.mount('#app');
