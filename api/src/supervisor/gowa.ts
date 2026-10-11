import { existsSync } from "fs";
import { join } from "path";
import type { Subprocess } from "bun";

const GOWA_PORT = 3002;
const GOWA_HOST = "127.0.0.1";
const GOWA_AUTH = "admin:whatsremind";

let gowaProcess: Subprocess | null = null;

export const gowaConfig = {
  host: GOWA_HOST,
  port: GOWA_PORT,
  auth: GOWA_AUTH,
  baseUrl: `http://${GOWA_HOST}:${GOWA_PORT}`,
};

function getBinaryPath(): string {
  // Check api/bin/whatsapp or bin/whatsapp relative to cwd
  const candidates = [
    join(process.cwd(), "bin", "whatsapp"),
    join(process.cwd(), "..", "bin", "whatsapp"),
    join(process.cwd(), "api", "bin", "whatsapp"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return join(process.cwd(), "bin", "whatsapp");
}

export function isGowaRunning(): boolean {
  return gowaProcess !== null && gowaProcess.exitCode === null;
}

export async function ensureGowaStarted(): Promise<boolean> {
  if (isGowaRunning()) {
    return true;
  }

  // Check if GOWA is already running on port 3002 externally
  try {
    const res = await fetch(`${gowaConfig.baseUrl}/devices`, {
      headers: {
        Authorization: `Basic ${Buffer.from(GOWA_AUTH).toString("base64")}`,
      },
      signal: AbortSignal.timeout(1000),
    });
    if (res.ok) {
      return true;
    }
  } catch {
    // Port not open yet, proceed to spawn
  }

  const binary = getBinaryPath();
  if (!existsSync(binary)) {
    console.warn(`[GOWA] Binary not found at: ${binary}`);
    return false;
  }

  try {
    gowaProcess = Bun.spawn(
      [
        binary,
        "rest",
        `--host=${GOWA_HOST}`,
        `--port=${GOWA_PORT}`,
        `--basic-auth=${GOWA_AUTH}`,
        "--ui-enabled=false",
        "--db-uri=file:storages/whatsapp.db",
      ],
      {
        cwd: process.cwd().endsWith("api") ? join(process.cwd(), "..") : process.cwd(),
        stdout: "ignore",
        stderr: "inherit",
      }
    );

    // Wait up to 3 seconds for server to respond
    for (let i = 0; i < 15; i++) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      try {
        const ping = await fetch(`${gowaConfig.baseUrl}/devices`, {
          headers: {
            Authorization: `Basic ${Buffer.from(GOWA_AUTH).toString("base64")}`,
          },
          signal: AbortSignal.timeout(500),
        });
        if (ping.ok) {
          console.log(`[GOWA] Service successfully started on ${gowaConfig.baseUrl}`);
          return true;
        }
      } catch {
        // continue polling
      }
    }

    return isGowaRunning();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[GOWA] Failed to spawn process: ${message}`);
    return false;
  }
}

export function stopGowa(): void {
  if (gowaProcess && gowaProcess.exitCode === null) {
    try {
      gowaProcess.kill();
      gowaProcess = null;
      console.log("[GOWA] Service stopped");
    } catch {
      // ignore kill errors
    }
  }
}

// Ensure cleanup on parent process exit
process.on("SIGINT", () => {
  stopGowa();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopGowa();
  process.exit(0);
});
