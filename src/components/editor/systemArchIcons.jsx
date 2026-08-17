// One glyph per System Architecture Diagram element (see shapeCatalog.js's
// own systemArchShapes) - kept as a single lookup table, shared by
// ShapeIcon.jsx (the sidebar/picker tile) and Shape.jsx (the actual canvas
// node), so each of these ~55 icons only ever gets drawn once. Every glyph
// is the *inner* content of a 24x24 viewBox svg (no outer <svg>/stroke/fill
// attributes of its own) - callers wrap it in their own sized <svg
// stroke="currentColor"> the same way every other icon in this app already
// does, so a glyph automatically follows whatever color/size context it's
// dropped into.
//
// Deliberately abstract/geometric rather than literal brand marks (no
// Kubernetes helm wheel, no Docker whale, no AWS/GCP/Azure logos) - a
// general diagramming tool shouldn't bake in one vendor's trademarked icon
// as "the" symbol for a generic concept like "container" or "cloud
// platform," and every glyph here still reads fine next to its own label
// (which is always shown, in both the tile grid and the sidebar tooltip -
// the icon is a quick visual anchor, not the primary identifier).
const SYSTEM_ARCH_ICONS = {
  // Actors / Users ('actor' itself is reused from usecaseShapes - see
  // shapeCatalog.js's own comment on why that one entry isn't duplicated
  // here.)
  sysExternalUsers: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  sysAdmin: (
    <>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M4 20c0-3.8 2.7-6.5 6-6.5s6 2.7 6 6.5" />
      <rect x="15" y="15" width="6" height="5" rx="1" />
      <path d="M16.5 17.3l1 1 1.8-1.8" />
    </>
  ),
  sysRole: (
    <>
      <circle cx="9" cy="7" r="3.5" />
      <path d="M3 20c0-3.8 2.7-6.5 6-6.5s6 2.7 6 6.5" />
      <rect x="15" y="4" width="6" height="8" rx="1" />
      <line x1="17" y1="7" x2="19" y2="7" />
      <line x1="17" y1="9.5" x2="19" y2="9.5" />
    </>
  ),

  // Client / Presentation Layer
  sysBrowser: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <line x1="3" y1="9" x2="21" y2="9" />
    </>
  ),
  sysMobileApp: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <line x1="10" y1="18" x2="14" y2="18" />
    </>
  ),
  sysDesktopApp: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <line x1="8" y1="20" x2="16" y2="20" />
      <line x1="12" y1="16" x2="12" y2="20" />
    </>
  ),
  sysUI: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <line x1="7" y1="8.5" x2="17" y2="8.5" />
      <line x1="7" y1="12" x2="14" y2="12" />
      <line x1="7" y1="15.5" x2="12" y2="15.5" />
    </>
  ),

  // Network & Connectivity
  sysInternet: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </>
  ),
  sysNetwork: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <circle cx="12" cy="18" r="2.2" />
      <path d="M8 7.6l3 8.6M16 7.6l-3 8.6M8.2 6h7.6" />
    </>
  ),
  sysWifi: (
    <>
      <path d="M4.5 9a11 11 0 0 1 15 0" />
      <path d="M7.8 12.8a6.5 6.5 0 0 1 8.4 0" />
      <circle cx="12" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  sysApiGateway: (
    <>
      <rect x="7" y="5" width="10" height="14" rx="1.5" />
      <path d="M2 12h5M17 12h5" />
    </>
  ),
  sysLoadBalancer: (
    <>
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <path d="M12 7v4M12 11 5 17M12 11l7 6" />
    </>
  ),
  sysFirewall: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <line x1="3" y1="10.5" x2="21" y2="10.5" />
      <line x1="3" y1="16" x2="21" y2="16" />
      <line x1="9" y1="4" x2="9" y2="10.5" />
      <line x1="15" y1="10.5" x2="15" y2="16" />
    </>
  ),
  sysVpn: (
    <>
      <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3Z" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  sysCdn: (
    <>
      <path d="M7 15a4 4 0 0 1-1-7.9A5 5 0 0 1 16 6a4.5 4.5 0 0 1 1 8.9" />
      <path d="M8 18v3M12 18v3M16 18v3" />
    </>
  ),

  // Application / Logic Layer
  sysAppServer: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <circle cx="8" cy="6" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  sysWebServer: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <line x1="4" y1="9" x2="20" y2="9" />
      <circle cx="12" cy="15" r="3" />
    </>
  ),
  sysApiService: <path d="M8 7 3 12l5 5M16 7l5 5-5 5" />,
  sysMicroservice: (
    <>
      <rect x="9" y="2.5" width="6" height="6" rx="1.2" />
      <rect x="2" y="14.5" width="6" height="6" rx="1.2" />
      <rect x="16" y="14.5" width="6" height="6" rx="1.2" />
      <path d="M12 8.5v3.5M9 15l3-3M15 15l-3-3" />
    </>
  ),
  sysBusinessLogic: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </>
  ),
  sysBackgroundService: (
    <>
      <path d="M4 12a8 8 0 0 1 14-5.3L20 8" />
      <path d="M20 4v4h-4" />
      <path d="M20 12a8 8 0 0 1-14 5.3L4 16" />
      <path d="M4 20v-4h4" />
    </>
  ),
  sysScheduler: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  sysMessageQueue: (
    <>
      <rect x="3" y="5" width="18" height="4" rx="1" />
      <rect x="3" y="11" width="18" height="4" rx="1" />
      <rect x="3" y="17" width="12" height="4" rx="1" />
    </>
  ),

  // Data Layer
  sysDatabase: (
    <>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </>
  ),
  sysRelationalDb: (
    <>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </>
  ),
  sysNoSqlDb: (
    <>
      <path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z" />
      <path d="M3 12l9 4.5 9-4.5" />
      <path d="M3 16.5 12 21l9-4.5" />
    </>
  ),
  sysCache: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M13 7l-5 6h4l-1 5 5-6h-4l1-5Z" />
    </>
  ),
  sysFileStorage: <path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z" />,
  sysCloudStorage: (
    <>
      <path d="M7 18a4 4 0 0 1-1-7.9A5 5 0 0 1 16 8a4.5 4.5 0 0 1 1 8.9H7Z" />
      <path d="M12 16v-5" />
      <path d="M9.5 13.5 12 11l2.5 2.5" />
    </>
  ),
  sysDataWarehouse: (
    <>
      <rect x="6" y="8" width="12" height="13" rx="1" />
      <path d="M6 8a6 6 0 0 1 12 0" />
      <line x1="9" y1="12" x2="9" y2="17" />
      <line x1="15" y1="12" x2="15" y2="17" />
    </>
  ),
  sysBackupStorage: (
    <>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <path d="M9 12.5l2 2 4-4" />
    </>
  ),

  // Integration / External Services
  sysThirdParty: (
    <>
      <path d="M6 7h12v4a6 6 0 0 1-12 0V7Z" />
      <path d="M9 3v4M15 3v4M12 17v4" />
    </>
  ),
  sysExternalApi: (
    <>
      <circle cx="10" cy="12" r="7" />
      <path d="M10 5a7 7 0 0 0 0 14M10 5a7 7 0 0 1 0 14M3 12h14" />
      <path d="M16 9l4 3-4 3" />
    </>
  ),
  sysPaymentGateway: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="6" y1="14.5" x2="10" y2="14.5" />
    </>
  ),
  sysEmailService: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="m3 6.5 9 6.5 9-6.5" />
    </>
  ),
  sysSmsService: (
    <>
      <path d="M4 4h16v12H9l-5 4V4Z" />
      <circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  sysServerlessFn: <path d="M13 2 5 13h5l-1 9 8-11h-5l1-9Z" />,
  sysCloudService: <path d="M7 18a4 4 0 0 1-1-7.9A5 5 0 0 1 16 8a4.5 4.5 0 0 1 1 8.9H7Z" />,
  sysIntegrationPlugin: (
    <>
      <path d="M5 7h14v3a7 7 0 0 1-14 0V7Z" />
      <path d="M9 2v5M15 2v5M12 17v5" />
    </>
  ),

  // Infrastructure / Deployment
  sysServer: (
    <>
      <rect x="4" y="3" width="16" height="8" rx="1.5" />
      <rect x="4" y="13" width="16" height="8" rx="1.5" />
      <circle cx="8" cy="7" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="8" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  sysVm: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <line x1="8" y1="20" x2="16" y2="20" />
      <line x1="12" y1="16" x2="12" y2="20" />
      <circle cx="16.5" cy="8.5" r="2" />
    </>
  ),
  sysContainer: (
    <>
      <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
      <path d="M4 7l8 4 8-4M12 11v10" />
    </>
  ),
  sysKubernetes: (
    <>
      <path d="M12 2 21 7v10l-9 5-9-5V7l9-5Z" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  sysCloudPlatform: (
    <>
      <path d="M7 14a4 4 0 0 1-1-7.9A5 5 0 0 1 16 4a4.5 4.5 0 0 1 1 8.9H7Z" />
      <rect x="8" y="16" width="8" height="4.5" rx="1" />
    </>
  ),
  sysDisk: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <line x1="12" y1="3" x2="12" y2="6" />
    </>
  ),
  sysEnvironment: (
    <>
      <rect x="5" y="4" width="14" height="4" rx="1" />
      <rect x="5" y="10" width="14" height="4" rx="1" />
      <rect x="5" y="16" width="14" height="4" rx="1" />
    </>
  ),
  sysArtifact: (
    <>
      <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" />
      <path d="M4 7.5 12 12l8-4.5M12 12v9" />
    </>
  ),

  // Monitoring & Management
  sysMonitoring: (
    <>
      <path d="M4 19h16" />
      <path d="M6 15l3-4 3 3 6-8" />
    </>
  ),
  sysAlerts: (
    <>
      <path d="M6 10a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  sysLogging: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="13" y2="16" />
    </>
  ),
  sysSecurity: <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3Z" />,
  sysPerformance: (
    <>
      <path d="M4 16a8 8 0 0 1 16 0" />
      <path d="M12 16l4-5" />
      <circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  sysConfig: (
    <>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="9" cy="6" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="8" cy="18" r="1.8" fill="currentColor" stroke="none" />
    </>
  ),

  // Annotations & Containers (Note/Text Box reuses textLabelTool, Container/
  // Group and Zone/Boundary reuse the existing System Boundary shape - see
  // shapeCatalog.js's own comment)
  sysStickyNote: (
    <>
      <path d="M4 4h13l3 3v13H4V4Z" />
      <path d="M17 4v3h3" />
    </>
  ),
  sysDocument: (
    <>
      <path d="M6 3h9l3 3v15H6V3Z" />
      <path d="M15 3v3h3" />
      <line x1="9" y1="11" x2="15" y2="11" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </>
  ),
  sysDbNote: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="2.5" />
      <path d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6" />
      <line x1="8" y1="18" x2="16" y2="18" />
    </>
  ),
}

// Wraps a glyph in a properly sized/colored <svg> - the same shape every
// other icon component in this file already takes (width/height/viewBox/
// stroke setup), just parameterized by lookup key instead of one `if` per
// type.
export function SystemArchIcon({ type, size = 16, strokeWidth = 1.8, className = 'shrink-0' }) {
  const glyph = SYSTEM_ARCH_ICONS[type]
  if (!glyph) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {glyph}
    </svg>
  )
}
