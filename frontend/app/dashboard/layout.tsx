// Dashboard layout is now handled by AuthLayout in providers
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
