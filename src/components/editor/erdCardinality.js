// Shared between ArrowLayer.jsx (the actual SVG connector markers) and
// ArrowCardinalityPickers.jsx (the floating per-endpoint picker UI) so both
// ever agree on the same 6 values, their display order/labels, and which
// marker id backs which value - one list to update if a 7th cardinality is
// ever added, instead of two definitions silently drifting apart. Plain
// data only (no JSX) - see ErdCardinalityIcon.jsx for the matching icon,
// split into its own file so this one stays fast-refresh-friendly.
export const ERD_CARDINALITY_OPTIONS = [
  { value: 'zeroOne', label: 'Zero or one' },
  { value: 'one', label: 'One' },
  { value: 'oneOnly', label: 'One and only one' },
  { value: 'zeroMany', label: 'Zero or many' },
  { value: 'oneMany', label: 'One or many' },
  { value: 'many', label: 'Many' },
]

export const ERD_CARDINALITY_MARKER_ID = {
  zeroOne: 'erd-zeroone',
  one: 'erd-one',
  oneOnly: 'erd-oneonly',
  zeroMany: 'erd-zeromany',
  oneMany: 'erd-onemany',
  many: 'erd-many',
}
