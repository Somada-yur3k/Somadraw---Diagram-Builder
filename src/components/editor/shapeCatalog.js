// Single source of truth for "what shapes exist, in which group, under what
// label" - shared by EditorSidebar (the picker UI) and FloatingShapePreview
// (the drag-style ghost shown while a shape tool is armed), so neither can
// drift out of sync with the other about a shape's display name or which
// keys are actually placeable.

// Entity/Process/Data Store are the actual DFD notation shapes, shown in the
// collapsible "Data Flow Diagram" section. Text Label isn't DFD notation -
// it lives with Select/Draw Arrow in "Tools" instead.
export const dfdShapes = [
  { key: 'entity', label: 'Entity' },
  { key: 'process', label: 'Process' },
  { key: 'store', label: 'Data Store' },
]
// Standard flowchart notation, shown in its own collapsible "Flowchart"
// section - separate key namespace from the DFD shapes above (e.g.
// 'flowProcess' vs 'process') since a flowchart process and a DFD process
// are visually and semantically different shapes.
export const flowchartShapes = [
  { key: 'flowProcess', label: 'Process' },
  { key: 'decision', label: 'Decision' },
  { key: 'terminator', label: 'Start/End' },
  { key: 'inputOutput', label: 'Input/Output' },
]
// UML Use Case notation, shown in its own collapsible "Use Case Diagram"
// section, same treatment as dfdShapes/flowchartShapes above - own key
// namespace since these are their own diagram type, not tied to either
// notation above.
export const usecaseShapes = [
  { key: 'actor', label: 'Actor' },
  { key: 'usecase', label: 'Use Case' },
  { key: 'boundary', label: 'System Boundary' },
]
// UML notation covering class structure plus Activity/State-machine nodes,
// shown in its own collapsible "UML Diagram" section - own key namespace
// (e.g. 'umlClass' not 'class') for the same reason as the groups above.
export const umlShapes = [
  { key: 'umlClass', label: 'Class' },
  { key: 'activity', label: 'Activity' },
  { key: 'umlDecision', label: 'Decision' },
  { key: 'state', label: 'State' },
  { key: 'initial', label: 'Initial' },
  { key: 'final', label: 'Final' },
  { key: 'forkJoinH', label: 'Fork/Join (Horizontal)' },
  { key: 'forkJoinV', label: 'Fork/Join (Vertical)' },
  { key: 'swimlaneV1', label: 'Vertical Swimlane (1)' },
  { key: 'swimlaneV3', label: 'Vertical Swimlane (3)' },
  { key: 'swimlaneH1', label: 'Horizontal Swimlane (1)' },
  { key: 'swimlaneH2', label: 'Horizontal Swimlane (2)' },
]

// Shape types that behave as containers meant to visually hold other shapes
// inside them (rather than sit on top of them) - System Boundary plus every
// swimlane variant. Shared by Shape.jsx (pointer-events pass-through so
// contents stay reachable) and useDiagramEditor's ADD_SHAPE (paint order:
// unshifted to the back so anything placed inside stays visually on top).
export const containerShapeTypes = new Set(['boundary', 'swimlaneV1', 'swimlaneV3', 'swimlaneH1', 'swimlaneH2'])
// Plain geometric shapes, reachable only from the Shapes button's dropdown
// (not the sidebar's own collapsible sections, unlike dfdShapes/
// flowchartShapes above) - own key namespace (not reusing e.g. 'process')
// since these are generic freeform shapes, not tied to either notation.
export const basicShapes = [
  { key: 'circle', label: 'Circle' },
  { key: 'square', label: 'Square' },
  { key: 'rectangle', label: 'Rectangle' },
  { key: 'triangle', label: 'Triangle' },
  { key: 'diamond', label: 'Diamond' },
]
export const textLabelTool = { key: 'label', label: 'Text Label' }

// Mobile-only: which diagram type's shapes the sidebar's dropdown picker
// currently shows (see EditorSidebar's mobile-only block). `iconKey` picks
// one representative shape from each group as the picker's own icon.
export const diagramTypeGroups = [
  { key: 'dfd', label: 'Data Flow Diagram', shapes: dfdShapes, iconKey: 'entity' },
  { key: 'flowchart', label: 'Flowchart', shapes: flowchartShapes, iconKey: 'decision' },
  { key: 'usecase', label: 'Use Case Diagram', shapes: usecaseShapes, iconKey: 'actor' },
  { key: 'uml', label: 'UML Diagram', shapes: umlShapes, iconKey: 'umlClass' },
]

// Every shape reachable from anywhere a shape can be picked - the toolbox
// dropdown (basicShapes) plus the sidebar's own DFD/Flowchart/Use Case/UML
// sections - so the Shapes button still highlights as active no matter
// which group a placed shape's tool key belongs to.
export const shapeToolKeys = new Set(
  [...dfdShapes, ...flowchartShapes, ...usecaseShapes, ...umlShapes, ...basicShapes].map((shape) => shape.key),
)

// Every tool key that actually places a shape on click (shapeToolKeys plus
// the text label tool, which lives outside those sections) mapped to its
// display label - what FloatingShapePreview shows next to the ghost icon
// while that tool is armed.
export const PLACEABLE_SHAPE_LABEL_BY_KEY = Object.fromEntries(
  [...dfdShapes, ...flowchartShapes, ...usecaseShapes, ...umlShapes, ...basicShapes, textLabelTool].map((shape) => [
    shape.key,
    shape.label,
  ]),
)
