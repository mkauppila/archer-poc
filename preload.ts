let globalCanvas: HTMLCanvasElement;
window.addEventListener("DOMContentLoaded", () => {
  let canvas = document.getElementById("canvas") as HTMLCanvasElement | null;
  if (canvas) {
    globalCanvas = canvas;
  } else {
    // TODO: fatal error
  }
});

type KeyboardState = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
};

const keyboardState: KeyboardState = {
  left: false,
  right: false,
  up: false,
  down: false,
};

window.addEventListener(
  "keydown",
  (event) => {
    console.log("key name down", event.key);
    if (event.key === "ArrowUp") {
      keyboardState.up = true;
    }
    if (event.key === "ArrowDown") {
      keyboardState.down = true;
    }
    if (event.key === "ArrowLeft") {
      keyboardState.left = true;
    }
    if (event.key === "ArrowRight") {
      keyboardState.right = true;
    }
  },
  false
);

window.addEventListener(
  "keyup",
  (event) => {
    console.log("key name up ", event.key);
    if (event.key === "ArrowUp") {
      keyboardState.up = false;
    }
    if (event.key === "ArrowDown") {
      keyboardState.down = false;
    }
    if (event.key === "ArrowLeft") {
      keyboardState.left = false;
    }
    if (event.key === "ArrowRight") {
      keyboardState.right = false;
    }
  },
  false
);

const loopState = {
  time: 0.0,
  deltaTime: 0.01,
  currentTime: Date.now(),
  accumulator: 0.0,
};

const logicFrameRateInMs = 10;

type Vector = {
  x: number;
  y: number;
};

type Mob = {
  aabb: AABB;
  movement: Vector;
};

type Bullet = {
  ttl: number;
} & Mob;

type GameState = {
  player: Mob;
  mobs: Mob[];
  playerBullets: Bullet[];
};

type AABB = {
  position: Vector;
  width: number;
  height: number;
};

const gameState: GameState = {
  player: {
    aabb: {
      position: {
        x: 200,
        y: 600,
      },
      width: 10,
      height: 10,
    },
    movement: {
      x: 0,
      y: 0,
    },
  },
  mobs: [
    {
      aabb: {
        position: {
          x: 100,
          y: 300,
        },
        width: 10,
        height: 10,
      },
      movement: { x: 0, y: 0 },
    },
    {
      aabb: {
        position: {
          x: 300,
          y: 500,
        },
        width: 10,
        height: 10,
      },
      movement: { x: 0, y: 0 },
    },
    {
      aabb: {
        position: {
          x: 200,
          y: 300,
        },
        width: 10,
        height: 10,
      },
      movement: { x: 0, y: 0 },
    },
  ],
  playerBullets: [],
};

function handlePlayerMovement(player: Mob, keyboardState: KeyboardState) {
  const speed = 2;
  if (keyboardState.up) {
    player.movement.y = -speed;
  }
  if (keyboardState.down) {
    player.movement.y = speed;
  }

  if (!keyboardState.up && !keyboardState.down) {
    player.movement.y = 0;
  }
  if (keyboardState.left) {
    player.movement.x = -speed;
  }

  if (keyboardState.right) {
    player.movement.x = speed;
  }
  if (!keyboardState.left && !keyboardState.right) {
    player.movement.x = 0;
  }

  player.aabb.position.x += player.movement.x;
  player.aabb.position.y += player.movement.y;
}

function playerIsStill(player: Mob) {
  return player.movement.x === 0 && player.movement.y == 0;
}

function createPlayerBullet(startingPoint: Vector, direction: Vector) {
  return {
    aabb: {
      position: {
        x: startingPoint.x,
        y: startingPoint.y,
      },
      width: 2,
      height: 2,
    },
    movement: {
      x: direction.x, // TODO: fix the speed, this is just the direction
      y: direction.y,
    },
    ttl: 250,
  };
}

function updateBullets(bullets: Bullet[]) {
  for (const bullet of bullets) {
    bullet.aabb.position.x += bullet.movement.x;
    bullet.aabb.position.y += bullet.movement.y;

    bullet.ttl = bullet.ttl - 1;
  }
}

