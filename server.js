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

// Validate required configuration
if (!llmConfig.apiKey) {
  console.error("⚠️  LLM_API_KEY not set. Create a .env file from .env.example");
  process.exit(1);
}

// Validate baseURL format
try {
  new URL(llmConfig.baseURL);
} catch (err) {
  console.error("⚠️  LLM_BASE_URL is not a valid URL");
  process.exit(1);
}

// Limit request body size to prevent abuse
const app = express();
app.use(express.json({ limit: "100kb" }));

// Serve static frontend
app.use(express.static(join(__dirname, "public")));

// Add security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

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

  // Validate messages content
  const invalidMessage = messages.find(m =>
    m.role !== "user" && m.role !== "assistant" && m.role !== "system"
  );
  if (invalidMessage) {
    res.write(`data: ${JSON.stringify({ error: "Invalid message role" })}\n\n`);
    res.end();
    return;
  }

  // Limit message count to prevent abuse
  if (messages.length > 20) {
    res.write(`data: ${JSON.stringify({ error: "Message history too long" })}\n\n`);
    res.end();
    return;
  }

  // Create abort controller for client disconnect handling
  const abortController = new AbortController();

  // Handle client disconnect
  res.on("close", () => {
    abortController.abort();
  });

  try {
    const stream = await client.chat.completions.stream({
      model: llmConfig.model,
      messages: messages,
      stream: true,
    });

    // Hook into stream to support abort
    const originalReturn = stream.return;
    stream.return = async function() {
      abortController.abort();
      return originalReturn.call(this);
    };

    for await (const chunk of stream) {
      // Skip writes if client has disconnected
      if (res.writableEnded || abortController.signal.aborted) break;

      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        try {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        } catch (writeErr) {
          // Client disconnected during write
          break;
        }
      }
    }

    if (!res.writableEnded && !abortController.signal.aborted) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  } catch (err) {
    // Ignore abort errors
    if (err.name === "AbortError") {
      return;
    }
    console.error("LLM API error:", err.message);
    if (!res.writableEnded) {
      try {
        res.write(`data: ${JSON.stringify({ error: err.message || "Failed to get response from LLM" })}\n\n`);
        res.end();
      } catch (ignoreErr) {
        // Ignore write errors after client disconnect
      }
    }
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", model: llmConfig.model });
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
});

// Graceful shutdown handling
let isShuttingDown = false;
process.on("SIGTERM", () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log("\n  🛑 Shutdown signal received");
  server.close(() => {
    console.log("  → Server closed");
    process.exit(0);
  });
  // Force close after 5 seconds
  setTimeout(() => {
    console.log("  → Force closing after timeout");
    process.exit(1);
  }, 5000);
});

const server = app.listen(port, () => {
  console.log(`\n  🚀 LLM Chat Web Service running`);
  console.log(`  → http://localhost:${port}`);
  console.log(`  → Model: ${llmConfig.model}\n`);
});
