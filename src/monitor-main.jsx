import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import MonitorPage from './components/MonitorPage.jsx'

// Own entry point, own bundle, own <html> document (monitor.html) - this
// intentionally never imports App.jsx or main.jsx's <BrowserRouter>.
// MonitorPage.jsx does its own auth check rather than relying on
// App.jsx/Dashboard.jsx's, since neither of those ever run here.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MonitorPage />
  </StrictMode>,
)
