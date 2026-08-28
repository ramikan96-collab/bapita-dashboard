"use client";

import { useParams } from "next/navigation";
import { PageEditor } from "../../../_components/PageEditor";

export default function AdminNewPage() {
  const { id } = useParams();
  return <PageEditor businessId={id as string} />;
}
