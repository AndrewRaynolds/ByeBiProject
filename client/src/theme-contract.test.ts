import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");
const brandAccentSources = [
  "./pages/ExperiencesPage.tsx",
  "./components/FeaturedDestinations.tsx",
  "./components/Newsletter.tsx",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

function themeBlock(brand: "byebro" | "byebride") {
  const match = css.match(new RegExp(`html\\[data-brand="${brand}"\\] \\{([^}]+)\\}`));
  if (!match) throw new Error(`Missing ${brand} theme block`);
  return match[1];
}

describe("brand theme contract", () => {
  it.each(["byebro", "byebride"] as const)("changes only brand tokens for %s", (brand) => {
    const block = themeBlock(brand);
    expect(block).toContain("--primary:");
    expect(block).toContain("--primary-hover:");
    expect(block).toContain("--brand-soft:");
    expect(block).toContain("--focus-ring:");
    expect(block).not.toMatch(/--success|--warning|--destructive|--danger|--surface|--border/);
  });

  it("keeps feedback colors in the shared neutral foundation", () => {
    const root = css.match(/:root \{([^}]+)\}/)?.[1] ?? "";
    expect(root).toMatch(/--success:/);
    expect(root).toMatch(/--warning:/);
    expect(root).toMatch(/--destructive:/);
  });

  it("uses semantic tokens for the reviewed shared brand accents", () => {
    const source = brandAccentSources.join("\n");
    expect(source).toMatch(/bg-primary/);
    expect(source).toMatch(/text-primary/);
    expect(source).toMatch(/focus:ring-ring/);
    expect(source).not.toMatch(/(?:bg|ring|from|to)-red-(?:[1-9]00|950)/);
    expect(source).not.toMatch(/text-red-(?:600|700|800)/);
  });
});
