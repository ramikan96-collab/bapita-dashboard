import { renderExtraPage, extraPageMetadata } from "./extra-page";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string; page: string }>;
}

export default async function ExtraPage({ params }: Props) {
  const { slug, page } = await params;
  return renderExtraPage(slug, page);
}

export async function generateMetadata({ params }: Props) {
  const { slug, page } = await params;
  return extraPageMetadata(slug, page);
}
