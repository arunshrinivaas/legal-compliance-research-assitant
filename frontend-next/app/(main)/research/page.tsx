
"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { researchApi, Source } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Bot, User, FileText, Loader2, Upload } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  isDemo?: boolean;
}

function SourceCard({ source }: { source: Source }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-xs text-muted-foreground border">
      <FileText size={11} strokeWidth={1.5} />
      <span className="font-medium">{source.document_title}</span>
      <span>· Chunk {source.chunk}</span>
      <span className="text-[10px] opacity-60">({(1 - source.distance).toFixed(2)} relevance)</span>
    </div>
  );
}

const EXAMPLE_QUESTIONS = [
  "What are the key data retention requirements under GDPR?",
  "How does CCPA compare with GDPR on consumer rights?",
  "What are the HIPAA requirements for PHI encryption?",
  "Summarize the key obligations under DORA for financial institutions.",
];

export default function ResearchPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const queryMutation = useMutation({
    mutationFn: researchApi.query,
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          isDemo: data.sources.length === 0,
        },
      ]);
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Error: ${err.message}. Please check the backend connection.`,
        },
      ]);
    },
  });

  const handleSend = (question?: string) => {
    const q = question ?? input.trim();
    if (!q) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: q },
    ]);
    setInput("");
    queryMutation.mutate(q);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="max-w-4xl mx-auto flex flex-col" style={{ height: "calc(100vh - 3.5rem - 3rem)" }}>
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-semibold tracking-tight">Research Workspace</h1>
        <p className="text-sm text-muted-foreground mt-1">Ask questions grounded in your knowledge base. Upload documents to expand coverage.</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-xl border bg-card p-4 space-y-4 mb-4">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Bot size={22} strokeWidth={1.5} className="text-muted-foreground" />
            </div>
            <h2 className="text-base font-medium">Ask the Research Assistant</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Ask questions about regulations, compliance requirements, or policy implications.
              Answers are grounded in your uploaded documents.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full max-w-xl">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-left text-xs p-3 rounded-xl border hover:border-foreground/30 hover:bg-muted/40 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={13} className="text-background" strokeWidth={1.5} />
                </div>
              )}
              <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-2`}>
                <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-foreground text-background"
                    : "bg-muted text-foreground"
                }`}>
                  {msg.content}
                  {msg.isDemo && (
                    <p className="text-[10px] mt-2 opacity-60 border-t border-current/10 pt-2">
                      ⚠ Demo response — no documents indexed. Upload PDFs to enable RAG retrieval.
                    </p>
                  )}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((s, i) => (
                      <SourceCard key={i} source={s} />
                    ))}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User size={13} strokeWidth={1.5} />
                </div>
              )}
            </div>
          ))
        )}
        {queryMutation.isPending && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center shrink-0">
              <Bot size={13} className="text-background" strokeWidth={1.5} />
            </div>
            <div className="bg-muted rounded-xl px-4 py-3 flex items-center gap-2">
              <Loader2 size={13} className="animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Retrieving and analyzing…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 shrink-0">
        <div className="relative flex-1">
          <Input
            className="pr-10 h-10 text-sm"
            placeholder="Ask a question about regulations, compliance, or policies…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={queryMutation.isPending}
          />
        </div>
        <Button
          className="h-10 px-4 gap-2 text-sm"
          onClick={() => handleSend()}
          disabled={queryMutation.isPending || !input.trim()}
        >
          {queryMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={1.5} />}
          Send
        </Button>
        <Button variant="outline" className="h-10 px-3" title="Upload document">
          <Upload size={14} strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
