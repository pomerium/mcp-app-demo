import React, { useState } from 'react'
import { Button } from './ui/Button'
import { Settings2, Plus, Loader2, X } from 'lucide-react'
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

type Server = {
  id: string
  name: string
  url: string
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
}

export function ServerSettings() {
  const [servers, setServers] = useState<Server[]>([])
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState({
    title: '',
    description: '',
  })
  const [newServer, setNewServer] = useState({ name: '', url: '' })
  const [isOpen, setIsOpen] = useState(false)

  const addServer = (e: React.FormEvent) => {
    e.preventDefault()

    if (newServer.name && newServer.url) {
      const server: Server = {
        id: Math.random().toString(36).substring(7),
        name: newServer.name,
        url: newServer.url,
        status: 'disconnected',
      }

      setServers((prev) => [...prev, server])
      showNotification(
        'Server Added',
        `${newServer.name} has been added to your servers list.`,
      )
      setNewServer({ name: '', url: '' })
      setIsOpen(false)
    }
  }

  const connectToServer = async (serverId: string) => {
    setServers((prev) =>
      prev.map((server) =>
        server.id === serverId ? { ...server, status: 'connecting' } : server,
      ),
    )

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      setServers((prev) =>
        prev.map((server) =>
          server.id === serverId ? { ...server, status: 'connected' } : server,
        ),
      )

      const server = servers.find((s) => s.id === serverId)
      showNotification('Connected', `Successfully connected to ${server?.name}`)
    } catch (error) {
      setServers((prev) =>
        prev.map((server) =>
          server.id === serverId ? { ...server, status: 'error' } : server,
        ),
      )

      showNotification(
        'Connection Failed',
        'Unable to connect to the server. Please try again.',
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
        <Label htmlFor="name" className="text-gray-900 dark:text-gray-100">
          Server Name
        </Label>
        <input
          id="name"
          type="text"
          value={newServer.name}
          onChange={(e) =>
            setNewServer((prev) => ({ ...prev, name: e.target.value }))
          }
          className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
          placeholder="Production Server"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url" className="text-gray-900 dark:text-gray-100">
          Server URL
        </Label>
        <input
          id="url"
          type="url"
          value={newServer.url}
          onChange={(e) =>
            setNewServer((prev) => ({ ...prev, url: e.target.value }))
          }
          className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
          placeholder="https://example.com"
          required
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen(false)}
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
          {servers.map((server) => (
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
                <Button
                  onClick={() => connectToServer(server.id)}
                  disabled={
                    server.status === 'connecting' ||
                    server.status === 'connected'
                  }
                  variant={
                    server.status === 'connected' ? 'outline' : 'primary'
                  }
                  className="min-w-[100px]"
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
              </div>
            </div>
          ))}

          {servers.length === 0 && (
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
