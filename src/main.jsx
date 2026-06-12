import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './style.css'
import './buttons.css'
import App from './app.jsx'
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById('app')).render(
  <StrictMode>
      <BrowserRouter>
          <App />
          <Toaster position="bottom-right" />
      </BrowserRouter>
  </StrictMode>,
)

