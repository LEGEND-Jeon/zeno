import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const ANTHROPIC_MODEL_PLAN = process.env.ANTHROPIC_MODEL_PLAN || "claude-sonnet-4-6";
export const ANTHROPIC_MODEL_CODE_WEB = process.env.ANTHROPIC_MODEL_CODE_WEB || "claude-sonnet-4-6";
export const ANTHROPIC_MODEL_CODE_APP = process.env.ANTHROPIC_MODEL_CODE_APP || "claude-opus-4-7";
export const USE_ANTHROPIC_PLAN = process.env.USE_ANTHROPIC_PLAN === "true";
export const USE_ANTHROPIC_CODE = process.env.USE_ANTHROPIC_CODE === "true";
