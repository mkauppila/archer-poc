import { GameState } from "./gameLoop";
import * as input from "./input";

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
  health: number;
  state?: MobState;
  stateTimer?: number;
  weaponTimer?: number;
};

type Bullet = {
  ttl: number;
} & Mob;

export type AABB = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Message = {
  position: Vector;
  message: string;
  timer: number;
};

export type LevelState = {
  player: Mob;
  mobs: Mob[];
  playerBullets: Bullet[];
  mobBullets: Bullet[];
  level: Level;
  endPortal: AABB;
  messages: Message[];
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

export function createLevelState(): LevelState {
  return {
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
      health: 100,
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
        health: 40,
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
        health: 40,
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
        health: 40,
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
    messages: [],
  };
}

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
    health: 40,
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
  }
}

function detectCollisionBetween(lhs: AABB, rhs: AABB) {
  return (
    lhs.x < rhs.x + rhs.width &&
    lhs.x + lhs.width > rhs.x &&
    lhs.y < rhs.y + rhs.height &&
    lhs.y + lhs.height > rhs.y
  );
}

export function logicStep(logicFrameRateInMs: number, state: GameState) {
  weaponTimer += logicFrameRateInMs;

  const levelState = state.levelState;

  const player = levelState.player;
  // TODO: do the actual update of player's position
  // after hte collision detection has been done (for the future state)
  // handlePlayerMovement(player, logicFrameRateInMs, input.keyboardState);
  player.movementFn(player, logicFrameRateInMs, input.keyboardState);

  for (const mob of [...levelState.mobs, player]) {
    mob.movementFn(mob, logicFrameRateInMs, undefined);
  }

  isMobCollidingWithBoundaries(
    player,
    [...state.boundaries, ...levelState.level.blocks.map((b) => b.aabb)],
    () => {}
  );

  for (const mob of levelState.mobs) {
    isMobCollidingWithBoundaries(
      mob,
      [...state.boundaries, ...levelState.level.blocks.map((b) => b.aabb)],
      () => {}
    );
  }

  if (
    detectCollisionBetween(player.aabb, levelState.endPortal) &&
    levelState.mobs.length === 0
  ) {
    state.levelState = createLevelState();
  }

  for (const mob of levelState.mobs) {
    handleMobShootingLogic(mob, logicFrameRateInMs);
  }

  if (playerIsStill(player) && weaponTimer >= weaponSpeedInMs) {
    weaponTimer = 0;
    const closestMob = closestMobToPlayer(player, levelState.mobs);
    if (closestMob) {
      const directionX = closestMob.aabb.x - player.aabb.x;
      const directionY = closestMob.aabb.y - player.aabb.y;
      const lenght = Math.sqrt(directionX ** 2 + directionY ** 2);
      const normDirX = directionX / lenght;
      const normDirY = directionY / lenght;

      levelState.playerBullets.push(
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

  for (const mob of levelState.mobs) {
    mob.weaponTimer! += logicFrameRateInMs;

    if (mob.state === MobState.shooting && mob.weaponTimer! > weaponSpeedInMs) {
      mob.weaponTimer = 0;
      const directionX = player.aabb.x - mob.aabb.x;
      const directionY = player.aabb.y - mob.aabb.y;
      const lenght = Math.sqrt(directionX ** 2 + directionY ** 2);
      const normDirX = directionX / lenght;
      const normDirY = directionY / lenght;

      levelState.mobBullets.push(
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
  for (const bullet of [
    ...levelState.playerBullets,
    ...levelState.mobBullets,
  ]) {
    bullet.movementFn(bullet, logicFrameRateInMs);
  }

  for (const bullet of [
    ...levelState.playerBullets,
    ...levelState.mobBullets,
  ]) {
    bullet.ttl -= 1;
  }

  // player vs mob bullets
  for (const bullet of levelState.mobBullets) {
    if (detectCollisionBetween(player.aabb, bullet.aabb)) {
      levelState.messages.push({
        message: "-10",
        position: { x: player.aabb.x, y: player.aabb.y },
        timer: 0,
      });
      player.health -= 10;
      if (player.health < 0) {
        state.levelState = createLevelState();
      }
    }
  }

  for (const playerBullet of levelState.playerBullets) {
    isMobCollidingWithBoundaries(
      playerBullet,
      [...state.boundaries, ...levelState.level.blocks.map((b) => b.aabb)],
      (bullet, _target, delta) => {
        if (delta.x > delta.y) {
          bullet.movement.x = -bullet.movement.x;
        } else {
          bullet.movement.y = -bullet.movement.y;
        }
      }
    );
  }

  for (const mobBullet of levelState.mobBullets) {
    isMobCollidingWithBoundaries(
      mobBullet,
      [...state.boundaries, ...levelState.level.blocks.map((b) => b.aabb)],
      (bullet, _target, delta) => {
        if (delta.x > delta.y) {
          bullet.movement.x = -bullet.movement.x;
        } else {
          bullet.movement.y = -bullet.movement.y;
        }
      }
    );
  }

  // mob vs player bullets
  let destroyedMobIndexes: number[] = [];
  for (const mobIndex in levelState.mobs) {
    const mob = levelState.mobs[mobIndex];
    for (const bullet of levelState.playerBullets) {
      if (detectCollisionBetween(mob.aabb, bullet.aabb)) {
        levelState.messages.push({
          message: "-10",
          position: { x: mob.aabb.x, y: mob.aabb.y },
          timer: 0,
        });

        mob.health -= 10;
        console.log("mob health ", mob.health);
        if (mob.health < 0) {
          destroyedMobIndexes.push(mobIndex as any);
        }
      }
    }
  }
  for (const index of destroyedMobIndexes.reverse()) {
    levelState.mobs.splice(index, 1);
  }

  // player bullets
  let deleteIndexes: number[] = [];
  for (const bulletIndex in levelState.playerBullets) {
    if (levelState.playerBullets[bulletIndex].ttl <= 0) {
      deleteIndexes.push(bulletIndex as any);
    }
  }
  for (const index of deleteIndexes.reverse()) {
    levelState.playerBullets.splice(index, 1);
  }

  // mob bullets
  deleteIndexes = [];
  for (const bulletIndex in levelState.mobBullets) {
    if (levelState.mobBullets[bulletIndex].ttl <= 0) {
      deleteIndexes.push(bulletIndex as any);
    }
  }
  for (const index of deleteIndexes.reverse()) {
    levelState.mobBullets.splice(index, 1);
  }

  // update messages
  const deleteMessageIndexes: number[] = [];
  for (const idx in levelState.messages) {
    const message = levelState.messages[idx];
    message.timer += logicFrameRateInMs;

    if (message.timer > 500) {
      deleteMessageIndexes.push(idx as any);
    }
  }
  for (const index of deleteMessageIndexes.reverse()) {
    levelState.messages.splice(index, 1);
  }
}
