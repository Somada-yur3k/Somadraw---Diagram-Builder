// Same shape as systemArchIcons.jsx (see that file's own header comment for
// the full reasoning: one glyph per element, shared by ShapeIcon.jsx and
// Shape.jsx, abstract/geometric rather than literal brand marks) - kept as
// its own file/lookup rather than merged into that one so Network
// Diagram's ~59 shapes don't bloat System Architecture's own module, even
// though the two catalogs share some real-world concepts (firewall, cloud,
// VM, container...) and therefore some visually-similar glyphs.
const NETWORK_ICONS = {
  // End Devices / Clients
  netDesktopPc: (
    <>
      <rect x="4" y="4" width="16" height="12" rx="1.5" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="16" x2="12" y2="20" />
    </>
  ),
  netLaptop: (
    <>
      <rect x="5" y="4" width="14" height="10" rx="1.2" />
      <path d="M3 19h18l-2-3.5H5L3 19Z" />
    </>
  ),
  netMobilePhone: (
    <>
      <rect x="8" y="2" width="8" height="20" rx="2" />
      <line x1="10.5" y1="18" x2="13.5" y2="18" />
    </>
  ),
  netTablet: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.8" />
      <line x1="12" y1="17.5" x2="12" y2="17.5" />
    </>
  ),
  netPrinter: (
    <>
      <path d="M6 8V4h12v4" />
      <rect x="3" y="8" width="18" height="8" rx="1.2" />
      <path d="M6 14h12v6H6v-6Z" />
    </>
  ),
  netIpPhone: (
    <>
      <path d="M5 4h6l1.5 4-2 1.5a10 10 0 0 0 5 5l1.5-2 4 1.5v6a1 1 0 0 1-1 1C11 21 3 13 4 5a1 1 0 0 1 1-1Z" />
    </>
  ),
  netCameraIp: (
    <>
      <rect x="2" y="8" width="14" height="9" rx="2" />
      <path d="M16 10.5 22 8v9l-6-2.5" />
      <circle cx="7" cy="12.5" r="2" />
    </>
  ),
  netSmartTv: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="1.5" />
      <path d="M8 21l4-4 4 4" />
    </>
  ),

  // Network Devices
  netRouter: (
    <>
      <rect x="3" y="10" width="18" height="7" rx="1.5" />
      <path d="M7 10V7a2 2 0 0 1 2-2M17 10V7a2 2 0 0 0-2-2" />
      <circle cx="7" cy="13.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="11" cy="13.5" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  netSwitch: (
    <>
      <rect x="3" y="9" width="18" height="7" rx="1.2" />
      <line x1="6" y1="12.5" x2="6" y2="12.5" />
      <line x1="6" y1="9" x2="6" y2="16" strokeDasharray="0.1 3" />
      <line x1="10" y1="9" x2="10" y2="16" strokeDasharray="0.1 3" />
      <line x1="14" y1="9" x2="14" y2="16" strokeDasharray="0.1 3" />
      <line x1="18" y1="9" x2="18" y2="16" strokeDasharray="0.1 3" />
    </>
  ),
  netWirelessRouter: (
    <>
      <rect x="4" y="12" width="16" height="7" rx="1.5" />
      <path d="M9 12l-1-5M15 12l1-5" />
      <path d="M8 5a4 4 0 0 1 8 0" />
    </>
  ),
  netAccessPoint: (
    <>
      <ellipse cx="12" cy="18" rx="8" ry="2.5" />
      <path d="M8 14a5.7 5.7 0 0 1 8 0" />
      <path d="M10 11.5a2.6 2.6 0 0 1 4 0" />
      <circle cx="12" cy="18" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  netModem: (
    <>
      <rect x="4" y="7" width="16" height="10" rx="1.5" />
      <circle cx="8" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  netRepeater: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M5 12a7 7 0 0 1 3-5.7M19 12a7 7 0 0 1-3 5.7" />
      <path d="M2 12a10 10 0 0 1 5-8.7M22 12a10 10 0 0 1-5 8.7" />
    </>
  ),
  netHub: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 9V4M12 15v5M9 12H4M15 12h5" />
    </>
  ),
  netBridge: (
    <>
      <rect x="3" y="10" width="7" height="6" rx="1" />
      <rect x="14" y="10" width="7" height="6" rx="1" />
      <line x1="10" y1="13" x2="14" y2="13" />
    </>
  ),
  netMediaConverter: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="1.2" />
      <line x1="12" y1="8" x2="12" y2="16" strokeDasharray="2 2" />
      <circle cx="7" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="17" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),

  // Security Devices
  netFirewall: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <line x1="3" y1="10.5" x2="21" y2="10.5" />
      <line x1="3" y1="16" x2="21" y2="16" />
      <line x1="9" y1="4" x2="9" y2="10.5" />
      <line x1="15" y1="10.5" x2="15" y2="16" />
    </>
  ),
  netUtmGateway: (
    <>
      <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  netIdsIps: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4-4" />
      <path d="M9 9l4 4M13 9l-4 4" />
    </>
  ),
  netVpnConcentrator: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9.5" y="10" width="5" height="4" rx="0.8" />
      <path d="M10.5 10V8.5a1.5 1.5 0 0 1 3 0V10" />
    </>
  ),
  netProxyServer: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <line x1="4" y1="9" x2="20" y2="9" />
      <path d="M9 14l2-2 2 2 2-2" />
    </>
  ),
  netWebFilter: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <path d="m16 16 4 4" />
    </>
  ),

  // Servers
  netAppServer: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <circle cx="8" cy="6" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  netWebServer: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <line x1="4" y1="9" x2="20" y2="9" />
      <circle cx="12" cy="15" r="3" />
    </>
  ),
  netDbServer: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <line x1="4" y1="9" x2="20" y2="9" />
      <ellipse cx="12" cy="13" rx="4" ry="1.6" />
      <path d="M8 13v3.5c0 .9 1.8 1.6 4 1.6s4-.7 4-1.6V13" />
    </>
  ),
  netMailServer: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <line x1="4" y1="9" x2="20" y2="9" />
      <path d="M7 12h10v5H7v-5Z" />
      <path d="m7 12 5 3.3L17 12" />
    </>
  ),
  netFileServer: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <line x1="4" y1="9" x2="20" y2="9" />
      <path d="M8 12a1 1 0 0 1 1-1h3l1 1.5h3a1 1 0 0 1 1 1V17H8v-5Z" />
    </>
  ),
  netDnsServer: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <line x1="4" y1="9" x2="20" y2="9" />
      <circle cx="12" cy="14.5" r="3.5" />
      <path d="M12 11v7M8.7 14.5h6.6" />
    </>
  ),

  // Network Media / Connections
  netEthernetCable: (
    <>
      <path d="M4 20 16 8" />
      <path d="M14 4h6v6" />
      <path d="M14 10l-2-2M17 7l-2-2" />
    </>
  ),
  netFiberCable: (
    <>
      <path d="M3 20 15 8" strokeDasharray="1 2.6" />
      <path d="M13 4h7v7" />
    </>
  ),
  netCoaxialCable: (
    <>
      <circle cx="7" cy="17" r="4" />
      <circle cx="7" cy="17" r="1.3" fill="currentColor" stroke="none" />
      <path d="M10 14 20 4" />
    </>
  ),
  netConsoleCable: (
    <>
      <rect x="3" y="9" width="7" height="6" rx="1" />
      <path d="M10 12h4" />
      <path d="M14 9v6l4-3-4-3Z" />
    </>
  ),
  netWifiMedia: (
    <>
      <path d="M4.5 9a11 11 0 0 1 15 0" />
      <path d="M7.8 12.8a6.5 6.5 0 0 1 8.4 0" />
      <circle cx="12" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  netBluetooth: <path d="M7 7l10 10-5 4V3l5 4L7 17" />,
  netCellular: (
    <>
      <line x1="5" y1="19" x2="5" y2="14" />
      <line x1="10" y1="19" x2="10" y2="10" />
      <line x1="15" y1="19" x2="15" y2="6" />
      <path d="M18.5 5.5a8 8 0 0 1 0 5" />
    </>
  ),
  netSatellite: (
    <>
      <path d="M4 20c4-4 4-10 0-14" />
      <path d="M9 15l-4-4 3-3 4 4" />
      <rect x="13.5" y="2.5" width="4" height="4" rx="0.5" transform="rotate(45 15.5 4.5)" />
      <path d="M18 7l3-3" />
    </>
  ),

  // Cloud & Internet
  netInternet: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </>
  ),
  netCloud: <path d="M7 18a4 4 0 0 1-1-7.9A5 5 0 0 1 16 8a4.5 4.5 0 0 1 1 8.9H7Z" />,
  netPublicCloud: (
    <>
      <path d="M6 17a3.7 3.7 0 0 1-1-7.3A4.6 4.6 0 0 1 14 7a4.1 4.1 0 0 1 1 8H6Z" />
      <circle cx="15.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  netPrivateCloud: (
    <>
      <path d="M7 18a4 4 0 0 1-1-7.9A5 5 0 0 1 16 8a4.5 4.5 0 0 1 1 8.9H7Z" />
      <rect x="10" y="12" width="4" height="3.2" rx="0.6" />
      <path d="M10.8 12V10.8a1.2 1.2 0 0 1 2.4 0V12" />
    </>
  ),
  netHybridCloud: (
    <>
      <path d="M5 16a3.2 3.2 0 0 1-.8-6.3A4 4 0 0 1 12 8" />
      <path d="M12 8a4 4 0 0 1 6.8 3 3.2 3.2 0 0 1-.8 5H8" />
      <path d="M9 16v3M13 16v3" />
    </>
  ),
  netSaas: (
    <>
      <path d="M7 15a4 4 0 0 1-1-7.9A5 5 0 0 1 16 5a4.5 4.5 0 0 1 1 8.9H7Z" />
      <rect x="8" y="17" width="8" height="4.5" rx="1" />
    </>
  ),

  // Rack & Physical Infrastructure
  netServerRack: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="1" />
      <line x1="5" y1="7" x2="19" y2="7" />
      <line x1="5" y1="12" x2="19" y2="12" />
      <line x1="5" y1="17" x2="19" y2="17" />
    </>
  ),
  netPatchPanel: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="1" />
      <path d="M6 8v-1.5M9 8v-1.5M12 8v-1.5M15 8v-1.5M18 8v-1.5" />
    </>
  ),
  netCableOrganizer: (
    <>
      <rect x="3" y="9" width="18" height="6" rx="1" />
      <circle cx="6.5" cy="12" r="1.1" />
      <circle cx="12" cy="12" r="1.1" />
      <circle cx="17.5" cy="12" r="1.1" />
    </>
  ),
  netPdu: (
    <>
      <rect x="9" y="2" width="6" height="20" rx="1.2" />
      <circle cx="12" cy="6.5" r="1" />
      <circle cx="12" cy="10.5" r="1" />
      <circle cx="12" cy="14.5" r="1" />
      <circle cx="12" cy="18.5" r="1" />
    </>
  ),
  netUps: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M13 7 9 13h3l-1 4 4-6h-3l1-4Z" />
    </>
  ),
  netRackShelf: (
    <>
      <rect x="3" y="9" width="18" height="4" rx="0.8" />
      <path d="M5 13v3M19 13v3" />
    </>
  ),
  netKvmSwitch: (
    <>
      <rect x="3" y="10" width="18" height="6" rx="1.2" />
      <path d="M7 10V8a1 1 0 0 1 1-1h1M13 10V8a1 1 0 0 1 1-1h1M12 16v3" />
    </>
  ),
  netCoolingFan: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 12c0-3 2-5 4-5s2 3 0 5-4 0-4 0Z" />
      <path d="M12 12c0 3-2 5-4 5s-2-3 0-5 4 0 4 0Z" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),

  // Virtualization & Containers
  netVm: (
    <>
      <path d="M12 2 5 6v8l7 4 7-4V6l-7-4Z" />
      <path d="M5 6l7 4 7-4" />
      <path d="M12 10v8" />
    </>
  ),
  netHypervisor: (
    <>
      <rect x="3" y="14" width="18" height="6" rx="1" />
      <rect x="6" y="4" width="5" height="6" rx="0.8" />
      <rect x="13" y="4" width="5" height="6" rx="0.8" />
      <path d="M8.5 10v4M15.5 10v4" />
    </>
  ),
  netDockerContainer: (
    <>
      <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
      <path d="M4 7l8 4 8-4M12 11v10" />
    </>
  ),
  netKubernetes: (
    <>
      <path d="M12 2 21 7v10l-9 5-9-5V7l9-5Z" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  netVirtualNetwork: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <circle cx="12" cy="18" r="2.2" />
      <path d="M8 7.6l3 8.6M16 7.6l-3 8.6M8.2 6h7.6" strokeDasharray="2 2" />
    </>
  ),
  netVlan: (
    <>
      <rect x="3" y="7" width="18" height="10" rx="1.5" strokeDasharray="2.5 2" />
      <line x1="3" y1="12" x2="21" y2="12" strokeDasharray="2.5 2" />
    </>
  ),

  // Documentation & Containers (Zone/Boundary/Group reuses the existing
  // System Boundary shape - see shapeCatalog.js's own comment)
  netStickyNote: (
    <>
      <path d="M4 4h13l3 3v13H4V4Z" />
      <path d="M17 4v3h3" />
    </>
  ),
  netCallout: (
    <>
      <path d="M4 4h16v9H10l-4 4v-4H4V4Z" />
      <line x1="8" y1="8" x2="16" y2="8" />
    </>
  ),
}

export function NetworkIcon({ type, size = 16, strokeWidth = 1.8, className = 'shrink-0' }) {
  const glyph = NETWORK_ICONS[type]
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
