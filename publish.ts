import { execSync } from "child_process";

const packages = process.argv.slice(2);
for (const pkg of packages) {
  const workDir = `packages/${pkg}`;
  execSync('npm publish', {
    cwd: workDir,
    stdio: 'inherit',
  });
}
