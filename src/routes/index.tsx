import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const LegacyApp = lazy(() => import("@/legacy/Root"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mea Dental — Clinic Management System" },
      {
        name: "description",
        content:
          "Manage clinics, patients, appointments, treatments, invoices and staff from one dental practice management platform.",
      },
      { property: "og:title", content: "Mea Dental — Clinic Management System" },
      {
        property: "og:description",
        content:
          "Multi-clinic dental management: patients, appointments, tooth charting, invoicing, inventory and staff accounting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Loading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
    </div>
  );
}

function Page() {
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <LegacyApp />
      </Suspense>
    </ClientOnly>
  );
}
