import { useEffect, useLayoutEffect, useRef, useState } from "react";
import rough from 'roughjs/bundled/rough.esm';
import { getStroke } from 'perfect-freehand'

const generator = rough.generator()

function createElement(id, x1, y1, x2, y2, type) {
  switch(type) {
    case "line":
      console.log("createElement:line")
      const roughElementForLine = generator.line(x1, y1, x2, y2)
      console.log({ id, x1, y1, x2, y2, roughElementForLine, type })
      return { id, x1, y1, x2, y2, roughElement: roughElementForLine, type }
    case "rectangle":
      const roughElementForRectangle = generator.rectangle(x1, y1, x2-x1, y2-y1)
      return { id, x1, y1, x2, y2, roughElement: roughElementForRectangle, type }
    case "pencil":
      return { id, type, points: [{ x: x1, y: y1 }] }
    case "text":
      return { id, type, x1, y1, x2, y2, text: "" }
    default:
      throw new Error(`Type not recognised : ${type}`)
  
  }
}

const nearPoint = (x, y, x1, y1, name) => {
  const offset = 10
  return Math.abs(x - x1) < offset && Math.abs(y - y1) < offset ? name : null
}

function onLine(x1, y1, x2, y2, x, y, distanceOffset = 1) {
  const a = { x: x1, y: y1 }
  const b = { x: x2, y: y2 }
  const c = { x: x, y: y }
  const offset = distance(a, b) - (distance(a, c) + distance(b, c))
  const insideLine = Math.abs(offset) < distanceOffset  ? "inside" : null
  return insideLine
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
      const insideLine = onLine(x1, y1, x2, y2, x, y, 5)
      const start = nearPoint(x, y, x1, y1, "start")
      const end = nearPoint(x, y, x2, y2, "end")
      return start || end || insideLine
    case "pencil":
      const betweenAnyPoint = element.points.some(( point, index ) => {
        const nextPoint = element.points[index + 1]
        if(!nextPoint) return false
        return onLine(point.x, point.y, nextPoint.x, nextPoint.y, x, y) != null
      })
      const onPath = betweenAnyPoint ? "inside" : null

      return onPath
    case "text":
      return x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null 
    default:
      throw new Error("Error")
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
    default:
      throw new Error(`Type not recognised : ${element.type}`)
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

const useHistory = (initialState) => {
  const [index, setIndex] = useState(0)
  const [history, setHistory] = useState([initialState])

  const setState = (action, override = false) => {
    // action could be a 1)current state or 2)function
    // 1) setState(items) 2) setState(prevState => prevState)
    const newState = typeof action === "function" ? action(history[index]) : action
    if(override) {
      const historyCopy = [...history]
      historyCopy[index] = newState
      setHistory(historyCopy)
    }
    else{
      const updatedState = [...history].splice(0, index + 1)
      setHistory([...updatedState, newState])
      setIndex(prevState => prevState + 1)
    }
  
  }

  const undo = () => index > 0 && setIndex(prevState => prevState - 1)
  const redo = () => index < history.length - 1 && setIndex(prevState => prevState + 1)

  return [history[index], setState, undo, redo]
}

function getSvgPathFromStroke(stroke) {
  if (!stroke.length) return ""

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ["M", ...stroke[0], "Q"]
  )

  d.push("Z")
  return d.join(" ")
}

const drawElement = (roughCanvas, context, element) => {
  switch(element.type) {
    case "line":
    case "rectangle":
      roughCanvas.draw(element.roughElement)
      break
    case "pencil":
      console.log('In draw element pencil')
      const stroke = getStroke(element.points, {
        size: 10
      });
      const pathData = getSvgPathFromStroke(stroke);
      const myPath = new Path2D(pathData)
      context.fill(myPath)
      break
    case "text":
      console.log("element.text, element.x1, element.y1")
      context.textBaseline = "top"
      context.font = "24px sans-serif"
      context.fillText(element.text, element.x1, element.y1)
      break
    default:
      throw new Error(`Type not recognised : ${element.type}`)

  }
}

function adjustmentRequired(type) {
  if(type in ['line', 'rectangle']){
    return true
  }
  return false
}

