import React, { useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Send } from 'lucide-react'
import { Textarea } from './ui/textarea'

type ChatInputProps = {
  onSendMessage: (message: string) => void
  disabled?: boolean
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  focusTimestamp?: number
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  value,
  onChange,
  focusTimestamp,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (focusTimestamp && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [focusTimestamp])

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
      className="flex items-end gap-2 p-4 border-t border-gray-200 dark:border-gray-800 bg-background backdrop-blur-sm shadow-t-sm"
      onSubmit={handleSubmit}
    >
      <div className="relative flex-1 flex items-center">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask something..."
          required
          disabled={disabled}
          rows={1}
          className="w-full resize-none rounded-lg border-0 pr-12 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 disabled:opacity-50 transition-all"
        />
        <Button
          type="submit"
          variant="default"
          className="absolute right-2 size-8"
          aria-label="Send message"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </form>
  )
}
