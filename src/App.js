import { useLayoutEffect } from "react";
import rough from 'roughjs/bundled/rough.esm';

function App() {

  useLayoutEffect(() => {
    const canvas = document.getElementById("canvas")
    const ctx = canvas.getContext('2d')

    const roughCanvas = rough.canvas(canvas)
    roughCanvas.rectangle(10, 20, 100,200)
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
