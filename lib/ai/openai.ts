/**
 * OpenAI API client for embeddings and chat completions
 *
 * Provides functions to generate vector embeddings using OpenAI's
 * text-embedding-3-small model (1536 dimensions) and chat completions
 * using GPT-4 Turbo.
 */

/**
 * Get OpenAI API key from environment variable
 */
function getApiKey(): string {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is not set. Please set it in your .env file or environment.",
    );
  }
  return apiKey;
}

/**
 * OpenAI embeddings API response structure
 */
export interface OpenAIEmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate embedding for text using OpenAI text-embedding-3-small model
 *
 * @param text Text to generate embedding for
 * @returns Embedding vector (1536 dimensions)
 */
export async function generateEmbedding(
  text: string,
): Promise<number[]> {
  const apiKey = getApiKey();
  const apiUrl = "https://api.openai.com/v1/embeddings";

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data: OpenAIEmbeddingResponse = await response.json();

  if (!data.data || data.data.length === 0) {
    throw new Error("OpenAI API returned no embedding data");
  }

  const embedding = data.data[0].embedding;

  // Verify dimension matches expected (1536 for text-embedding-3-small)
  if (embedding.length !== 1536) {
    throw new Error(
      `Unexpected embedding dimension: expected 1536, got ${embedding.length}`,
    );
  }

  return embedding;
}

/**
 * OpenAI chat completion API response structure
 */
export interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Chat message for GPT-4 API
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Generate chat completion using GPT-4 Turbo
 *
 * @param messages Array of chat messages
 * @returns Generated text response
 */
export async function generateChatCompletion(
  messages: ChatMessage[],
): Promise<string> {
  const apiKey = getApiKey();
  const apiUrl = "https://api.openai.com/v1/chat/completions";

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data: OpenAIChatCompletionResponse = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error("OpenAI API returned no completion choices");
  }

  const content = data.choices[0].message.content;

  if (!content) {
    throw new Error("OpenAI API returned empty content");
  }

  return content;
}
