import { useState } from "react"
import "./App.css"
import Auth from "./components/Auth"
import Dashboard from "./components/Dashboard"

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  return (
    <div className="container">
      <h1 className="title">Legal Compliance Research Assistant</h1>

      {isLoggedIn ? (
        <Dashboard />
      ) : (
        <Auth onLoginSuccess={() => setIsLoggedIn(true)} />
      )}
    </div>
  )
}

export default App