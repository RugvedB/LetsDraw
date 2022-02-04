import { useLayoutEffect, useState } from "react";
import rough from 'roughjs/bundled/rough.esm';

const generator = rough.generator()

function createElement(id, x1, y1, x2, y2, type) {
  switch(type) {
    case "line":
      var roughElement = generator.line(x1, y1, x2, y2)
      return { id, x1, y1, x2, y2, roughElement, type }
    case "rectangle":
      var roughElement = generator.rectangle(x1, y1, x2-x1, y2-y1)
      return { id, x1, y1, x2, y2, roughElement, type }
    default:
      return null
  
  }
}

const isWithinElement = (x, y, element) => {
  const { x1, x2, y1, y2, type } = element
  
  switch(type) {
    case "rectangle":
      console.log("rectangle for selection")
      const minX = Math.min(x1, x2)
      const maxX = Math.max(x1, x2)
      const minY = Math.min(y1, y2)
      const maxY = Math.max(y1, y2)
      console.log(x,y)
      console.log(minX,minY,maxX,maxY)
      console.log(x >= minX && x <= maxX && y >= minY && y <= maxY)
      return x >= minX && x <= maxX && y >= minY && y <= maxY
    case "line":
      console.log("line for selection")
      const a = { x: x1, y: y1 }
      const b = { x: x2, y: y2 }
      const c = { x: x, y: y }
      const offset = distance(a, b) - (distance(a, c) + distance(b, c))
      console.log("abc offset")
      return Math.abs(offset) < 1
  }
}

function distance(a, b){
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)) 
}

function getElementAtPosition(x, y, elements) {
  return elements.find(element => isWithinElement(x, y, element))
}

function App() {
  const [elements, setElements] = useState([])
  const [action, setAction] = useState('none')
  const [tool, setTool] = useState(null)
  const [selectedElement, setSelectedElement] = useState(null)

  useLayoutEffect(() => {
    const canvas = document.getElementById("canvas")
    const context = canvas.getContext('2d')
    context.clearRect(0, 0, canvas.width, canvas.height)

    const roughCanvas = rough.canvas(canvas)
    elements.forEach(element => {
      roughCanvas.draw(element.roughElement)
    })

  },[elements])

  const handleMouseDown = (event) => {
    const { clientX, clientY } = event

    if(tool === "selection"){
      const element = getElementAtPosition(clientX, clientY, elements)
      console.log("element at selection is: ")
      console.log(element)
      if(element) {
        const offsetX = clientX - element.x1
        const offsetY = clientY - element.y1
        setAction("moving")
        setSelectedElement({...element, offsetX, offsetY})
      }
    }
    else{
      const id = elements.length
      const element = createElement(id, clientX, clientY, clientX, clientY, tool)
      setElements(prevState => [...prevState, element])
      setAction("drawing")

    }
  }

  const updateElement = (id, x1, y1, x2, y2, type) => {
    const updatedElement = createElement(id, x1, y1, x2, y2, type)
  
    const elementsCopy = [...elements]
    elementsCopy[id] = updatedElement
    setElements(elementsCopy)
  }

  const handleMouseMove = (event) => {
    const { clientX, clientY } = event

    if(tool === "selection"){
      event.target.style.cursor = getElementAtPosition(clientX, clientY, elements) ? "move" : "default"
    }
    
    if(action === "drawing"){
      const index = elements.length - 1
      const { x1, y1, type } = elements[index]
      updateElement(index, x1, y1, clientX, clientY, type)
    }
    else if(action === "moving"){
      console.log('lets move')
      console.log(selectedElement)
      const { id, x1, y1, x2, y2, type, offsetX, offsetY } = selectedElement
      const width = x2 - x1
      const height = y2 - y1
      const newX1 = clientX - offsetX
      const newY1 = clientY - offsetY
      updateElement(id, newX1, newY1, newX1 + width, newY1 + height, type)
    }

  }

  const handleMouseUp = (event) => {
    setAction("none")
    setSelectedElement(null)
  }

  return (
    <div>
      <div style={{ position: "fixed" }}>
      <input
          type="radio"
          id="selection" 
          checked={tool === "selection"}
          onChange={() => setTool("selection")}
        />
        <label htmlFor="selection">Selection</label>

        <input
          type="radio"
          id="line" 
          checked={tool === "line"}
          onChange={() => setTool("line")}
        />
        <label htmlFor="line">Line</label>

        <input
          type="radio"
          id="rectangle" 
          checked={tool === "rectangle"}
          onChange={() => setTool("rectangle")}
        />
        <label htmlFor="rectangle">Rectangle</label>
      </div>

      <canvas 
        id="canvas"
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        Canvas
      </canvas>
    </div>
  );
}

export default App;
