import { memo, useRef } from 'react'
import EditableText from './EditableText'
import ShapeHandles from './ShapeHandles'
import { textFormatStyle } from './textFormat'
import { DEFAULT_CORNER_RADIUS_BY_TYPE } from './shapeStyle'
import { containerShapeTypes } from './shapeCatalog'

function DeleteButton({ onClick }) {
  return (
    <button
      type="button"
      data-no-drag
      onClick={onClick}
      title="Delete"
      className="pointer-events-auto absolute -right-4 -top-4 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-white text-[11px] leading-none text-soft shadow-sm hover:border-rose-300 hover:text-rose-500"
    >
      ×
    </button>
  )
}

// Swimlane container - a frame divided into `laneCount` equal lanes (columns
// side by side for vertical, rows stacked for horizontal), each its own
// independently editable header (`shape.lane1`, `lane2`, ...), same
// generic-field-name approach as umlClass's attributes/methods above. A
// vertical column's own header runs across ITS top edge (horizontal text);
// a horizontal row's own header runs down ITS left edge (rotated vertical
// text) - the standard pool/swimlane convention (Lucidchart, draw.io, Visio)
// where a lane's label always sits flush against the axis the lane itself
// doesn't repeat along, so outer flex splits the frame into lanes (row-wise
// for vertical, column-wise for horizontal) and each lane's own internal
// flex direction (and its header's dimensions/text orientation) flips to
// match. Each header is a *solid*-color label (not a translucent tint like
// every other shape's fill) so it reads as a real title bar - same
// treatment as the DFD Process shape's own badge header - and like that
// header, its color is the shape's own customizable fill (Format panel),
// defaulting to solid cyan when untouched. Headers also double as the
// container's grab handle - `dragHandlers` (select/drag/drop, same as
// Shape's own border edge strips for every container type) is spread onto
// each one, since the container's own interior is pointer-events-none for
// shapes placed inside it (see Shape's isContainer) and its border is only
// 10px thick - a title bar is a far more discoverable way to select the
// swimlane itself (e.g. to reach the Format panel and change this very
// color) than hunting for that thin edge.
function SwimlaneBody({ shape, orientation, laneCount, commitField, disableDblClick, cornerStyle, fill, borderStyleValue, dragHandlers }) {
  const isVertical = orientation === 'vertical'
  const lanes = Array.from({ length: laneCount }, (_, i) => `lane${i + 1}`)
  const dividerAfter = isVertical ? 'border-r-2' : 'border-b-2'
  return (
    <div
      className={`flex h-full w-full overflow-hidden border-2 border-cyan-600/60 bg-white ${isVertical ? 'flex-row' : 'flex-col'}`}
      style={{ ...cornerStyle, borderColor: fill || undefined, borderStyle: borderStyleValue }}
    >
      {lanes.map((field, i) => (
        <div
          key={field}
          className={`flex flex-1 overflow-hidden ${isVertical ? 'flex-col' : 'flex-row'} ${
            i < laneCount - 1 ? `${dividerAfter} border-cyan-600/40` : ''
          }`}
          style={{ borderColor: fill || undefined, borderStyle: borderStyleValue }}
        >
          {/* pointer-events-auto: opts this header back in to stay clickable
              for rename even though the outer Shape wrapper turns
              pointer-events-none for every container type (see Shape's own
              comment on isContainer) - same pattern as boundary's label. */}
          <div
            {...dragHandlers}
            className={`pointer-events-auto flex shrink-0 cursor-move items-center justify-center overflow-hidden bg-cyan-600 ${
              isVertical ? 'w-full px-1.5 py-1' : 'h-full w-6 px-0.5 py-1.5'
            }`}
            style={{ backgroundColor: fill || undefined }}
          >
            <EditableText
              value={shape[field]}
              onCommit={commitField(field)}
              placeholder="Person / Group"
              placeholderOnlyWhileEditing
              disableDblClick={disableDblClick}
              className={`truncate text-[10.5px] font-semibold text-white ${
                isVertical ? 'w-full text-center' : 'max-h-full'
              }`}
              // Vertical writing mode (not a transform: rotate) so the text's
              // own box naturally sizes to "one line tall" in the rotated
              // direction (~1em wide, height grows with the label) instead of
              // clipping against the narrow w-6 header the way a rotated
              // horizontally-laid-out box would. rotate(180deg) on top flips
              // the reading direction to bottom-to-top, the same convention
              // real swimlane tools use for a lane label running down its
              // own left edge.
              style={!isVertical ? { writingMode: 'vertical-rl', transform: 'rotate(180deg)' } : undefined}
            />
          </div>
          <div className="flex-1" />
        </div>
      ))}
    </div>
  )
}

