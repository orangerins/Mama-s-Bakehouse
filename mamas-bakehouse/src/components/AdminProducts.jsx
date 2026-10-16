
import { useEffect, useState } from "react";
import {
  CakeSlice,
  Clock3,
  Package,
  RefreshCw,
  Pencil,
  Save,
  X,
  Settings2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import "./AdminProducts.css";

function formatPrice(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value || 0));
}

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [options, setOptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [expandedOptionsId, setExpandedOptionsId] =
    useState(null);

  const [editingOptionId, setEditingOptionId] =
    useState(null);

  const [savingOption, setSavingOption] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    base_price: "",
    minimum_order_quantity: "",
    preparation_days: "",
    is_available: true,
  });

  const [optionForm, setOptionForm] = useState({
    option_name: "",
    additional_price: "",
    is_available: true,
  });

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError("");

      const [productsResult, optionsResult] =
        await Promise.all([
          supabase
            .from("products")
            .select(`
              id,
              name,
              description,
              base_price,
              minimum_order_quantity,
              preparation_days,
              is_available,
              categories(name)
            `)
            .order("name", { ascending: true }),

          supabase
            .from("product_options")
            .select(`
              id,
              product_id,
              option_group,
              option_name,
              additional_price,
              is_available
            `)
            .order("option_group", { ascending: true })
            .order("option_name", { ascending: true }),
        ]);

      if (!active) return;

      if (productsResult.error) {
        setError(productsResult.error.message);
        setProducts([]);
      } else {
        setProducts(productsResult.data || []);
      }

      if (optionsResult.error) {
        setError((previous) =>
          [previous, optionsResult.error.message]
            .filter(Boolean)
            .join(" | ")
        );
        setOptions([]);
      } else {
        setOptions(optionsResult.data || []);
      }

      setLoading(false);
    }

    loadData();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  function startEditing(product) {
    setEditingId(product.id);
    setEditingOptionId(null);
    setError("");
    setSuccess("");

    setEditForm({
      name: product.name,
      description: product.description || "",
      base_price: String(product.base_price),
      minimum_order_quantity: String(
        product.minimum_order_quantity
      ),
      preparation_days: String(product.preparation_days),
      is_available: product.is_available,
    });
  }

  function cancelEditing() {
    if (saving) return;

    setEditingId(null);
    setError("");
  }

  function updateEditField(event) {
    const { name, value, type, checked } = event.target;

    setEditForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function saveProduct(productId) {
    if (saving) return;

    setError("");
    setSuccess("");

    const name = editForm.name.trim();
    const price = Number(editForm.base_price);
    const minimumQuantity = Number(
      editForm.minimum_order_quantity
    );
    const preparationDays = Number(
      editForm.preparation_days
    );

    if (!name) {
      setError("Product name is required.");
      return;
    }

    if (
      editForm.base_price.trim() === "" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setError("Enter a valid price of ₱0 or higher.");
      return;
    }

    if (
      editForm.minimum_order_quantity.trim() === "" ||
      !Number.isInteger(minimumQuantity) ||
      minimumQuantity < 1
    ) {
      setError("Minimum quantity must be at least 1.");
      return;
    }

    if (
      editForm.preparation_days.trim() === "" ||
      !Number.isInteger(preparationDays) ||
      preparationDays < 0
    ) {
      setError(
        "Preparation days must be a whole number of 0 or higher."
      );
      return;
    }

    setSaving(true);

    const updates = {
      name,
      description: editForm.description.trim() || null,
      base_price: price,
      minimum_order_quantity: minimumQuantity,
      preparation_days: preparationDays,
      is_available: editForm.is_available,
      updated_at: new Date().toISOString(),
    };

    const { data, error: updateError } = await supabase
      .from("products")
      .update(updates)
      .eq("id", productId)
      .select("id");

    if (updateError) {
      setError(
        "Could not save product: " + updateError.message
      );
      setSaving(false);
      return;
    }

    if (!data || data.length !== 1) {
      setError(
        "Product update was not confirmed. Check administrator permissions."
      );
      setSaving(false);
      return;
    }

    setEditingId(null);
    setSaving(false);
    setSuccess("Product updated successfully!");
    setRefreshKey((key) => key + 1);
  }

  function toggleOptions(productId) {
    setExpandedOptionsId((current) =>
      current === productId ? null : productId
    );

    setEditingOptionId(null);
    setError("");
    setSuccess("");
  }

  function startEditingOption(option) {
    setEditingOptionId(option.id);
    setEditingId(null);
    setError("");
    setSuccess("");

    setOptionForm({
      option_name: option.option_name,
      additional_price: String(option.additional_price),
      is_available: option.is_available,
    });
  }

  function updateOptionField(event) {
    const { name, value, type, checked } = event.target;

    setOptionForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function saveOption(optionId) {
    if (savingOption) return;

    setError("");
    setSuccess("");

    const optionName = optionForm.option_name.trim();
    const additionalPrice = Number(
      optionForm.additional_price
    );

    if (!optionName) {
      setError("Option name is required.");
      return;
    }

    if (
      optionForm.additional_price.trim() === "" ||
      !Number.isFinite(additionalPrice) ||
      additionalPrice < 0
    ) {
      setError(
        "Additional price must be ₱0 or higher."
      );
      return;
    }

    setSavingOption(true);

    const { data, error: updateError } = await supabase
      .from("product_options")
      .update({
        option_name: optionName,
        additional_price: additionalPrice,
        is_available: optionForm.is_available,
      })
      .eq("id", optionId)
      .select("id");

    if (updateError) {
      setError(
        "Could not save option: " + updateError.message
      );
      setSavingOption(false);
      return;
    }

    if (!data || data.length !== 1) {
      setError(
        "Option update was not confirmed. Check administrator permissions."
      );
      setSavingOption(false);
      return;
    }

    setEditingOptionId(null);
    setSavingOption(false);
    setSuccess("Product option updated successfully!");
    setRefreshKey((key) => key + 1);
  }

  return (
    <section className="admin-products-page">
      <div className="admin-products-heading">
        <div>
          <p className="admin-kicker">
            BAKERY MANAGEMENT
          </p>

          <h1>Products</h1>

          <p>
            Manage your products, prices, and options.
          </p>
        </div>

        <button
          className="admin-refresh-button"
          type="button"
          onClick={() => {
            setEditingId(null);
            setEditingOptionId(null);
            setSuccess("");
            setRefreshKey((key) => key + 1);
          }}
          disabled={loading || saving || savingOption}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p className="admin-product-success" role="status">
          {success}
        </p>
      )}

      <div className="admin-products-summary">
        <div className="admin-products-summary-icon">
          <Package size={20} />
        </div>

        <div>
          <strong>
            {loading
              ? "Loading..."
              : `${products.length} Products`}
          </strong>

          <span>Currently in your bakery catalog</span>
        </div>
      </div>

      <div className="admin-products-list">
        {loading ? (
          <p className="admin-products-empty">
            Loading your products...
          </p>
        ) : products.length === 0 ? (
          <p className="admin-products-empty">
            No products found.
          </p>
        ) : (
          products.map((product) => {
            const isEditing = editingId === product.id;

            const productOptions = options.filter(
              (option) => option.product_id === product.id
            );

            const isExpanded =
              expandedOptionsId === product.id;

            return (
              <article
                className="admin-product-card"
                key={product.id}
              >
                <div className="admin-product-icon">
                  <CakeSlice size={22} />
                </div>

                <div className="admin-product-details">
                  {isEditing ? (
                    <form
                      className="admin-product-edit-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        saveProduct(product.id);
                      }}
                    >
                      <h3>Edit Product</h3>

                      <label htmlFor={`name-${product.id}`}>
                        Product Name
                      </label>

                      <input
                        id={`name-${product.id}`}
                        name="name"
                        type="text"
                        value={editForm.name}
                        onChange={updateEditField}
                        required
                      />

                      <label htmlFor={`description-${product.id}`}>
                        Description
                      </label>

                      <textarea
                        id={`description-${product.id}`}
                        name="description"
                        value={editForm.description}
                        onChange={updateEditField}
                        rows={3}
                      />

                      <div className="admin-product-edit-grid">
                        <div>
                          <label htmlFor={`price-${product.id}`}>
                            Starting Price (₱)
                          </label>

                          <input
                            id={`price-${product.id}`}
                            name="base_price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={editForm.base_price}
                            onChange={updateEditField}
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor={`minimum-${product.id}`}>
                            Minimum Quantity
                          </label>

                          <input
                            id={`minimum-${product.id}`}
                            name="minimum_order_quantity"
                            type="number"
                            min="1"
                            step="1"
                            value={
                              editForm.minimum_order_quantity
                            }
                            onChange={updateEditField}
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor={`days-${product.id}`}>
                            Preparation Days
                          </label>

                          <input
                            id={`days-${product.id}`}
                            name="preparation_days"
                            type="number"
                            min="0"
                            step="1"
                            value={editForm.preparation_days}
                            onChange={updateEditField}
                            required
                          />
                        </div>
                      </div>

                      <label className="admin-product-checkbox">
                        <input
                          name="is_available"
                          type="checkbox"
                          checked={editForm.is_available}
                          onChange={updateEditField}
                        />
                        Available for ordering
                      </label>

                      <div className="admin-product-edit-actions">
                        <button
                          className="admin-product-save"
                          type="submit"
                          disabled={saving}
                        >
                          <Save size={16} />
                          {saving
                            ? "Saving..."
                            : "Save Changes"}
                        </button>

                        <button
                          className="admin-product-cancel"
                          type="button"
                          onClick={cancelEditing}
                          disabled={saving}
                        >
                          <X size={16} />
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="admin-product-title-row">
                        <h3>{product.name}</h3>

                        <span
                          className={
                            product.is_available
                              ? "admin-product-status available"
                              : "admin-product-status unavailable"
                          }
                        >
                          {product.is_available
                            ? "Available"
                            : "Unavailable"}
                        </span>
                      </div>

                      <p className="admin-product-category">
                        {product.categories?.name ||
                          "Uncategorized"}
                      </p>

                      {product.description && (
                        <p className="admin-product-description">
                          {product.description}
                        </p>
                      )}

                      <div className="admin-product-meta">
                        <span>
                          <Package size={14} />
                          Minimum:{" "}
                          {product.minimum_order_quantity}
                        </span>

                        <span>
                          <Clock3 size={14} />
                          Prep: {product.preparation_days} day(s)
                        </span>
                      </div>

                      <div className="admin-product-actions-row">
                        <button
                          className="admin-product-edit-button"
                          type="button"
                          onClick={() => startEditing(product)}
                          disabled={saving || savingOption}
                        >
                          <Pencil size={15} />
                          Edit Product
                        </button>

                        {productOptions.length > 0 && (
                          <button
                            className="admin-product-edit-button"
                            type="button"
                            onClick={() =>
                              toggleOptions(product.id)
                            }
                            disabled={saving || savingOption}
                          >
                            <Settings2 size={15} />
                            Manage Options

                            {isExpanded ? (
                              <ChevronUp size={15} />
                            ) : (
                              <ChevronDown size={15} />
                            )}
                          </button>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="admin-options-section">
                          <h4>Product Options</h4>

                          <p className="admin-options-help">
                            Final price = Starting price +
                            Additional price.
                          </p>

                          {productOptions.map((option) => {
                            const isEditingOption =
                              editingOptionId === option.id;

                            return (
                              <div
                                className="admin-option-item"
                                key={option.id}
                              >
                                {isEditingOption ? (
                                  <form
                                    className="admin-option-form"
                                    onSubmit={(event) => {
                                      event.preventDefault();
                                      saveOption(option.id);
                                    }}
                                  >
                                    <strong>
                                      {option.option_group}
                                    </strong>

                                    <label
                                      htmlFor={`option-name-${option.id}`}
                                    >
                                      Option Name
                                    </label>

                                    <input
                                      id={`option-name-${option.id}`}
                                      name="option_name"
                                      type="text"
                                      value={optionForm.option_name}
                                      onChange={updateOptionField}
                                      required
                                    />

                                    <label
                                      htmlFor={`option-price-${option.id}`}
                                    >
                                      Additional Price (₱)
                                    </label>

                                    <input
                                      id={`option-price-${option.id}`}
                                      name="additional_price"
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={
                                        optionForm.additional_price
                                      }
                                      onChange={updateOptionField}
                                      required
                                    />

                                    <label className="admin-option-checkbox">
                                      <input
                                        name="is_available"
                                        type="checkbox"
                                        checked={
                                          optionForm.is_available
                                        }
                                        onChange={updateOptionField}
                                      />
                                      Available
                                    </label>

                                    <div className="admin-option-actions">
                                      <button
                                        className="admin-product-save"
                                        type="submit"
                                        disabled={savingOption}
                                      >
                                        <Save size={15} />
                                        {savingOption
                                          ? "Saving..."
                                          : "Save Option"}
                                      </button>

                                      <button
                                        className="admin-product-cancel"
                                        type="button"
                                        onClick={() =>
                                          setEditingOptionId(null)
                                        }
                                        disabled={savingOption}
                                      >
                                        <X size={15} />
                                        Cancel
                                      </button>
                                    </div>
                                  </form>
                                ) : (
                                  <>
                                    <div className="admin-option-info">
                                      <span className="admin-option-group">
                                        {option.option_group}
                                      </span>

                                      <strong>
                                        {option.option_name}
                                      </strong>

                                      <span
                                        className={
                                          option.is_available
                                            ? "admin-product-status available"
                                            : "admin-product-status unavailable"
                                        }
                                      >
                                        {option.is_available
                                          ? "Available"
                                          : "Unavailable"}
                                      </span>
                                    </div>

                                    <div className="admin-option-price">
                                      <small>
                                        +{formatPrice(
                                          option.additional_price
                                        )}
                                      </small>

                                      <strong>
                                        {formatPrice(
                                          Number(product.base_price) +
                                            Number(
                                              option.additional_price
                                            )
                                        )}
                                      </strong>
                                    </div>

                                    <button
                                      className="admin-option-edit-button"
                                      type="button"
                                      onClick={() =>
                                        startEditingOption(option)
                                      }
                                      disabled={savingOption || saving}
                                    >
                                      <Pencil size={14} />
                                      Edit
                                    </button>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!isEditing && !isExpanded && (
                  <div className="admin-product-price">
                    <small>Starting at</small>

                    <strong>
                      {formatPrice(product.base_price)}
                    </strong>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
