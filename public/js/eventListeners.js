addEventListener('click', (event) => {
  const player = frontEndPlayers[socket.id]
  if (!player || player.dead) return

  const rect = canvas.getBoundingClientRect()
  const logicalW = canvas.width / devicePixelRatio
  const logicalH = canvas.height / devicePixelRatio
  const scaleX = logicalW / rect.width
  const scaleY = logicalH / rect.height

  const mouseX = (event.clientX - rect.left) * scaleX
  const mouseY = (event.clientY - rect.top) * scaleY

  const angle = Math.atan2(mouseY - player.y, mouseX - player.x)

  socket.emit('shoot', {
    x: player.x,
    y: player.y,
    angle
  })
})