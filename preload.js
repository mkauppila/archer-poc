const { Main, Renderer } = require("electron")

let globalCanvas;
window.addEventListener('DOMContentLoaded', () => {
    globalCanvas = document.getElementById('canvas')
})

const keyboardState = {
   left: false,
   right: false,
   up: false,
   down: false
}

window.addEventListener('keydown', (event) => {
    console.log('key name down', event.key)
    if (event.key === 'ArrowUp') {
        keyboardState.up = true
    } 
    if (event.key === 'ArrowDown') {
        keyboardState.down = true
    }
    if (event.key === 'ArrowLeft') {
        keyboardState.left = true
    }
    if (event.key === 'ArrowRight') {
        keyboardState.right = true
    }
}, false)

window.addEventListener('keyup', (event) => {
    console.log('key name up ', event.key)
    if (event.key === 'ArrowUp') {
        keyboardState.up = false
    } 
    if (event.key === 'ArrowDown') {
        keyboardState.down = false
    }
    if (event.key === 'ArrowLeft') {
        keyboardState.left = false
    }
    if (event.key === 'ArrowRight') {
        keyboardState.right = false
    }
}, false)

const loopState = {
    time: 0.0,
    deltaTime: 0.01,
    currentTime: Date.now(),
    accumulator: 0.0,
}

const logicFrameRateInMs = 10

const gameState = {
    player: {
        position: {
            x: 200,
            y: 600,
        },
        movement: {
            x: 0, 
            y: 0
        }, 
        width: 10,
        height: 10
    },
    mobs: [{
        position: {
            x: 100,
            y: 300
        },
        width: 10,
        height: 10
    }, {
        position: {
            x: 300,
            y: 500
        },
        width: 10,
        height: 10
    }, {
        position: {
            x: 200,
            y: 300
        },
        width: 10,
        height: 10
    }],
    playerBullets: []
}

function handlePlayerMovement(player, keyboardState) {
    const speed = 2
    if (keyboardState.up) {
        player.movement.y = -speed
    }
    if (keyboardState.down) {
        player.movement.y = speed
    }
    
    if (!keyboardState.up && !keyboardState.down) {
       player.movement.y = 0 
    }
    if (keyboardState.left) {
        player.movement.x = -speed
    }
    
    if (keyboardState.right) {
        player.movement.x = speed
    }
    if (!keyboardState.left && !keyboardState.right) {
       player.movement.x = 0 
    }

    player.position.x += player.movement.x
    player.position.y += player.movement.y
}

function playerIsStill(player) {
    return player.movement.x === 0 && player.movement.y == 0
}

function createPlayerBullet(startingPoint, direction) {
    return {
        position: {
            x: startingPoint.x,
            y: startingPoint.y,
        },
        movement:  {
            x: direction.x, // TODO: fix the speed, this is just the direction
            y: direction.y
        },
        ttl: 250,
        width: 2,
        height: 2 
    }
}

function updateBullets(bullets) {
    for (const bullet of bullets) {
        bullet.position.x += bullet.movement.x
        bullet.position.y += bullet.movement.y

        bullet.ttl = bullet.ttl - 1
    }
}

function closestMobToPlayer(player, mobs) {
    const ppos = player.position

    let closestMob = null
    let smallestDistance = 10_000
    for (const mob of mobs) {
        const mpos = mob.position

        const distance = Math.sqrt(((ppos.x - mpos.x) ** 2) + ((ppos.y - mpos.y) ** 2))
        if (distance < smallestDistance) {
            smallestDistance = distance 
            closestMob = mob
        }
    }
    return closestMob
}

const weaponSpeedInMs = 200
let weaponTimer = 0

function main() {
    requestAnimationFrame(main)

    const newTime = Date.now()
    let frameTime = newTime - loopState.currentTime
    if (frameTime > logicFrameRateInMs * 2) { 
        frameTime = logicFrameRateInMs * 2
    }
    loopState.currentTime = newTime

    loopState.accumulator += frameTime
    
    while (loopState.accumulator >= logicFrameRateInMs) {
        weaponTimer += logicFrameRateInMs

        const player = gameState.player
        handlePlayerMovement(player, keyboardState)
        if (playerIsStill(player) && weaponTimer >= weaponSpeedInMs) {
            weaponTimer = 0
            const closestMob = closestMobToPlayer(player, gameState.mobs)
            if (closestMob) {
                const directionX = closestMob.position.x - player.position.x
                const directionY = closestMob.position.y - player.position.y
                const lenght = Math.sqrt(directionX ** 2 + directionY ** 2)
                const normDirX = directionX / lenght
                const normDirY = directionY / lenght

                gameState.playerBullets.push(createPlayerBullet(gameState.player.position, {
                    x: normDirX, y: normDirY
                }))
            }
        }
        updateBullets(gameState.playerBullets)

        let destroyedMobIndexes = []
        for (const mobIndex in gameState.mobs) {
            const mob = gameState.mobs[mobIndex]
            for (const bullet of gameState.playerBullets) {
                if (detectCollisionBetween(mob, bullet)) {
                    destroyedMobIndexes.push(mobIndex)
                }
            }
        }
        for (const index of destroyedMobIndexes.reverse()) {
            gameState.mobs.splice(index, 1)
        }

        let deleteIndexes = []
        for (const bulletIndex in gameState.playerBullets) {
            if (gameState.playerBullets[bulletIndex].ttl <= 0) {
                deleteIndexes.push(bulletIndex)
            }
        }
        for (const index of deleteIndexes.reverse()) {
            gameState.playerBullets.splice(index, 1)
        }

        loopState.accumulator -=  logicFrameRateInMs
    }

    const alpha = loopState.accumulator / logicFrameRateInMs
    render(globalCanvas, alpha, gameState)
}

function detectCollisionBetween(lhs, rhs) {
    return lhs.position.x < rhs.position.x + rhs.width &&
        lhs.position.x + lhs.width > rhs.position.x &&
        lhs.position.y < rhs.position.y + rhs.height &&
        lhs.position.y + lhs.height > rhs.position.y
}

main()

function render(canvas, alpha, gameState) {
    var ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#FF0000";
    ctx.fillRect(
        gameState.player.position.x + alpha * gameState.player.movement.x, 
        gameState.player.position.y + alpha * gameState.player.movement.y,
        gameState.player.width, 
        gameState.player.height);

    ctx.fillStyle = "#00a000";
    for (const mob of gameState.mobs) {
        ctx.fillRect(mob.position.x, mob.position.y, mob.width, mob.height);
    }

    ctx.fillStyle = "#090909";
    for (const bullet of gameState.playerBullets)  {
        ctx.fillRect(bullet.position.x, bullet.position.y, bullet.width, bullet.height);
    }
}
