"use client";

import { useParams, useRouter } from "next/navigation";
import BusinessForm from "../_components/BusinessForm";

export default function EditBusinessPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  return (
    <BusinessForm
      mode="edit"
      businessId={id}
      onSaved={() => router.push("/admin/businesses")}
      onCancel={() => router.push("/admin/businesses")}
    />
  );
}
