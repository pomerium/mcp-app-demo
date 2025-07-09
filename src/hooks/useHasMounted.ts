import { useEffect, useState } from 'react'

export function useHasMounted(): boolean {
  const [hasMounted, setHasMounted] = useState(false)
  useEffect(() => {
    setHasMounted(true)
  }, [])
  return hasMounted
}
