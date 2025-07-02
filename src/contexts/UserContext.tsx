import { createContext, useContext } from 'react'
import { getBrowserUser } from '@pomerium/js-sdk'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { UserInfo as PomeriumUserInfo } from 'node_modules/@pomerium/js-sdk/lib/esm/types/utils'

type UserInfo = PomeriumUserInfo & {
  id: string | undefined
}

type UserContextType = {
  user: UserInfo | undefined
  isLoading: boolean
  error: unknown
}

const UserContext = createContext<UserContextType | undefined>(undefined)

async function fetchUserInfo(): Promise<UserInfo> {
  const userInfo = await getBrowserUser()

  return {
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture as string,
    id: userInfo.user,
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUserInfo,
  })

  return (
    <UserContext.Provider value={{ user, isLoading, error }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
