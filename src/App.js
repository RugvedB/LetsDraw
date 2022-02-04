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

const nearPoint = (x, y, x1, y1, name) => {
  const offset = 10
  return Math.abs(x - x1) < offset && Math.abs(y - y1) < offset ? name : null
}

const positionWithinElement = (x, y, element) => {
  const { x1, x2, y1, y2, type } = element
  
  switch(type) {
    case "rectangle":
      console.log("rectangle for selection")
      const minX = Math.min(x1, x2)
      const maxX = Math.max(x1, x2)
      const minY = Math.min(y1, y2)
      const maxY = Math.max(y1, y2)
     
      const topLeft = nearPoint(x, y, minX, minY, "tl")
      const topRight = nearPoint(x, y, maxX, minY, "tr")
      const bottomLeft = nearPoint(x, y, minX, maxY, "bl")
      const bottomRight = nearPoint(x, y, maxX, maxY, "br")
      const insideRect = x >= minX && x <= maxX && y >= minY && y <= maxY ? "inside" : null 

      return topLeft || topRight || bottomLeft || bottomRight || insideRect
    case "line":
      console.log("line for selection")
      const a = { x: x1, y: y1 }
      const b = { x: x2, y: y2 }
      const c = { x: x, y: y }
      const offset = distance(a, b) - (distance(a, c) + distance(b, c))
      const start = nearPoint(x, y, x1, y1, "start")
      const end = nearPoint(x, y, x2, y2, "end")
      const insideLine = Math.abs(offset) < 1  ? "inside" : null
      return start || end || insideLine
  }
}

function distance(a, b){
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)) 
}

function getElementAtPosition(x, y, elements) {
  return elements.map(element => ({ ...element, position: positionWithinElement(x, y, element)}))
  .find(element => element.position !== null)
}

function adjustElementCoordinates(element){
  const { type, x1, y1, x2, y2 } = element
  switch(type){
    case "rectangle":
      const minX = Math.min(x1, x2)
      const maxX = Math.max(x1, x2)
      const minY = Math.min(y1, y2)
      const maxY = Math.max(y1, y2)
      return { x1: minX, y1: minY, x2: maxX, y2: maxY }
    case "line":
      if((x1 < x2 || x1 === x2) && y1 < y2){
        return { x1, y1, x2, y2 }
      }
      return { x1: x2, y1: y2, x2: x1, y2: y1 }
  }
}

function cursorForPosition(position){
  switch(position) {
    case "tl":
    case "br":
    case "start":
    case "end":
      return "nwse-resize"
    case "tr":
    case "bl":
      return "nesw-resize"
    default:
      return "move"
  }
}

function resizedCoordinates(clientX, clientY, position, coordinates) {
  const { x1, y1, x2, y2 } = coordinates
  switch(position) {
    case "tl":
    case "start":
      return { x1: clientX, y1: clientY, x2, y2 }
    case "tr":
      return { x1, y1: clientY, x2: clientX, y2 }
    case "bl":
      return { x1: clientX, y1, x2, y2: clientY }
    case "br":
    case "end":
      return { x1, y1, x2: clientX, y2: clientY }
    default:
      return null
  }

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
      
      if(element) {
        const offsetX = clientX - element.x1
        const offsetY = clientY - element.y1

        if(element.position === "inside"){
          setAction("moving")
        }
        else{
          console.log('setting action to resizing')
          setAction("resizing")
        }
        setSelectedElement({...element, offsetX, offsetY})
      }
    }
    else{
      const id = elements.length
      const element = createElement(id, clientX, clientY, clientX, clientY, tool)
      setElements(prevState => [...prevState, element])
      setAction("drawing")
      setSelectedElement(element)

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
      const element = getElementAtPosition(clientX, clientY, elements)
      event.target.style.cursor = element ? cursorForPosition(element.position) : "default"
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
    else if(action === "resizing") {
      console.log("action resizing, selectedElement:")
      console.log(selectedElement)
      const { id, type, position, ...coordinates } = selectedElement
      const { x1, y1, x2, y2 } = resizedCoordinates(clientX, clientY, position, coordinates)
      updateElement(id, x1, y1, x2, y2, type)
    }

  }

  const handleMouseUp = (event) => {
    const index = selectedElement.id
    const { id, type } = elements[index]

    if(action === "drawing" || action === "resizing") {
      const { x1, y1, x2, y2 } = adjustElementCoordinates(elements[index])
      updateElement(id, x1, y1, x2, y2, type)
    }

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
