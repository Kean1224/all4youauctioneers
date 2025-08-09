'use client';

import { useEffect, useState } from 'react';

export default function Notification() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let email = '';
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        email = payload.email;
      }
    } catch {}
    if (!email) return;
    ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5051');
    ws.onopen = () => {
      ws?.send(JSON.stringify({ type: 'register', email }));
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.message) setMessage(data.message);
      } catch {}
    };
    return () => {
      ws?.close();
    };
  }, []);

  if (!message) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-yellow-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 animate-bounce">
      {message}
      <button className="ml-4 text-white font-bold" onClick={() => setMessage(null)}>
        ×
      </button>
    </div>
  );
}
