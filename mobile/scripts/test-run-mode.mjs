import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test, { after } from "node:test";
import ts from "typescript";

const directory = await mkdtemp(join(tmpdir(), "madger-mode-tests-"));
after(() => rm(directory, { recursive: true, force: true }));
for (const name of ["burrowRun", "runRecovery", "gameProfile"]) {
  const source = await readFile(new URL(`../src/lib/${name}.ts`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace(/from "\.\/(\w+)"/g, 'from "./$1.mjs"');
  await writeFile(join(directory, name + ".mjs"), compiled);
}
const p = await import(pathToFileURL(join(directory, "gameProfile.mjs")));
const rules = await import(pathToFileURL(join(directory, "burrowRun.mjs")));

test("only qualifying Daily runs earn field marks and the daily achievement", () => {
  let profile = p.emptyProfile();
  for (const [index, day] of ["2026-10-10", "2026-10-11", "2026-10-12"].entries()) {
    const stats = { ...rules.freshRun(), score: 5000, signals: 30, bestStreak: 20 };
    const details = { day, finishedAt: `${day}T12:00:00Z`, seconds: 60, reason: "time" };
    const classic = p.makeSavedRun(stats, { ...details, id: `classic-${index}`, mode: "classic" });
    profile = p.addCompletedRun(profile, classic);
    assert.equal(profile.record.marks.length, index);
    assert.equal(profile.highScores.filter(run => run.mode === "classic").length, index + 1);
    const incomplete = p.makeSavedRun(rules.freshRun(), { ...details, id: `incomplete-${index}`, mode: "daily" });
    profile = p.addCompletedRun(profile, incomplete);
    assert.equal(profile.record.marks.length, index);
    const daily = p.makeSavedRun(stats, { ...details, id: `daily-${index}`, mode: "daily" });
    profile = p.addCompletedRun(profile, daily);
    assert.equal(profile.record.marks.length, index + 1);
    assert.equal(p.addCompletedRun(profile, daily), profile);
  }
  const markAchievement = p.achievementsFor(profile).find(item => item.target === 3 && item.detail.includes("daily field marks"));
  assert.ok(markAchievement);
  assert.equal(markAchievement.value, 3);
  assert.equal(profile.record.runs, 9);
});
