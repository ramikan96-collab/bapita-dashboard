import { renderExtraPage, extraPageMetadata } from "../../[page]/extra-page";

export const dynamic = "force-dynamic";

// The Hebrew URL of an extra page. Only a business with a brand copy pack
// (lib/brand-copy) has one; for everyone else this 404s, exactly as
// /<slug>/he/<page> did before this route existed.

interface Props {
  params: Promise<{ slug: string; page: string }>;
}

export default async function ExtraPageHe({ params }: Props) {
  const { slug, page } = await params;
  return renderExtraPage(slug, page, "he");
}

export async function generateMetadata({ params }: Props) {
  const { slug, page } = await params;
  return extraPageMetadata(slug, page, "he");
}
