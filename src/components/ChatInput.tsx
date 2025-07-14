import { useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import type { KeyboardEvent } from 'react'

type ChatInputProps = {
  onSendMessage: (message: string) => void
  disabled?: boolean
  focusTimestamp?: number
}

export function ChatInput({
  onSendMessage,
  disabled = false,
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
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`
    }
  }, [textareaRef.current?.value])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const textarea = form.elements.namedItem('prompt') as HTMLTextAreaElement
    const { value } = textarea

    if (value.trim() && !disabled) {
      onSendMessage(value)
      form.reset()
      textarea.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
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
          name="prompt"
          onKeyDown={handleKeyDown}
          placeholder="Ask something..."
          required
          disabled={disabled}
          rows={1}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          aria-label="Ask something..."
          className="w-full resize-none rounded-lg border-0 pr-12 text-base placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 disabled:opacity-50 transition-all"
        />
        <Button
          type="submit"
          variant="default"
          className="absolute right-2 size-8"
          disabled={disabled}
        >
          <span className="sr-only">Send message</span>
          <Send className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </form>
  )
}
