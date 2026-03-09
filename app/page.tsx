"use client";

import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");

async function sendMessage() {
  const text = input.trim();
  if (!text) return;

  setMessages((prev) => [...prev, `You: ${text}`]);
  setInput("");

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: text }),
  });

  const data = await res.json();

  setMessages((prev) => [...prev, `PocketBot: ${data.reply}`]);
}


  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          background: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>PocketBot</h1>
        <p style={{ color: "#666", marginBottom: "24px" }}>
          Your personal AI assistant prototype
        </p>

        <div
          style={{
            minHeight: "250px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "16px",
            background: "#fafafa",
          }}
        >
          {messages.length === 0 ? (
            <p style={{ color: "#888" }}>No messages yet.</p>
          ) : (
            messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: "10px" }}>
                {msg}
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
            }}
          />
          <button
            onClick={sendMessage}
            style={{
              padding: "12px 18px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#111",
              color: "white",
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}

