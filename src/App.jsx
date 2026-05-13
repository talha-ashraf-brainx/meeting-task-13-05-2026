import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import EditorPage from './pages/EditorPage.jsx'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