function App() {
  const [elements, setElements, undo, redo] = useHistory([])
  const [action, setAction] = useState('none')
  const [tool, setTool] = useState('text')
  const [selectedElement, setSelectedElement] = useState(null)
  const textAreaRef = useRef()

  useLayoutEffect(() => {
    const canvas = document.getElementById("canvas")
    const context = canvas.getContext('2d')
    context.clearRect(0, 0, canvas.width, canvas.height)

    const roughCanvas = rough.canvas(canvas)
    elements.forEach(element => {
        if(action === "writing" && selectedElement.id === element.id) return
        drawElement(roughCanvas, context, element)
      }
    )

  },[elements, action, selectedElement])

  useEffect(() => {
    const undoRedoFunction = event => {
      if((event.ctrlKey && event.key === "z")) {
        undo()
      }
      if((event.ctrlKey && event.key === "y")) {
        redo()
      }
    }

    document.addEventListener("keydown", undoRedoFunction)
    
    return () => {
      document.removeEventListener("keydown", undoRedoFunction)
    }
  }, [undo, redo])

  useEffect(() => {
    const textArea = textAreaRef.current
    
    if(action === "writing") {
      textArea.focus()
      textArea.value = selectedElement.text
    }
  },[action, selectedElement])

  const handleMouseDown = (event) => {
    if(action === "writing") return

    const { clientX, clientY } = event

    if(tool === "selection"){
      const element = getElementAtPosition(clientX, clientY, elements)
      
      if(element) {

        if(element.type === "pencil") {
          const xoffsets = element.points.map(point => clientX - point.x)
          const yoffsets = element.points.map(point => clientY - point.y)
          setSelectedElement({...element, xoffsets, yoffsets})
        }
        else{
          const offsetX = clientX - element.x1
          const offsetY = clientY - element.y1
          setSelectedElement({...element, offsetX, offsetY})
        }

        // Added the below line because when we use selection, history is not created, only its last element is overrided. So to create a new entry in history we use setElements whichis actually the setState method of useHistory.
        setElements(prevState => prevState)

        if(element.position === "inside"){
          setAction("moving")
        }
        else{
          console.log('setting action to resizing')
          setAction("resizing")
        }
      }
    }
    else if(tool === "rectangle" || tool === "line" || tool === "pencil" || tool === "text" ){
      const id = elements.length
      const element = createElement(id, clientX, clientY, clientX, clientY, tool)
      console.log("new element created")
      console.log(element)
      setElements(prevState => [...prevState, element])
      setAction(tool === "text" ? "writing" : "drawing")
      setSelectedElement(element)

    }
  }

  const updateElement = (id, x1, y1, x2, y2, type, options) => {
    const elementsCopy = [...elements]
    
    switch(type){
      case "line":
      case "rectangle":    
        elementsCopy[id] = createElement(id, x1, y1, x2, y2, type)
        break
      case "pencil":
        elementsCopy[id].points = [...elementsCopy[id].points, { x: x2, y: y2 }] 
        break
      case "text":
        const textWidth = document
          .getElementById("canvas")
          .getContext("2d")
          .measureText(options.text).width
        const textHeight = 24
        elementsCopy[id] = {
          ...createElement(id, x1, y1, x1 + textWidth, y1 + textHeight, type),
          text: options.text,
        }
        break
      default:
        throw new Error(`Type not recognized ${type}`)
    }

    setElements(elementsCopy, true)
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

      if(selectedElement.type === "pencil") {
        const newPoints = selectedElement.points.map(( _, index ) => {
          console.log ("x:"+ selectedElement.xoffsets[index] + " new:"+ (clientX - selectedElement.xoffsets[index]))
          return {
            x: clientX - selectedElement.xoffsets[index],
            y: clientY - selectedElement.yoffsets[index]
          }
        })
        const elementsCopy = [...elements]
        elementsCopy[selectedElement.id] = {
          ...elementsCopy[selectedElement.id],
          points : newPoints
        }
        setElements(elementsCopy, true)
      }
      else{
        const { id, x1, y1, x2, y2, type, offsetX, offsetY } = selectedElement
        const width = x2 - x1
        const height = y2 - y1
        const newX1 = clientX - offsetX
        const newY1 = clientY - offsetY
        const options = type === "text" ? { text: selectedElement.text } : {}
        updateElement(id, newX1, newY1, newX1 + width, newY1 + height, type, options)
      }
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
    const { clientX, clientY } = event

    if(selectedElement){

      if(selectedElement.type === "text" 
        && clientX - selectedElement.offsetX === selectedElement.x1
        && clientY - selectedElement.offsetY === selectedElement.y1  
      ) {
        setAction("writing")
        return
      }

      const index = selectedElement.id
      const { id, type } = elements[index]
  
      if((action === "drawing" || action === "resizing") && adjustmentRequired(type)) {
        const { x1, y1, x2, y2 } = adjustElementCoordinates(elements[index])
        updateElement(id, x1, y1, x2, y2, type)
      }
    }

    // if we are writing, we dont want to reset action to none
    if(action === "writing") return

    setAction("none")
    setSelectedElement(null)
  }

  const handleBlur = (event) => {
    const { id, x1, y1, type } = selectedElement
    setAction("none")
    setSelectedElement(null)
    updateElement(id, x1, y1, null, null, type, { text: event.target.value })
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

        <input
          type="radio"
          id="pencil" 
          checked={tool === "pencil"}
          onChange={() => setTool("pencil")}
        />
        <label htmlFor="pencil">Pencil</label>

        <input
          type="radio"
          id="text" 
          checked={tool === "text"}
          onChange={() => setTool("text")}
        />
        <label htmlFor="text">Text</label>
      </div>

      <div style={{ position: "fixed", top: 0, right: 0, padding: "10px" }}>
        <button onClick={() => undo()}>Undo (Ctrl + Z)</button>
        <button onClick={() => redo()}>Redo (Ctrl + Y)</button>
      </div>

      {
        action === "writing" ? 
        <textarea
          ref={textAreaRef} 
          onBlur={handleBlur}
          style={{ 
            position: "fixed", 
            top: selectedElement.y1, 
            left: selectedElement.x1,
            font: "24px sans-serif",
            margin: 0,
            padding: 0,
            border: 0,
            outline: 0,
            resize: "auto",
            overflow: "hidden",
            whitespace: "pre",
            background: "transparent"
          }} />
        : null
      }

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
