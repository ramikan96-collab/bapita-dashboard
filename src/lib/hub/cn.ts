import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The display sizes in globals.css (`--text-display-xl`, `--text-chapter`,
 * `--text-display-lg`) are custom `text-*` utilities. tailwind-merge doesn't
 * know them, so it filed them in the same group as the text COLOUR utilities and
 * kept only the last one — `cn("text-clay", "text-chapter")` returned
 * `text-chapter` alone, which is why the dark closing headline rendered espresso
 * on espresso and its first line was invisible. Registering them as font sizes
 * keeps colour and size in separate groups.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": ["text-display-xl", "text-display-lg", "text-chapter"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
