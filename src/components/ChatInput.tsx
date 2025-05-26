import React, { useRef, useEffect } from 'react'
import { Button } from './ui/Button'
import { Send } from 'lucide-react'

type ChatInputProps = {
  onSendMessage: (message: string) => void
  disabled?: boolean
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  value,
  onChange,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to calculate the right one
      textareaRef.current.style.height = 'auto'
      // Set new height based on scrollHeight (content)
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`
    }
  }, [value])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (value.trim() && !disabled) {
      onSendMessage(value)

      // Reset the textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter without Shift
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form
      className="flex items-end gap-2 p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 backdrop-blur-sm shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask something..."
          required
          disabled={disabled}
          rows={1}
          className="w-full resize-none bg-gray-100 dark:bg-gray-800 rounded-lg border-0 px-4 py-3 pr-12 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 disabled:opacity-50 transition-all"
        />
        <Button
          type="submit"
          className="absolute right-2 bottom-3 flex h-8 w-8 items-center justify-center p-0"
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </form>
  )
}
