import { useLayoutEffect } from "react";
import rough from 'roughjs/bundled/rough.esm';

const generator = rough.generator()

function App() {

  useLayoutEffect(() => {
    const canvas = document.getElementById("canvas")
    const ctx = canvas.getContext('2d')

    const roughCanvas = rough.canvas(canvas)
    const rect = generator.rectangle(10, 20, 100,200)
    const line = generator.line(10, 10, 100, 200)
    roughCanvas.draw(rect)
    roughCanvas.draw(line)
  })

  return (
    <canvas 
      id="canvas"
      width={window.innerWidth}
      height={window.innerHeight}
    >
      Canvas
    </canvas>
  );
}

export default App;
