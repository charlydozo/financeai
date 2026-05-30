import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { FloatingChat } from '@/components/chat/FloatingChat';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <Header />
      <main style={{
        marginLeft: 'var(--sidebar-w)',
        paddingTop: 'var(--topbar-h)',
        minHeight: '100vh',
        background: 'var(--bg)',
      }}>
        {children}
      </main>
      <FloatingChat />
    </>
  );
}
