const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname, '..', 'web');

const images = [
  { file: 'favicon-16x16.png', width: 16, height: 16 },
  { file: 'favicon-32x32.png', width: 32, height: 32 },
  { file: 'favicon-48x48.png', width: 48, height: 48 }
];

const imgBuffers = images.map(img => {
  const buf = fs.readFileSync(path.join(webDir, img.file));
  return {
    ...img,
    buf,
    size: buf.length
  };
});

// ICO Header (6 bytes)
// 0-1: 00 00 (Reserved)
// 2-3: 01 00 (Icon type)
// 4-5: Count of images (UInt16LE)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(imgBuffers.length, 4);

// Directory Entries: 16 bytes per image
const dirEntries = Buffer.alloc(16 * imgBuffers.length);
let currentOffset = 6 + (16 * imgBuffers.length);

imgBuffers.forEach((img, idx) => {
  const entryOffset = idx * 16;
  dirEntries.writeUInt8(img.width >= 256 ? 0 : img.width, entryOffset + 0);
  dirEntries.writeUInt8(img.height >= 256 ? 0 : img.height, entryOffset + 1);
  dirEntries.writeUInt8(0, entryOffset + 2); // Colors (0 = no palette)
  dirEntries.writeUInt8(0, entryOffset + 3); // Reserved
  dirEntries.writeUInt16LE(1, entryOffset + 4); // Planes
  dirEntries.writeUInt16LE(32, entryOffset + 6); // Bits per pixel
  dirEntries.writeUInt32LE(img.size, entryOffset + 8); // Image size in bytes
  dirEntries.writeUInt32LE(currentOffset, entryOffset + 12); // File offset
  currentOffset += img.size;
});

const icoBuf = Buffer.concat([
  header,
  dirEntries,
  ...imgBuffers.map(img => img.buf)
]);

fs.writeFileSync(path.join(webDir, 'favicon.ico'), icoBuf);
console.log(`Successfully generated standard multi-resolution favicon.ico (${icoBuf.length} bytes) containing 16x16, 32x32, and 48x48 PNG layers!`);
