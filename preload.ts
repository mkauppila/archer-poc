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

type AABB = {
  position: Vector;
  width: number;
  height: number;
};

type GameState = {
  player: Mob;
  mobs: Mob[];
  playerBullets: Bullet[];
  level: Level;
  boundaries: AABB[];
};

const gameState: GameState = {
  player: {
    aabb: {
      position: {
        x: 200,
        y: 550,
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
          x: 150,
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
  level: generateLevel(),
  // 4 x AABB to border the area
  boundaries: [
    // left
    {
      height: 880,
      width: 10,
      position: {
        x: -10,
        y: 0,
      },
    },
    // right
    {
      height: 8800,
      width: 10,
      position: {
        x: 440,
        y: 0,
      },
    },
    // top
    {
      height: 10,
      width: 440,
      position: {
        x: 0,
        y: -10,
      },
    },
    // bottom
    {
      height: 16,
      width: 440,
      position: {
        x: 0,
        y: 880,
      },
    },
  ],
};

type Level = {
  blocks: Block[];
  tileWidthInPx: number;
  tileHeightInPx: number;
  widthInTiles: number;
  heightInTiles: number;
};

type Block = {
  type: "wall";
  aabb: AABB;
};

function generateLevel(): Level {
  const widthInTiles = 11;
  const heightInTiles = 22;
  const tileHeight = Math.floor(880 / heightInTiles);
  const tileWidth = Math.floor(440 / widthInTiles);

  const generateBlocks = (width: number, height: number): Block[] => {
    const blocks: Block[] = [];

    let y = 4;
    for (let x = 2; x < 9; ++x) {
      blocks.push({
        type: "wall",
        aabb: {
          position: {
            x: x * tileWidth,
            y: y * tileHeight,
          },
          width: tileWidth,
          height: tileHeight,
        },
      });
    }

    for (let y = 12; y < 18; ++y) {
      let x = 2;
      blocks.push({
        type: "wall",
        aabb: {
          position: {
            x: x * tileWidth,
            y: y * tileHeight,
          },
          width: tileWidth,
          height: tileHeight,
        },
      });

      x = 8;
      blocks.push({
        type: "wall",
        aabb: {
          position: {
            x: x * tileWidth,
            y: y * tileHeight,
          },
          width: tileWidth,
          height: tileHeight,
        },
      });
    }

    return blocks;
  };

  return {
    blocks: generateBlocks(widthInTiles, heightInTiles),
    tileWidthInPx: tileWidth,
    tileHeightInPx: tileHeight,
    widthInTiles,
    heightInTiles,
  };
}

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
    ttl: 192,
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

function isMobCollidingWithBoundaries(
  player: Mob,
  boundaries: AABB[],
  handler: (mob: Mob, target: AABB, delta: Vector) => void
) {
  const updated: AABB = {
    position: {
      x: player.aabb.position.x, // + player.movement.x,
      y: player.aabb.position.y, // + player.movement.y,
    },
    height: player.aabb.height,
    width: player.aabb.width,
  };
  for (const boundary of boundaries) {
    if (detectCollisionBetween(updated, boundary)) {
      let dx = 0;
      let dy = 0;

      if (updated.position.x < boundary.position.x) {
        dx = boundary.position.x - (updated.position.x + updated.width);
      } else {
        dx = updated.position.x - (boundary.position.x + boundary.width);
      }

      if (updated.position.y < boundary.position.y) {
        dy = boundary.position.y - (updated.position.y + updated.height);
      } else {
        dy = updated.position.y - (boundary.position.y + boundary.height);
      }

      // collision on x-axis
      if (Math.abs(dx) < Math.abs(dy)) {
        if (player.movement.x > 0) {
          player.aabb.position.x += dx;
        } else {
          player.aabb.position.x -= dx;
        }
      } else {
        if (player.movement.y > 0) {
          player.aabb.position.y += dy;
        } else {
          player.aabb.position.y -= dy;
        }
      }

      handler(player, boundary, { x: dx, y: dy });
    }
  }
}

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
    // TODO: do the actual update of player's position
    // after hte collision detection has been done (for the future state)
    handlePlayerMovement(player, keyboardState);

    isMobCollidingWithBoundaries(
      player,
      [...gameState.boundaries, ...gameState.level.blocks.map((b) => b.aabb)],
      () => {}
    );

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

    for (const playerBullet of gameState.playerBullets) {
      isMobCollidingWithBoundaries(
        playerBullet,
        [...gameState.boundaries, ...gameState.level.blocks.map((b) => b.aabb)],
        (bullet, _target, delta) => {
          console.log("bullet collision response");

          if (delta.x > delta.y) {
            bullet.movement.x = -bullet.movement.x;
          } else {
            bullet.movement.y = -bullet.movement.y;
          }
        }
      );
    }

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

  // render level
  const level = gameState.level;
  // render the base map
  let switcher = false;
  for (let y = 0; y < level.heightInTiles; ++y) {
    for (let x = 0; x < level.widthInTiles; ++x) {
      ctx.fillStyle = switcher ? "rgb(117, 139, 246)" : "rgb(113, 134, 246)";
      const px = x * level.tileWidthInPx;
      const py = y * level.tileWidthInPx;
      ctx.fillRect(px, py, level.tileWidthInPx, level.tileHeightInPx);

      switcher = !switcher;
    }
  }

  // divider line rgb(153, 168, 244)

  ctx.fillStyle = "rgb(184, 222, 250)";
  for (const block of level.blocks) {
    ctx.fillRect(
      block.aabb.position.x,
      block.aabb.position.y,
      block.aabb.width,
      block.aabb.height
    );
  }

  /*
  for (const boundary of gameState.boundaries) {
    ctx.fillRect(
      boundary.position.x,
      boundary.position.y,
      boundary.width,
      boundary.height
    );
  }
  */

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
