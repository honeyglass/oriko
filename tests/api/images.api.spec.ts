import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import { squarePhoto } from '../../classic/images.ts';

const RED = [255, 0, 0, 255];
const BLUE = [0, 0, 255, 255];

// A picture whose left half is red and whose right half is blue.
const halves = (width: number, height: number) => {
  const data = new Uint8Array(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++)
    data.set(pixel % width < width / 2 ? RED : BLUE, pixel * 4);
  return { width, height, data };
};

const png = ({ width, height, data }: ReturnType<typeof halves>) => {
  const image = new PNG({ width, height });
  image.data = Buffer.from(data);
  return PNG.sync.write(image);
};

const pixel = (image: PNG, x: number, y: number) => [
  ...image.data.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 4),
];

// The picture as a file the person names, and the square PNG squarePhoto answers for it.
const squared = async (bytes: Uint8Array) => {
  const path = join(mkdtempSync(join(tmpdir(), 'oriko-picture-')), 'picture');
  writeFileSync(path, bytes);
  const square = await squarePhoto(path);
  if (Array.isArray(square)) throw new Error(`the picture was refused: ${square[0].code}`);
  return PNG.sync.read(Buffer.from(square));
};

test('cuts the middle square out of a wide photo', async () => {
  const square = await squared(png(halves(40, 20)));
  assert.deepEqual([square.width, square.height], [20, 20]);
  assert.deepEqual([pixel(square, 0, 0), pixel(square, 19, 19)], [RED, BLUE]);
});

test('shrinks a large photo to 600 pixels', async () => {
  const square = await squared(png(halves(1300, 1200)));
  assert.deepEqual([square.width, square.height], [600, 600]);
  assert.deepEqual([pixel(square, 0, 300), pixel(square, 599, 300)], [RED, BLUE]);
});

test('reads a JPEG and answers a PNG', async () => {
  const photo = jpeg.encode({ ...halves(40, 40), data: Buffer.from(halves(40, 40).data) }, 90).data;
  const square = await squared(photo);
  assert.deepEqual([square.width, square.height], [40, 40]);
});
