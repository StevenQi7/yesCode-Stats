# Change Log

All notable changes to the "yesCode Stats" extension will be documented in this file.

## [1.0.1] - 2025-08-01

### Fixed
- 修复 "Cannot find module 'axios'" 错误
- 将 axios 依赖替换为 Node.js 内置的 https 模块，解决插件加载失败问题

## [1.0.0] - 2025-08-01

### Added
- 初始版本发布
- 状态栏实时显示余额和订阅使用百分比
- 侧边栏详细统计面板
- 自动引导设置流程
- API Token 安全存储在 VS Code 密钥库
- 支持多种刷新周期（10秒、30秒、1分钟、5分钟、30分钟）
- 订阅使用量计算和进度条显示
- 中文界面

### Features
- 双重显示：状态栏和侧边栏
- 自动刷新功能
- 灵活的配置选项
- 使用量警告（>80% 黄色警告，>90% 红色警告）