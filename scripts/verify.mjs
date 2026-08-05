import { spawn } from "node:child_process";

const commands = [
  ["npm", ["test"]],
  ["npm", ["run", "build"]],
  ["npm", ["run", "fixtures"]],
  ["npm", ["run", "check:secrets"]],
  ["npm", ["run", "check:actions"]],
];

for (const [command, args] of commands) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} exited ${code}`)));
  });
}
