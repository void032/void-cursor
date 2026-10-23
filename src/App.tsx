import './App.css'
import { VoidCursor } from './index'

function App() {
  return (
    <>
      <VoidCursor hideNativeCursor />
      <main className="playground">
        <header className="playground__header">
          <span className="playground__brand">VOID / CURSOR</span>
          <span className="playground__status">DEVELOPMENT PLAYGROUND</span>
        </header>
        <section className="playground__content">
          <span className="playground__eyebrow">INTERACTION EXPERIMENT 001</span>
          <h1>Follow the<br /><span>movement.</span></h1>
          <p>A custom cursor experiment.<br />Move your pointer around and explore.</p>
          <button type="button" className="playground__button" data-void-cursor="hover">
            Test interaction <span>↗</span>
          </button>
        </section>
        <footer className="playground__footer">
          <span>VOID CURSOR LAB</span>
          <span>REACT · TYPESCRIPT</span>
        </footer>
      </main>
    </>
  )
}

export default App
