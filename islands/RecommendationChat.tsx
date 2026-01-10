import { useEffect, useRef, useState } from "preact/hooks";
import type { ChatMessage } from "../lib/ai/openai.ts";

interface RecommendationChatProps {
  tmdbId: number;
  contentTitle: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
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
      const response = await fetch(`/api/recommendations/${tmdbId}/chat`, {
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
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div class="flex items-center justify-between p-4 border-b">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              Chat about "{contentTitle}"
            </h3>
            <p class="text-sm text-gray-500">
              Ask questions about this recommendation
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            class="text-gray-400 hover:text-gray-600 transition-colors"
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
                Start a conversation about this recommendation!
              </p>
              <p class="text-sm">
                Ask questions like "Why do you think I'd like this?" or "What's
                similar to this?"
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

        {/* Input */}
        <div class="p-4 border-t">
          <div class="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about this recommendation..."
              disabled={loading}
              rows={2}
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
