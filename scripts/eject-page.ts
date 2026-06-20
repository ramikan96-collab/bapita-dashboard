#!/usr/bin/env npx tsx
/**
 * Usage: npm run eject <slug> --from <theme>
 * Copies a theme file to customs/<slug>.tsx, renames the component,
 * and registers it in BookingShell.tsx.
 */
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const slug = args[0];
const fromIdx = args.indexOf("--from");
const theme = fromIdx !== -1 ? args[fromIdx + 1] : "classic";

if (!slug) {
  console.error("Usage: npm run eject <slug> --from <classic|clean|dark>");
  process.exit(1);
}
if (!["classic", "clean", "dark"].includes(theme)) {
  console.error(`Unknown theme "${theme}". Must be classic, clean, or dark.`);
  process.exit(1);
}

const root = path.resolve(__dirname, "..");
const themeMap: Record<string, string> = {
  classic: "ClassicPage",
  clean:   "CleanPage",
  dark:    "DarkPage",
};
const themeName = themeMap[theme];
const srcFile = path.join(root, "src/app/[slug]/themes", theme, `${themeName}.tsx`);
const dstDir  = path.join(root, "src/app/[slug]/customs");
const dstFile = path.join(dstDir, `${slug}.tsx`);

if (!fs.existsSync(srcFile)) {
  console.error(`Source not found: ${srcFile}`);
  process.exit(1);
}

// PascalCase component name from slug: "rami-barber" → "RamiBarberPage"
const componentName =
  slug.split("-").map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join("") + "Page";

// Copy + rename exported component
let src = fs.readFileSync(srcFile, "utf8");
src = src.replaceAll(`export function ${themeName}`, `export function ${componentName}`);
fs.mkdirSync(dstDir, { recursive: true });
fs.writeFileSync(dstFile, src);
console.log(`✓ Created ${path.relative(root, dstFile)}`);

// Register in BookingShell.tsx (idempotent)
const shellFile = path.join(root, "src/app/[slug]/BookingShell.tsx");
let shell = fs.readFileSync(shellFile, "utf8");

const importLine = `import { ${componentName} } from "./customs/${slug}";`;
const registryEntry = `  "${slug}": ${componentName},`;

if (shell.includes(`"${slug}":`)) {
  console.log(`ℹ️  "${slug}" already registered in BookingShell — skipping.`);
} else {
  // Add import after last existing import
  if (!shell.includes(importLine)) {
    shell = shell.replace(
      /^(import { DemoThemeSwitcher }.*)/m,
      `$1\n${importLine}`
    );
  }
  // Add registry entry
  shell = shell.replace(
    /(const CUSTOM_PAGES: Record<string, PageComponent> = \{)/,
    `$1\n${registryEntry}`
  );
  fs.writeFileSync(shellFile, shell);
  console.log(`✓ Registered "${slug}" in BookingShell.tsx`);
}

console.log(`\nNext: edit ${path.relative(root, dstFile)} to customise the page.`);
