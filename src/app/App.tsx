import { BrowserRouter, Route, Routes } from 'react-router'

function Inicio() {
  return (
    <main>
      <h1>La Isla</h1>
    </main>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
      </Routes>
    </BrowserRouter>
  )
}
