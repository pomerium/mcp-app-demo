import React from 'react'
import { Link } from '@tanstack/react-router'
import { MessageSquareText, ChevronLeft, User, Settings2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/dropdown-menu'
import { ThemeToggle } from './ThemeToggle'
import { Button } from './ui/button'

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-xl font-semibold">PomChat</h1>
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Chat
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="relative h-10 w-10 rounded-full"
            >
              <div className="flex h-full w-full items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">User Account</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                user@example.com
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings" className="w-full flex items-center">
                <Settings2 className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a
                href="/.pomerium/sign_out"
                className="w-full flex items-center text-red-600 dark:text-red-400"
              >
                <span>Sign out</span>
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default Header
