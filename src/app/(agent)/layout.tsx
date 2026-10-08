import type { Metadata } from 'next';
import { BackOfficeShell } from '@/components/BackOfficeShell';

export const metadata: Metadata = { title: 'FastGet Agent Dashboard' };

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <BackOfficeShell panelName="Agent Panel" logoHref="/agent-dashboard">
      {children}
    </BackOfficeShell>
  );
}
