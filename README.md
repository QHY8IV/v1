# AI费曼小老师 - 桌面版

> 专为小学 1-6 年级学生打造的 AI 数学学习陪伴工具
> 核心方式：让孩子当小老师，给 AI 讲数学

## 快速启动

### 第一步：启动后端服务（终端 1）
```bash
cd "C:\Users\HP\Desktop\AI费曼小老师"
node server/index.js
```

### 第二步：启动前端开发服务器（终端 2）
```bash
cd "C:\Users\HP\Desktop\AI费曼小老师"
node node_modules/vite/bin/vite.js
```

### 第三步：启动 Electron 桌面应用（终端 3）
```bash
cd "C:\Users\HP\Desktop\AI费曼小老师"
node node_modules/electron/cli.js .
```

> 💡 三个终端需要同时运行！

## 功能模块

### 👶 学生端
| 页面 | 功能 |
|------|------|
| 🏠 首页 | 今日课表、快捷入口、学习建议 |
| 📅 课表管理 | 周视图、添加/编辑/删除课程 |
| 📖 课堂互动 | 25分钟计时、AI对话、质量评分 |
| ✏️ 手写板书 | Canvas绘画、多色画笔、OCR识别 |
| 🏆 奖励中心 | 徽章收集、奖励记录、课时提现 |
| ⚙️ 设置 | 个人信息、通知、关于 |

### 👨‍👩‍👧 家长端
| 页面 | 功能 |
|------|------|
| 📊 数据总览 | 统计卡片、学习趋势图、本周课表 |
| 📈 学习进度 | 知识点掌握率、能力雷达图、历史记录 |
| 💳 课时充值 | 套餐选择、交易记录 |
| 🏆 奖励管理 | 奖励规则配置、徽章管理 |
| ⚙️ 系统设置 | 学生信息、课表、通知、安全 |

## 切换模式

点击左侧边栏底部的 **学生/家长模式** 开关即可切换。

## Live2D 虚拟形象

右下角的 🤖 角色"小聪"是 AI 学生，会：
- 定时问候（早/中/晚）
- 点击互动回复
- 课堂上认真听学生讲课

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 33 |
| 前端 | Vue 3 + Vite + Pinia |
| 数据库 | SQLite (sql.js) |
| 后端 | Express + CORS |
| AI | 通义千问 / OpenAI |

## 项目结构

```
AI费曼小老师/
├── electron/          # Electron 主进程
│   ├── main.js        # 窗口管理 + SQLite 数据库
│   └── preload.js     # 安全 API 暴露
├── src/               # Vue 前端
│   ├── App.vue        # 主布局（侧边栏+顶部栏）
│   ├── components/    # 公共组件
│   │   └── Live2DWidget.vue  # 虚拟形象
│   ├── views/         # 页面
│   │   ├── Home.vue           # 首页
│   │   ├── Schedule.vue       # 课表
│   │   ├── Classroom.vue      # 课堂
│   │   ├── Whiteboard.vue     # 板书
│   │   ├── RewardCenter.vue   # 奖励
│   │   ├── Settings.vue       # 设置
│   │   └── parent/            # 家长端
│   ├── stores/        # Pinia 状态管理
│   └── styles/        # 全局样式
├── server/            # Express 后端
│   └── index.js       # AI + OCR + 知识点 API
├── public/            # 静态资源
├── package.json
└── vite.config.js
```

## 语音识别（STT）— 完全离线

课堂页面已集成**离线语音识别**，基于 **Transformers.js + Whisper** 模型，无需联网即可运行：

- 🎤 点击麦克风按钮开始/停止聆听，支持中文普通话
- 📝 实时转写：录音结束后自动识别并显示文本
- 💬 自动发送：识别完成后自动作为学生消息发送到 AI 对话区
- 🧠 离线模型：首次使用自动下载 Whisper-tiny 模型（~75MB），之后缓存在浏览器中
- 🔒 完全离线：模型加载后无需任何网络连接，所有识别在本地完成
- ⚠️ 错误提示：模型下载失败、麦克风权限拒绝等均有中文提示

