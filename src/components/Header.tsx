import React, { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, User, Settings2, Menu } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/dropdown-menu'
import { ThemeToggle } from './ThemeToggle'
import { Button } from './ui/button'
import { ModelSelect } from './ModelSelect'
import { useModel } from '../contexts/ModelContext'
import { useRouteMatch } from '../hooks/useRouteMatch'
import pomeriumIcon from "../../public/Pomerium-icon.svg?url"

const Header: React.FC = () => {
  const { selectedModel, setSelectedModel } = useModel()
  const isSettingsPage = useRouteMatch('/settings')
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    // Optionally, subscribe to theme changes
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);


  return (
    <header className="sticky top-0 z-50 bg-primary dark:bg-background border-b px-4 py-3 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" className='size-10 flex md:hidden justify-center items-center rounded-full'>
              <Menu className='size-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className='mx-4 my-2'>
            {isSettingsPage && (
              <>
                <DropdownMenuItem asChild>
                  <Link to="/" className='flex gap-2 items-center justify-between'>
                    <ChevronLeft className="size-4" />
                    Back to Chat
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
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
        <a href="https://pomerium.com" target='_blank'>
          <img 
            src={isDark ? pomeriumIcon : "/pomerium-icon.png"} 
            alt="Pomerium Logo" 
            className='w-8 hover:-translate-y-0.5 transition-all' 
          />
        </a>
        <Link to="/">
          <h1 className="text-xl font-bold text-white">PomChat</h1>
        </Link>
        <ModelSelect value={selectedModel} onValueChange={setSelectedModel} />
      </div>




      <div className="flex items-center gap-2">
        {isSettingsPage && (
          <Link
            to="/"
            className="hidden md:flex items-center gap-2 text-sm text-primary-foreground hover:bg-secondary hover:text-secondary-foreground rounded-lg px-2 py-1 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Chat
          </Link>
        )}
        <ThemeToggle />
        <span className='hidden md:inline-block'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="size-10 flex items-center justify-center rounded-full"
              >
                <User className="h-5 w-5 text-secondary-foreground" />
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
        </span>
      </div>
    </header>
  )
}

export default Header
