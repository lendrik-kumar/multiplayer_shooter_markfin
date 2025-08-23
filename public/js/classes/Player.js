class Player {
  constructor({ x, y, radius, character, username }) {
    this.x = x
    this.y = y
    this.radius = radius
    this.character = character
    this.username = username || character?.toUpperCase() || " "

    this.image = new Image()
    this.image.src = (this.character === "batman" ? "/img/batman.png" : "/img/superman.png")
  }

  draw() {
    const size = this.radius * 6
    c.save()
    c.shadowColor = this.character === "batman" ? "yellow" : "red"
    c.shadowBlur = 40
    c.drawImage(this.image, this.x - size/4 , this.y - size/4 , size, size)
    c.restore()
  }
}