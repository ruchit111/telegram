const path = require("path");
const { spawn } = require("child_process");

async function start() {
  console.log("Local: http://localhost:5173/");

  const backend = spawn(process.execPath, ["server.js"], {
    cwd: path.resolve(__dirname, "..", "backend"),
    stdio: "inherit",
  });

  backend.on("error", (error) => {
    console.error("Unable to start the backend:", error.message);
  });

  const { createServer } = await import("vite");
  const server = await createServer({
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
    },
  });

  await server.listen();
  const localUrl = "http://localhost:5173/";
  process.stdout.write(`\n  Local:   ${localUrl}\n`);
  process.stdout.write("  Network: server listening on all local interfaces\n\n");

  const shutdown = async () => {
    backend.kill();
    await server.close();
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  process.stdin.resume();
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});