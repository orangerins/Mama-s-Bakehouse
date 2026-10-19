
import { useEffect, useMemo, useState } from "react";
import {
  ShoppingBag,
  ShoppingCart,
  CakeSlice,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  LogOut,
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import CustomerCheckout from "./CustomerCheckout";
import "./CustomerDashboard.css";

const peso = (amount) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(amount || 0));

function ProductCard({ product, options, onAdd }) {
  const groups = useMemo(() => {
    const result = {};

    options.forEach((option) => {
      if (!result[option.option_group]) {
        result[option.option_group] = [];
      }

      result[option.option_group].push(option);
    });

    return result;
  }, [options]);

  const groupNames = Object.keys(groups);
  const [selected, setSelected] = useState({});

  const selectedOptions = groupNames
    .map((group) =>
      groups[group].find(
        (option) => option.id === selected[group]
      )
    )
    .filter(Boolean);

  const allSelected = groupNames.every(
    (group) => Boolean(selected[group])
  );

  const finalPrice =
    Number(product.base_price || 0) +
    selectedOptions.reduce(
      (sum, option) =>
        sum + Number(option.additional_price || 0),
      0
    );

  function addProduct() {
    if (!allSelected) return;

    onAdd(product, selectedOptions, finalPrice);
    setSelected({});
  }

  return (
    <article className="customer-product-card">
      <div className="customer-product-image">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <CakeSlice size={45} strokeWidth={1.4} />
        )}
      </div>

      <div className="customer-product-body">
        <div className="customer-product-title-row">
          <h3>{product.name}</h3>

          <span className="customer-available-badge">
            Available
          </span>
        </div>

        <p className="customer-product-description">
          {product.description ||
            "Freshly prepared with love."}
        </p>

        <div className="customer-product-meta">
          <span>
            Minimum order:{" "}
            {product.minimum_order_quantity || 1}
          </span>

          <span>
            Preparation: {product.preparation_days ?? 1} day(s)
          </span>
        </div>

        {groupNames.map((group) => (
          <label
            className="customer-option-label"
            key={group}
          >
            <span>{group}</span>

            <div className="customer-select-wrap">
              <select
                value={selected[group] || ""}
                onChange={(event) =>
                  setSelected((previous) => ({
                    ...previous,
                    [group]: event.target.value,
                  }))
                }
              >
                <option value="">
                  Choose {group}
                </option>

                {groups[group].map((option) => (
                  <option
                    key={option.id}
                    value={option.id}
                  >
                    {option.option_name}
                    {Number(option.additional_price) !== 0
                      ? ` (+${peso(option.additional_price)})`
                      : ""}
                  </option>
                ))}
              </select>

              <ChevronDown size={16} />
            </div>
          </label>
        ))}

        <div className="customer-product-footer">
          <div>
            <span className="customer-price-caption">
              {selectedOptions.length > 0
                ? "Final price"
                : "Starting at"}
            </span>

            <strong className="customer-product-price">
              {peso(finalPrice)}
            </strong>
          </div>

          <button
            type="button"
            className="customer-primary-button"
            disabled={!allSelected}
            onClick={addProduct}
          >
            <Plus size={17} />
            Add to Cart
          </button>
        </div>

        {groupNames.length > 0 && !allSelected && (
          <p className="customer-selection-hint">
            Choose your preferred options to continue.
          </p>
        )}
      </div>
    </article>
  );
}

