# LLM Web Chat Service

> 本项目由 **Claude Code** 从零生成，没有人类编写任何一行代码。

一个基于 Node.js + Express 的轻量级 LLM 聊天 Web 服务，支持流式响应（SSE），可对接任意 OpenAI 兼容的 LLM API。

## 功能特性

- 聊天流式响应（Server-Sent Events）
- 对话历史记录（`localStorage` 持久化，刷新不丢失）
- 新建 / 切换 / 删除对话，侧边栏管理
- 静态前端页面直接托管
- 健康检查接口
- 通过环境变量灵活配置 LLM 后端

## 环境要求

- Node.js >= 18（支持 ESM）

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 LLM API Key 等配置

# 启动服务
npm start
```

服务默认运行在 `http://localhost:3000`。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `LLM_API_KEY` | LLM API 密钥（必须） | — |
| `LLM_BASE_URL` | LLM API 地址 | `http://127.0.0.1:8080/v1` |
| `LLM_MODEL` | 使用的模型名称 | `default` |

## 项目结构

```
├── server.js          # Express 服务端，SSE 聊天接口
├── main.js            # 独立的 CLI 测试脚本
├── public/
│   └── index.html     # 前端聊天页面
├── .env.example       # 环境变量示例
└── package.json
```

## 接口说明

### POST /api/chat

发送聊天消息，接收流式响应。

**请求体：**

```json
{
  "messages": [
    { "role": "user", "content": "你好" }
  ]
}
```

**响应：** `text/event-stream`，每条数据为 JSON：

```
data: {"content": "你好"}
data: {"done": true}
```

### GET /api/health

健康检查。

**响应：**

```json
{ "status": "ok", "model": "default" }
```

## 独立 CLI 测试

`main.js` 提供了一个不依赖 Web 服务的独立测试脚本，可直接调用 LLM API：

```bash
node main.js
```
