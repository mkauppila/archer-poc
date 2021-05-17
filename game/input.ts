export type KeyboardState = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
};

export const keyboardState: KeyboardState = {
  left: false,
  right: false,
  up: false,
  down: false,
};

export function init(window: Window & typeof globalThis) {
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
}
