"use client";

import { useParams } from "next/navigation";
import { PageEditor } from "../../../_components/PageEditor";

export default function AdminEditPage() {
  const { id, pageId } = useParams();
  return <PageEditor businessId={id as string} pageId={pageId as string} />;
}
