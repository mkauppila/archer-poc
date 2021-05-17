import { GameState } from "./gameLoop";

let ctx: CanvasRenderingContext2D | null = null;
let width = 0;
let height = 0;

export function init(canvas: HTMLCanvasElement) {
  ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("canvas context is null");
    return;
  }
  width = canvas.width;
  height = canvas.height;
}

export function render(alpha: number, state: GameState) {
  if (ctx === null) {
    console.error("No context for renderer");
    return;
  }

  ctx.clearRect(0, 0, width, height);

  const levelState = state.levelState;

  // render level
  const level = levelState.level;
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
    levelState.endPortal.x,
    levelState.endPortal.y,
    levelState.endPortal.width,
    levelState.endPortal.height
  );

  ctx.fillStyle = "#FF0000";
  ctx.fillRect(
    levelState.player.aabb.x + alpha * levelState.player.movement.x,
    levelState.player.aabb.y + alpha * levelState.player.movement.y,
    levelState.player.aabb.width,
    levelState.player.aabb.height
  );

  ctx.fillStyle = "#00a000";
  for (const mob of levelState.mobs) {
    ctx.fillRect(mob.aabb.x, mob.aabb.y, mob.aabb.width, mob.aabb.height);
  }

  ctx.fillStyle = "#090909";
  for (const bullet of levelState.playerBullets) {
    ctx.fillRect(
      bullet.aabb.x,
      bullet.aabb.y,
      bullet.aabb.width,
      bullet.aabb.height
    );
  }

  ctx.fillStyle = "#090909";
  for (const bullet of levelState.mobBullets) {
    ctx.fillRect(
      bullet.aabb.x,
      bullet.aabb.y,
      bullet.aabb.width,
      bullet.aabb.height
    );
  }

  for (const message of levelState.messages) {
    ctx.fillText(message.message, message.position.x, message.position.y);
  }
}
