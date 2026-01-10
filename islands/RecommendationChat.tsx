import { useEffect, useRef, useState } from "preact/hooks";
import type { ChatMessage } from "../lib/ai/openai.ts";
import type { RecommendationCandidate } from "../lib/ai/recommendations.ts";
import { trapFocus } from "../lib/accessibility/focus-trap.ts";

interface RecommendationChatProps {
  tmdbId?: number; // Optional - if not provided, enables general chat mode
  contentTitle?: string; // Optional - for display purposes
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Chat interface for discussing recommendations with AI
 * Premium users only
 */
export default function RecommendationChat({
  tmdbId,
  contentTitle,
  isOpen,
  onClose,
}: RecommendationChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<
    RecommendationCandidate[]
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Set up focus trap when modal opens
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const cleanup = trapFocus(modalRef.current, onClose);
    return cleanup;
  }, [isOpen, onClose]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle sending a message
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
    };

    // Add user message to conversation
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      // Use general chat endpoint if no tmdbId, otherwise use content-specific endpoint
      const endpoint = tmdbId
        ? `/api/recommendations/${tmdbId}/chat`
        : `/api/recommendations/chat`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages, // Send conversation history for context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to get response");
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.response,
      };

      setMessages([...updatedMessages, assistantMessage]);

      // If recommendations are returned (mood-based request), display them
      if (data.recommendations && Array.isArray(data.recommendations)) {
        setRecommendations(data.recommendations);
      }
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : "An error occurred";
      setError(errorMessage);
      // Remove user message on error
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key (with Shift for new line)
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        class="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-title"
      >
        {/* Header */}
        <div class="flex items-center justify-between p-4 border-b">
          <div>
            <h3 id="chat-title" class="text-lg font-semibold text-gray-900">
              {contentTitle
                ? `Chat about "${contentTitle}"`
                : "AI Recommendations Chat"}
            </h3>
            <p class="text-sm text-gray-500">
              {contentTitle
                ? "Ask questions about this recommendation"
                : "Ask for recommendations by mood or context"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            class="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded transition-colors"
            aria-label="Close chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div class="text-center text-gray-500 py-8">
              <p class="mb-2">
                {contentTitle
                  ? "Start a conversation about this recommendation!"
                  : "Start a conversation to get recommendations!"}
              </p>
              <p class="text-sm">
                {contentTitle
                  ? 'Ask questions like "Why do you think I\'d like this?" or "What\'s similar to this?"'
                  : 'Try: "I want something light and funny tonight" or "Recommend me a thriller"'}
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              class={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                class={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <p class="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div class="flex justify-start">
              <div class="bg-gray-100 rounded-lg px-4 py-2">
                <div class="flex space-x-1">
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce">
                  </div>
                  <div
                    class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style="animation-delay: 0.1s"
                  >
                  </div>
                  <div
                    class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style="animation-delay: 0.2s"
                  >
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div class="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Recommendations Display */}
        {recommendations.length > 0 && (
          <div class="p-4 border-t bg-gray-50">
            <h4 class="text-sm font-semibold text-gray-900 mb-3">
              Recommendations for you:
            </h4>
            <div class="space-y-2">
              {recommendations.map((rec) => (
                <a
                  href={`/content/${rec.tmdb_id}`}
                  class="block p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-500 transition-colors"
                  key={`${rec.type}-${rec.tmdb_id}`}
                >
                  <div class="flex items-start gap-3">
                    {rec.poster_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${rec.poster_path}`}
                        alt={rec.title}
                        class="w-16 h-24 object-cover rounded"
                      />
                    )}
                    <div class="flex-1 min-w-0">
                      <h5 class="font-medium text-gray-900 truncate">
                        {rec.title}
                      </h5>
                      <p class="text-xs text-gray-500 mb-1">
                        {rec.type.toUpperCase()}
                        {rec.release_date &&
                          ` • ${new Date(rec.release_date).getFullYear()}`}
                      </p>
                      {rec.explanation && (
                        <p class="text-sm text-gray-700 line-clamp-2">
                          {rec.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div class="p-4 border-t">
          <div class="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
              onKeyDown={handleKeyDown}
              placeholder={contentTitle
                ? "Ask a question about this recommendation..."
                : "Try: 'I want something light and funny tonight'"}
              disabled={loading}
              rows={2}
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
