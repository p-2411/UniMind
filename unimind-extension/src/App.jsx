import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import BlockPage from './block-page/BlockPage'

function App() {
  const [count, setCount] = useState(0)

  return (
    <BlockPage/>
  )
}

export default App
