import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { initErrorTracking } from './utils/errorTracking'
import { initWebVitals } from './utils/performance'

// Initialize error tracking and performance monitoring
initErrorTracking();
initWebVitals();

console.log('Writers Voice Version: Build 2026-02-03');

// Writers Voice - Voice Journey Application
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
