type MaybePromise<T> = T | Promise<T>
type ClearCallback = () => MaybePromise<void>
export type HydrationCallback = () => MaybePromise<ClearCallback | void>

const cleanUps: ClearCallback[] = []

export function hydrate(callback: HydrationCallback) {
  if (typeof window !== "undefined") {
    async function CombinedCallback() {
      const cleaner = await callback()
      if (cleaner) {
        cleanUps.push(cleaner)
      }
      window.removeEventListener("load", CombinedCallback)
    }
    window.addEventListener("load", CombinedCallback)
  }
}

export async function clearHydrations() {
  await Promise.allSettled(cleanUps.map(cleanUp => cleanUp()))
  cleanUps.length = 0
  return
}

export function onMount(callback: HydrationCallback) {
  if (typeof window !== "undefined") {
    callback()
  }
}

type Getter<T> = () => T
type Factory<T> = (currentValue: T) => T
type Setter<T> = {
  (fn: Factory<T>): void
  (value: T): void
}
type Subscriber<T> = (value: T) => void
type Subscribe<T> = (subsriber: Subscriber<T>) => () => void

type State<T> = {
  get: Getter<T>
  set: Setter<T>
  subscribe: Subscribe<T>
}

export function use<T>(): State<T>
export function use<T>(initialState: T): State<T>
export function use<T>(initialState?: T) {
  let state: T
  if (initialState !== undefined) {
    state = initialState
  }
  const subscribers = new Set<Subscriber<T>>()
  function isFactory(fn: Factory<T> | T): fn is Factory<T> {
    return typeof fn === "function"
  }

  function setter(newStateOrFn: Factory<T> | T) {
    if (isFactory(newStateOrFn)) {
      state = newStateOrFn(state)
    } else {
      state = newStateOrFn
    }
    subscribers.forEach(subscriber => subscriber(state))
  }

  const subscribe = (fn: (newState: T) => void) => {
    subscribers.add(fn)
    return () => {
      subscribers.delete(fn)
    }
  }

  const getter = () => state

  return {
    get: getter,
    set: setter,
    subscribe: subscribe
  }
}