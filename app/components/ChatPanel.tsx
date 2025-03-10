"use client";

import { useState, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Image as ImageIcon } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  image?: string;
}

export type ChatPanelHandle = {
  addImageMessage: (image: string) => void;
};

export const ChatPanel = forwardRef<ChatPanelHandle>((props, ref) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your CAD/CAM assistant. How can I help you with your designs today?",
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');

  useImperativeHandle(ref, () => ({
    addImageMessage: (image: string) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: "Here's the current view:",
        sender: 'user',
        timestamp: new Date(),
        image
      };
      setMessages(prev => [...prev, newMessage]);
    }
  }));

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm analyzing your request. How else can I assist you?",
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-background border-l">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Chat Assistant</h2>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                {message.image && (
                  <div className="mt-2">
                    <img
                      src={message.image}
                      alt="Shared view"
                      className="max-w-full rounded-md"
                      onClick={() => window.open(message.image, '_blank')}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSend();
              }
            }}
          />
          <Button onClick={handleSend}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

ChatPanel.displayName = 'ChatPanel';