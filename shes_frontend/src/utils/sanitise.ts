/**
 * SHES – Frontend Input Sanitisation
 * Strips HTML tags from any string before it is submitted to the API.
 * This is a defence-in-depth measure — the backend also sanitises,
 * but doing it on the frontend too prevents unnecessary round trips
 * and gives instant feedback.
 */

/**
 * Remove all HTML tags and trim whitespace from a string.
 * Works without any external library using the browser's own DOMParser.
 */
export function sanitiseString(value: string): string {
  if (!value || typeof value !== 'string') return value

  // Use the browser's DOMParser to safely parse and strip HTML
  const doc = new DOMParser().parseFromString(value, 'text/html')
  const text = doc.body.textContent ?? ''

  // Collapse multiple spaces and trim
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Sanitise all string values in a form data object.
 * Non-string values (numbers, booleans, dates, arrays) pass through unchanged.
 *
 * @example
 * const clean = sanitiseFormData({
 *   journal_note: '<script>alert(1)</script>How are you?',
 *   mood_score: 7,
 * })
 * // → { journal_note: 'How are you?', mood_score: 7 }
 */
export function sanitiseFormData<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data }

  for (const key of Object.keys(result) as Array<keyof T>) {
    const value = result[key]

    if (typeof value === 'string') {
      result[key] = sanitiseString(value) as T[keyof T]
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string' ? sanitiseString(item) : item
      ) as T[keyof T]
    }
  }

  return result
}

/**
 * Fields that should NEVER be sanitised.
 * Passwords and tokens must pass through exactly as entered.
 */
const SKIP_FIELDS = new Set([
  'password',
  'password_confirm',
  'old_password',
  'new_password',
  'confirm_password',
  'token',
  'email',
])

/**
 * Sanitise form data, skipping sensitive fields like passwords and tokens.
 * This is the function to use on all form submissions.
 */
export function sanitiseSubmission<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data }

  for (const key of Object.keys(result) as Array<keyof T>) {
    if (SKIP_FIELDS.has(key as string)) continue

    const value = result[key]

    if (typeof value === 'string') {
      result[key] = sanitiseString(value) as T[keyof T]
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string' ? sanitiseString(item) : item
      ) as T[keyof T]
    }
  }

  return result
}