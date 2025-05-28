import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'

export function useRouteMatch(path: string) {
  const router = useRouter()
  const [isMatch, setIsMatch] = useState(false)

  useEffect(() => {
    const unsubscribe = router.subscribe('onResolved', () => {
      setIsMatch(router.state.location.pathname === path)
    })
    return () => unsubscribe()
  }, [router, path])

  return isMatch
}
