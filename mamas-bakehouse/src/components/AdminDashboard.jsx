
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
  Search,
  ChefHat,
  ExternalLink,
  X,
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
// API #5 - THEMEALDB RECIPE INSPIRATION
// ========================================

function RecipeInspiration() {
  const [query, setQuery] = useState("cake");
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!selectedRecipe) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSelectedRecipe(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedRecipe]);

  async function searchRecipes(term = query) {
    const keyword = term.trim();
    if (!keyword) {
      setError("Enter a recipe name to search.");
      return;
    }
    setLoading(true);
    setError("");
    setSearched(true);
    setRecipes([]);
    setSelectedRecipe(null);
    try {
      const response = await fetch(
        `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(keyword)}`
      );
      if (!response.ok) throw new Error(`Recipe search failed (${response.status}).`);
      const data = await response.json();
      setRecipes(Array.isArray(data.meals) ? data.meals : []);
    } catch (err) {
      setError(err.message || "Could not search recipes. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function viewRecipe(recipe) {
    // Search already returns complete recipe details. Open immediately,
    // without depending on a second network request.
    setSelectedRecipe(recipe);
    setError("");
    setDetailsLoading(true);
    try {
      const response = await fetch(
        `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(recipe.idMeal)}`
      );
      if (!response.ok) throw new Error("Recipe detail lookup failed.");
      const data = await response.json();
      const fullRecipe = data.meals?.[0];
      if (fullRecipe) {
        setSelectedRecipe((current) =>
          current?.idMeal === recipe.idMeal ? fullRecipe : current
        );
      }
    } catch (err) {
      // Keep showing the recipe supplied by search if lookup is unavailable.
      console.warn("Recipe lookup unavailable; showing search result:", err);
    } finally {
      setDetailsLoading(false);
    }
  }

  const ingredients = selectedRecipe
    ? Array.from({ length: 20 }, (_, index) => {
        const number = index + 1;
        return {
          name: String(selectedRecipe[`strIngredient${number}`] || "").trim(),
          measure: String(selectedRecipe[`strMeasure${number}`] || "").trim(),
        };
      }).filter((item) => item.name)
    : [];

  return (
    <section style={{ background: "#fff", border: "1px solid #eaded3", borderRadius: 16, padding: 22, marginBottom: 24 }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 0, color: "#3b291f" }}>
        <ChefHat size={24} /> Recipe Inspiration
      </h2>
      <p style={{ color: "#927a68", lineHeight: 1.6 }}>
        Search recipes for bakery product inspiration using TheMealDB.
      </p>
      <form onSubmit={(event) => { event.preventDefault(); searchRecipes(); }} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          type="search"
          aria-label="Recipe search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search cake, bread, pasta..."
          style={{ flex: "1 1 220px", minWidth: 0, padding: 12, border: "1px solid #e5d5c7", borderRadius: 10, fontSize: 14 }}
        />
        <button type="submit" disabled={loading} style={{ background: "#76543c", color: "white", border: 0, borderRadius: 10, padding: "12px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <Search size={17} /> {loading ? "Searching..." : "Search Recipes"}
        </button>
      </form>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {["Cake", "Bread", "Pasta", "Chicken"].map((term) => (
          <button key={term} type="button" disabled={loading} onClick={() => { setQuery(term); searchRecipes(term); }} style={{ border: "1px solid #eaded3", background: "#faf5ef", borderRadius: 20, padding: "8px 13px", color: "#76543c", cursor: "pointer" }}>
            {term}
          </button>
        ))}
      </div>
      {error && <p role="alert" style={{ color: "#b42318" }}>{error}</p>}
      {!searched && <p style={{ color: "#927a68", marginTop: 18 }}>Search to explore recipes and ingredients.</p>}
      {searched && !loading && !error && recipes.length === 0 && <p>No recipes found. Try a different keyword.</p>}
      {recipes.length > 0 && (
        <>
          <p style={{ color: "#927a68", fontSize: 13 }}>{recipes.length} recipe(s) found</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 }}>
            {recipes.map((recipe) => (
              <article key={recipe.idMeal} style={{ border: "1px solid #eaded3", borderRadius: 12, overflow: "hidden" }}>
                {recipe.strMealThumb && <img src={recipe.strMealThumb} alt={recipe.strMeal} loading="lazy" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />}
                <div style={{ padding: 14 }}>
                  <h3 style={{ fontSize: 15, margin: "0 0 8px", color: "#3b291f" }}>{recipe.strMeal}</h3>
                  <p style={{ fontSize: 12, color: "#927a68" }}>{recipe.strCategory || "Recipe"}</p>
                  <button type="button" onClick={() => viewRecipe(recipe)} style={{ width: "100%", padding: 11, background: "#76543c", border: 0, color: "#fff", borderRadius: 9, cursor: "pointer" }}>
                    View Recipe
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      <p style={{ fontSize: 12, color: "#927a68", marginTop: 20 }}>Powered by TheMealDB (API #5). Recipes are for inspiration only.</p>

      {selectedRecipe && (
        <div
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedRecipe(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(26, 19, 14, 0.72)", display: "flex", justifyContent: "center", alignItems: "center", padding: 16 }}
        >
          <div role="dialog" aria-modal="true" aria-label={`${selectedRecipe.strMeal} recipe`} style={{ width: "100%", maxWidth: 740, maxHeight: "90vh", overflowY: "auto", background: "#fffdfb", borderRadius: 18, padding: 24, boxSizing: "border-box", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <h2 style={{ color: "#3b291f", margin: "0 0 6px" }}>{selectedRecipe.strMeal}</h2>
                <p style={{ color: "#927a68", margin: 0 }}>{selectedRecipe.strCategory || "Recipe"}{selectedRecipe.strArea ? ` · ${selectedRecipe.strArea}` : ""}</p>
              </div>
              <button type="button" aria-label="Close recipe" onClick={() => setSelectedRecipe(null)} style={{ border: "1px solid #eaded3", background: "white", borderRadius: 9, padding: 9, cursor: "pointer" }}><X size={20} /></button>
            </div>
            {selectedRecipe.strMealThumb && <img src={selectedRecipe.strMealThumb} alt={selectedRecipe.strMeal} style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 12, marginTop: 18 }} />}
            <h3 style={{ color: "#3b291f" }}>Ingredients</h3>
            <ul style={{ color: "#79563b", lineHeight: 1.9 }}>
              {ingredients.map((item, index) => <li key={index}>{item.measure ? `${item.measure} ` : ""}{item.name}</li>)}
            </ul>
            <h3 style={{ color: "#3b291f" }}>Instructions</h3>
            <p style={{ whiteSpace: "pre-line", lineHeight: 1.8, color: "#79563b" }}>{selectedRecipe.strInstructions || "Instructions not available."}</p>
            {detailsLoading && <p style={{ fontSize: 12, color: "#927a68" }}>Checking for additional recipe details...</p>}
            {selectedRecipe.strYoutube && <a href={selectedRecipe.strYoutube} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#76543c", fontWeight: 700 }}><ExternalLink size={16} /> Watch Recipe Video</a>}
            <div style={{ marginTop: 24 }}>
              <button type="button" onClick={() => setSelectedRecipe(null)} style={{ background: "#76543c", border: 0, borderRadius: 10, padding: "12px 20px", color: "white", cursor: "pointer" }}>Close Recipe</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
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

        {/* API #5 - THEMEALDB */}
        <RecipeInspiration />

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
