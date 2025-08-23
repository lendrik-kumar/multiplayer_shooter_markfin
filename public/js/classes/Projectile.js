class Projectile {
  constructor({ x, y, radius, color = 'white', velocity, owner }) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.velocity = velocity
    this.owner = owner 

    this.image = new Image()
    this.imageLoaded = false

    if (this.owner?.toLowerCase() === 'batman') {
      this.image.src = '/img/batarang.png'
    } else if (this.owner?.toLowerCase() === 'superman') {
      this.image.src = '/img/laser.png'
    } else {
      this.image.src = '/img/defaultProjectile.png'
    }

    this.image.onload = () => {
      this.imageLoaded = true
    }
    this.image.onerror = () => {
      console.warn(`Failed to load projectile image for ${this.owner}`)
      this.imageLoaded = false
    }
  }

  draw() {
    const size = this.radius * 5
    if (this.imageLoaded) {
      c.drawImage(this.image, this.x - size / 2, this.y - size / 2, size, size)
    } else {
      c.beginPath()
      c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
      c.fillStyle = this.color
      c.fill()
    }
  }

  update() {
    this.draw()
    this.x += this.velocity.x
    this.y += this.velocity.y
  }
}