import * as Dialog from '@radix-ui/react-dialog'
import { Switch } from './ui/switch'
import { Button } from './ui/button'
import { ChevronDown, Globe, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu'
import { Drawer, DrawerContent } from './ui/drawer'
import { useMediaQuery } from '../hooks/useMediaQuery'

interface ServerToolsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverName: string
  serverUrl: string
  tools: Record<string, any>
  toolStates: Record<string, { enabled: boolean; allow: string }>
  onToolStateChange: (
    tool: string,
    state: { enabled: boolean; allow: string },
  ) => void
}

const ALLOW_OPTIONS = [
  {
    label: 'Always ask permission',
    value: 'approval',
    sub: 'Your approval is required every time',
  },
  {
    label: 'Allow unsupervised',
    value: 'unsupervised',
    sub: 'Your approval is not required',
  },
]

export function ServerToolsModal({
  open,
  onOpenChange,
  serverName,
  serverUrl,
  tools,
  toolStates,
  onToolStateChange,
}: ServerToolsModalProps) {
  const handleToggle = (tool: string) => {
    const prev = toolStates[tool] || { enabled: true, allow: 'unsupervised' }
    onToolStateChange(tool, { ...prev, enabled: !prev.enabled })
  }

  const handleAllowChange = (tool: string, value: string) => {
    const prev = toolStates[tool] || { enabled: true, allow: 'unsupervised' }
    onToolStateChange(tool, { ...prev, allow: value })
  }

  const isMobile = useMediaQuery('(max-width: 640px)')

  const modalContent = (
    <>
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg font-bold text-gray-700 dark:text-gray-200">
          {serverName[0]}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">
              {serverName}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
            <Globe className="h-3 w-3 mr-1" />
            <span className="truncate max-w-xs">{serverUrl}</span>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <div className="font-semibold text-xs text-gray-700 dark:text-gray-300 mb-2 tracking-wide">
          PROVIDED TOOLS
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {Object.entries(tools || {}).map(([name, tool]) => (
            <div key={name} className="flex items-center py-3 gap-3">
              <Switch
                checked={toolStates[name]?.enabled ?? true}
                onCheckedChange={() => handleToggle(name)}
                className="mr-2"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                  {name}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {tool.description}
                </div>
              </div>
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-xs px-2 py-1 h-8 min-w-[180px] flex items-center justify-between"
                      type="button"
                    >
                      {
                        ALLOW_OPTIONS.find(
                          (o) =>
                            o.value ===
                            (toolStates[name]?.allow ?? 'unsupervised'),
                        )?.label
                      }
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[240px]">
                    {ALLOW_OPTIONS.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => handleAllowChange(name, option.value)}
                        className="flex flex-col items-start gap-0.5 py-2 px-3"
                      >
                        <div className="flex items-center w-full">
                          <span className="text-sm text-gray-900 dark:text-gray-100 flex-1">
                            {option.label}
                          </span>
                          {(toolStates[name]?.allow ?? 'unsupervised') ===
                            option.value && (
                            <Check className="h-4 w-4 text-indigo-600 ml-2" />
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {option.sub}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="p-4">{modalContent}</DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl">
          {modalContent}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
