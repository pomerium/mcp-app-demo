import { AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react'

export const getStatusIcon = (status?: string, error?: string) => {
  if (error || status?.includes('failed')) {
    return <AlertCircle className="h-4 w-4" />
  }
  if (status?.includes('in_progress')) {
    return <Loader2 className="h-4 w-4 animate-spin" />
  }
  if (status?.includes('completed') || status?.includes('done')) {
    return <CheckCircle className="h-4 w-4" />
  }
  return <Clock className="h-4 w-4" />
}
