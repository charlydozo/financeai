import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
     * Outer wrapper: display:flex but NO overflow-hidden here,
     * so sidebar tooltips can overflow to the right without being clipped.
     * overflow:hidden lives on the inner content column only.
     */
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Header />
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
