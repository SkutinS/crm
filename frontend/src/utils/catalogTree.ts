interface TreeNode {
  id: number
  parent_id: number | null
  name: string
}

export interface FlatTreeRow<T extends TreeNode> {
  item: T
  depth: number
  path: string
}

/** Depth-first flattening of a parent/child list, each row carrying its
 * nesting depth and a "Category / Subcategory / Item" breadcrumb — used
 * both for indented tree display and for building searchable select
 * options with a self-explanatory label.
 */
export function flattenTree<T extends TreeNode>(items: T[]): FlatTreeRow<T>[] {
  const byParent = new Map<number | null, T[]>()
  for (const item of items) {
    const key = item.parent_id
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(item)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }

  const rows: FlatTreeRow<T>[] = []
  function walk(parentId: number | null, depth: number, prefix: string) {
    for (const item of byParent.get(parentId) ?? []) {
      const path = prefix ? `${prefix} / ${item.name}` : item.name
      rows.push({ item, depth, path })
      walk(item.id, depth + 1, path)
    }
  }
  walk(null, 0, '')
  return rows
}

/** ids of item and all of its descendants — used to keep a node from being
 * reparented into its own subtree in the parent picker. */
export function descendantIds<T extends TreeNode>(items: T[], itemId: number): Set<number> {
  const byParent = new Map<number | null, T[]>()
  for (const item of items) {
    const key = item.parent_id
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(item)
  }
  const result = new Set<number>([itemId])
  function collect(id: number) {
    for (const child of byParent.get(id) ?? []) {
      result.add(child.id)
      collect(child.id)
    }
  }
  collect(itemId)
  return result
}
