
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
  BarChart3,
} from "lucide-react";

import { supabase } from "../lib/supabase";

import AdminProducts from "./AdminProducts";
import AdminReadyStock from "./AdminReadyStock";
import AdminOrders from "./AdminOrders";
import AdminPayments from "./AdminPayments";
import AdminSalesReports from "./AdminSalesReports";
import WeatherForecast from "./WeatherForecast";
import PhilippineHolidays from "./PhilippineHolidays";

import "./AdminDashboard.css";
import "./AdminProducts.css";

// ========================================
// ADMIN ROUTES
// ========================================

const ADMIN_PAGES = {
  dashboard: "/admin",
  reports: "/admin/reports",
  orders: "/admin/orders",
  products: "/admin/products",
  stock: "/admin/available-today",
  payments: "/admin/payments",
};

// ========================================
// GET PAGE FROM URL
// ========================================

function getPageFromUrl() {
  const path =
    window.location.pathname.replace(/\/+$/, "") || "/";

  switch (path) {
    case "/admin":
      return "dashboard";

    case "/admin/reports":
      return "reports";

    case "/admin/orders":
      return "orders";

    case "/admin/products":
      return "products";

    case "/admin/available-today":
      return "stock";

    case "/admin/payments":
      return "payments";

    default:
      return "dashboard";
  }
}

// ========================================
// ADMIN DASHBOARD
// ========================================

export default function AdminDashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState(
    () => getPageFromUrl()
  );

  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalProducts: 0,
    pendingPayments: 0,
  });

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // ========================================
  // SYNCHRONIZE URL
  // ========================================

  useEffect(() => {
    function syncPageWithUrl() {
      setActivePage(getPageFromUrl());
    }

    syncPageWithUrl();

    window.addEventListener(
      "popstate",
      syncPageWithUrl
    );

    return () => {
      window.removeEventListener(
        "popstate",
        syncPageWithUrl
      );
    };
  }, []);

  // ========================================
  // NAVIGATION
  // ========================================

  function navigateTo(page) {
    const targetUrl = ADMIN_PAGES[page];

    if (!targetUrl) return;

    setActivePage(page);

    if (window.location.pathname !== targetUrl) {
      window.location.assign(targetUrl);
    } else {
      window.location.reload();
    }
  }

  // ========================================
  // LOAD DASHBOARD STATISTICS
  // ========================================

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setErrorMessage("");

      try {
        const results = await Promise.all([
          // TOTAL REAL ORDERS
          supabase
            .from("orders")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("is_test", false),

          // PENDING REAL ORDERS
          supabase
            .from("orders")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("status", "pending")
            .eq("is_test", false),

          // TOTAL PRODUCTS
          supabase
            .from("products")
            .select("id", {
              count: "exact",
              head: true,
            }),

          // PENDING REAL PAYMENTS
          supabase
            .from("payments")
            .select("id, orders!inner(is_test)", {
              count: "exact",
              head: true,
            })
            .eq("status", "pending")
            .eq("orders.is_test", false),
        ]);

        if (!active) return;

        const failed = results.find(
          (result) => result.error
        );

        if (failed) {
          setErrorMessage(failed.error.message);
        }

        setStats({
          totalOrders: results[0].count ?? 0,
          pendingOrders: results[1].count ?? 0,
          totalProducts: results[2].count ?? 0,
          pendingPayments: results[3].count ?? 0,
        });
      } catch (error) {
        if (!active) return;

        console.error(
          "Dashboard statistics error:",
          error
        );

        setErrorMessage(
          error.message ||
            "Unable to load dashboard statistics."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  // ========================================
  // DASHBOARD STATISTIC CARDS
  // ========================================

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

  // ========================================
  // SIDEBAR MENU
  // ========================================

  const menuItems = [
    {
      page: "dashboard",
      label: "Dashboard",
      icon: TrendingUp,
    },
    {
      page: "reports",
      label: "Sales Reports",
      icon: BarChart3,
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

  // ========================================
  // DASHBOARD OVERVIEW
  // ========================================

  function renderDashboard() {
    return (
      <>
        {/* DASHBOARD HEADER */}
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

          {/* ADMIN PROFILE */}
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

        {/* ERROR MESSAGE */}
        {errorMessage && (
          <p className="admin-error" role="alert">
            Could not load all dashboard data:{" "}
            {errorMessage}
          </p>
        )}

        {/* DASHBOARD STATISTICS */}
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

        {/* OPEN-METEO WEATHER FORECAST */}
        <div
          style={{
            marginTop: 24,
            marginBottom: 24,
          }}
        >
          <WeatherForecast />
        </div>

        {/* PHILIPPINE HOLIDAY SALES PLANNER */}
        <div style={{ marginBottom: 24 }}>
          <PhilippineHolidays />
        </div>

        {/* WELCOME PANEL */}
        <section className="admin-welcome-panel">
          <div className="admin-welcome-icon">
            <CakeSlice size={26} />
          </div>

          <h2>Welcome to Mama's Bakehouse</h2>

          <p>
            Your bakery management dashboard is ready.
            Here you'll manage customer orders,
            products, available stock, payment
            verification, and sales reports.
          </p>

          <span>
            Dashboard overview connected to Supabase
          </span>
        </section>
      </>
    );
  }

  // ========================================
  // RENDER SELECTED ADMIN PAGE
  // ========================================

  function renderPage() {
    switch (activePage) {
      case "dashboard":
        return renderDashboard();

      case "reports":
        return <AdminSalesReports />;

      case "orders":
        return <AdminOrders />;

      case "products":
        return <AdminProducts />;

      case "stock":
        return <AdminReadyStock />;

      case "payments":
        return <AdminPayments />;

      default:
        return renderDashboard();
    }
  }

  // ========================================
  // MAIN ADMIN LAYOUT
  // ========================================

  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        {/* BRAND */}
        <div className="admin-brand">
          <div className="admin-brand-mark">
            MB
          </div>

          <div>
            <strong>Mama's Bakehouse</strong>
            <span>ADMIN PANEL</span>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav
          className="admin-menu"
          aria-label="Admin navigation"
        >
          <div className="admin-menu-label">
            OVERVIEW
          </div>

          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const selected =
              activePage === item.page;

            return (
              <div key={item.page}>
                {/* MANAGEMENT SECTION */}
                {index === 2 && (
                  <div className="admin-menu-label">
                    MANAGEMENT
                  </div>
                )}

                {/* MENU BUTTON */}
                <button
                  type="button"
                  className={
                    selected
                      ? "admin-menu-item selected"
                      : "admin-menu-item"
                  }
                  onClick={() =>
                    navigateTo(item.page)
                  }
                  aria-current={
                    selected
                      ? "page"
                      : undefined
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

        {/* LOGOUT */}
        <button
          type="button"
          className="admin-logout"
          onClick={onLogout}
        >
          <LogOut size={18} />
          Log Out
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="admin-main">
        {renderPage()}
      </main>
    </div>
  );
}
