// Single source of truth for "what shapes exist, in which group, under what
// label" - shared by EditorSidebar (the picker UI) and FloatingShapePreview
// (the drag-style ghost shown while a shape tool is armed), so neither can
// drift out of sync with the other about a shape's display name or which
// keys are actually placeable.

// Entity/Process/Data Store are the actual DFD notation shapes, shown in the
// collapsible "Data Flow Diagram" section. Text Label isn't DFD notation -
// it lives with Select/Draw Arrow in "Tools" instead. `category` labels the
// group the same way systemArchShapes/networkShapes do (groupShapesByCategory
// below) - just the one section here since the whole catalog is DFD
// notation, but every diagram type gets at least one labeled section now
// rather than only the two large ones.
export const dfdShapes = [
  { key: 'entity', label: 'Entity', category: 'Core DFD Elements' },
  { key: 'process', label: 'Process', category: 'Core DFD Elements' },
  { key: 'store', label: 'Data Store', category: 'Core DFD Elements' },
]
// Standard flowchart notation, shown in its own collapsible "Flowchart"
// section - separate key namespace from the DFD shapes above (e.g.
// 'flowProcess' vs 'process') since a flowchart process and a DFD process
// are visually and semantically different shapes.
export const flowchartShapes = [
  { key: 'flowProcess', label: 'Process', category: 'Flowchart Elements' },
  { key: 'decision', label: 'Decision', category: 'Flowchart Elements' },
  { key: 'terminator', label: 'Start/End', category: 'Flowchart Elements' },
  { key: 'inputOutput', label: 'Input/Output', category: 'Flowchart Elements' },
]
// UML Use Case notation, shown in its own collapsible "Use Case Diagram"
// section, same treatment as dfdShapes/flowchartShapes above - own key
// namespace since these are their own diagram type, not tied to either
// notation above.
export const usecaseShapes = [
  { key: 'actor', label: 'Actor', category: 'Use Case Elements' },
  { key: 'usecase', label: 'Use Case', category: 'Use Case Elements' },
  { key: 'boundary', label: 'System Boundary', category: 'Use Case Elements' },
]
// UML notation covering class structure plus Activity/State-machine nodes,
// shown in its own collapsible "UML Diagram" section - own key namespace
// (e.g. 'umlClass' not 'class') for the same reason as the groups above.
// Split across three categories (unlike dfdShapes/flowchartShapes/
// usecaseShapes' single one) since this is the one small-catalog diagram
// type where the shapes actually fall into visually distinct notation
// families, not just "everything in this diagram type."
export const umlShapes = [
  { key: 'umlClass', label: 'Class', category: 'Class Structure' },
  { key: 'activity', label: 'Activity', category: 'Activity / State Machine' },
  { key: 'umlDecision', label: 'Decision', category: 'Activity / State Machine' },
  { key: 'state', label: 'State', category: 'Activity / State Machine' },
  { key: 'initial', label: 'Initial', category: 'Activity / State Machine' },
  { key: 'final', label: 'Final', category: 'Activity / State Machine' },
  { key: 'forkJoinH', label: 'Fork/Join (Horizontal)', category: 'Activity / State Machine' },
  { key: 'forkJoinV', label: 'Fork/Join (Vertical)', category: 'Activity / State Machine' },
  { key: 'swimlaneV1', label: 'Vertical Swimlane (1)', category: 'Swimlanes' },
  { key: 'swimlaneV3', label: 'Vertical Swimlane (3)', category: 'Swimlanes' },
  { key: 'swimlaneH1', label: 'Horizontal Swimlane (1)', category: 'Swimlanes' },
  { key: 'swimlaneH2', label: 'Horizontal Swimlane (2)', category: 'Swimlanes' },
]

// Entity-Relationship notation, shown in its own collapsible "ERD Diagram"
// section - just the one shape (a table), since a relationship is drawn
// with the existing arrow tool (see the 'erd' connector type in
// EditorSidebar's own connectorTypes) rather than being its own placeable
// shape. No `category` - groupShapesByCategory below treats that as "one
// ungrouped section," which renders with no header at all (see its own
// comment); labeling a group of exactly one item has nothing to organize.
export const erdShapes = [{ key: 'erdTable', label: 'Table' }]

