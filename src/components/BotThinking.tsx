import { Bot } from 'lucide-react'

export function BotThinking() {
  return (
    <div className="flex w-full max-w-full gap-2 py-2 animate-in fade-in justify-start items-center">
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
        <Bot className="h-5 w-5" />
      </div>
      <div className="flex items-baseline gap-1">
        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.4s] [animation-duration:0.8s]"></div>
        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.2s] [animation-duration:0.8s]"></div>
        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-duration:0.8s]"></div>
        <span className="sr-only">AI is thinking...</span>
      </div>
    </div>
  )
}