function closestMobToPlayer(player: Mob, mobs: Mob[]) {
  const ppos = player.aabb.position;

  let closestMob = null;
  let smallestDistance = 10_000;
  for (const mob of mobs) {
    const mpos = mob.aabb.position;

    const distance = Math.sqrt((ppos.x - mpos.x) ** 2 + (ppos.y - mpos.y) ** 2);
    if (distance < smallestDistance) {
      smallestDistance = distance;
      closestMob = mob;
    }
  }
  return closestMob;
}

const weaponSpeedInMs = 200;
let weaponTimer = 0;

function main() {
  requestAnimationFrame(main);

  const newTime = Date.now();
  let frameTime = newTime - loopState.currentTime;
  if (frameTime > logicFrameRateInMs * 2) {
    frameTime = logicFrameRateInMs * 2;
  }
  loopState.currentTime = newTime;

  loopState.accumulator += frameTime;

  while (loopState.accumulator >= logicFrameRateInMs) {
    weaponTimer += logicFrameRateInMs;

    const player = gameState.player;
    handlePlayerMovement(player, keyboardState);
    if (playerIsStill(player) && weaponTimer >= weaponSpeedInMs) {
      weaponTimer = 0;
      const closestMob = closestMobToPlayer(player, gameState.mobs);
      if (closestMob) {
        const directionX = closestMob.aabb.position.x - player.aabb.position.x;
        const directionY = closestMob.aabb.position.y - player.aabb.position.y;
        const lenght = Math.sqrt(directionX ** 2 + directionY ** 2);
        const normDirX = directionX / lenght;
        const normDirY = directionY / lenght;

        gameState.playerBullets.push(
          createPlayerBullet(gameState.player.aabb.position, {
            x: normDirX,
            y: normDirY,
          })
        );
      }
    }
    updateBullets(gameState.playerBullets);

    let destroyedMobIndexes: number[] = [];
    for (const mobIndex in gameState.mobs) {
      const mob = gameState.mobs[mobIndex];
      for (const bullet of gameState.playerBullets) {
        if (detectCollisionBetween(mob.aabb, bullet.aabb)) {
          destroyedMobIndexes.push(mobIndex as any);
        }
      }
    }
    for (const index of destroyedMobIndexes.reverse()) {
      gameState.mobs.splice(index, 1);
    }

    let deleteIndexes: number[] = [];
    for (const bulletIndex in gameState.playerBullets) {
      if (gameState.playerBullets[bulletIndex].ttl <= 0) {
        deleteIndexes.push(bulletIndex as any);
      }
    }
    for (const index of deleteIndexes.reverse()) {
      gameState.playerBullets.splice(index, 1);
    }

    loopState.accumulator -= logicFrameRateInMs;
  }

  const alpha = loopState.accumulator / logicFrameRateInMs;
  render(globalCanvas, alpha, gameState);
}

function detectCollisionBetween(lhs: AABB, rhs: AABB) {
  return (
    lhs.position.x < rhs.position.x + rhs.width &&
    lhs.position.x + lhs.width > rhs.position.x &&
    lhs.position.y < rhs.position.y + rhs.height &&
    lhs.position.y + lhs.height > rhs.position.y
  );
}

main();

function render(
  canvas: HTMLCanvasElement,
  alpha: number,
  gameState: GameState
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("canvas context is null");
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#FF0000";
  ctx.fillRect(
    gameState.player.aabb.position.x + alpha * gameState.player.movement.x,
    gameState.player.aabb.position.y + alpha * gameState.player.movement.y,
    gameState.player.aabb.width,
    gameState.player.aabb.height
  );

  ctx.fillStyle = "#00a000";
  for (const mob of gameState.mobs) {
    ctx.fillRect(
      mob.aabb.position.x,
      mob.aabb.position.y,
      mob.aabb.width,
      mob.aabb.height
    );
  }

  ctx.fillStyle = "#090909";
  for (const bullet of gameState.playerBullets) {
    ctx.fillRect(
      bullet.aabb.position.x,
      bullet.aabb.position.y,
      bullet.aabb.width,
      bullet.aabb.height
    );
  }
}
