// Zips the built extension (dist) with the install guide into release/stepper-<version>.zip.
// Run after `npm run build`; `npm run package` does both.
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readdir, readFile, rm } from 'node:fs/promises';

const { version } = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
const staging = 'release/stage';
const zip = `release/stepper-${version}.zip`;

await rm(staging, { recursive: true, force: true });
await rm(zip, { force: true });
await mkdir(staging, { recursive: true });
await cp('dist', staging, { recursive: true });
await cp('INSTALL.md', `${staging}/README.md`);

// bsdtar (Windows 10+, macOS) writes a zip when the archive name ends in .zip and -a is given.
const files = await readdir(staging);
execFileSync('tar', ['-a', '-c', '-f', `../${zip.slice('release/'.length)}`, ...files], {
  cwd: staging,
  stdio: 'inherit',
});
await rm(staging, { recursive: true, force: true });
console.log(`Created ${zip}`);
