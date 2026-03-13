# exp_0312

独立的故障注入平台实验工程，目标是把旧版大文件实现拆成清晰的模块化结构，并围绕三层注入语义重构：

- 物理层：物理参数修改式注入
- 电气层：信号叠加式注入
- 协议层：通信链路数据篡改式注入

## 已实现内容

1. 独立可运行的前端工程，不依赖旧项目入口。
2. 模块 1 聚焦故障模板建模，模块 2 聚焦注入任务配置。
3. 左侧模块库、中间拖拽画布、右侧属性栏、下方四模块分析面板。
4. 工作区导入、导出、本地自动恢复、重置和场景预设加载。
5. 批量任务部署、任务执行控制、示波器切换、日志与分析报告导出。

## 代码结构

```text
exp_0312
|- index.html
|- package.json
|- vite.config.js
|- src
   |- main.js
   |- App.vue
   |- styles
   |  |- base.css
   |- data
   |  |- faultCatalog.js
   |- utils
   |  |- chartOption.js
   |  |- faultMath.js
   |  |- labels.js
   |- composables
   |  |- useSimulationRuntime.js
   |  |- useStudioState.js
   |- components
      |- charts
      |  |- TrendChart.vue
      |- layout
      |  |- StudioHeader.vue
      |- panels
      |  |- AnalysisPanel.vue
      |  |- ExecutionPanel.vue
      |  |- InjectionTaskPanel.vue
      |  |- ModuleLibrary.vue
      |  |- PropertyInspector.vue
      |  |- TemplateModelingPanel.vue
      |- workbench
         |- WorkbenchCanvas.vue
         |- registerStudioNodes.js
```

## 运行

```powershell
cd D:\Work\研二下\故障平台\Code\exp_0312
npm install
npm run dev
```

默认访问地址：

```text
http://127.0.0.1:5181
```

## GitHub Pages 部署

当前仓库采用 `main / docs` 的静态分支发布方式，不依赖 GitHub Actions。

生成 Pages 发布目录：

```powershell
cd D:\Work\研二下\故障平台\Code\exp_0312
npm run build:pages
```

生成后的静态文件会放在 `docs/` 目录，推送到 GitHub 后，在仓库里设置：

1. `Settings -> Pages`
2. `Build and deployment -> Source` 选择 `Deploy from a branch`
3. `Branch` 选择 `main`
4. `Folder` 选择 `/docs`

预计访问地址：

```text
https://blank1cheng.github.io/Guzhang_0313/
```
