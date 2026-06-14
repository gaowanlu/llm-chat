# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A lightweight Node.js + Express LLM chat web service with SSE streaming, supporting any OpenAI-compatible API. The frontend is a single static HTML page.

## Key Commands

```bash
npm start          # Start the web service (server.js) on PORT 3000
node main.js       # Run standalone CLI test script (one-shot chat to stdout)
npm install         # Install dependencies
```

No tests or linting are configured.

## Configuration

- Copy `.env.example` to `.env` and fill in `LLM_API_KEY` (required), `LLM_BASE_URL`, `LLM_MODEL`, and `PORT`.
- All config is read from environment variables at startup via `dotenv`.

## Architecture

### Entry Points

- **`server.js`** — Express web server. Serves static frontend from `public/` and provides two API routes:
  - `POST /api/chat` — Chat streaming endpoint. Accepts `{ messages: [{role, content}] }`, streams LLM response via SSE.
  - `GET /api/health` — Health check returning `{ status, model }`.
- **`main.js`** — Standalone CLI script for quick LLM API testing, independent of the web server.

### Dependencies

- **express** — HTTP server and static file serving
- **openai** — OpenAI-compatible SDK (used as an HTTP client for any OpenAI-compatible API)
- **dotenv** — Environment variable loading

### Frontend

- **`public/index.html`** — Single-page chat UI. Manages conversation state, SSE client-side streaming, and `localStorage`-based conversation history (new/switch/delete).

### Key Patterns

- Server uses OpenAI SDK with custom `baseURL` to proxy requests to any OpenAI-compatible endpoint (not necessarily OpenAI itself).
- SSE streaming: server writes `data: {...}\n\n` lines per chunk, client reads and appends content incrementally.
- Conversation history is client-side (`localStorage`), server is stateless — receives the full messages array on each request.
