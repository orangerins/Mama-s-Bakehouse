
import { useEffect, useState } from "react";
import {
  ClipboardList,
  Package,
  ShoppingBag,
  CreditCard,
  TrendingUp,
  Clock3,
  LogOut,
  CakeSlice,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import AdminProducts from "./AdminProducts";
import AdminReadyStock from "./AdminReadyStock";
import AdminOrders from "./AdminOrders";

import "./AdminDashboard.css";
import "./AdminProducts.css";

const ADMIN_PAGES = {
  dashboard: "/admin",
  orders: "/admin/orders",
  products: "/admin/products",
  stock: "/admin/available-today",
  payments: "/admin/payments",
};

function getPageFromUrl() {
  const path =
    window.location.pathname.replace(/\/+$/, "") || "/";

  const found = Object.entries(ADMIN_PAGES).find(
    ([, url]) => url === path
  );

  return found ? found[0] : "dashboard";
}

export default function AdminDashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState(getPageFromUrl);

  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalProducts: 0,
    pendingPayments: 0,
  });

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    function handlePopState() {
      setActivePage(getPageFromUrl());
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  function navigateTo(page) {
    const url = ADMIN_PAGES[page];

    if (!url) return;

    if (window.location.pathname !== url) {
      window.history.pushState({}, "", url);
    }

    setActivePage(page);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setErrorMessage("");

      const results = await Promise.all([
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),

        supabase
          .from("products")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("payments")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

      if (!active) return;

      const failed = results.find((result) => result.error);

      if (failed) {
        setErrorMessage(failed.error.message);
      }

      setStats({
        totalOrders: results[0].count ?? 0,
        pendingOrders: results[1].count ?? 0,
        totalProducts: results[2].count ?? 0,
        pendingPayments: results[3].count ?? 0,
      });

      setLoading(false);
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const cards = [
    {
      label: "Total Orders",
      value: stats.totalOrders,
      icon: ShoppingBag,
    },
    {
      label: "Pending Orders",
      value: stats.pendingOrders,
      icon: Clock3,
    },
    {
      label: "Total Products",
      value: stats.totalProducts,
      icon: Package,
    },
    {
      label: "Pending Payments",
      value: stats.pendingPayments,
      icon: CreditCard,
    },
  ];

  const menuItems = [
    {
      page: "dashboard",
      label: "Dashboard",
      icon: TrendingUp,
    },
    {
      page: "orders",
      label: "Orders",
      icon: ClipboardList,
    },
    {
      page: "products",
      label: "Products",
      icon: CakeSlice,
    },
    {
      page: "stock",
      label: "Available Today",
      icon: Package,
    },
    {
      page: "payments",
      label: "Payments",
      icon: CreditCard,
    },
  ];

  function renderDashboard() {
    return (
      <>
        <header className="admin-header">
          <div>
            <p className="admin-kicker">
              BAKERY MANAGEMENT
            </p>

            <h1>Dashboard</h1>

            <p>
              Here's an overview of your bakery.
            </p>
          </div>

          <div className="admin-user">
            <div className="admin-avatar">
              {(user?.email?.[0] || "A").toUpperCase()}
            </div>

            <div>
              <strong>Administrator</strong>
              <span>{user?.email}</span>
            </div>
          </div>
        </header>

        {errorMessage && (
          <p className="admin-error" role="alert">
            Could not load all dashboard data:{" "}
            {errorMessage}
          </p>
        )}

        <section className="admin-stats">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                className="admin-stat-card"
                key={card.label}
              >
                <div className="admin-stat-top">
                  <span>{card.label}</span>

                  <div className="admin-stat-icon">
                    <Icon size={20} />
                  </div>
                </div>

                <strong>
                  {loading ? "..." : card.value}
                </strong>
              </div>
            );
          })}
        </section>

        <section className="admin-welcome-panel">
          <div className="admin-welcome-icon">
            <CakeSlice size={26} />
          </div>

          <h2>Welcome to Mama's Bakehouse</h2>

          <p>
            Your bakery management dashboard is ready.
            Here you'll manage customer orders, products,
            available stock, and payment verification.
          </p>

          <span>
            Dashboard overview connected to Supabase
          </span>
        </section>
      </>
    );
  }

  function renderComingSoon(title, description) {
    return (
      <>
        <header className="admin-header">
          <div>
            <p className="admin-kicker">
              BAKERY MANAGEMENT
            </p>

            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </header>

        <section className="admin-welcome-panel">
          <div className="admin-welcome-icon">
            <CakeSlice size={26} />
          </div>

          <h2>{title}</h2>

          <p>
            This management section will be developed next.
          </p>
        </section>
      </>
    );
  }

  function renderPage() {
    switch (activePage) {
      case "products":
        return <AdminProducts />;

      case "stock":
        return <AdminReadyStock />;

      case "orders":
        return <AdminOrders />;

      case "payments":
        return renderComingSoon(
          "Payments",
          "Review and verify customer payments."
        );

      default:
        return renderDashboard();
    }
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-mark">MB</div>

          <div>
            <strong>Mama's Bakehouse</strong>
            <span>ADMIN PANEL</span>
          </div>
        </div>

        <nav
          className="admin-menu"
          aria-label="Admin navigation"
        >
          <div className="admin-menu-label">
            OVERVIEW
          </div>

          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const selected = activePage === item.page;

            return (
              <div key={item.page}>
                {index === 1 && (
                  <div className="admin-menu-label">
                    MANAGEMENT
                  </div>
                )}

                <button
                  type="button"
                  className={
                    selected
                      ? "admin-menu-item selected"
                      : "admin-menu-item"
                  }
                  onClick={() => navigateTo(item.page)}
                  aria-current={
                    selected ? "page" : undefined
                  }
                  style={{
                    width: "100%",
                    border: "none",
                    textAlign: "left",
                    background: selected
                      ? "#f1ece6"
                      : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              </div>
            );
          })}
        </nav>

        <button
          type="button"
          className="admin-logout"
          onClick={onLogout}
        >
          <LogOut size={18} />
          Log Out
        </button>
      </aside>

      <main className="admin-main">
        {renderPage()}
      </main>
    </div>
  );
}
