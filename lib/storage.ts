export const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    if (typeof window === "undefined") return defaultValue
    const value = localStorage.getItem(key)
    if (!value) return defaultValue

    // Try to parse as JSON
    try {
      return JSON.parse(value)
    } catch {
      // Return as plain string if JSON parsing fails
      return value as T
    }
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error)
    return defaultValue
  }
}

export const saveToLocalStorage = (key: string, value: unknown): void => {
  try {
    if (typeof window === "undefined") return
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error)
  }
}

export const clearAllLocalStorage = (): void => {
  try {
    if (typeof window === "undefined") return
    localStorage.clear()
    sessionStorage.clear()
  } catch (error) {
    console.error("Error clearing localStorage:", error)
  }
}
