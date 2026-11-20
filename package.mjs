// Zips the built extension (dist) with the install guide into release/stepper-<version>.zip.
// Run after `npm run build`; `npm run package` does both.
// The zip is written here with zlib instead of an external tool, so the result is the same on every OS
// (tar on Windows, Git Bash and Linux behave differently).
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { crc32, deflateRawSync } from 'node:zlib';

const { version } = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
const zipPath = `release/stepper-${version}.zip`;

/** Files in a folder, recursively, as [path inside the zip, path on disk]. */
async function listFiles(dir, prefix = '') {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = `${prefix}${entry.name}`;
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...(await listFiles(full, `${name}/`)));
    else out.push([name, full]);
  }
  return out;
}

function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

/** Minimal zip writer: deflate, UTF-8 names, no zip64 (files are small). */
function createZip(entries) {
  const { time, day } = dosDateTime(new Date());
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name, 'utf8');
    const compressed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBytes, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    // extra length, comment length, disk number, internal and external attributes stay 0
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);

    offset += local.length + nameBytes.length + compressed.length;
  }

  const centralSize = centrals.reduce((sum, b) => sum + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

const files = [...(await listFiles('dist')), ['README.md', 'INSTALL.md']];
const entries = await Promise.all(files.map(async ([name, path]) => ({ name, data: await readFile(path) })));

await mkdir('release', { recursive: true });
await rm(zipPath, { force: true });
await writeFile(zipPath, createZip(entries));
console.log(`Created ${zipPath} (${entries.length} files)`);
