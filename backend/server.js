import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/api/plan", async (req, res) => {
  const { destination, days, interests } = req.body;

  if (!destination || !days) {
    return res.status(400).json({ error: "Destination and days are required" });
  }

  try {
    // Create model instance with parameters
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,   // adds creativity
        topK: 40,          // considers top 40 tokens
        topP: 0.9,         // nucleus sampling (90% prob mass)
        maxOutputTokens: 500, // control length
      },
    });

    // System + User Prompting
    const prompt = `
System Prompt:
You are an AI Travel Planner. 
Always return itineraries in a structured JSON format with days and activities. 
Do not use bullet points, stars, or extra formatting.

User Prompt:
Plan a ${days}-day trip to ${destination}.
User interests: ${interests || "general sightseeing"}.

Output Format (STRICT):
{
  "trip": [
    { "day": 1, "activities": ["...","..."] },
    { "day": 2, "activities": ["...","..."] }
  ]
}
    `;

    // Generate response
    const result = await model.generateContent(prompt);

    const responseText = result.response.text();

    // Token info (rough idea: input + output tokens length)
    const inputTokens = prompt.split(" ").length;
    const outputTokens = responseText.split(" ").length;

    res.json({
      plan: responseText,
      tokens: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate plan" });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