// System Architecture notation, shown in its own "System Architecture
// Diagram" section - by far the largest catalog here, so every entry
// shares one rendering path (Shape.jsx's SystemArchNodeBody, ShapeIcon.jsx's
// SystemArchIcon) instead of a bespoke component each; only the glyph
// differs per key (systemArchIcons.jsx). Each entry also carries its own
// `category` (unlike every other diagram type's shapes above, all small
// enough to browse as one flat list) - groupShapesByCategory below is what
// turns that into actual labeled sections in the picker/sidebar, matching
// the reference spec's own category groupings, instead of one long
// unlabeled grid of ~55 icons.
//
// A few items from that same spec are deliberately left out, not
// forgotten:
//  - "Actor / User" reuses the existing 'actor' key (usecaseShapes above) -
//    same concept, no reason to draw a second, subtly-different person icon.
//  - "Note / Text Box" reuses the existing textLabelTool (Tools row), and
//    "Container / Group" / "Zone / Boundary" reuse the existing 'boundary'
//    shape (usecaseShapes above) - all three are already fully general,
//    not specific to any one diagram type.
//  - The "Common Symbols" group (Start/End/Decision/Process) is exactly
//    flowchartShapes under different names - that's what the Flowchart
//    diagram type is for, not a reason to duplicate those four shapes
//    under a second name here.
//  - The "Connectors / Relationships" group (Data Flow, Dependency,
//    Association, Aggregation, Composition, Inheritance) describes arrow
//    styles, not placeable shapes - solid/dotted line style and start/end
//    arrowheads already exist (EditorSidebar's Draw Arrow menu); UML-style
//    diamond/triangle relationship markers (Aggregation/Composition/
//    Inheritance specifically) don't exist yet and would extend
//    ArrowLayer.jsx's own marker defs, not this shape catalog - a
//    reasonable follow-up, not part of this pass.
export const systemArchShapes = [
  { key: 'actor', label: 'Actor / User', category: 'Actors & Users', noBorder: true },
  { key: 'sysExternalUsers', label: 'External Users', category: 'Actors & Users', noBorder: true },
  { key: 'sysAdmin', label: 'Administrator', category: 'Actors & Users', noBorder: true },
  { key: 'sysRole', label: 'Role / Staff', category: 'Actors & Users', noBorder: true },

  { key: 'sysBrowser', label: 'Web Browser', category: 'Client / Presentation Layer', noBorder: true },
  { key: 'sysMobileApp', label: 'Mobile App', category: 'Client / Presentation Layer', noBorder: true },
  { key: 'sysDesktopApp', label: 'Desktop App', category: 'Client / Presentation Layer', noBorder: true },
  { key: 'sysUI', label: 'User Interface', category: 'Client / Presentation Layer', noBorder: true },

  { key: 'sysInternet', label: 'Internet', category: 'Network & Connectivity', noBorder: true },
  { key: 'sysNetwork', label: 'Network', category: 'Network & Connectivity' },
  { key: 'sysWifi', label: 'Wi-Fi', category: 'Network & Connectivity', noBorder: true },
  { key: 'sysApiGateway', label: 'API Gateway', category: 'Network & Connectivity' },
  { key: 'sysLoadBalancer', label: 'Load Balancer', category: 'Network & Connectivity' },
  { key: 'sysFirewall', label: 'Firewall', category: 'Network & Connectivity', noBorder: true },
  { key: 'sysVpn', label: 'VPN', category: 'Network & Connectivity', noBorder: true },
  { key: 'sysCdn', label: 'CDN', category: 'Network & Connectivity', noBorder: true },

  { key: 'sysAppServer', label: 'Application Server', category: 'Application / Logic Layer' },
  { key: 'sysWebServer', label: 'Web Server', category: 'Application / Logic Layer' },
  { key: 'sysApiService', label: 'API Service', category: 'Application / Logic Layer' },
  { key: 'sysMicroservice', label: 'Microservice', category: 'Application / Logic Layer' },
  { key: 'sysBusinessLogic', label: 'Business Logic', category: 'Application / Logic Layer' },
  { key: 'sysBackgroundService', label: 'Background Service', category: 'Application / Logic Layer' },
  { key: 'sysScheduler', label: 'Job / Scheduler', category: 'Application / Logic Layer', noBorder: true },
  { key: 'sysMessageQueue', label: 'Message Queue', category: 'Application / Logic Layer' },

  { key: 'sysDatabase', label: 'Database', category: 'Data Layer', noBorder: true },
  { key: 'sysRelationalDb', label: 'Relational DB', category: 'Data Layer', noBorder: true },
  { key: 'sysNoSqlDb', label: 'NoSQL Database', category: 'Data Layer', noBorder: true },
  { key: 'sysCache', label: 'Cache (Redis)', category: 'Data Layer', noBorder: true },
  { key: 'sysFileStorage', label: 'File Storage', category: 'Data Layer', noBorder: true },
  { key: 'sysCloudStorage', label: 'Cloud Storage', category: 'Data Layer', noBorder: true },
  { key: 'sysDataWarehouse', label: 'Data Warehouse', category: 'Data Layer', noBorder: true },
  { key: 'sysBackupStorage', label: 'Backup Storage', category: 'Data Layer', noBorder: true },

  { key: 'sysThirdParty', label: 'Third-Party Service', category: 'Integration / External Services' },
  { key: 'sysExternalApi', label: 'External API', category: 'Integration / External Services', noBorder: true },
  { key: 'sysPaymentGateway', label: 'Payment Gateway', category: 'Integration / External Services', noBorder: true },
  { key: 'sysEmailService', label: 'Email Service', category: 'Integration / External Services', noBorder: true },
  { key: 'sysSmsService', label: 'SMS Service', category: 'Integration / External Services', noBorder: true },
  { key: 'sysServerlessFn', label: 'Serverless Function', category: 'Integration / External Services', noBorder: true },
  { key: 'sysCloudService', label: 'Cloud Service', category: 'Integration / External Services', noBorder: true },
  { key: 'sysIntegrationPlugin', label: 'Integration / Plugin', category: 'Integration / External Services' },

  { key: 'sysServer', label: 'Server', category: 'Infrastructure / Deployment', noBorder: true },
  { key: 'sysVm', label: 'Virtual Machine', category: 'Infrastructure / Deployment', noBorder: true },
  { key: 'sysContainer', label: 'Container (Docker)', category: 'Infrastructure / Deployment', noBorder: true },
  { key: 'sysKubernetes', label: 'Kubernetes', category: 'Infrastructure / Deployment', noBorder: true },
  { key: 'sysCloudPlatform', label: 'Cloud Platform', category: 'Infrastructure / Deployment', noBorder: true },
  { key: 'sysDisk', label: 'Storage / Disk', category: 'Infrastructure / Deployment', noBorder: true },
  { key: 'sysEnvironment', label: 'Environment', category: 'Infrastructure / Deployment' },
  { key: 'sysArtifact', label: 'Artifact / Package', category: 'Infrastructure / Deployment', noBorder: true },

  { key: 'sysMonitoring', label: 'Monitoring', category: 'Monitoring & Management' },
  { key: 'sysAlerts', label: 'Alerts / Notifications', category: 'Monitoring & Management', noBorder: true },
  { key: 'sysLogging', label: 'Logging', category: 'Monitoring & Management', noBorder: true },
  { key: 'sysSecurity', label: 'Security', category: 'Monitoring & Management', noBorder: true },
  { key: 'sysPerformance', label: 'Performance', category: 'Monitoring & Management' },
  { key: 'sysConfig', label: 'Configuration', category: 'Monitoring & Management' },

  { key: 'sysStickyNote', label: 'Sticky Note', category: 'Annotations & Containers', noBorder: true },
  { key: 'sysDocument', label: 'Document', category: 'Annotations & Containers', noBorder: true },
  { key: 'sysDbNote', label: 'Database Note', category: 'Annotations & Containers', noBorder: true },
]

