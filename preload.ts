let globalCanvas: HTMLCanvasElement;
window.addEventListener("DOMContentLoaded", () => {
  let canvas = document.getElementById("canvas") as HTMLCanvasElement | null;
  if (canvas) {
    globalCanvas = canvas;
    main();
  } else {
    // TODO: fatal error
  }
});

import * as input from "./input";
input.init(window);

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

enum MobState {
  moving,
  shooting,
}

type Mob = {
  aabb: AABB;
  movement: Vector;
  movementFn: (
    mob: Mob,
    stepDuration: number,
    input?: input.KeyboardState
  ) => void;
  state?: MobState;
  stateTimer?: number;
  weaponTimer?: number;
};

type Bullet = {
  ttl: number;
} & Mob;

type AABB = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type GameState = {
  player: Mob;
  mobs: Mob[];
  playerBullets: Bullet[];
  mobBullets: Bullet[];
  level: Level;
  boundaries: AABB[];
  endPortal: AABB;
};

const gameState: GameState = {
  player: {
    aabb: {
      x: 200,
      y: 550,
      width: 24,
      height: 24,
    },
    movement: {
      x: 0,
      y: 0,
    },
    movementFn: handlePlayerMovement,
  },
  mobs: [
    {
      aabb: {
        x: 150,
        y: 300,
        width: 24,
        height: 24,
      },
      movement: { x: 0, y: 0 },
      state: MobState.moving,
      stateTimer: 0,
      weaponTimer: 0,
      movementFn: handleMobMovementLogic,
    },
    {
      aabb: {
        x: 300,
        y: 500,
        width: 24,
        height: 24,
      },
      movement: { x: 0, y: 0 },
      state: MobState.moving,
      stateTimer: 0,
      weaponTimer: 0,
      movementFn: handleMobMovementLogic,
    },
    {
      aabb: {
        x: 200,
        y: 300,
        width: 24,
        height: 24,
      },
      movement: { x: 0, y: 0 },
      state: MobState.moving,
      stateTimer: 0,
      weaponTimer: 0,
      movementFn: handleMobMovementLogic,
    },
  ],
  endPortal: {
    x: 5 * 40,
    y: 0,
    width: 40,
    height: 40,
  },
  playerBullets: [],
  mobBullets: [],
  level: generateLevel(),
  // 4 x AABB to border the area
  boundaries: [
    // left
    {
      height: 880,
      width: 10,
      x: -10,
      y: 0,
    },
    // right
    {
      height: 8800,
      width: 10,
      x: 440,
      y: 0,
    },
    // top
    {
      height: 10,
      width: 440,
      x: 0,
      y: -10,
    },
    // bottom
    {
      height: 16,
      width: 440,
      x: 0,
      y: 880,
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
          x: x * tileWidth,
          y: y * tileHeight,
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
          x: x * tileWidth,
          y: y * tileHeight,
          width: tileWidth,
          height: tileHeight,
        },
      });

      x = 8;
      blocks.push({
        type: "wall",
        aabb: {
          x: x * tileWidth,
          y: y * tileHeight,
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

function handlePlayerMovement(
  player: Mob,
  _stepDuration: number,
  keyboardState?: input.KeyboardState
) {
  if (!keyboardState) {
    return;
  }

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

  player.aabb.x += player.movement.x;
  player.aabb.y += player.movement.y;
}

function playerIsStill(player: Mob) {
  return player.movement.x === 0 && player.movement.y == 0;
}

function createPlayerBullet(startingPoint: Vector, direction: Vector) {
  return {
    aabb: {
      x: startingPoint.x,
      y: startingPoint.y,
      width: 2,
      height: 2,
    },
    movement: {
      x: direction.x, // TODO: fix the speed, this is just the direction
      y: direction.y,
    },
    ttl: 192,
    movementFn: updateBulletMovement,
  };
}

function updateBulletMovement(
  bullet: Mob,
  _stepDuration: number,
  _keyboardState?: input.KeyboardState
) {
  bullet.aabb.x += bullet.movement.x;
  bullet.aabb.y += bullet.movement.y;

  // bullet.ttl = bullet.ttl - 1;
}

function closestMobToPlayer(player: Mob, mobs: Mob[]) {
  let closestMob = null;
  let smallestDistance = 10_000;
  for (const mob of mobs) {
    const distance = Math.sqrt(
      (player.aabb.x - mob.aabb.x) ** 2 + (player.aabb.y - mob.aabb.y) ** 2
    );
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
    x: player.aabb.x, // + player.movement.x,
    y: player.aabb.y, // + player.movement.y,
    height: player.aabb.height,
    width: player.aabb.width,
  };
  for (const boundary of boundaries) {
    if (detectCollisionBetween(updated, boundary)) {
      let dx = 0;
      let dy = 0;

      if (updated.x < boundary.x) {
        dx = boundary.x - (updated.x + updated.width);
      } else {
        dx = updated.x - (boundary.x + boundary.width);
      }

      if (updated.y < boundary.y) {
        dy = boundary.y - (updated.y + updated.height);
      } else {
        dy = updated.y - (boundary.y + boundary.height);
      }

      // collision on x-axis
      if (Math.abs(dx) < Math.abs(dy)) {
        if (player.movement.x > 0) {
          player.aabb.x += dx;
        } else {
          player.aabb.x -= dx;
        }
      } else {
        if (player.movement.y > 0) {
          player.aabb.y += dy;
        } else {
          player.aabb.y -= dy;
        }
      }

      handler(player, boundary, { x: dx, y: dy });
    }
  }
}

function handleMobMovementLogic(mob: Mob, stepDuration: number) {
  const movementTime = 1000;

  if (!mob.stateTimer) {
    mob.stateTimer = 0;
  }

  mob.stateTimer += stepDuration;

  if (mob.state === MobState.moving) {
    if (mob.stateTimer > movementTime) {
      mob.stateTimer = 0;
      mob.state = MobState.shooting;
    } else {
      if (mob.movement.x === 0 && mob.movement.y === 0) {
        mob.movement.x = Math.random() * 2 - 1;
        mob.movement.y = Math.random() * 2 - 1;
      }

      mob.aabb.x += mob.movement.x;
      mob.aabb.y += mob.movement.y;
    }
  }
}

function handleMobShootingLogic(mob: Mob, stepDuration: number) {
  const shootingTime = 1000;

  if (mob.state === MobState.shooting) {
    if (mob.stateTimer! > shootingTime) {
      mob.stateTimer = 0;
      mob.movement = { x: 0, y: 0 };
      mob.state = MobState.moving;
    }
    console.log("mob is shooting");
  }
}

function logicStep(logicFrameRateInMs: number, gameState: GameState) {
  weaponTimer += logicFrameRateInMs;

  const player = gameState.player;
  // TODO: do the actual update of player's position
  // after hte collision detection has been done (for the future state)
  // handlePlayerMovement(player, logicFrameRateInMs, input.keyboardState);
  player.movementFn(player, logicFrameRateInMs, input.keyboardState);

  for (const mob of [...gameState.mobs, player]) {
    mob.movementFn(mob, logicFrameRateInMs, undefined);
  }

  isMobCollidingWithBoundaries(
    player,
    [...gameState.boundaries, ...gameState.level.blocks.map((b) => b.aabb)],
    () => {}
  );

  for (const mob of gameState.mobs) {
    isMobCollidingWithBoundaries(
      mob,
      [...gameState.boundaries, ...gameState.level.blocks.map((b) => b.aabb)],
      () => {}
    );
  }

  if (
    detectCollisionBetween(player.aabb, gameState.endPortal) &&
    gameState.mobs.length === 0
  ) {
    // TODO Generate another level!
  }

  for (const mob of gameState.mobs) {
    handleMobShootingLogic(mob, logicFrameRateInMs);
  }

  if (playerIsStill(player) && weaponTimer >= weaponSpeedInMs) {
    weaponTimer = 0;
    const closestMob = closestMobToPlayer(player, gameState.mobs);
    if (closestMob) {
      const directionX = closestMob.aabb.x - player.aabb.x;
      const directionY = closestMob.aabb.y - player.aabb.y;
      const lenght = Math.sqrt(directionX ** 2 + directionY ** 2);
      const normDirX = directionX / lenght;
      const normDirY = directionY / lenght;

      gameState.playerBullets.push(
        createPlayerBullet(
          {
            x: player.aabb.x + player.aabb.width / 2,
            y: player.aabb.y + player.aabb.height / 2,
          },
          {
            x: normDirX,
            y: normDirY,
          }
        )
      );
    }
  }

  for (const mob of gameState.mobs) {
    mob.weaponTimer! += logicFrameRateInMs;

    if (mob.state === MobState.shooting && mob.weaponTimer! > weaponSpeedInMs) {
      mob.weaponTimer = 0;
      const directionX = player.aabb.x - mob.aabb.x;
      const directionY = player.aabb.y - mob.aabb.y;
      const lenght = Math.sqrt(directionX ** 2 + directionY ** 2);
      const normDirX = directionX / lenght;
      const normDirY = directionY / lenght;

      gameState.mobBullets.push(
        createPlayerBullet(
          {
            x: mob.aabb.x + mob.aabb.width / 2,
            y: mob.aabb.y + mob.aabb.height / 2,
          },
          {
            x: normDirX,
            y: normDirY,
          }
        )
      );
    }
  }
  for (const bullet of [...gameState.playerBullets, ...gameState.mobBullets]) {
    bullet.movementFn(bullet, logicFrameRateInMs);
  }

  for (const bullet of gameState.playerBullets) {
    bullet.ttl -= 1;
  }

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

  for (const bullet of gameState.mobBullets) {
    if (detectCollisionBetween(player.aabb, bullet.aabb)) {
      console.log("player got hit!");
    }
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

  // Set up here!

  while (loopState.accumulator >= logicFrameRateInMs) {
    logicStep(logicFrameRateInMs, gameState);

    loopState.accumulator -= logicFrameRateInMs;
  }

  const alpha = loopState.accumulator / logicFrameRateInMs;
  render(globalCanvas, alpha, gameState);
}

function detectCollisionBetween(lhs: AABB, rhs: AABB) {
  return (
    lhs.x < rhs.x + rhs.width &&
    lhs.x + lhs.width > rhs.x &&
    lhs.y < rhs.y + rhs.height &&
    lhs.y + lhs.height > rhs.y
  );
}

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
      block.aabb.x,
      block.aabb.y,
      block.aabb.width,
      block.aabb.height
    );
  }

  ctx.fillStyle = "rgb(119, 67, 67)";
  ctx.fillRect(
    gameState.endPortal.x,
    gameState.endPortal.y,
    gameState.endPortal.width,
    gameState.endPortal.height
  );

  ctx.fillStyle = "#FF0000";
  ctx.fillRect(
    gameState.player.aabb.x + alpha * gameState.player.movement.x,
    gameState.player.aabb.y + alpha * gameState.player.movement.y,
    gameState.player.aabb.width,
    gameState.player.aabb.height
  );

  ctx.fillStyle = "#00a000";
  for (const mob of gameState.mobs) {
    ctx.fillRect(mob.aabb.x, mob.aabb.y, mob.aabb.width, mob.aabb.height);
  }

  ctx.fillStyle = "#090909";
  for (const bullet of gameState.playerBullets) {
    ctx.fillRect(
      bullet.aabb.x,
      bullet.aabb.y,
      bullet.aabb.width,
      bullet.aabb.height
    );
  }

  ctx.fillStyle = "#090909";
  for (const bullet of gameState.mobBullets) {
    ctx.fillRect(
      bullet.aabb.x,
      bullet.aabb.y,
      bullet.aabb.width,
      bullet.aabb.height
    );
  }
}
