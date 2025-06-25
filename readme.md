# React/Vue Component Dependency Analyzer

自动检测项目框架（React / Vue），分析指定页面或组件的依赖关系，并以 HTML 图表形式可视化依赖结构。

## ✨ 功能亮点

- 🚀 **自动识别框架**：支持 Next.js、Vite、Webpack、Taro 等项目结构。
- 🔍 **深度依赖分析**：基于 TypeScript 静态分析，递归追踪组件、Hooks、工具函数等依赖。
- 📊 **可视化输出**：生成 `dependency-graph.html` 文件，清晰展示每个页面或组件的完整依赖树。
- ⏱️ **进度反馈**：分析过程展示进度条，任务完成后输出总耗时。
- 🛠️ **插件式架构**：易于扩展其他框架或自定义规则。

## 🧪 TODO LIST

- [x] Taro（React）
- [x] Next（React，支持 App / Pages Router）
- [ ] Nuxt（Vue）
- [ ] Vue & React（Vite / Webpack）
- [x] Monorepo（Yarn Workspaces，需手动指定 `--project` 或 `-p <路径>`）
- [ ] Test Examples for dev

## 📦 安装与使用

```bash
npm install -D dep-graphy
dep-graphy

Options:
  -f, --framework <framework>  Specify the framework (e.g., next, taro)
  -p, --project <path>         Specify the project root directory, defaults to current working directory (e.g., client)
  -h, --help                   Display help for command

