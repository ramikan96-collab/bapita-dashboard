"use client";

import { useParams } from "next/navigation";
import { PagesList } from "../../_components/PagesList";

export default function AdminPagesListPage() {
  const { id } = useParams();
  return <PagesList businessId={id as string} />;
}
