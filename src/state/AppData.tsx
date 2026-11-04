import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { apiGet, apiPost, errorMessage } from '../api/client'
import type { RecipientDraft } from '../features/recipients/validation'
import type { Corridor, Recipient } from '../types'

// Reference data every screen needs: the corridors we serve and the
// customer's saved recipients. Loaded once when the app starts.

interface AppData {
  corridors: Corridor[]
  recipients: Recipient[]
  loading: boolean
  error: string | null
  corridorById: (id: string) => Corridor | undefined
  addRecipient: (draft: RecipientDraft) => Promise<Recipient>
  reload: () => void
}

const AppDataContext = createContext<AppData | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [corridors, setCorridors] = useState<Corridor[]>([])
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadCount, setLoadCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([apiGet<Corridor[]>('/corridors'), apiGet<Recipient[]>('/recipients')])
      .then(([corridorList, recipientList]) => {
        if (cancelled) return
        setCorridors(corridorList)
        setRecipients(recipientList)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [loadCount])

  const corridorById = useCallback((id: string) => corridors.find((c) => c.id === id), [corridors])

  const addRecipient = useCallback(async (draft: RecipientDraft) => {
    const recipient = await apiPost<Recipient>('/recipients', draft)
    setRecipients((current) => [...current, recipient].sort((a, b) => a.name.localeCompare(b.name)))
    return recipient
  }, [])

  const reload = useCallback(() => setLoadCount((n) => n + 1), [])

  const value = useMemo(
    () => ({ corridors, recipients, loading, error, corridorById, addRecipient, reload }),
    [corridors, recipients, loading, error, corridorById, addRecipient, reload],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppData {
  const value = useContext(AppDataContext)
  if (!value) throw new Error('useAppData must be used inside AppDataProvider')
  return value
}
