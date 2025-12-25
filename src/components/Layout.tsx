import { ReactNode, useState, useEffect } from "react";

interface LayoutProps {
  sidebar: ReactNode;
  editor: ReactNode;
}

const MOBILE_BREAKPOINT = 768;

export function Layout({ sidebar, editor }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  return (
    <div className={`layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {isMobile && sidebarCollapsed && (
        <button
          className="sidebar-toggle sidebar-toggle-open"
          onClick={toggleSidebar}
          aria-label="Open sidebar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}
      {isMobile && !sidebarCollapsed && (
        <div className="sidebar-overlay" onClick={toggleSidebar} />
      )}
      <aside className={`layout-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        {!isMobile && (
          <button
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarCollapsed ? (
                <polyline points="9 18 15 12 9 6" />
              ) : (
                <polyline points="15 18 9 12 15 6" />
              )}
            </svg>
          </button>
        )}
        {isMobile && !sidebarCollapsed && (
          <button
            className="sidebar-toggle sidebar-toggle-close"
            onClick={toggleSidebar}
            aria-label="Close sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        {sidebar}
      </aside>
      <main className="layout-main">{editor}</main>
    </div>
  );
}
