import type { FocusEvent } from 'react'

// Mantine's NumberInput keeps the initial 0 in place and inserts typed
// digits next to it instead of replacing it. Selecting the whole value on
// focus makes the first keystroke overwrite it, like a normal spreadsheet
// cell.
export function selectOnFocus(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.select()
}
