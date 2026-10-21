import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import Header from "./Header.jsx";
import Navbar from "./Navbar.jsx";
import "./AppLayout.css";

export default function AppLayout({ onSearch }) {
  useEffect(() => {
    const theme = localStorage.getItem("theme") || "light";
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark", "theme-bball", "dark-mode");
    root.classList.add(theme === "dark" ? "theme-dark" : theme === "bball" ? "theme-bball" : "theme-light");
    if (theme === "dark") root.classList.add("dark-mode");
  }, []);
  return (
    <div className="layout">
      <header className="layout-header">
        <Header onSearch={onSearch} />
      </header>

      <aside className="layout-sidebar">
        <Navbar />
      </aside>

      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
