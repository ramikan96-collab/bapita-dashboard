"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import BusinessForm from "../_components/BusinessForm";

export default function EditBusinessPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  return (
    <>
      {/* Extra pages live on their own screen — BusinessForm is already 2,600 lines. */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "16px 16px 0", display: "flex", justifyContent: "flex-end" }}>
        <Link
          href={`/admin/businesses/${id}/pages`}
          style={{
            fontSize: 13, fontWeight: 700, color: "var(--color-dark)", textDecoration: "none",
            border: "1.5px solid var(--color-cream-2)", borderRadius: 10, padding: "8px 14px",
          }}
        >
          Pages →
        </Link>
      </div>
      <BusinessForm
        mode="edit"
        businessId={id}
        onSaved={() => router.push("/admin/businesses")}
        onCancel={() => router.push("/admin/businesses")}
      />
    </>
  );
}
