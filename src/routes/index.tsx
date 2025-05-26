import { createFileRoute } from '@tanstack/react-router'
import { Chat } from '../components/Chat'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return <Chat />
}