// Which System Architecture shapes render without the standard bordered
// card (see Shape.jsx's SystemArchNodeBody) - anything whose glyph is
// already a complete, self-contained pictorial symbol (a person, a device,
// a cylinder, a cloud, a shield, an envelope, a card, a folder, a note, a
// bell, a box, a disk...) the way the existing 'actor' shape already
// renders with no box at all. Everything left bordered is a more abstract/
// schematic representation of a concept with no obvious standalone shape
// of its own (a gear, a node graph, brackets, a gauge) - for those the
// card is what makes it read as one distinct element on the canvas rather
// than a loose mark floating in space.
export const systemArchNoBorderKeys = new Set(
  systemArchShapes.filter((shape) => shape.noBorder).map((shape) => shape.key),
)

// Folds a flat shapes array into [{ category, shapes }, ...], in first-seen
// order - used anywhere a diagram type's shapes render as more than one
// flat grid (currently just System Architecture; every other diagram type
// is small enough that its shapes array has no `category` on any entry,
// which this treats as "one untitled group," so callers can run every
// diagram type through the same rendering path without a special case for
// "does this one have categories or not").
export function groupShapesByCategory(shapes) {
  const groups = []
  const groupByCategory = new Map()
  for (const shape of shapes) {
    const category = shape.category ?? null
    let group = groupByCategory.get(category)
    if (!group) {
      group = { category, shapes: [] }
      groupByCategory.set(category, group)
      groups.push(group)
    }
    group.shapes.push(shape)
  }
  return groups
}
// Every key in systemArchShapes above that isn't reused from elsewhere
// (i.e. excludes 'actor') - Shape.jsx and ShapeIcon.jsx both check
// membership here to decide "render this through the shared System
// Architecture path" without needing a giant if/else per key.
export const systemArchOwnShapeKeys = new Set(
  systemArchShapes.map((shape) => shape.key).filter((key) => key !== 'actor'),
)

