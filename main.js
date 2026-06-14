import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL || "http://127.0.0.1:8080/v1",
});

const model = process.env.LLM_MODEL || "default";

async function main() {
  const stream = client.chat.completions.stream({
    model: model,
    messages: [
      {
        role: "user",
        content: "请用中文介绍一下你自己。"
      }
    ]
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
  console.log("\n");
}


main();
