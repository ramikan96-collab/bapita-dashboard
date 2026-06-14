import { en } from "./en";
import { he } from "./he";

export type Lang = "en" | "he";
export type Translations = typeof en;
export const translations: Record<Lang, Translations> = { en, he };
