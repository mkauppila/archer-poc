import { AABB, createLevelState, LevelState, logicStep } from "./gameplay";
import { render } from "./render";

const loopState = {
  time: 0.0,
  deltaTime: 0.01,
  currentTime: Date.now(),
  accumulator: 0.0,
};

const logicFrameRateInMs = 10;

// The state for the whole game
// Basically, WorldState
export type GameState = {
  levelState: LevelState;
  boundaries: AABB[];
};

const gameState: GameState = {
  levelState: createLevelState(),
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

export function runGameLoop() {
  requestAnimationFrame(runGameLoop);

  const newTime = Date.now();
  let frameTime = newTime - loopState.currentTime;
  if (frameTime > logicFrameRateInMs * 2) {
    frameTime = logicFrameRateInMs * 2;
  }
  loopState.currentTime = newTime;

  loopState.accumulator += frameTime;

  while (loopState.accumulator >= logicFrameRateInMs) {
    logicStep(logicFrameRateInMs, gameState);

    loopState.accumulator -= logicFrameRateInMs;
  }

  const alpha = loopState.accumulator / logicFrameRateInMs;

  render(alpha, gameState);
}
