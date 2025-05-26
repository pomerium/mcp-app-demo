import React from "react";
import { cn } from "../lib/utils";
import type { Message } from "../mcp/client";
import { formatTimestamp } from "../lib/utils";
import { Bot, User, CheckCircle2, Clock, AlertCircle } from "lucide-react";

type ChatMessageProps = {
  message: Message;
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isUserMessage = message.sender === "user";
  
  const statusIcons = {
    sending: <Clock className="h-3 w-3 text-gray-400" />,
    sent: <CheckCircle2 className="h-3 w-3 text-green-500" />,
    error: <AlertCircle className="h-3 w-3 text-red-500" />
  };

  return (
    <div
      className={cn(
        "flex w-full max-w-full gap-2 py-2 animate-in fade-in",
        isUserMessage ? "justify-end" : "justify-start"
      )}
    >
      {!isUserMessage && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
          <Bot className="h-5 w-5" />
        </div>
      )}
      
      <div className={cn(
        "flex flex-col space-y-1 max-w-[80%] sm:max-w-[70%]",
        isUserMessage ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-2xl px-4 py-2 text-sm",
          isUserMessage 
            ? "bg-indigo-600 text-white dark:bg-indigo-500" 
            : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
        )}>
          {message.content}
        </div>
        
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-1">
          <span>{formatTimestamp(message.timestamp)}</span>
          {isUserMessage && statusIcons[message.status]}
        </div>
      </div>
      
      {isUserMessage && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
          <User className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}