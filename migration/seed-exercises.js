import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { closePool, pool } from "../src/config/dbConnect.js";
const here = dirname(fileURLToPath(import.meta.url));
const dataPath = join(here, "..", "data", "exercises.json");
// Images live in the dataset repo; we store absolute URLs.
const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";
function slugify(s) {
    return s
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}
function externalIdFor(ex) {
    // Dataset's id is sometimes the folder name, sometimes missing.
    // The first image's directory matches the folder when present.
    if (ex.id)
        return ex.id;
    const firstImage = ex.images?.[0];
    if (firstImage)
        return firstImage.split("/")[0];
    return slugify(ex.name);
}
async function main() {
    const json = readFileSync(dataPath, "utf8");
    const data = JSON.parse(json);
    console.log(`[seed] loaded ${data.length} exercises from JSON`);
    const seenSlugs = new Set();
    const seenExternal = new Set();
    let inserted = 0;
    let updated = 0;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (const ex of data) {
            const externalId = externalIdFor(ex);
            if (seenExternal.has(externalId))
                continue;
            seenExternal.add(externalId);
            // Disambiguate slug collisions by suffixing with the external id.
            let slug = slugify(ex.name);
            if (seenSlugs.has(slug)) {
                slug = `${slug}-${slugify(externalId).slice(-8)}`;
            }
            seenSlugs.add(slug);
            const level = ex.level === "expert" ? "advanced" : ex.level;
            const images = (ex.images ?? []).map((p) => `${IMAGE_BASE}/${p}`);
            const category = ex.category ?? "strength";
            const result = await client.query(`INSERT INTO exercises (
                    external_id, slug, name, force, level, mechanic,
                    equipment, category, primary_muscles, secondary_muscles,
                    instructions, image_urls
                 ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
                 )
                 ON CONFLICT (external_id) DO UPDATE SET
                    slug              = EXCLUDED.slug,
                    name              = EXCLUDED.name,
                    force             = EXCLUDED.force,
                    level             = EXCLUDED.level,
                    mechanic          = EXCLUDED.mechanic,
                    equipment         = EXCLUDED.equipment,
                    category          = EXCLUDED.category,
                    primary_muscles   = EXCLUDED.primary_muscles,
                    secondary_muscles = EXCLUDED.secondary_muscles,
                    instructions      = EXCLUDED.instructions,
                    image_urls        = EXCLUDED.image_urls
                 RETURNING (xmax = 0) AS was_insert`, [
                externalId,
                slug,
                ex.name,
                ex.force ?? null,
                level,
                ex.mechanic ?? null,
                ex.equipment ?? null,
                category,
                ex.primaryMuscles ?? [],
                ex.secondaryMuscles ?? [],
                ex.instructions ?? [],
                images,
            ]);
            if (result.rows[0].was_insert)
                inserted++;
            else
                updated++;
        }
        await client.query("COMMIT");
        console.log(`[seed] inserted ${inserted}, updated ${updated}`);
    }
    catch (err) {
        await client.query("ROLLBACK");
        throw err;
    }
    finally {
        client.release();
    }
}
main()
    .catch((err) => {
    console.error("[seed] failed:", err);
    process.exitCode = 1;
})
    .finally(() => closePool());
//# sourceMappingURL=seed-exercises.js.map