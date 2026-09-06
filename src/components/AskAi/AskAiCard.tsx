import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import './AskAiCard.css';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTIONS = [
  'How can I improve conversion for leads sitting in Negotiation?',
  "What's the best way to re-engage stale leads?",
  'How should I prioritize follow-ups this week?',
];

/** Calls the local backend, never Gemini directly — the API key lives only
 * in server/.env and is never sent to (or knowable by) the browser. */
async function askAi(messages: ChatMessage[]): Promise<string> {
  const res = await fetch('/api/ask-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  let body: { reply?: string; error?: string } | null = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON error body (e.g. the API server isn't running) — fall through to the generic message below
  }

  if (!res.ok || !body?.reply) {
    throw new Error(body?.error || 'Could not reach the AI assistant. Is the API server running (`npm run server`)?');
  }
  return body.reply;
}

interface AskAiCardProps {
  title?: string;
  hint?: string;
  suggestions?: string[];
}

export function AskAiCard({
  title = 'Ask a custom sales question',
  hint = 'Get a quick, practical answer from an AI sales assistant — then ask it to suggest ways to improve performance.',
  suggestions = SUGGESTIONS,
}: AskAiCardProps = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', text: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setLoading(true);
    scrollToBottom();

    try {
      const reply = await askAi(nextMessages);
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function retry() {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    setError(null);
    setLoading(true);
    askAi(messages)
      .then((reply) => setMessages((prev) => [...prev, { role: 'assistant', text: reply }]))
      .catch((err) => setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.'))
      .finally(() => {
        setLoading(false);
        scrollToBottom();
      });
  }

  return (
    <section className="ask-ai-card">
      <div className="ask-ai-card__category">✨ Ask AI</div>
      <h3 className="ask-ai-card__question">{title}</h3>
      <p className="ask-ai-card__hint">{hint}</p>

      <div className="ask-ai-card__messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="ask-ai-card__empty">
            <p>Try asking something like:</p>
            <div className="ask-ai-card__suggestions">
              {suggestions.map((s) => (
                <button key={s} type="button" className="ask-ai-card__suggestion" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`ask-ai-message ask-ai-message--${m.role}`}>
            <span className="ask-ai-message__role">{m.role === 'user' ? 'You' : 'AI'}</span>
            <p className="ask-ai-message__text">{m.text}</p>
          </div>
        ))}

        {loading && (
          <div className="ask-ai-message ask-ai-message--assistant ask-ai-message--loading">
            <span className="ask-ai-message__role">AI</span>
            <span className="ask-ai-card__typing" aria-label="AI is thinking">
              <span />
              <span />
              <span />
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="ask-ai-card__error">
          <span>{error}</span>
          <button type="button" onClick={retry}>
            Retry
          </button>
        </div>
      )}

      <form className="ask-ai-card__composer" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a sales question… (Enter to send, Shift+Enter for a new line)"
          rows={2}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? 'Thinking…' : 'Send'}
        </button>
      </form>
    </section>
  );
}
