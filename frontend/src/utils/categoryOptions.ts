/** Builds Select options from a flat active/inactive category list,
 * always keeping `currentId` present (even if inactive) so an existing
 * row's saved category never silently disappears from its own picker.
 */
export function categoryOptions(
  categories: { id: number; name: string; is_active: boolean }[],
  currentId: number | null,
): { value: string; label: string }[] {
  return categories
    .filter((c) => c.is_active || c.id === currentId)
    .map((c) => ({ value: String(c.id), label: c.is_active ? c.name : `${c.name} (неактивна)` }))
}
