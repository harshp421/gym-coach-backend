import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool, closePool } from "../src/config/dbConnect.js";
const here = dirname(fileURLToPath(import.meta.url));
async function run() {
    const files = readdirSync(here)
        .filter((f) => f.endsWith(".sql"))
        .sort();
    if (files.length === 0) {
        console.log("[migrate] no .sql files found");
        return;
    }
    for (const file of files) {
        console.log(`[migrate] applying ${file}`);
        const sql = readFileSync(join(here, file), "utf8");
        await pool.query(sql);
    }
    console.log(`[migrate] done (${files.length} file${files.length === 1 ? "" : "s"})`);
}
run()
    .catch((err) => {
    console.error("[migrate] failed:", err);
    process.exitCode = 1;
})
    .finally(() => closePool());
//# sourceMappingURL=migrate.js.map