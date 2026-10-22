import { renderTenantPage, tenantMetadata } from "../tenant-page";

export const dynamic = "force-dynamic";

// The Hebrew URL of a business homepage. Only a business with a brand copy pack
// (lib/brand-copy) has one; for everyone else this 404s, exactly as
// /<slug>/he did before this route existed.

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BookPageHe({ params }: Props) {
  const { slug } = await params;
  return renderTenantPage(slug, "he");
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return tenantMetadata(slug, "he");
}
