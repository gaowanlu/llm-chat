# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A lightweight Node.js + Express LLM chat web service with SSE streaming, supporting any OpenAI-compatible API. The frontend is a single-page app entirely contained in `public/index.html`.

## Key Commands

```bash
npm start          # Start the web service (server.js) on PORT 3000
node main.js       # Run standalone CLI test script (one-shot chat to stdout)
npm install        # Install dependencies
```

Open http://localhost:3000 in a browser to use the chat interface.


## CI/CD

- **GitHub Actions**: CI workflow (`.github/workflows/ci.yml`) verifies server health endpoint on each push to main branch using Node.js 20.

## Configuration

- Copy `.env.example` to `.env` and fill in `LLM_API_KEY` (required), `LLM_BASE_URL`, `LLM_MODEL`, and `PORT`.
- All config is read from environment variables at startup via `dotenv`.
- `.env` contains actual credentials — do not commit to git.

## Architecture

### Entry Points

- **`server.js`** — Express web server. Serves static frontend from `public/` and provides two API routes:
  - `POST /api/chat` — Chat streaming endpoint. Accepts `{ messages: [{role, content}] }`, streams LLM response via SSE. Writes `data: {"content": ...}\n\n` per chunk, `data: {"done": true}\n\n` at end, and `data: {"error": ...}\n\n` on failure. Aborts writes if client disconnects.
  - `GET /api/health` — Health check returning `{ status: "ok", model }`.
- **`main.js`** — Standalone CLI script for quick LLM API testing, independent of the web server. Sends a fixed Chinese prompt and writes streamed content directly to stdout.

### Dependencies

- **express** (^5.1.0) — HTTP server and static file serving
- **openai** (^6.42.0) — OpenAI-compatible SDK (used as an HTTP client for any OpenAI-compatible API)
- **dotenv** (^16.4.7) — Environment variable loading

### Frontend (`public/index.html`, ~1300 lines)

A self-contained SPA with substantial client-side logic:

- **Conversation management**: `localStorage`-backed conversation store with create/switch/delete. Each conversation holds a messages array and auto-derived title (from first user message). Sorted by `updatedAt` descending in sidebar.
- **SSE client**: Uses `fetch` + `ReadableStream.getReader()` with manual line buffering to parse SSE frames. Decodes UTF-8 chunks and splits on `\n`.
- **Streaming control**: `AbortController` per request — `cancelStreaming()` calls `.abort()` to cancel in-flight requests.
- **Health status indicator**: Calls `GET /api/health` on load and on click, shows online/offline badge.
- **UI features**: Auto-resize textarea, typing indicator (three bouncing dots), error messages, welcome screen toggle, collapsible sidebar, model indicator in header.
- **Responsive design**: Optimized for small screens (≤480px) with adjusted button sizes and proper sidebar hiding.
- **Markdown rendering**: Uses `marked.js` (downloaded to `public/marked.min.js`) for full Markdown support including headers, lists, blockquotes, code blocks, and links.
- **Delete confirmation**: Deleting conversations shows a confirmation dialog with conversation title and automatically switches to a new conversation if the deleted item was the active one.

### Frontend Dependencies (Local)

- **`marked.js`** (v11.1.1) — Markdown parser, downloaded to `public/marked.min.js`. Provides complete Markdown rendering with no external CDN dependencies.

### UI Components

- **Sidebar**: Collapsible conversation list showing conversation title, last activity timestamp, and delete button
- **Delete button**: Garbage can icon with hover effect, confirms deletion before removing conversation
- **Status indicator**: Health check badge showing connection status (green for online, red for offline)
- **Model indicator**: Displays the currently configured LLM model name fetched from `/api/health`

### Recent Changes

- **2026-06-19**: Added model indicator in header showing currently configured LLM model name, fetched from `/api/health` endpoint
- **2026-06-17**: Added GitHub Actions CI workflow to verify server health endpoint
- **2026-06-17**: Added delete confirmation dialog with conversation title, trash icon for delete button, and automatic switch to new conversation after deletion
- **2026-06-17**: Optimized sidebar hide and close button display on small screens (≤480px)

### Key Patterns

- Server uses OpenAI SDK with custom `baseURL` to proxy requests to any OpenAI-compatible endpoint (not necessarily OpenAI itself).
- SSE streaming: server writes `data: {...}\n\n` lines per chunk; client uses `ReadableStream` with manual parsing.
- Conversation history is client-side (`localStorage`), server is stateless — receives the full messages array on each request.
- Client-side error recovery: connection timeouts, parse errors, and empty responses are all handled gracefully.
- Markdown content is rendered using `marked.parse()` with fallback to basic formatting if the library is unavailable.
