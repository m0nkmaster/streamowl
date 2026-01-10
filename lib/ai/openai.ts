/**
 * OpenAI API client for embeddings
 *
 * Provides functions to generate vector embeddings using OpenAI's
 * text-embedding-3-small model (1536 dimensions)
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
