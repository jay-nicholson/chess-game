export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main className="admin-page">
      <h1>Admin</h1>
      <p>
        If you can read this, <code>ADMIN_SECRET</code> is configured and your request was authorized.
      </p>
      <p className="admin-page__muted">
        Prefer Tailscale or Cloudflare Access for operator access; this route is a minimal escape hatch.
      </p>
    </main>
  );
}
