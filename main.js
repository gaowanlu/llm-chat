import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL || "http://127.0.0.1:8080/v1",
});

const model = process.env.LLM_MODEL || "default";

// Get prompt from command line args or use default
const prompt = process.argv[2] || "请用中文介绍一下你自己。";

async function main() {
  try {
    const stream = await client.chat.completions.stream({
      model: model,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    for await (const chunk of stream) {
      process.stdout.write(chunk.choices[0]?.delta?.content || "");
    }
    console.log("\n");
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
