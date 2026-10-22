"use client";

import { createContext, useContext } from "react";

/**
 * Per-photo alt text for whatever page is rendering, looked up by image URL.
 *
 * Only a business with a brand copy pack provides one (lib/brand-copy); for
 * everyone else the default answers nothing and each image keeps the alt it
 * had before. A context rather than a prop because the same photo shows up in
 * the hero, the unit cards, the gallery grid and the lightbox, several
 * components apart.
 */
const PhotoAltContext = createContext<(src: string) => string | undefined>(() => undefined);

export const PhotoAltProvider = PhotoAltContext.Provider;

export function usePhotoAlt() {
  return useContext(PhotoAltContext);
}
