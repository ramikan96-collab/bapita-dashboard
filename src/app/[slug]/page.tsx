import { renderTenantPage, tenantMetadata } from "./tenant-page";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BookPage({ params }: Props) {
  const { slug } = await params;
  return renderTenantPage(slug);
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return tenantMetadata(slug);
}
