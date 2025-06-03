import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRoute,
  Link,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ModelProvider } from '../contexts/ModelContext'
import { UserProvider } from '../contexts/UserContext'

import appCss from '../styles.css?url'
import Header from '../components/Header'

// Create a client
const queryClient = new QueryClient()

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Pomerium Chat',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        href: '/pomerium-icon.svg',
      },
    ],
  }),

  notFoundComponent: () => (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        404
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        Page not found
      </p>
      <Link
        to="/"
        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
      >
        Return to Home
      </Link>
    </div>
  ),

  component: () => (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <ModelProvider>
          <RootDocument>
            <Outlet />
          </RootDocument>
        </ModelProvider>
      </UserProvider>
    </QueryClientProvider>
  ),
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="flex flex-col h-screen bg-background text-gray-900 dark:text-gray-100 transition-colors">
          <Header />
          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-4xl h-full">{children}</div>
          </main>
        </div>
        <Scripts />
      </body>
    </html>
  )
}