// Network Diagram notation, shown in its own "Network Diagram" section -
// same shared-rendering-path treatment as systemArchShapes above
// (Shape.jsx's NetworkNodeBody, ShapeIcon.jsx's NetworkIcon, networkIcons.jsx
// for the glyphs), including its own `category`/`noBorder` fields for the
// same reasons systemArchShapes' own comments already explain.
//
// Left out, for the same reasons as systemArchShapes' own equivalents:
//  - "Note / Text Box" / "Label" reuse textLabelTool; "Zone / Boundary" /
//    "Group" reuse the existing 'boundary' shape.
//  - "Network Topologies (Examples)" (Star/Bus/Ring/Mesh/Tree/Hybrid) - each
//    of those is a whole *composition* of several nodes and links arranged
//    a particular way, not a single placeable shape - there's nothing to
//    give one tool key.
//  - "Arrows / Connectors" (Wired/Wireless/Virtual link, Unidirectional/
//    Bidirectional/Multi-Link) describes line styles, not shapes - this is
//    what this diagram type's own arrowDefaults entry (diagramTypeGroups
//    below) and the existing solid/dotted + start/end-arrowhead controls
//    already cover, same as systemArchShapes' own connectors note.
export const networkShapes = [
  { key: 'netDesktopPc', label: 'Desktop PC', category: 'End Devices / Clients', noBorder: true },
  { key: 'netLaptop', label: 'Laptop', category: 'End Devices / Clients', noBorder: true },
  { key: 'netMobilePhone', label: 'Mobile Phone', category: 'End Devices / Clients', noBorder: true },
  { key: 'netTablet', label: 'Tablet', category: 'End Devices / Clients', noBorder: true },
  { key: 'netPrinter', label: 'Printer', category: 'End Devices / Clients', noBorder: true },
  { key: 'netIpPhone', label: 'IP Phone', category: 'End Devices / Clients', noBorder: true },
  { key: 'netCameraIp', label: 'Camera (IP)', category: 'End Devices / Clients', noBorder: true },
  { key: 'netSmartTv', label: 'Smart TV', category: 'End Devices / Clients', noBorder: true },

  { key: 'netRouter', label: 'Router', category: 'Network Devices', noBorder: true },
  { key: 'netSwitch', label: 'Switch', category: 'Network Devices', noBorder: true },
  { key: 'netWirelessRouter', label: 'Wireless Router', category: 'Network Devices', noBorder: true },
  { key: 'netAccessPoint', label: 'Access Point', category: 'Network Devices', noBorder: true },
  { key: 'netModem', label: 'Modem', category: 'Network Devices', noBorder: true },
  { key: 'netRepeater', label: 'Repeater', category: 'Network Devices', noBorder: true },
  { key: 'netHub', label: 'Hub', category: 'Network Devices', noBorder: true },
  { key: 'netBridge', label: 'Bridge', category: 'Network Devices', noBorder: true },
  { key: 'netMediaConverter', label: 'Media Converter', category: 'Network Devices', noBorder: true },

  { key: 'netFirewall', label: 'Firewall', category: 'Security Devices', noBorder: true },
  { key: 'netUtmGateway', label: 'UTM / Gateway', category: 'Security Devices', noBorder: true },
  { key: 'netIdsIps', label: 'IDS / IPS', category: 'Security Devices', noBorder: true },
  { key: 'netVpnConcentrator', label: 'VPN Concentrator', category: 'Security Devices', noBorder: true },
  { key: 'netProxyServer', label: 'Proxy Server', category: 'Security Devices', noBorder: true },
  { key: 'netWebFilter', label: 'Web Filter', category: 'Security Devices', noBorder: true },

  { key: 'netAppServer', label: 'Application Server', category: 'Servers', noBorder: true },
  { key: 'netWebServer', label: 'Web Server', category: 'Servers', noBorder: true },
  { key: 'netDbServer', label: 'Database Server', category: 'Servers', noBorder: true },
  { key: 'netMailServer', label: 'Mail Server', category: 'Servers', noBorder: true },
  { key: 'netFileServer', label: 'File Server', category: 'Servers', noBorder: true },
  { key: 'netDnsServer', label: 'DNS Server', category: 'Servers', noBorder: true },

  { key: 'netEthernetCable', label: 'Ethernet Cable (Copper)', category: 'Network Media / Connections', noBorder: true },
  { key: 'netFiberCable', label: 'Fiber Optic Cable', category: 'Network Media / Connections', noBorder: true },
  { key: 'netCoaxialCable', label: 'Coaxial Cable', category: 'Network Media / Connections', noBorder: true },
  { key: 'netConsoleCable', label: 'Console / Rollover Cable', category: 'Network Media / Connections', noBorder: true },
  { key: 'netWifiMedia', label: 'Wi-Fi (Wireless)', category: 'Network Media / Connections', noBorder: true },
  { key: 'netBluetooth', label: 'Bluetooth', category: 'Network Media / Connections', noBorder: true },
  { key: 'netCellular', label: 'Cellular / 4G / 5G', category: 'Network Media / Connections', noBorder: true },
  { key: 'netSatellite', label: 'Satellite Link', category: 'Network Media / Connections', noBorder: true },

  { key: 'netInternet', label: 'Internet', category: 'Cloud & Internet', noBorder: true },
  { key: 'netCloud', label: 'Cloud', category: 'Cloud & Internet', noBorder: true },
  { key: 'netPublicCloud', label: 'Public Cloud', category: 'Cloud & Internet', noBorder: true },
  { key: 'netPrivateCloud', label: 'Private Cloud', category: 'Cloud & Internet', noBorder: true },
  { key: 'netHybridCloud', label: 'Hybrid Cloud', category: 'Cloud & Internet', noBorder: true },
  { key: 'netSaas', label: 'SaaS / Online Service', category: 'Cloud & Internet', noBorder: true },

  { key: 'netServerRack', label: 'Server Rack / Cabinet', category: 'Rack & Physical Infrastructure', noBorder: true },
  { key: 'netPatchPanel', label: 'Patch Panel', category: 'Rack & Physical Infrastructure', noBorder: true },
  { key: 'netCableOrganizer', label: 'Cable Organizer', category: 'Rack & Physical Infrastructure', noBorder: true },
  { key: 'netPdu', label: 'PDU (Power Distribution Unit)', category: 'Rack & Physical Infrastructure', noBorder: true },
  { key: 'netUps', label: 'UPS (Uninterruptible Power Supply)', category: 'Rack & Physical Infrastructure', noBorder: true },
  { key: 'netRackShelf', label: 'Network Rack Shelf', category: 'Rack & Physical Infrastructure', noBorder: true },
  { key: 'netKvmSwitch', label: 'KVM Switch', category: 'Rack & Physical Infrastructure', noBorder: true },
  { key: 'netCoolingFan', label: 'Cooling Fan / Ventilation', category: 'Rack & Physical Infrastructure', noBorder: true },

  { key: 'netVm', label: 'Virtual Machine (VM)', category: 'Virtualization & Containers', noBorder: true },
  { key: 'netHypervisor', label: 'Hypervisor', category: 'Virtualization & Containers', noBorder: true },
  { key: 'netDockerContainer', label: 'Docker Container', category: 'Virtualization & Containers', noBorder: true },
  { key: 'netKubernetes', label: 'Kubernetes', category: 'Virtualization & Containers', noBorder: true },
  { key: 'netVirtualNetwork', label: 'Virtual Network', category: 'Virtualization & Containers' },
  { key: 'netVlan', label: 'VLAN', category: 'Virtualization & Containers' },

  { key: 'netStickyNote', label: 'Sticky Note', category: 'Documentation & Annotations', noBorder: true },
  { key: 'netCallout', label: 'Callout', category: 'Documentation & Annotations', noBorder: true },
]

