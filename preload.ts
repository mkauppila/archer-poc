import * as input from "./game/input";
import * as render from "./game/render";
import { runGameLoop } from "./game/gameLoop";

window.addEventListener("DOMContentLoaded", () => {
  let canvas = document.getElementById("canvas") as HTMLCanvasElement | null;
  if (canvas) {
    render.init(canvas);
    input.init(window);
    runGameLoop();
  } else {
    // TODO: fatal error
  }
});
