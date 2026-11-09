
import { Suspense } from "react";
import LoginForm from "./LoginForm";

type PageProps = {
  params: Promise<{
    schoolCode: string;
  }>;
};

async function SchoolLogin({ params }: PageProps) {
  const { schoolCode } = await params;

  return <LoginForm schoolCode={schoolCode} />;
}

export default function LoginPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="auth-page">
          <section className="auth-form-panel">
            <p>Loading school login...</p>
          </section>
        </main>
      }
    >
      <SchoolLogin params={params} />
    </Suspense>
  );
}
