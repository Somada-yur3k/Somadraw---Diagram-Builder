// Standalone small preview of a cardinality glyph - used both as
// ArrowCardinalityPickers' floating trigger (so it shows what's currently
// set on that end) and as each option's own icon inside that picker's
// dropdown. Deliberately mirrors the *shape* of the actual SVG marker defs
// in ArrowLayer.jsx (same relative tick/circle/crow's-foot geometry, symbol
// nearest the drawing's right edge - the "shape" side, matching every
// marker's own refX-near-max-x convention) so what you pick here is
// recognizably the same symbol that then renders on the arrow itself. Not
// the literal same <marker> markup though - markers live in <defs> and
// can't be reused as a freestanding icon outside an SVG's
// marker-start/marker-end plumbing, so this redraws the same shapes at a
// fixed small size instead. Uses currentColor rather than the markers' own
// var(--color-soft)/var(--color-brand-purple), so callers control color the
// normal React way (a text-* class on whatever wraps it) instead of needing
// a selected/unselected prop like the marker ids do.
function ErdCardinalityIcon({ value, className = 'h-3.5 w-6' }) {
  const stroke = 'currentColor'
  if (value === 'one') {
    return (
      <svg viewBox="0 0 28 16" className={className} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
        <line x1="14" y1="3" x2="14" y2="13" />
      </svg>
    )
  }
  if (value === 'oneOnly') {
    return (
      <svg viewBox="0 0 28 16" className={className} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
        <line x1="11" y1="3" x2="11" y2="13" />
        <line x1="17" y1="3" x2="17" y2="13" />
      </svg>
    )
  }
  if (value === 'zeroOne') {
    return (
      <svg viewBox="0 0 28 16" className={className} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
        <circle cx="8" cy="8" r="5" fill="white" />
        <line x1="20" y1="3" x2="20" y2="13" />
      </svg>
    )
  }
  if (value === 'many') {
    return (
      <svg viewBox="0 0 28 16" className={className} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
        <path d="M24 8 10 2M24 8 10 14" />
      </svg>
    )
  }
  if (value === 'oneMany') {
    return (
      <svg viewBox="0 0 28 16" className={className} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
        <line x1="6" y1="3" x2="6" y2="13" />
        <path d="M24 8 14 2M24 8 14 14" />
      </svg>
    )
  }
  if (value === 'zeroMany') {
    return (
      <svg viewBox="0 0 28 16" className={className} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
        <circle cx="6" cy="8" r="5" fill="white" />
        <path d="M24 8 14 2M24 8 14 14" />
      </svg>
    )
  }
  return null
}

export default ErdCardinalityIcon
