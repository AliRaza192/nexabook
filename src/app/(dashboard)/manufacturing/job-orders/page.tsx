"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JobOrdersListPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/manufacturing/job-orders/new");
  }, [router]);

  return null;
}