export const networkOwnShapeKeys = new Set(networkShapes.map((shape) => shape.key))
export const networkNoBorderKeys = new Set(
  networkShapes.filter((shape) => shape.noBorder).map((shape) => shape.key),
)

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
// `arrowDefaults` is each notation's own conventional connector look
// (straight association lines for UML, crow's-foot for ERD, orthogonal
// "shape" routing for DFD/Flowchart/System Architecture's boxy connections,
// plain wired links for Network) - EditorSidebar's chooseDiagramType
// applies it (SET_ARROW_CONNECTOR_TYPE) every time the active diagram type
// changes, the same way switching notations resets which tool is armed.
export const diagramTypeGroups = [
  {
    key: 'dfd',
    label: 'Data Flow Diagram',
    shapes: dfdShapes,
    iconKey: 'entity',
    arrowDefaults: { connectorType: 'shape', lineStyle: 'solid' },
  },
  {
    key: 'flowchart',
    label: 'Flowchart',
    shapes: flowchartShapes,
    iconKey: 'decision',
    arrowDefaults: { connectorType: 'shape', lineStyle: 'solid' },
  },
  {
    key: 'usecase',
    label: 'Use Case Diagram',
    shapes: usecaseShapes,
    iconKey: 'actor',
    arrowDefaults: { connectorType: 'straight', lineStyle: 'solid' },
  },
  {
    key: 'uml',
    label: 'UML Diagram',
    shapes: umlShapes,
    iconKey: 'umlClass',
    arrowDefaults: { connectorType: 'straight', lineStyle: 'solid' },
  },
  {
    key: 'erd',
    label: 'ERD Diagram',
    shapes: erdShapes,
    iconKey: 'erdTable',
    arrowDefaults: { connectorType: 'erd', lineStyle: 'solid' },
  },
  {
    key: 'sysArch',
    label: 'System Architecture Diagram',
    shapes: systemArchShapes,
    iconKey: 'sysCloudPlatform',
    arrowDefaults: { connectorType: 'shape', lineStyle: 'solid' },
  },
  {
    key: 'network',
    label: 'Network Diagram',
    shapes: networkShapes,
    iconKey: 'netRouter',
    // "Wired Connection" - the network legend's own default/most-common
    // link type; Wireless/Virtual are still one click away from the
    // existing Dotted Line submenu, same as every other diagram type's
    // alternate line styles.
    arrowDefaults: { connectorType: 'straight', lineStyle: 'solid' },
  },
]

// Every shape reachable from anywhere a shape can be picked - the toolbox
// dropdown (basicShapes) plus the sidebar's own DFD/Flowchart/Use Case/UML
// sections - so the Shapes button still highlights as active no matter
// which group a placed shape's tool key belongs to.
export const shapeToolKeys = new Set(
  [
    ...dfdShapes,
    ...flowchartShapes,
    ...usecaseShapes,
    ...umlShapes,
    ...erdShapes,
    ...systemArchShapes,
    ...networkShapes,
    ...basicShapes,
  ].map((shape) => shape.key),
)

// Every tool key that actually places a shape on click (shapeToolKeys plus
// the text label tool, which lives outside those sections) mapped to its
// display label - what FloatingShapePreview shows next to the ghost icon
// while that tool is armed.
export const PLACEABLE_SHAPE_LABEL_BY_KEY = Object.fromEntries(
  [
    ...dfdShapes,
    ...flowchartShapes,
    ...usecaseShapes,
    ...umlShapes,
    ...erdShapes,
    ...systemArchShapes,
    ...networkShapes,
    ...basicShapes,
    textLabelTool,
  ].map((shape) => [shape.key, shape.label]),
)
