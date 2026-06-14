"use client";

import { useRouter } from "next/navigation";
import BusinessForm from "../_components/BusinessForm";

export default function NewBusinessPage() {
  const router = useRouter();
  return (
    <BusinessForm
      mode="new"
      onSaved={(slug) => router.push(`/admin/businesses`)}
      onCancel={() => router.push("/admin/businesses")}
    />
  );
}
