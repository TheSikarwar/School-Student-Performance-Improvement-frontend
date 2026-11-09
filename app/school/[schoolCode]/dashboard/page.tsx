import { Suspense } from "react";
import SchoolDashboardClient from "./SchoolDashboardClient";

export default function SchoolDashboardRoute() {
  return (
    <Suspense fallback={<main>Verifying your school access...</main>}>
      <SchoolDashboardClient />
    </Suspense>
  );
}