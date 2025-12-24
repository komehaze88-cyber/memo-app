import { ReactNode } from "react";

interface LayoutProps {
  sidebar: ReactNode;
  editor: ReactNode;
}

export function Layout({ sidebar, editor }: LayoutProps) {
  return (
    <div className="layout">
      <aside className="layout-sidebar">{sidebar}</aside>
      <main className="layout-main">{editor}</main>
    </div>
  );
}
