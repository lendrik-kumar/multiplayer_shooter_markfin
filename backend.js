const express = require('express')
const app = express()

const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')

const io = new Server(server, { 
  pingInterval: 2000, 
  pingTimeout: 5000,
  cors: {
    origin: "*"
  }
})

const port = 3001

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

const backEndPlayers = {}        
const backEndProjectiles = {}     

const SPEED = 5
const RADIUS = 10
const PROJECTILE_RADIUS = 5
let projectileId = 0

const HEROES = ['batman', 'superman']
let usedHeroes = new Set()

io.on('connection', (socket) => {
  console.log('a user connected')
  io.emit('updatePlayers', backEndPlayers)

  socket.on('chooseCharacter', (payload = {}) => {
    let { character, width, height, canvasWidth, canvasHeight } = payload

    width = width ?? canvasWidth ?? 1024
    height = height ?? canvasHeight ?? 576

    if (!character && usedHeroes.size === 1) {
      character = HEROES.find(h => !usedHeroes.has(h))
    }

    if (!character || !HEROES.includes(character)) character = 'batman'

    if (usedHeroes.has(character)) {
      socket.emit('characterTaken', character)
      return
    }
    if (usedHeroes.size >= HEROES.length) {
      socket.emit('gameFull')
      return
    }

    socket.data.character = character

    backEndPlayers[socket.id] = {
      x: 1024 * Math.random(),
      y: 576 * Math.random(),
      character,
      sequenceNumber: 0,
      score: 0,
      radius: RADIUS,
      dead: false,
      canvas: { width, height }
    }

    usedHeroes.add(character)
    io.emit('updatePlayers', backEndPlayers)
  })

  socket.on('shoot', ({ x, y, angle }) => {
    const shooter = backEndPlayers[socket.id]
    if (!shooter || shooter.dead) return

    projectileId++
    const velocity = { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 }

    backEndProjectiles[projectileId] = {
      x,
      y,
      velocity,
      playerId: socket.id,         
      owner: shooter.character      
    }
  })

  socket.on('restart', ({ width, height }) => {
    const player = backEndPlayers[socket.id]
    if (!player) return

    backEndPlayers[socket.id] = {
      ...player,
      x: 1024 * Math.random(),
      y: 576 * Math.random(),
      dead: false,
      sequenceNumber: 0,
      canvas: { width: width ?? player.canvas?.width ?? 1024, height: height ?? player.canvas?.height ?? 576 }
    }

    io.emit('updatePlayers', backEndPlayers)
  })

  socket.on('keydown', ({ keycode, sequenceNumber }) => {
    const p = backEndPlayers[socket.id]
    if (!p || p.dead) return

    p.sequenceNumber = sequenceNumber
    switch (keycode) {
      case 'KeyW': p.y -= SPEED; break
      case 'KeyA': p.x -= SPEED; break
      case 'KeyS': p.y += SPEED; break
      case 'KeyD': p.x += SPEED; break
    }

    const left   = p.x - p.radius
    const right  = p.x + p.radius
    const top    = p.y - p.radius
    const bottom = p.y + p.radius

    if (left < 0) p.x = p.radius
    if (right > 1024) p.x = 1024 - p.radius
    if (top < 0) p.y = p.radius
    if (bottom > 576) p.y = 576 - p.radius
  })

  socket.on('disconnect', (reason) => {
    console.log('user disconnected:', reason)
    if (backEndPlayers[socket.id]) {
      usedHeroes.delete(backEndPlayers[socket.id].character)
      delete backEndPlayers[socket.id]
    }
    io.emit('updatePlayers', backEndPlayers)
  })
})

setInterval(() => {
  for (const id in backEndProjectiles) {
    const proj = backEndProjectiles[id]
    if (!backEndPlayers[proj.playerId]) {
      delete backEndProjectiles[id]
      continue
    }

    proj.x += proj.velocity.x
    proj.y += proj.velocity.y

    const shooterCanvas = backEndPlayers[proj.playerId]?.canvas
    if (
      proj.x - PROJECTILE_RADIUS >= (shooterCanvas?.width ?? 1024) ||
      proj.x + PROJECTILE_RADIUS <= 0 ||
      proj.y - PROJECTILE_RADIUS >= (shooterCanvas?.height ?? 576) ||
      proj.y + PROJECTILE_RADIUS <= 0
    ) {
      delete backEndProjectiles[id]
      continue
    }

    for (const playerId in backEndPlayers) {
      const target = backEndPlayers[playerId]
      if (target.dead) continue
      if (playerId === proj.playerId) continue

      const dist = Math.hypot(proj.x - target.x, proj.y - target.y)
      if (dist < PROJECTILE_RADIUS + target.radius) {
        if (backEndPlayers[proj.playerId]) {
          backEndPlayers[proj.playerId].score++
        }

        target.dead = true
        io.to(playerId).emit('playerDied', { character: target.character })

        delete backEndProjectiles[id]
        break
      }
    }
  }

  io.emit('updateProjectiles', backEndProjectiles)
  io.emit('updatePlayers', backEndPlayers)
}, 30)

server.listen(port,"0.0.0.0",  () => {
  console.log(`Server listening on port ${port}`)
})