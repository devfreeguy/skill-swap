"use client";

import dynamic from "next/dynamic";

const PendingAnchorChecker = dynamic(
  () => import("@/components/layouts/PendingAnchorChecker"),
  { ssr: false }
);

export default function PendingAnchorCheckerLoader() {
  return <PendingAnchorChecker />;
}
