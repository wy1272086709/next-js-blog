/**
 * Some exported Markdown uses loose, four-space-indented paragraphs where the
 * author intended nested list items. Convert only groups of two or more such
 * paragraphs below a list item, which avoids rewriting ordinary code blocks.
 */
export function normalizeLooseNestedLists(markdown: string): string {
  const lines = markdown.split(/\r?\n/)
  let inFence = false

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const parentMatch = line.match(/^(\s*)[-*+]\s+\S/)
    if (!parentMatch) continue

    const parentIndent = parentMatch[1].length
    const childIndent = parentIndent + 4
    const candidates: number[] = []
    let cursor = index + 1
    let segmentInFence = false

    for (; cursor < lines.length; cursor += 1) {
      const childLine = lines[cursor]
      if (/^\s*(```|~~~)/.test(childLine)) {
        segmentInFence = !segmentInFence
        continue
      }
      if (segmentInFence || childLine.trim() === "") continue

      const indentation = childLine.match(/^\s*/)?.[0].length ?? 0
      if (indentation <= parentIndent) break

      const content = childLine.slice(childIndent)
      if (
        indentation === childIndent &&
        content.trim() &&
        !/^[-*+]\s+/.test(content) &&
        !/^\d+[.)]\s+/.test(content)
      ) {
        candidates.push(cursor)
      }
    }

    if (candidates.length >= 2) {
      for (const candidate of candidates) {
        lines[candidate] = `${" ".repeat(parentIndent + 2)}- ${lines[candidate].trimStart()}`
      }
    }

    index = cursor - 1
  }

  return lines.join("\n")
}
