import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { createVercelConfig } from "./vercel-config";

// Emit Build Output API v3, with static assets only. Never bundle server/index.ts.
const config = createVercelConfig(process.env);
await rm(".vercel/output", { recursive: true, force: true });
await mkdir(".vercel/output", { recursive: true });
await cp("dist/public", ".vercel/output/static", { recursive: true });
await writeFile(".vercel/output/config.json", JSON.stringify(config, null, 2) + "\n");