function ShapeBody({ shape, dispatch, disableDblClick, dragHandlers }) {
  const commitField = (field) => (value) =>
    dispatch({ type: 'RENAME_SHAPE', id: shape.id, field, value })
  const textStyle = textFormatStyle(shape)
  // undefined unless the shape's own corner radius has been customized, so an
  // untouched shape keeps rendering with its type's own Tailwind rounding
  // class (rounded-lg / rounded-xl / none) exactly as before this feature -
  // same "additive only, never fights the base class" approach as textStyle.
  const cornerStyle =
    shape.cornerRadius != null ? { borderRadius: `${shape.cornerRadius}px` } : undefined
  // Same additive-only approach as cornerStyle/textStyle: undefined pieces
  // leave the type's own Tailwind brand color (blue/purple/pink) showing
  // through untouched until the user actually picks a fill color.
  const fill = shape.fillColor
  const fillTint = fill ? `color-mix(in srgb, ${fill} 8%, white)` : undefined
  // undefined (not 'solid') for the common case, same additive-only
  // reasoning as cornerStyle - a shape's Tailwind border-2 class already
  // renders solid on its own, so this only needs to override anything once
  // the user actually picks dotted.
  const borderStyleValue =
    shape.borderStyle && shape.borderStyle !== 'solid' ? shape.borderStyle : undefined

  if (shape.type === 'entity') {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-lg border-2 border-brand-blue/50 bg-brand-blue/6 px-3"
        style={{ ...cornerStyle, borderColor: fill || undefined, borderStyle: borderStyleValue, backgroundColor: fillTint }}
      >
        <EditableText
          value={shape.text}
          onCommit={commitField('text')}
          placeholder="Entity"
          placeholderOnlyWhileEditing
          disableDblClick={disableDblClick}
          className="w-full text-center text-[13px] font-semibold uppercase tracking-wide text-ink"
          style={textStyle}
        />
      </div>
    )
  }

  if (shape.type === 'process') {
    return (
      <div
        className="flex h-full w-full flex-col overflow-hidden rounded-2xl border-2 border-brand-purple"
        style={{ ...cornerStyle, borderColor: fill || undefined, borderStyle: borderStyleValue }}
      >
        <div
          className="flex shrink-0 items-center gap-2 bg-brand-purple px-3 py-1.5"
          style={{ backgroundColor: fill || undefined }}
        >
          <EditableText
            value={shape.badge}
            onCommit={commitField('badge')}
            placeholder="#"
            disableDblClick={disableDblClick}
            className="min-w-3.5 text-[13px] font-extrabold leading-none text-white"
          />
          <span className="text-[11px] font-bold uppercase tracking-wide leading-none text-white">
            Process
          </span>
        </div>
        <div
          className="flex flex-1 items-center justify-center bg-brand-purple/6 px-3 py-2"
          style={{ backgroundColor: fillTint }}
        >
          <EditableText
            value={shape.text}
            onCommit={commitField('text')}
            placeholder="Process"
            placeholderOnlyWhileEditing
            disableDblClick={disableDblClick}
            className="w-full text-center text-[14px] font-medium leading-snug text-ink"
            style={textStyle}
          />
        </div>
      </div>
    )
  }

  if (shape.type === 'store') {
    // Two-compartment table layout (badge cell | label cell), full border
    // on all sides plus a vertical divider between them - replaces the old
    // open-ended (top/bottom border only) Gane-Sarson look with the
    // fully-boxed style requested from a reference image.
    return (
      <div
        className="flex h-full w-full overflow-hidden border-2 border-brand-blue/60"
        style={{ ...cornerStyle, borderColor: fill || undefined, borderStyle: borderStyleValue }}
      >
        <div
          className="flex w-14 shrink-0 items-center justify-center border-r-2 border-brand-blue/60 bg-brand-blue/10 px-1"
          style={{ borderColor: fill || undefined, borderStyle: borderStyleValue, backgroundColor: fillTint }}
        >
          <EditableText
            value={shape.badge}
            onCommit={commitField('badge')}
            placeholder="D#"
            disableDblClick={disableDblClick}
            className="w-full text-center text-[12px] font-bold leading-none text-ink"
          />
        </div>
        <div
          className="flex flex-1 items-center justify-center bg-brand-blue/6 px-2"
          style={{ backgroundColor: fillTint }}
        >
          <EditableText
            value={shape.text}
            onCommit={commitField('text')}
            placeholder="Data store"
            placeholderOnlyWhileEditing
            disableDblClick={disableDblClick}
            className="w-full text-center text-[13px] font-medium leading-snug text-ink"
            style={textStyle}
          />
        </div>
      </div>
    )
  }

  if (shape.type === 'flowProcess') {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-md border-2 border-teal-500/50 bg-teal-500/6 px-3"
        style={{ ...cornerStyle, borderColor: fill || undefined, borderStyle: borderStyleValue, backgroundColor: fillTint }}
      >
        <EditableText
          value={shape.text}
          onCommit={commitField('text')}
          placeholder="Process"
          placeholderOnlyWhileEditing
          disableDblClick={disableDblClick}
          className="w-full text-center text-[13px] font-medium text-ink"
          style={textStyle}
        />
      </div>
    )
  }

  // Diamond via clip-path (not a rotated square) so it fits any width/height
  // aspect ratio correctly - corner radius has no meaningful effect on a
  // clipped polygon, so cornerStyle is intentionally not applied here.
  if (shape.type === 'decision') {
    return (
      <div className="relative h-full w-full">
        <div
          className="absolute inset-0 border-2 border-amber-500/60 bg-amber-500/10"
          style={{
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            borderColor: fill || undefined,
            borderStyle: borderStyleValue,
            backgroundColor: fillTint,
          }}
        />
        <div className="relative flex h-full w-full items-center justify-center px-6">
          <EditableText
            value={shape.text}
            onCommit={commitField('text')}
            placeholder="Decision"
            placeholderOnlyWhileEditing
            disableDblClick={disableDblClick}
            className="w-full text-center text-[12.5px] font-medium leading-snug text-ink"
            style={textStyle}
          />
        </div>
      </div>
    )
  }

  if (shape.type === 'terminator') {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-full border-2 border-slate-500/50 bg-slate-500/6 px-4"
        style={{ ...cornerStyle, borderColor: fill || undefined, borderStyle: borderStyleValue, backgroundColor: fillTint }}
      >
        <EditableText
          value={shape.text}
          onCommit={commitField('text')}
          placeholder="Start"
          placeholderOnlyWhileEditing
          disableDblClick={disableDblClick}
          className="w-full text-center text-[13px] font-medium text-ink"
          style={textStyle}
        />
      </div>
    )
  }

  // Parallelogram via a skewed background layer behind an unskewed text
  // layer, same "two-layer" approach as the decision diamond, so the label
  // stays upright and readable instead of slanting with the shape.
  if (shape.type === 'inputOutput') {
    return (
      <div className="relative h-full w-full">
        <div
          className="absolute inset-0 border-2 border-cyan-500/60 bg-cyan-500/10"
          style={{
            ...cornerStyle,
            transform: 'skewX(-12deg)',
            borderColor: fill || undefined,
            borderStyle: borderStyleValue,
            backgroundColor: fillTint,
          }}
        />
        <div className="relative flex h-full w-full items-center justify-center px-4">
          <EditableText
            value={shape.text}
            onCommit={commitField('text')}
            placeholder="Input/Output"
            placeholderOnlyWhileEditing
            disableDblClick={disableDblClick}
            className="w-full text-center text-[12.5px] font-medium leading-snug text-ink"
            style={textStyle}
          />
        </div>
      </div>
    )
  }

  if (shape.type === 'circle') {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-full border-2 border-brand-blue/50 bg-brand-blue/6 px-3"
        style={{ borderColor: fill || undefined, borderStyle: borderStyleValue, backgroundColor: fillTint }}
      >
        <EditableText
          value={shape.text}
          onCommit={commitField('text')}
          placeholder="Circle"
          placeholderOnlyWhileEditing
          disableDblClick={disableDblClick}
          className="w-full text-center text-[13px] font-medium text-ink"
          style={textStyle}
        />
      </div>
    )
  }

  if (shape.type === 'square') {
    return (
      <div
        className="flex h-full w-full items-center justify-center border-2 border-brand-purple/50 bg-brand-purple/6 px-3"
        style={{ ...cornerStyle, borderColor: fill || undefined, borderStyle: borderStyleValue, backgroundColor: fillTint }}
      >
        <EditableText
          value={shape.text}
          onCommit={commitField('text')}
          placeholder="Square"
          placeholderOnlyWhileEditing
          disableDblClick={disableDblClick}
          className="w-full text-center text-[13px] font-medium text-ink"
          style={textStyle}
        />
      </div>
    )
  }

  if (shape.type === 'rectangle') {
    return (
      <div
        className="flex h-full w-full items-center justify-center border-2 border-teal-500/50 bg-teal-500/6 px-3"
        style={{ ...cornerStyle, borderColor: fill || undefined, borderStyle: borderStyleValue, backgroundColor: fillTint }}
      >
        <EditableText
          value={shape.text}
          onCommit={commitField('text')}
          placeholder="Rectangle"
          placeholderOnlyWhileEditing
          disableDblClick={disableDblClick}
          className="w-full text-center text-[13px] font-medium text-ink"
          style={textStyle}
        />
      </div>
    )
  }

  // Clip-path polygons (not rotated squares) so they fit any width/height
  // aspect ratio correctly - corner radius has no meaningful effect on a
  // clipped polygon, so cornerStyle is intentionally not applied to either.
  if (shape.type === 'triangle') {
    return (
      <div className="relative h-full w-full">
        <div
          className="absolute inset-0 border-2 border-amber-500/60 bg-amber-500/10"
          style={{
            clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
            borderColor: fill || undefined,
            borderStyle: borderStyleValue,
            backgroundColor: fillTint,
          }}
        />
        <div className="relative flex h-full w-full items-end justify-center px-6 pb-2">
          <EditableText
            value={shape.text}
            onCommit={commitField('text')}
            placeholder="Triangle"
            placeholderOnlyWhileEditing
            disableDblClick={disableDblClick}
            className="w-full text-center text-[12.5px] font-medium leading-snug text-ink"
            style={textStyle}
          />
        </div>
      </div>
    )
  }

  if (shape.type === 'diamond') {
    return (
      <div className="relative h-full w-full">
        <div
          className="absolute inset-0 border-2 border-slate-500/60 bg-slate-500/10"
          style={{
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            borderColor: fill || undefined,
            borderStyle: borderStyleValue,
            backgroundColor: fillTint,
          }}
        />
        <div className="relative flex h-full w-full items-center justify-center px-6">
          <EditableText
            value={shape.text}
            onCommit={commitField('text')}
            placeholder="Diamond"
            placeholderOnlyWhileEditing
            disableDblClick={disableDblClick}
            className="w-full text-center text-[12.5px] font-medium leading-snug text-ink"
            style={textStyle}
          />
        </div>
      </div>
    )
  }

  // UML actor - a fixed stick-figure glyph (not stretched to the shape's own
  // box, unlike every other shape body) with its name label beneath, same
  // convention real UML tools use since the figure itself has no meaningful
  // "aspect ratio" to preserve.
  if (shape.type === 'actor') {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-start gap-1 text-indigo-500"
        style={{ color: fill || undefined }}
      >
        <svg viewBox="0 0 34 52" className="h-[65%] w-auto shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="17" cy="8" r="7" />
          <line x1="17" y1="15" x2="17" y2="34" />
          <line x1="4" y1="22" x2="30" y2="22" />
          <line x1="17" y1="34" x2="6" y2="50" />
          <line x1="17" y1="34" x2="28" y2="50" />
        </svg>
        <EditableText
          value={shape.text}
          onCommit={commitField('text')}
          placeholder="Actor"
          placeholderOnlyWhileEditing
          disableDblClick={disableDblClick}
          className="w-full text-center text-[12.5px] font-medium text-ink"
          style={textStyle}
        />
      </div>
    )
  }

  // Ellipse via percentage (not fixed-px, unlike circle's rounded-full)
  // border-radius, so it stays a true oval at any width/height aspect ratio
  // instead of the "stadium" shape rounded-full would give a non-square box.
  if (shape.type === 'usecase') {
    return (
      <div
        className="flex h-full w-full items-center justify-center border-2 border-sky-500/50 bg-sky-500/6 px-4"
        style={{ borderRadius: '50%', borderColor: fill || undefined, borderStyle: borderStyleValue, backgroundColor: fillTint }}
      >
        <EditableText
          value={shape.text}
          onCommit={commitField('text')}
          placeholder="Use case"
          placeholderOnlyWhileEditing
          disableDblClick={disableDblClick}
          className="w-full text-center text-[13px] font-medium text-ink"
          style={textStyle}
        />
      </div>
    )
  }

  // System boundary - a plain frame with its label pinned to the top-left
  // corner (not centered, unlike every other shape body) since it's meant to
  // visually contain other shapes rather than hold its own centered text.
  if (shape.type === 'boundary') {
    return (
      <div
        className="relative h-full w-full border-2 border-slate-400/60 bg-slate-400/5"
        style={{ ...cornerStyle, borderColor: fill || undefined, borderStyle: borderStyleValue, backgroundColor: fillTint }}
      >
        {/* pointer-events-auto: the outer Shape wrapper below turns itself
            pointer-events-none for this type so shapes placed inside the
            frame stay reachable (see Shape's own comment) - the label still
            needs to opt back in to stay clickable for rename. */}
        <div className="pointer-events-auto absolute left-2.5 top-2">
          <EditableText
            value={shape.text}
            onCommit={commitField('text')}
            placeholder="System"
            placeholderOnlyWhileEditing
            disableDblClick={disableDblClick}
            className="text-[12px] font-semibold text-ink"
            style={textStyle}
          />
        </div>
      </div>
    )
  }

  // UML class box - three stacked compartments (name / attributes / methods),
  // each its own independently editable field rather than one shared `text`
  // like every other shape, since a class box's whole point is showing those
  // as visually distinct rows. Attributes/methods are single-line like every
  // other EditableText here (Enter commits and blurs, same as elsewhere) -
  // not a real multi-line member list, but enough to label a class's shape.
  if (shape.type === 'umlClass') {
    return (
      <div
        className="flex h-full w-full flex-col overflow-hidden rounded-md border-2 border-slate-500/60 bg-white"
        style={{ ...cornerStyle, borderColor: fill || undefined, borderStyle: borderStyleValue }}
      >
        <div
          className="shrink-0 border-b-2 border-slate-500/40 bg-slate-500/10 px-2 py-1.5"
          style={{ borderColor: fill || undefined, borderStyle: borderStyleValue, backgroundColor: fillTint }}
        >
          <EditableText
            value={shape.text}
            onCommit={commitField('text')}
            placeholder="ClassName"
            placeholderOnlyWhileEditing
            disableDblClick={disableDblClick}
            className="w-full text-center text-[13px] font-bold text-ink"
            style={textStyle}
          />
        </div>
        <div
          className="shrink-0 border-b-2 border-slate-500/40 px-2 py-1.5"
          style={{ borderColor: fill || undefined, borderStyle: borderStyleValue }}
        >
          <EditableText
            value={shape.attributes}
            onCommit={commitField('attributes')}
            placeholder="attributes"
            placeholderOnlyWhileEditing
            disableDblClick={disableDblClick}
            className="w-full text-left text-[11.5px] leading-snug text-body"
          />
        </div>
        <div className="flex-1 px-2 py-1.5">
          <EditableText
            value={shape.methods}
            onCommit={commitField('methods')}
            placeholder="methods()"
            placeholderOnlyWhileEditing
            disableDblClick={disableDblClick}
            className="w-full text-left text-[11.5px] leading-snug text-body"
          />
        </div>
      </div>
    )
  }

  // UML activity node - a soft, fully-rounded rectangle per the notation's
  // "rounded rect" action symbol, distinct from flowchart's flowProcess (own
  // key/color, see shapeCatalog.js's own note on separate namespaces).
  if (shape.type === 'activity') {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-[28px] border-2 border-emerald-500/60 bg-emerald-500/8 px-4"
        style={{ ...cornerStyle, borderColor: fill || undefined, borderStyle: borderStyleValue, backgroundColor: fillTint }}
      >
        <EditableText
          value={shape.text}
          onCommit={commitField('text')}
          placeholder="Activity"
          placeholderOnlyWhileEditing
          disableDblClick={disableDblClick}
          className="w-full text-center text-[13px] font-medium text-ink"
          style={textStyle}
        />
      </div>
    )
  }

  // UML state node - name compartment plus a second compartment for its
  // internal activities (e.g. "entry / ..."), the state-machine notation's
  // own convention, same two-compartment idea as umlClass above but with
  // exactly one lower field instead of two.
  if (shape.type === 'state') {
    return (
      <div
        className="flex h-full w-full flex-col overflow-hidden rounded-xl border-2 border-fuchsia-500/60 bg-fuchsia-500/6"
        style={{ ...cornerStyle, borderColor: fill || undefined, borderStyle: borderStyleValue, backgroundColor: fillTint }}
      >
        <div
          className="flex shrink-0 items-center justify-center border-b-2 border-fuchsia-500/30 px-3 py-1.5"
          style={{ borderColor: fill || undefined, borderStyle: borderStyleValue }}
        >
          <EditableText
            value={shape.text}
            onCommit={commitField('text')}
            placeholder="State"
            placeholderOnlyWhileEditing
            disableDblClick={disableDblClick}
            className="w-full text-center text-[13px] font-semibold text-ink"
            style={textStyle}
          />
        </div>
        <div className="flex flex-1 items-center justify-center px-3 py-1">
          <EditableText
            value={shape.entryActivity}
            onCommit={commitField('entryActivity')}
            placeholder="entry / do…"
            placeholderOnlyWhileEditing
            disableDblClick={disableDblClick}
            className="w-full text-center text-[11px] italic text-body"
          />
        </div>
      </div>
    )
  }

  // UML decision - own key/color-independent copy of flowchart's decision
  // diamond (see shapeCatalog.js's separate-namespace convention), kept
  // visually identical (amber diamond) since "decision = amber diamond" is
  // the same recognizable convention in both notations.
  if (shape.type === 'umlDecision') {
    return (
      <div className="relative h-full w-full">
        <div
          className="absolute inset-0 border-2 border-amber-500/60 bg-amber-500/10"
          style={{
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            borderColor: fill || undefined,
            borderStyle: borderStyleValue,
            backgroundColor: fillTint,
          }}
        />
        <div className="relative flex h-full w-full items-center justify-center px-6">
          <EditableText
            value={shape.text}
            onCommit={commitField('text')}
            placeholder="Decision"
            placeholderOnlyWhileEditing
            disableDblClick={disableDblClick}
            className="w-full text-center text-[12.5px] font-medium leading-snug text-ink"
            style={textStyle}
          />
        </div>
      </div>
    )
  }

  // Pseudostates (initial/final) carry no label in the notation - plain
  // filled glyphs, same "fixed decorative shape, no EditableText" treatment
  // as actor's stick figure, just without a name underneath.
  if (shape.type === 'initial') {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-full w-full rounded-full bg-ink" style={{ backgroundColor: fill || undefined }} />
      </div>
    )
  }

  if (shape.type === 'final') {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-full border-2 border-ink"
        style={{ borderColor: fill || undefined }}
      >
        <div className="h-[55%] w-[55%] rounded-full bg-ink" style={{ backgroundColor: fill || undefined }} />
      </div>
    )
  }

  // Fork/Join - a solid bar (no label, same "fixed decorative glyph"
  // treatment as the pseudostates above) that splits one flow into several
  // concurrent ones (fork) or merges them back (join) - same notation
  // symbol either way, the direction is implied by which way the arrows
  // attached to it point, not by anything the shape itself renders.
  // Horizontal/vertical are separate keys (own default width/height) rather
  // than one tool the user has to manually resize, same precedent as the
  // swimlane orientation pairs above.
  if (shape.type === 'forkJoinH' || shape.type === 'forkJoinV') {
    return <div className="h-full w-full rounded-sm bg-ink" style={{ ...cornerStyle, backgroundColor: fill || undefined }} />
  }

  if (
    shape.type === 'swimlaneV1' ||
    shape.type === 'swimlaneV3' ||
    shape.type === 'swimlaneH1' ||
    shape.type === 'swimlaneH2'
  ) {
    const orientation = shape.type.startsWith('swimlaneV') ? 'vertical' : 'horizontal'
    const laneCount = Number(shape.type.slice(-1))
    return (
      <SwimlaneBody
        shape={shape}
        orientation={orientation}
        laneCount={laneCount}
        commitField={commitField}
        disableDblClick={disableDblClick}
        cornerStyle={cornerStyle}
        fill={fill}
        borderStyleValue={borderStyleValue}
        dragHandlers={dragHandlers}
      />
    )
  }

  return (
    <div
      className={`flex h-full w-full items-center ${fill ? 'rounded-md border-2 px-2' : 'px-1'}`}
      style={{ borderColor: fill || undefined, backgroundColor: fillTint }}
    >
      <EditableText
        value={shape.text}
        onCommit={commitField('text')}
        placeholder="Text label"
        placeholderOnlyWhileEditing
        disableDblClick={disableDblClick}
        className="w-full text-[13px] font-medium text-ink"
        style={textStyle}
      />
    </div>
  )
}

