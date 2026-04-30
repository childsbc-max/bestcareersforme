/**
 * Rank all careers by skill-vector cosine + technology Jaccard vs a reference SOC
 * (same formula as production scoring: skill-neighborhoods.json + buildSkillFootprintVector).
 *
 * Usage (from bestjobforme/):
 *   npx tsx scripts/skill-neighbor-report.ts --soc 53-2022.00 --top 50 --out reports/skill-neighbors.html
 *   npx tsx scripts/skill-neighbor-report.ts --soc 53-2022.00 --top 30
 *     (prints HTML to stdout if --out omitted)
 */

import fs from "fs";
import path from "path";

import type { Career, SkillNeighborhoodBundle } from "@/lib/types";
import { buildSkillFootprintVector, skillTechAffinity } from "@/lib/skill-neighborhoods";
import { normalizeSoc } from "@/lib/scoring";

import { parseArgs, getString, getInt } from "./eval/cli-utils";

function vecDim(bundle: SkillNeighborhoodBundle, rawSoc: string): number {
  const v = bundle.socVectors?.[rawSoc] ?? bundle.socVectors?.[normalizeSoc(rawSoc)];
  return v ? Object.keys(v).length : 0;
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function main() {
  const args = parseArgs(process.argv);
  const soc = getString(args, "soc", "").trim();
  const topN = getInt(args, "top", 50);
  const outPath = getString(args, "out", "");

  if (!soc) {
    console.error("Usage: npx tsx scripts/skill-neighbor-report.ts --soc <SOC_CODE> [--top 50] [--out path/to.html]");
    process.exit(1);
  }

  const root = process.cwd();
  const careersPath = path.join(root, "data", "careers.json");
  const bundlePath = path.join(root, "data", "skill-neighborhoods.json");

  if (!fs.existsSync(careersPath)) {
    console.error(
      `No careers file at:\n  ${careersPath}\n\n` +
        `Run this from the bestjobforme app directory (where package.json and data/ live), e.g.:\n` +
        `  cd bestjobforme\n` +
        `  npx tsx scripts/skill-neighbor-report.ts --soc 53-2022.00 --out reports/skill-neighbors.html`
    );
    process.exit(1);
  }

  if (!fs.existsSync(bundlePath)) {
    console.error(`Missing ${bundlePath}. Run: npm run build:skill-neighborhoods`);
    process.exit(1);
  }

  const careers = JSON.parse(fs.readFileSync(careersPath, "utf8")) as Career[];
  if (!Array.isArray(careers) || careers.length === 0) {
    console.error(`${careersPath} is missing or empty.`);
    process.exit(1);
  }
  const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8")) as SkillNeighborhoodBundle;

  const footprint = buildSkillFootprintVector(bundle, [soc]);
  const refDims = vecDim(bundle, soc);
  if (!footprint) {
    console.error(
      `No skill footprint for SOC "${soc}". Ensure this SOC appears in onet-by-soc.json with non-generic skills, then rebuild skill-neighborhoods.`
    );
    process.exit(1);
  }

  const ref = careers.find((c) => normalizeSoc(c.soc) === normalizeSoc(soc) || c.soc === soc);
  const refName = ref?.name ?? soc;
  const lam = bundle.lambdaSkill ?? 0.72;

  const seen = new Set<string>();
  const rows: Array<{
    soc: string;
    name: string;
    combined: number;
    skillCos: number;
    techJac: number;
    skillDims: number;
  }> = [];

  for (const c of careers) {
    const key = normalizeSoc(c.soc);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const { combined, skillCos, techJac } = skillTechAffinity(bundle, footprint, c.soc);
    rows.push({
      soc: c.soc,
      name: c.name || "",
      combined,
      skillCos,
      techJac,
      skillDims: vecDim(bundle, c.soc),
    });
  }

  rows.sort((a, b) => b.combined - a.combined);
  const slice = rows.slice(0, Math.max(1, topN));
  const emptyNotice =
    slice.length === 0
      ? `<p style="padding:1rem;background:#ffe;font-weight:600;">No rows to show (unexpected empty rankings).</p>`
      : "";

  const generated = new Date().toISOString();
  const bundleGeneratedAt =
    typeof bundle.generatedAt === "string" && bundle.generatedAt.trim()
      ? bundle.generatedAt.trim()
      : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <title>Skill / tech neighbors — ${esc(refName)} (${esc(soc)})</title>
  <style>
    :root { font-family: "Segoe UI", system-ui, sans-serif; color: #1a1a1a; background: #f5f5f0; }
    body { max-width: 1100px; margin: 0 auto; padding: 1.5rem; background: #f5f5f0; color: #1a1a1a; }
    h1 { font-size: 1.35rem; font-weight: 600; margin: 0 0 0.25rem; }
    .meta { color: #555; font-size: 0.9rem; margin-bottom: 1.25rem; }
    table { width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    th, td { text-align: left; padding: 0.5rem 0.65rem; border-bottom: 1px solid #e8e8e3; font-size: 0.88rem; }
    th { background: #efece4; font-weight: 600; position: sticky; top: 0; }
    tr:hover td { background: #fafaf8; }
    .num { font-variant-numeric: tabular-nums; text-align: right; }
    .bar-wrap { min-width: 120px; height: 8px; background: #e5e5e0; border-radius: 4px; overflow: hidden; }
    .bar { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #2d6a4f, #40916c); }
    .bar-skill { background: linear-gradient(90deg, #1d3557, #457b9d); }
    .bar-tech { background: linear-gradient(90deg, #9a6b2d, #bc8c2e); }
    caption { caption-side: bottom; padding: 0.75rem 0; color: #666; font-size: 0.8rem; text-align: left; }
  </style>
</head>
<body>
  <h1>Closest careers by skill + hot-technology metrics</h1>
  <div style="background:#e8f4fc;border:1px solid #7eb8da;padding:0.75rem 1rem;margin-bottom:1rem;border-radius:6px;font-size:0.9rem;line-height:1.5;">
    <strong>skill-neighborhoods.json</strong> snapshot: <code>${esc(bundleGeneratedAt || "— missing generatedAt; re-run build:skill-neighborhoods —")}</code><br />
    <strong>This HTML file generated:</strong> <code>${esc(generated)}</code><br />
    If results look unchanged: delete this HTML, run <code>npm run build:skill-neighborhoods</code>, run this report script again, then open the new file (or press <strong>Ctrl+F5</strong>).
  </div>
  <p class="meta">
    Reference: <strong>${esc(refName)}</strong> · SOC <code>${esc(soc)}</code><br />
    Combined score = ${lam.toFixed(2)} × skill cosine + ${(1 - lam).toFixed(2)} × technology Jaccard
    (vectors from <code>skill-neighborhoods.json</code>, derived from <code>onet-by-soc.json</code>).<br />
    Reference skill vector: <strong>${refDims}</strong> stored dimensions (includes one synthetic axis per SOC so identical O*NET skill lists no longer all show skill cosine = 1).<br />
    Showing top ${slice.length} of ${rows.length} unique occupations.
  </p>
  ${emptyNotice}
  <table>
    <caption>
      Skill cosine uses L2-normalized vectors from the build (IDF + fallback, plus a tiny per-SOC axis). Technology Jaccard uses hot-technology strings.
    </caption>
    <thead>
      <tr>
        <th>#</th>
        <th>SOC</th>
        <th>Career</th>
        <th class="num">Dims</th>
        <th class="num">Combined</th>
        <th>Combined</th>
        <th class="num">Skill cos</th>
        <th>Skill</th>
        <th class="num">Tech Jaccard</th>
        <th>Tech</th>
      </tr>
    </thead>
    <tbody>
${slice
  .map(
    (r, i) => `      <tr>
        <td class="num">${i + 1}</td>
        <td><code>${esc(r.soc)}</code></td>
        <td>${esc(r.name)}</td>
        <td class="num" title="Non-zero skill dimensions in stored vector">${r.skillDims}</td>
        <td class="num">${r.combined.toFixed(4)}</td>
        <td><div class="bar-wrap" title="combined"><div class="bar" style="width:${Math.round(r.combined * 100)}%"></div></div></td>
        <td class="num">${r.skillCos.toFixed(4)}</td>
        <td><div class="bar-wrap" title="skill cosine"><div class="bar bar-skill" style="width:${Math.round(r.skillCos * 100)}%"></div></div></td>
        <td class="num">${r.techJac.toFixed(4)}</td>
        <td><div class="bar-wrap" title="tech Jaccard"><div class="bar bar-tech" style="width:${Math.round(r.techJac * 100)}%"></div></div></td>
      </tr>`
  )
  .join("\n")}
    </tbody>
  </table>
</body>
</html>
`;

  if (outPath) {
    const resolvedOut = path.resolve(outPath);
    const dir = path.dirname(resolvedOut);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(resolvedOut, html, "utf8");
    const bytes = fs.statSync(resolvedOut).size;
    console.error(`Wrote ${bytes} bytes to:\n  ${resolvedOut}\nOpen that file in your browser (drag-and-drop onto a tab, or File → Open).`);
  } else {
    process.stdout.write(html);
  }
}

main();
