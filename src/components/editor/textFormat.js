export const FONT_OPTIONS = [
  { id: 'inter', label: 'Inter', family: 'Inter, sans-serif' },
  { id: 'georgia', label: 'Georgia', family: 'Georgia, serif' },
  { id: 'mono', label: 'Monospace', family: 'ui-monospace, Menlo, Consolas, monospace' },
]

const FONT_FAMILY_BY_ID = Object.fromEntries(FONT_OPTIONS.map((f) => [f.id, f.family]))

export const DEFAULT_FONT_ID = FONT_OPTIONS[0].id
export const DEFAULT_SHAPE_FONT_SIZE = 13
export const DEFAULT_ARROW_FONT_SIZE = 11

export const MIN_FONT_SIZE = 8
export const MAX_FONT_SIZE = 96

export function clampFontSize(size) {
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size))
}

// Every property is undefined unless the target explicitly set it, so this
// only ever adds to a shape/arrow's existing Tailwind-driven appearance -
// never fights it (e.g. unchecking bold returns to a type's own inherent
// font-weight, not all the way down to 400).
export function textFormatStyle(target) {
  return {
    fontFamily: target.fontFamily ? FONT_FAMILY_BY_ID[target.fontFamily] : undefined,
    fontSize: target.fontSize ? `${target.fontSize}px` : undefined,
    color: target.textColor || undefined,
    fontWeight: target.bold ? 700 : undefined,
    fontStyle: target.italic ? 'italic' : undefined,
  }
}

export function patchDiffers(target, patch) {
  return Object.keys(patch).some((key) => target[key] !== patch[key])
}
