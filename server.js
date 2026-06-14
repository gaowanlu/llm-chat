import dotenv from "dotenv";
dotenv.config();

import express from "express";
import OpenAI from "openai";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load config from environment variables
const port = parseInt(process.env.PORT, 10) || 3000;
const llmConfig = {
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL || "http://127.0.0.1:8080/v1",
  model: process.env.LLM_MODEL || "default",
};

if (!llmConfig.apiKey) {
  console.error("⚠️  LLM_API_KEY not set. Create a .env file from .env.example");
  process.exit(1);
}

const app = express();

// Parse JSON request bodies
app.use(express.json());

// Serve static frontend
app.use(express.static(join(__dirname, "public")));

// Initialize OpenAI-compatible client
const client = new OpenAI({
  apiKey: llmConfig.apiKey,
  baseURL: llmConfig.baseURL,
});

// Chat streaming endpoint
app.post("/api/chat", async (req, res) => {
  // Standard SSE headers with charset
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res.write(`data: ${JSON.stringify({ error: "Invalid request" })}\n\n`);
    res.end();
    return;
  }

  try {
    const stream = client.chat.completions.stream({
      model: llmConfig.model,
      messages: messages,
      stream: true,
    });

    for await (const chunk of stream) {
      // Skip writes if client has disconnected
      if (res.writableEnded) break;

      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  } catch (err) {
    console.error("LLM API error:", err.message);
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: err.message || "Failed to get response from LLM" })}\n\n`);
      res.end();
    }
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", model: llmConfig.model });
});

app.listen(port, () => {
  console.log(`\n  🚀 LLM Chat Web Service running`);
  console.log(`  → http://localhost:${port}\n`);
});
