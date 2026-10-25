import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'savings-planner:plan-hidden-blocks'

const listeners = new Set<() => void>()
let cache: string[] | null = null

function read(): string[] {
  if (cache) return cache
  try {
    const parsed: unknown = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? '[]')
    cache = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    cache = []
  }
  return cache
}

function write(next: string[]) {
  cache = next
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // storage unavailable: keep the in-memory value only
  }
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useHiddenBlocks() {
  const hidden = useSyncExternalStore(subscribe, read, read)
  const toggle = (id: string) => write(hidden.includes(id) ? hidden.filter(h => h !== id) : [...hidden, id])
  const reset = () => write([])
  return { hidden, toggle, reset }
}
