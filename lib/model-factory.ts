import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { ChatMistralAI } from "@langchain/mistralai";
import { AI_MODELS } from "./ai-models";

export function createModelInstance(modelKey: string) {
  const model = AI_MODELS[modelKey];
  
  if (!model) {
    throw new Error(`Unknown model: ${modelKey}`);
  }

  switch (model.provider) {
    case 'google':
      return new ChatGoogleGenerativeAI({
        model: modelKey,
        apiKey: process.env.GOOGLE_API_KEY,
        temperature: 0.7,
      });

    case 'openai':
      // o3-mini doesn't support temperature parameter
      if (modelKey === 'o3-mini') {
        return new ChatOpenAI({
          model: modelKey,
          apiKey: process.env.OPENAI_API_KEY,
        });
      }
      return new ChatOpenAI({
        model: modelKey,
        apiKey: process.env.OPENAI_API_KEY,
        temperature: 0.7,
      });

    case 'mistral':
      return new ChatMistralAI({
        model: modelKey,
        apiKey: process.env.MISTRAL_API_KEY,
        temperature: 0.7,
      });

    default:
      throw new Error(`Unsupported provider: ${model.provider}`);
  }
}
