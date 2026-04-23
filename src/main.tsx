import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { addCollection } from '@iconify/react'
import mingcuteData from '@iconify-json/mingcute/icons.json'
import './index.css'
import App from './App.tsx'

// Load MingCute icon set offline — no CDN requests
addCollection(mingcuteData as Parameters<typeof addCollection>[0])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
