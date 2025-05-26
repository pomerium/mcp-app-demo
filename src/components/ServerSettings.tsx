import React, { useState } from 'react'
import { Button } from './ui/Button'
import { Settings2, Plus, Loader2, X, Trash2 } from 'lucide-react'
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
} from './ui/toast'
import * as Dialog from '@radix-ui/react-dialog'
import { Label } from '@radix-ui/react-label'
import { useLocalStorage } from '../hooks/useLocalStorage'
import {
  serverSchema,
  serversSchema,
  type Server,
  type Servers,
} from '../routes/api/chat'
import { z } from 'zod'

const serverFormSchema = z.object({
  name: z.string(),
  url: z.string().url('Invalid server URL'),
})

type ServerFormData = z.infer<typeof serverFormSchema>

export function ServerSettings() {
  const [servers, setServers] = useLocalStorage<Servers>('mcp-servers', {})
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState({
    title: '',
    description: '',
  })
  const [isOpen, setIsOpen] = useState(false)
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof ServerFormData, string>>
  >({})

  const addServer = (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})

    const formData = new FormData(e.target as HTMLFormElement)
    const formValues = {
      name: formData.get('name') as string,
      url: formData.get('url') as string,
    }

    const result = serverFormSchema.safeParse(formValues)

    if (!result.success) {
      const errors: Partial<Record<keyof ServerFormData, string>> = {}
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as keyof ServerFormData] = err.message
        }
      })
      setFormErrors(errors)
      return
    }

    const { name, url } = result.data
    const id = Math.random().toString(36).substring(7)
    const server = {
      id,
      name,
      url,
      status: 'disconnected',
    } satisfies Server

    const serverResult = serverSchema.safeParse(server)
    if (!serverResult.success) {
      showNotification(
        'Validation Error',
        'Invalid server configuration. Please check your input.',
      )
      return
    }

    setServers((prev) => {
      const newServers = { ...prev, [id]: server }
      const serversResult = serversSchema.safeParse(newServers)

      if (!serversResult.success) {
        showNotification(
          'Validation Error',
          'Invalid server configuration. Please check your input.',
        )
        return prev
      }
      return newServers
    })

    showNotification(
      'Server Added',
      `${name} has been added to your servers list.`,
    )
    setIsOpen(false)
  }

  const connectToServer = async (serverId: string) => {
    const server = servers[serverId]
    if (!server) return

    setServers((prev) => ({
      ...prev,
      [serverId]: { ...prev[serverId], status: 'connecting' },
    }))

    try {
      // Validate server URL before attempting connection
      const urlResult = z.string().url().safeParse(server.url)
      if (!urlResult.success) {
        throw new Error('Invalid server URL')
      }

      // Here you would typically make an actual connection attempt
      // For now, we'll simulate a successful connection
      setServers((prev) => ({
        ...prev,
        [serverId]: { ...prev[serverId], status: 'connected' },
      }))

      showNotification('Connected', `Successfully connected to ${server.name}`)
    } catch (error) {
      setServers((prev) => ({
        ...prev,
        [serverId]: { ...prev[serverId], status: 'error' },
      }))

      showNotification(
        'Connection Failed',
        error instanceof Error
          ? error.message
          : 'Unable to connect to the server. Please try again.',
      )
    }
  }

  const removeServer = (serverId: string) => {
    const server = servers[serverId]
    if (server) {
      setServers((prev) => {
        const { [serverId]: _, ...rest } = prev
        const result = serversSchema.safeParse(rest)
        if (!result.success) {
          showNotification(
            'Validation Error',
            'Error removing server. Please try again.',
          )
          return prev
        }
        return rest
      })
      showNotification(
        'Server Removed',
        `${server.name} has been removed from your servers list.`,
      )
    }
  }

  const showNotification = (title: string, description: string) => {
    setToastMessage({ title, description })
    setShowToast(true)
    setTimeout(() => setShowToast(false), 5000)
  }

  const ServerForm = () => (
    <form onSubmit={addServer} className="space-y-4">
      <div className="space-y-2">
        <Label
          htmlFor="name"
          className="text-gray-900 dark:text-gray-100 grid gap-2"
        >
          <span>Server Name</span>
          <input
            name="name"
            type="text"
            className={`w-full px-3 py-2 rounded-md border ${
              formErrors.name
                ? 'border-red-500 dark:border-red-400'
                : 'border-gray-300 dark:border-gray-600'
            } bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400`}
            placeholder="Production Server"
            required
          />
          {formErrors.name && (
            <p className="text-sm text-red-500 dark:text-red-400">
              {formErrors.name}
            </p>
          )}
        </Label>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="url"
          className="text-gray-900 dark:text-gray-100 grid gap-2"
        >
          <span>Server URL</span>
          <input
            name="url"
            type="url"
            className={`w-full px-3 py-2 rounded-md border ${
              formErrors.url
                ? 'border-red-500 dark:border-red-400'
                : 'border-gray-300 dark:border-gray-600'
            } bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400`}
            placeholder="https://example.com"
            required
          />
          {formErrors.url && (
            <p className="text-sm text-red-500 dark:text-red-400">
              {formErrors.url}
            </p>
          )}
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setIsOpen(false)
            setFormErrors({})
          }}
        >
          Cancel
        </Button>
        <Button type="submit">Add Server</Button>
      </div>
    </form>
  )

  return (
    <ToastProvider>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-2xl font-semibold">Server Settings</h2>
          </div>

          <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
            <Dialog.Trigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Server
              </Button>
            </Dialog.Trigger>

            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
              <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-lg rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
                <Dialog.Title className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Add New Server
                </Dialog.Title>

                <ServerForm />

                <Dialog.Close asChild>
                  <button
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

        <div className="space-y-4">
          {Object.values(servers).map((server) => (
            <div
              key={server.id}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {server.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {server.url}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => connectToServer(server.id)}
                    disabled={
                      server.status === 'connecting' ||
                      server.status === 'connected'
                    }
                    variant={
                      server.status === 'connected' ? 'outline' : 'primary'
                    }
                    size="sm"
                    className="min-w-[100px] h-9"
                  >
                    {server.status === 'connecting' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Connecting
                      </>
                    ) : server.status === 'connected' ? (
                      'Connected'
                    ) : (
                      'Connect'
                    )}
                  </Button>
                  <Dialog.Root>
                    <Dialog.Trigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 flex items-center justify-center border border-gray-200 dark:border-gray-700 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                      >
                        <span className="sr-only">Remove Server</span>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Dialog.Trigger>
                    <Dialog.Portal>
                      <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                      <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
                        <Dialog.Title className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                          Remove Server
                        </Dialog.Title>
                        <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                          Are you sure you want to remove {server.name}? This
                          action cannot be undone.
                        </Dialog.Description>
                        <div className="flex justify-end gap-2">
                          <Dialog.Close asChild>
                            <Button variant="outline">Cancel</Button>
                          </Dialog.Close>
                          <Dialog.Close asChild>
                            <Button
                              variant="primary"
                              className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                              onClick={() => removeServer(server.id)}
                            >
                              Remove Server
                            </Button>
                          </Dialog.Close>
                        </div>
                      </Dialog.Content>
                    </Dialog.Portal>
                  </Dialog.Root>
                </div>
              </div>
            </div>
          ))}

          {Object.keys(servers).length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>No servers configured yet.</p>
              <p className="text-sm">Click "Add Server" to get started.</p>
            </div>
          )}
        </div>
      </div>

      {showToast && (
        <Toast className="bg-white dark:bg-gray-800">
          <div>
            <ToastTitle>{toastMessage.title}</ToastTitle>
            <ToastDescription>{toastMessage.description}</ToastDescription>
          </div>
          <ToastClose onClick={() => setShowToast(false)} />
        </Toast>
      )}
      <ToastViewport />
    </ToastProvider>
  )
}
