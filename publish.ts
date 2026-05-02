import { execSync } from "child_process";

const args = process.argv.slice(2);
let tag: string | undefined;
let packages: string[];

// Check if --tag argument is provided
const tagIndex = args.indexOf('--tag');
if (tagIndex !== -1 && args[tagIndex + 1]) {
  tag = args[tagIndex + 1];
  packages = args.slice(0, tagIndex).concat(args.slice(tagIndex + 2));
} else {
  packages = args;
}

for (const pkg of packages) {
  const workDir = `packages/${pkg}`;
  const publishCommand = tag ? `npm publish --tag ${tag}` : 'npm publish';
  execSync(publishCommand, {
    cwd: workDir,
    stdio: 'inherit',
  });
}
