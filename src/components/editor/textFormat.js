// The first three are web-safe (Inter's already loaded for the app's own
// UI chrome; Georgia/the system monospace stack need no network font at
// all) - everything after is loaded from Google Fonts (see index.html's
// own <link>, which documents why it needs crossorigin="anonymous": that's
// what lets diagram export read these fonts' cssRules to embed them into
// the exported image/PDF, not just render them on screen).
export const FONT_OPTIONS = [
  { id: 'inter', label: 'Inter', family: 'Inter, sans-serif' },
  { id: 'georgia', label: 'Georgia', family: 'Georgia, serif' },
  { id: 'mono', label: 'Monospace', family: 'ui-monospace, Menlo, Consolas, monospace' },
  { id: 'roboto', label: 'Roboto', family: 'Roboto, sans-serif' },
  { id: 'poppins', label: 'Poppins', family: 'Poppins, sans-serif' },
  { id: 'playfair', label: 'Playfair Display', family: '"Playfair Display", serif' },
  { id: 'merriweather', label: 'Merriweather', family: 'Merriweather, serif' },
  { id: 'sourceCodePro', label: 'Source Code Pro', family: '"Source Code Pro", ui-monospace, monospace' },
  { id: 'caveat', label: 'Caveat', family: 'Caveat, cursive' },
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
    // Left unset by default (not forced to 'left') so an untouched shape
    // keeps whichever alignment its own type's Tailwind classes already
    // give it (most shapes center their text; a few, like label, don't) -
    // same additive-only rule as every other field here.
    textAlign: target.textAlign || undefined,
  }
}

export function patchDiffers(target, patch) {
  return Object.keys(patch).some((key) => target[key] !== patch[key])
}