> 💡 首次使用需联网下载模型（约75MB），之后完全离线可用。需授权麦克风权限。

### 技术架构
```
麦克风 → AudioWorklet (16kHz PCM) → Web Worker → Whisper 模型 → 识别文本
```
- `src/workers/whisper-worker.js` — Whisper 模型加载与推理（Web Worker）
- `src/composables/useOfflineSTT.js` — 音频采集与 Worker 通信（Vue Composable）

## 文字转语音（TTS）— 双声线可选

AI 学生"小聪"的回复不仅显示气泡文字，还会**同步语音朗读**，使用微软 **Edge TTS 神经网络语音**，可在设置中选择萝莉音或小男孩声线：

- 🔊 AI 回复朗读：课堂上 AI 学生的每次回复均自动朗读
- 🗣️ 角色互动发声：点击小聪、定时问候等场景也会朗读
- 🎀 双声线可选（设置 → 小聪语音）：
  - **晓晓**（XiaoxiaoNeural）— 活泼萝莉音，语速 +8% / 音调 +15Hz
  - **云希**（YunxiNeural）— 可爱小男孩，语速 +5% / 音调 +10Hz
- ▶ 试听：设置页可即时试听所选声线
- 💾 偏好持久化：声线选择保存在 localStorage，重启后保留
- 🧠 神经网络：微软 Azure 级 TTS 引擎，远比系统语音自然
- ⏹️ 自动管理：新消息自动打断上一句，组件卸载自动清理
- 🔄 优雅降级：后端不可用时自动切换浏览器 SpeechSynthesis

> 💡 需要后端服务运行（`node server/index.js`）+ Python 已安装 `edge-tts`（`pip install edge-tts`）。首次合成需联网（Edge TTS 云端），之后有缓存。

### 技术架构
```
AI 回复文本 → live2d-speak 事件 → Live2DWidget → useTTS.speak()
  ├─ 优先：POST /api/tts/synthesize → Python edge-tts → MP3 音频流 → <audio> 播放
  └─ 降级：SpeechSynthesis API（系统语音）
```
- `src/composables/useTTS.js` — TTS Composable（Edge TTS 优先 + SpeechSynthesis 降级）
- `server/index.js` — `POST /api/tts/synthesize`（调用 edge-tts CLI 生成 MP3）
- `src/components/Live2DWidget.vue` — 角色说话时调用 TTS 朗读

## 手写板书 OCR

课堂配套的 ✏️ **手写板书** 页面（`src/views/Whiteboard.vue`）支持在 Canvas 画板上书写，并通过 OCR 识别为文本：

- ✍️ 左侧画板：多色画笔、可书写数学算式与解题过程
- 🔍 右侧识别面板：点击「识别」按钮，将板书内容识别为文本显示
- 💬 AI 反馈：识别后给出解题正误与书写建议（如单位标注、等号对齐等）
- 📤 提交板书：一键提交并触发 AI 分析

### 技术架构
```
Canvas 画板 → 导出图像(base64) → POST /api/ocr/recognize → 识别文本 + 置信度 → AI 反馈
```
- 前端：`src/views/Whiteboard.vue` — 画板绘制、识别交互与结果展示
- 后端：`server/index.js` — `POST /api/ocr/recognize` 接口（接收 `imageData`，返回 `{ text, confidence }`）

> ⚠️ 当前 OCR 为**模拟实现**（前后端均返回示例结果），接口与交互骨架已就绪；接入真实识别引擎（百度 OCR API 或本地 Tesseract）后即可投入使用。

## 下一步开发

- [ ] 接入真实 AI API（通义千问/OpenAI）
- [ ] 集成真实 Live2D 模型
- [x] 语音识别（STT）
- [x] 文字转语音（TTS）— Edge TTS 双声线（晓晓萝莉音 / 云希小男孩），设置可选 + 试听
- [x] 手写板书 OCR（UI + 接口骨架已完成，待接入带视觉模型学生AI）
- [ ] 微信支付对接
- [ ] 打包发布（electron-builder）

---

**AI费曼小老师** — 公益普惠 · 长期可用 · 不制造焦虑