export default function CustomerDashboard({
  user,
  onLogout,
}) {
  const [products, setProducts] = useState([]);
  const [options, setOptions] = useState([]);
  const [categories, setCategories] = useState([]);

  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showCart, setShowCart] = useState(false);

  // NEW: Controls the checkout view.
  const [showCheckout, setShowCheckout] = useState(false);

  async function loadCatalog() {
    setLoading(true);
    setError("");

    try {
      const [
        productsResult,
        optionsResult,
        categoriesResult,
      ] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("is_available", true)
          .order("name"),

        supabase
          .from("product_options")
          .select("*")
          .eq("is_available", true)
          .order("option_group")
          .order("option_name"),

        supabase
          .from("categories")
          .select("*")
          .order("name"),
      ]);

      const failed = [
        productsResult,
        optionsResult,
        categoriesResult,
      ].find((result) => result.error);

      if (failed) throw failed.error;

      setProducts(productsResult.data || []);
      setOptions(optionsResult.data || []);
      setCategories(categoriesResult.data || []);
    } catch (err) {
      setError(
        err.message ||
          "Unable to load the bakery catalog."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  const visibleProducts = products.filter((product) => {
    const matchesSearch =
      product.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (product.description || "")
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" ||
      String(product.category_id) === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const cartCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (sum, item) =>
      sum + item.finalPrice * item.quantity,
    0
  );

  function addToCart(product, selectedOptions, finalPrice) {
    const optionIds = selectedOptions
      .map((option) => option.id)
      .sort();

    const key = `${product.id}:${optionIds.join(",")}`;

    const minimum = Math.max(
      1,
      Number(product.minimum_order_quantity || 1)
    );

    setCart((previous) => {
      const existing = previous.find(
        (item) => item.key === key
      );

      if (existing) {
        return previous.map((item) =>
          item.key === key
            ? {
                ...item,
                quantity: item.quantity + minimum,
              }
            : item
        );
      }

      return [
        ...previous,
        {
          key,
          product,
          selectedOptions,
          finalPrice,
          quantity: minimum,
          minimum,
        },
      ];
    });

    setNotice(`${product.name} added to your cart.`);
    setShowCart(true);
  }

  function changeQuantity(key, amount) {
    setCart((previous) =>
      previous.map((item) =>
        item.key === key
          ? {
              ...item,
              quantity: Math.max(
                item.minimum,
                item.quantity + amount
              ),
            }
          : item
      )
    );
  }

  function removeItem(key) {
    setCart((previous) =>
      previous.filter((item) => item.key !== key)
    );
  }

  // NEW: Open checkout without removing cart items.
  function openCheckout() {
    if (cart.length === 0) return;

    setNotice("");
    setShowCheckout(true);
    setShowCart(false);
  }

  // NEW: Return to cart without losing items.
  function backToCart() {
    setShowCheckout(false);
    setShowCart(true);
  }

  // NEW: Close checkout and return to the catalog.
  function closeCheckout() {
    setShowCheckout(false);
    setShowCart(false);
  }

  const getCategoryName = (categoryId) =>
    categories.find(
      (category) =>
        String(category.id) === String(categoryId)
    )?.name || "Baked Goods";

  return (
    <div className="customer-page">
      <header className="customer-header">
        <a
          href="#catalog"
          className="customer-brand"
          aria-label="Mama's Bakehouse home"
          onClick={() => {
            setShowCheckout(false);
            setShowCart(false);
          }}
        >
          <span className="customer-brand-mark">
            MB
          </span>

          <span>
            <strong>Mama's Bakehouse</strong>
            <small>HOMEMADE WITH LOVE</small>
          </span>
        </a>

        <div className="customer-header-actions">
          <span className="customer-greeting">
            Hello,{" "}
            {user?.user_metadata?.full_name ||
              user?.email?.split("@")[0] ||
              "Customer"}
          </span>

          <button
            type="button"
            className="customer-cart-button"
            onClick={() => {
              setNotice("");
              setShowCheckout(false);
              setShowCart(true);
            }}
          >
            <ShoppingCart size={19} />
            Cart
            <span>{cartCount}</span>
          </button>

          <button
            type="button"
            className="customer-logout-button"
            onClick={onLogout}
          >
            <LogOut size={17} />
            Log Out
          </button>
        </div>
      </header>

      <main id="catalog" className="customer-main">
        <section className="customer-hero">
          <div>
            <p className="customer-eyebrow">
              FRESHLY MADE, JUST FOR YOU
            </p>

            <h1>A little sweetness goes a long way.</h1>

            <p>
              Discover homemade cakes and baked goods
              prepared with care for every occasion.
            </p>

            <a
              href="#customer-products"
              className="customer-hero-link"
            >
              Explore our menu
              <ChevronDown size={17} />
            </a>
          </div>

          <div className="customer-hero-icon">
            <CakeSlice size={86} strokeWidth={1.1} />
          </div>
        </section>

        <section
          id="customer-products"
          className="customer-catalog"
        >
          <div className="customer-section-heading">
            <div>
              <p className="customer-eyebrow">
                MADE WITH LOVE
              </p>

              <h2>Our Bakery Menu</h2>

              <p>
                Choose your favorites and customize your
                order.
              </p>
            </div>

            <button
              type="button"
              className="customer-refresh-button"
              onClick={loadCatalog}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          <div className="customer-filters">
            <div className="customer-search">
              <Search size={18} />

              <input
                type="search"
                placeholder="Search baked goods..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>

            <div className="customer-category-filter">
              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
              >
                <option value="all">
                  All Categories
                </option>

                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={String(category.id)}
                  >
                    {category.name}
                  </option>
                ))}
              </select>

              <ChevronDown size={16} />
            </div>
          </div>

          {notice && !showCart && !showCheckout && (
            <div className="customer-success-message">
              {notice}

              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Dismiss message"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {error && (
            <div className="customer-error-message">
              <strong>Catalog unavailable</strong>

              <p>{error}</p>

              <p>
                Check the Supabase read policies for
                products, product_options, and categories
                if access is denied.
              </p>

              <button
                type="button"
                onClick={loadCatalog}
                className="customer-primary-button"
              >
                Try Again
              </button>
            </div>
          )}

          {loading ? (
            <div className="customer-empty-state">
              <RefreshCw size={28} />
              <h3>Preparing our menu...</h3>
              <p>Loading fresh goodies for you.</p>
            </div>
          ) : !error && visibleProducts.length === 0 ? (
            <div className="customer-empty-state">
              <CakeSlice size={42} />
              <h3>No products found</h3>

              <p>
                Try another search or category, or check
                back for new baked goods.
              </p>
            </div>
          ) : (
            !error && (
              <>
                <p className="customer-result-count">
                  {visibleProducts.length}{" "}
                  {visibleProducts.length === 1
                    ? "product"
                    : "products"}{" "}
                  available
                </p>

                <div className="customer-product-grid">
                  {visibleProducts.map((product) => (
                    <div
                      key={product.id}
                      className="customer-product-wrapper"
                      data-category={getCategoryName(
                        product.category_id
                      )}
                    >
                      <ProductCard
                        product={product}
                        options={options.filter(
                          (option) =>
                            option.product_id === product.id
                        )}
                        onAdd={addToCart}
                      />

                      <span className="customer-category-caption">
                        {getCategoryName(product.category_id)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )
          )}
        </section>

        <footer className="customer-footer">
          <span className="customer-brand-mark">
            MB
          </span>

          <p>Mama's Bakehouse</p>

          <span>
            Proudly homemade in Iligan City.
          </span>
        </footer>
      </main>

      {/* SHOPPING CART */}
      {showCart && (
        <div
          className="customer-drawer-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowCart(false);
            }
          }}
        >
          <aside
            className="customer-cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
          >
            <div className="customer-cart-heading">
              <div>
                <p className="customer-eyebrow">
                  YOUR SELECTIONS
                </p>

                <h2>Your Cart</h2>
              </div>

              <button
                type="button"
                className="customer-icon-button"
                onClick={() => setShowCart(false)}
                aria-label="Close cart"
              >
                <X size={21} />
              </button>
            </div>

            {notice && (
              <div className="customer-success-message">
                {notice}

                <button
                  type="button"
                  onClick={() => setNotice("")}
                  aria-label="Dismiss message"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {cart.length === 0 ? (
              <div className="customer-empty-cart">
                <ShoppingBag size={42} />

                <h3>Your cart is empty</h3>

                <p>
                  Explore the menu and add something sweet.
                </p>

                <button
                  type="button"
                  className="customer-primary-button"
                  onClick={() => setShowCart(false)}
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              <>
                <div className="customer-cart-items">
                  {cart.map((item) => (
                    <article
                      key={item.key}
                      className="customer-cart-item"
                    >
                      <div className="customer-cart-item-top">
                        <div>
                          <h3>{item.product.name}</h3>

                          {item.selectedOptions.map(
                            (option) => (
                              <p key={option.id}>
                                {option.option_group}:{" "}
                                {option.option_name}
                              </p>
                            )
                          )}

                          <span>
                            {peso(item.finalPrice)} each
                          </span>
                        </div>

                        <button
                          type="button"
                          className="customer-remove-button"
                          onClick={() =>
                            removeItem(item.key)
                          }
                          aria-label={`Remove ${item.product.name}`}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>

                      <div className="customer-cart-item-bottom">
                        <div className="customer-quantity-control">
                          <button
                            type="button"
                            onClick={() =>
                              changeQuantity(item.key, -1)
                            }
                            disabled={
                              item.quantity <= item.minimum
                            }
                            aria-label="Decrease quantity"
                          >
                            <Minus size={15} />
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            type="button"
                            onClick={() =>
                              changeQuantity(item.key, 1)
                            }
                            aria-label="Increase quantity"
                          >
                            <Plus size={15} />
                          </button>
                        </div>

                        <strong>
                          {peso(
                            item.finalPrice * item.quantity
                          )}
                        </strong>
                      </div>

                      {item.minimum > 1 && (
                        <p className="customer-minimum-note">
                          Minimum order: {item.minimum}
                        </p>
                      )}
                    </article>
                  ))}
                </div>

                <div className="customer-cart-summary">
                  <div>
                    <span>Total</span>
                    <strong>{peso(cartTotal)}</strong>
                  </div>

                  <p>
                    Final order details and availability
                    will be confirmed during checkout.
                  </p>

                  {/* CHECKOUT BUTTON IS NOW ENABLED */}
                  <button
                    type="button"
                    className="customer-primary-button customer-checkout-button"
                    onClick={openCheckout}
                  >
                    Proceed to Checkout
                  </button>

                  <button
                    type="button"
                    className="customer-continue-button"
                    onClick={() => setShowCart(false)}
                  >
                    Continue Shopping
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {/* NEW CHECKOUT VIEW */}
      {showCheckout && (
        <div
          className="customer-drawer-overlay"
          style={{
            zIndex: 1000,
          }}
        >
          <aside
            className="customer-cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Customer checkout"
            style={{
              overflowY: "auto",
              maxHeight: "100vh",
            }}
          >
            <CustomerCheckout
              cart={cart}
              onBack={backToCart}
              onClose={closeCheckout}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