// A remote patch replaces shape state wholesale (see APPLY_REMOTE_STATE in
// historyReducer.js), so a collaborator moving/resizing/rotating a shape
// otherwise makes it jump straight to its new position/size/angle each time
// a throttled broadcast arrives - visibly stepped rather than smooth. This
// animates those changes instead. It has to stay off while *this* shape is
// part of *this tab's* own active drag/resize/rotate gesture though, or
// local dragging would lag behind the mouse waiting for the transition to
// catch up - see isLocallyDragging below for how that's told apart.
const REMOTE_TRANSITION_MS = 120
const POSITION_TRANSITION = {
  transitionProperty: 'left, top, width, height',
  transitionDuration: `${REMOTE_TRANSITION_MS}ms`,
  transitionTimingFunction: 'linear',
}
const ROTATION_TRANSITION = {
  transitionProperty: 'transform',
  transitionDuration: `${REMOTE_TRANSITION_MS}ms`,
  transitionTimingFunction: 'linear',
}

// A canvas with hundreds of shapes dispatches constantly - dragging one
// shape, typing in one label, even a remote collaborator's cursor moving -
// and every one of those used to re-render *every* Shape, because this
// component read the whole editor `state` straight from context (any
// context consumer re-renders whenever the value it subscribes to changes,
// regardless of memo on its own props). Shape now takes every piece of
// state it needs as plain props instead, computed once by EditorCanvas's
// `.map()`, so wrapping it in memo() actually means something: an unrelated
// dispatch elsewhere leaves an unaffected shape's props identical (same
// `shape` object reference per the reducer's own immutable-update pattern,
// same primitive booleans), and memo skips it entirely. `stateRef` is the
// one exception - a plain ref (not a reactive prop) holding the latest
// state, read only inside event handlers (group-drag start positions, see
// below) so those can see fresh data without themselves forcing a re-render.
function Shape({
  shape,
  zoom,
  dispatch,
  readOnly,
  stateRef,
  isSelected,
  isMultiSelected,
  isLocallyDragging,
  isPendingArrowSource,
  isArrowTool,
  isSelectTool,
  isConnectHover,
  showHandles,
}) {
  // Keeps the selection ring / connect-hover glow's own corners matching
  // ShapeBody's, whether the shape is still on its type's own default radius
  // or the user has customized it - otherwise a never-touched Process shape
  // (rounded-2xl body) would show a visibly boxier rounded-lg ring around it.
  const cornerRadius =
    shape.cornerRadius ?? DEFAULT_CORNER_RADIUS_BY_TYPE[shape.type] ?? 0
  const cornerStyle = { borderRadius: `${cornerRadius}px` }
  const dragRef = useRef(null)
  const outerRef = useRef(null)

  const handlePointerDown = (event) => {
    if (isArrowTool) {
      event.stopPropagation()
      event.preventDefault()
      dispatch({ type: 'ARROW_TOOL_CLICK_SHAPE', shapeId: shape.id })
      return
    }

    if (event.target.closest('[data-no-drag]')) return

    if (event.shiftKey) {
      event.stopPropagation()
      dispatch({ type: 'TOGGLE_SHAPE_SELECTION', id: shape.id })
      return
    }

    event.stopPropagation()

    // If this shape is already part of a multi-selection, drag the whole
    // group and skip the replacing SELECT below - dispatching a
    // single-shape SELECT first would destroy the multi-selection that
    // group-drag depends on.
    if (!isMultiSelected) {
      dispatch({ type: 'SELECT', kind: 'shape', ids: [shape.id] })
    }
    // Read fresh from the ref (not a prop) - the other selected shapes'
    // current positions are only needed right now, at gesture start, not on
    // every render, so this doesn't need to be reactive.
    const currentState = stateRef.current
    const idsToTrack = isMultiSelected ? currentState.selection.ids : [shape.id]

    // Selection above still applies for a viewer - only the drag session
    // itself is skipped, so the shape doesn't visually "try to follow the
    // cursor" for a MOVE_SHAPE that guardedDispatch would silently drop
    // anyway (see useDiagramEditor.js).
    if (readOnly) return

    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      shapes: idsToTrack.map((id) => ({
        id,
        startX: currentState.shapes[id].x,
        startY: currentState.shapes[id].y,
      })),
    }
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = (event.clientX - drag.startClientX) / zoom
    const dy = (event.clientY - drag.startClientY) / zoom
    for (const trackedShape of drag.shapes) {
      dispatch({
        type: 'MOVE_SHAPE',
        id: trackedShape.id,
        x: trackedShape.startX + dx,
        y: trackedShape.startY + dy,
      })
    }
  }

  const endDrag = (event) => {
    if (!dragRef.current) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dispatch({ type: 'DRAG_END', id: shape.id })
  }

  // A container (system boundary, or any UML swimlane variant) is a frame
  // meant to contain other shapes, not block them - its own hit-box normally
  // covers its whole width/height like any other shape, which would
  // otherwise sit on top of (and swallow every click/drag/arrow-connect
  // meant for) whatever's placed visually inside it. pointer-events-none
  // here opens that interior back up to whatever's beneath - a shape placed
  // inside, or the canvas itself - while the four edge strips below opt back
  // in so the frame itself stays selectable, draggable, and deletable from
  // its border. containerShapeTypes lives in shapeCatalog.js since
  // useDiagramEditor's ADD_SHAPE needs the exact same set (to paint these
  // types at the back of shapeOrder, same reasoning).
  const isContainer = containerShapeTypes.has(shape.type)
  const BORDER_HIT_THICKNESS = 10
  // The drag handlers below call setPointerCapture on event.currentTarget -
  // for every other shape that's this outer div, but a container's outer div
  // is pointer-events-none (see above), and capturing a pointer on a
  // non-hit-testable element is inconsistent across browsers: mousedown
  // could still select it (that bubbles up fine from a strip), but the
  // captured move/up events meant to actually drag it wouldn't reliably
  // arrive. So for a container, these go on the (pointer-events-auto) edge
  // strips directly instead of the outer div, keeping capture anchored to
  // an element that's actually a valid hit-test target.
  const dragHandlers = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  }

  return (
    <div
      ref={outerRef}
      data-shape-id={shape.id}
      {...(isContainer ? null : dragHandlers)}
      className={`absolute select-none animate-shape-enter ${isSelected ? 'z-10' : 'z-0'} ${isContainer ? 'pointer-events-none' : ''}`}
      style={{
        left: shape.x,
        top: shape.y,
        width: shape.width,
        height: shape.height,
        ...(isLocallyDragging ? null : POSITION_TRANSITION),
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          transform: `rotate(${shape.rotation ?? 0}deg)`,
          ...(isLocallyDragging ? null : ROTATION_TRANSITION),
        }}
      >
        <div
          className={`h-full w-full transition-shadow ${
            isSelected ? 'ring-2 ring-brand-purple ring-offset-2' : ''
          } ${
            isPendingArrowSource
              ? 'outline-2 outline-dashed outline-brand-blue outline-offset-2'
              : ''
          }`}
          style={{
            ...cornerStyle,
            ...(isConnectHover
              ? {
                  boxShadow:
                    '0 0 0 1px var(--color-brand-purple), 0 0 18px 4px color-mix(in srgb, var(--color-brand-purple) 35%, transparent)',
                }
              : null),
          }}
        >
          <ShapeBody
            shape={shape}
            dispatch={dispatch}
            disableDblClick={!isSelectTool || readOnly}
            dragHandlers={dragHandlers}
          />
        </div>
        {isContainer && (
          <>
            <div
              {...dragHandlers}
              className="pointer-events-auto absolute inset-x-0 top-0"
              style={{ height: BORDER_HIT_THICKNESS }}
            />
            <div
              {...dragHandlers}
              className="pointer-events-auto absolute inset-x-0 bottom-0"
              style={{ height: BORDER_HIT_THICKNESS }}
            />
            <div
              {...dragHandlers}
              className="pointer-events-auto absolute inset-y-0 left-0"
              style={{ width: BORDER_HIT_THICKNESS }}
            />
            <div
              {...dragHandlers}
              className="pointer-events-auto absolute inset-y-0 right-0"
              style={{ width: BORDER_HIT_THICKNESS }}
            />
          </>
        )}
        {showHandles && (
          <DeleteButton onClick={() => dispatch({ type: 'DELETE_SELECTED' })} />
        )}
        {showHandles && (
          <ShapeHandles shape={shape} dispatch={dispatch} outerRef={outerRef} zoom={zoom} />
        )}
      </div>
    </div>
  )
}

export default memo(Shape)
