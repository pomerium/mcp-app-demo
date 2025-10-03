import * as React from 'react'
import { X } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface SidebarProps {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  title: string
  className?: string
}

export function Sidebar({
  children,
  isOpen,
  onClose,
  title,
  className,
}: SidebarProps) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-80 bg-background border-l shadow-lg transform transition-transform duration-200 ease-in-out z-50',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className,
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-4rem)]">
          {children}
        </div>
      </div>
    </>
  )
}
