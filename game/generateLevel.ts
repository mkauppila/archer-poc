import { AABB } from "./gameplay";

export type Level = {
  blocks: Block[];
  tileWidthInPx: number;
  tileHeightInPx: number;
  widthInTiles: number;
  heightInTiles: number;
};

export type Block = {
  type: "wall";
  aabb: AABB;
};

export function generateLevel(): Level {
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
