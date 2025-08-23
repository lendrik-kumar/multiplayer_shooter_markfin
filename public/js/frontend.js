const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
const socket = io()

const devicePixelRatio = window.devicePixelRatio || 1
canvas.width = 1024 * devicePixelRatio
canvas.height = 576 * devicePixelRatio
c.scale(devicePixelRatio, devicePixelRatio)

const frontEndPlayers = {}     
const frontEndProjectiles = {}  

function safeUpper(s) { return (s || '').toUpperCase() }

socket.on('updateProjectiles', (backEndProjectiles) => {
  for (const id in backEndProjectiles) {
    const b = backEndProjectiles[id]
    if (!frontEndProjectiles[id]) {
      const owner = b.owner || frontEndPlayers[b.playerId]?.character
      frontEndProjectiles[id] = new Projectile({
        x: b.x,
        y: b.y,
        radius: 5,
        owner,
        velocity: b.velocity
      })
    } else {
      frontEndProjectiles[id].x = b.x
      frontEndProjectiles[id].y = b.y
    }
  }

  for (const id in frontEndProjectiles) {
    if (!backEndProjectiles[id]) delete frontEndProjectiles[id]
  }
})

socket.on('updatePlayers', (backEndPlayers) => {
  for (const id in backEndPlayers) {
    const bp = backEndPlayers[id]
    if (!frontEndPlayers[id]) {
      frontEndPlayers[id] = new Player({
        x: bp.x,
        y: bp.y,
        radius: 10,
        character: bp.character,
        username: safeUpper(bp.character)
      })
      const exists = document.querySelector(`div[data-id="${id}"]`)
      if (!exists) {
        document.querySelector('#playerLabels').insertAdjacentHTML(
          'beforeend',
          `<div data-id="${id}" data-score="${bp.score}">${safeUpper(bp.character)}: ${bp.score}</div>`
        )
      }
    }

    const p = frontEndPlayers[id]
    p.dead = !!bp.dead
    p.target = { x: bp.x, y: bp.y }
    p.character = bp.character

    const el = document.querySelector(`div[data-id="${id}"]`)
    if (el) {
      el.innerHTML = `${safeUpper(bp.character)}: ${bp.score}`
      el.setAttribute('data-score', bp.score)
    }
  }

  for (const id in frontEndPlayers) {
    if (!backEndPlayers[id]) {
      const el = document.querySelector(`div[data-id="${id}"]`)
      if (el && el.parentNode) el.parentNode.removeChild(el)
      delete frontEndPlayers[id]
    }
  }

  const parent = document.querySelector('#playerLabels')
  const children = Array.from(parent.querySelectorAll('div'))
  children.sort((a, b) => Number(b.dataset.score) - Number(a.dataset.score))
  children.forEach((d) => parent.appendChild(d))
})

let animationId
function animate() {
  animationId = requestAnimationFrame(animate)
  c.clearRect(0, 0, canvas.width, canvas.height)

  c.fillStyle = "rgba(0, 0, 0, 0.5)"  
  c.fillRect(0, 0, canvas.width, canvas.height)

  for (const id in frontEndPlayers) {
    const p = frontEndPlayers[id]
    if (p.target) {
      p.x += (p.target.x - p.x) * 0.5
      p.y += (p.target.y - p.y) * 0.5
    }
    if (!p.dead) p.draw()
  }

  for (const id in frontEndProjectiles) {
    frontEndProjectiles[id].draw()
  }
}
animate()

const keys = { w:{pressed:false}, a:{pressed:false}, s:{pressed:false}, d:{pressed:false} }
const SPEED = 5
const playerInputs = []
let sequenceNumber = 0

setInterval(() => {
  const me = frontEndPlayers[socket.id]
  if (!me || me.dead) return

  if (keys.w.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: 0, dy: -SPEED })
    socket.emit('keydown', { keycode: 'KeyW', sequenceNumber })
  }
  if (keys.a.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: -SPEED, dy: 0 })
    socket.emit('keydown', { keycode: 'KeyA', sequenceNumber })
  }
  if (keys.s.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: 0, dy: SPEED })
    socket.emit('keydown', { keycode: 'KeyS', sequenceNumber })
  }
  if (keys.d.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: SPEED, dy: 0 })
    socket.emit('keydown', { keycode: 'KeyD', sequenceNumber })
  }
}, 15)

window.addEventListener('keydown', (e) => {
  const me = frontEndPlayers[socket.id]
  if (!me || me.dead) return
  if (e.code === 'KeyW') keys.w.pressed = true
  if (e.code === 'KeyA') keys.a.pressed = true
  if (e.code === 'KeyS') keys.s.pressed = true
  if (e.code === 'KeyD') keys.d.pressed = true
})
window.addEventListener('keyup', (e) => {
  const me = frontEndPlayers[socket.id]
  if (!me || me.dead) return
  if (e.code === 'KeyW') keys.w.pressed = false
  if (e.code === 'KeyA') keys.a.pressed = false
  if (e.code === 'KeyS') keys.s.pressed = false
  if (e.code === 'KeyD') keys.d.pressed = false
})

const overlay = document.querySelector('#characterOverlay')
document.querySelectorAll('#characterForm button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const character = btn.getAttribute('data-hero')
    socket.emit('chooseCharacter', {
      character,
      width: canvas.width / devicePixelRatio,
      height: canvas.height / devicePixelRatio
    })
    overlay.style.display = 'none'
  })
})

socket.on('characterTaken', (character) => {
  alert(`${character} is already taken! Choose the other one.`)
  overlay.style.display = 'flex'
})
socket.on('gameFull', () => {
  alert('Game is full, only Batman vs Superman is allowed')
  overlay.style.display = 'flex'
})

socket.on('playerDied', () => {
  const ov = document.querySelector('#respawnOverlay')
  const countdownEl = document.querySelector('#countdownText')
  if (!ov || !countdownEl) return

  ov.style.display = 'flex'
  let counter = 3
  countdownEl.textContent = `Respawning in ${counter}...`

  const timer = setInterval(() => {
    counter--
    if (counter > 0) {
      countdownEl.textContent = `Respawning in ${counter}...`
    } else {
      clearInterval(timer)
      ov.style.display = 'none'
      socket.emit('restart', {
        width: canvas.width / devicePixelRatio,
        height: canvas.height / devicePixelRatio
      })
    }
  }, 1000)
})