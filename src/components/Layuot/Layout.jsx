import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout({
  user,
  activeView,
  pageTitle,
  subtitle,
  onNavigate,
  onOpenChangePassword,
  onManualLogout,
  children,
}) {
  return (
    <div className="cpy-app-shell">
      <Header
        user={user}
        title={pageTitle}
        subtitle={subtitle}
        onOpenChangePassword={onOpenChangePassword}
        onManualLogout={onManualLogout}
      />
      <div className="cpy-workspace">
        <Sidebar
          activeView={activeView}
          onNavigate={onNavigate}
          onManualLogout={onManualLogout}
        />
        <main className="cpy-main-card">{children}</main>
      </div>
    </div>
  );
}