import { spawn } from "node:child_process"
import { getHealthyRuntimeOrigin } from "../../../scripts/dev-runtime.mjs"

const host = process.env.SITE_DEV_HOST || "127.0.0.1"
const port = String(process.env.SITE_DEV_PORT || 4321)
const appUrl = `http://${host}:${port}`

function spawnCommand(command, args, options = {}) {
  return spawn(command, args, {
    stdio: "inherit",
    ...options,
  })
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.on("error", reject)
    child.on("exit", (code, signal) => resolve({ code, signal }))
  })
}

async function hasReusableAppServer() {
  return await getHealthyRuntimeOrigin("megameal", appUrl)
}

async function keepAliveForExistingApp(origin) {
  console.log(`🍔 Reusing existing megameal dev server at: ${origin}`)

  await new Promise((resolve) => {
    const interval = setInterval(() => {}, 60_000)
    const shutdown = () => {
      clearInterval(interval)
      resolve()
    }

    process.once("SIGINT", shutdown)
    process.once("SIGTERM", shutdown)
  })
}

async function main() {
  const existingOrigin = await hasReusableAppServer()
  if (existingOrigin) {
    await keepAliveForExistingApp(existingOrigin)
    return
  }

  const astroProcess = spawnCommand("pnpm", ["astro", "dev", "--host", host, "--port", port], {
    env: process.env,
  })

  astroProcess.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exit(code ?? 0)
  })

  astroProcess.on("error", (error) => {
    console.error("❌ Failed to start megameal dev server:", error)
    process.exit(1)
  })

  process.on("SIGINT", () => astroProcess.kill("SIGINT"))
  process.on("SIGTERM", () => astroProcess.kill("SIGTERM"))
}

main().catch((error) => {
  console.error("❌ Megameal dev bootstrap failed:", error)
  process.exit(1)
})
