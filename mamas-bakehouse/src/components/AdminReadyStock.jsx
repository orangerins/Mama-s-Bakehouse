
import { useEffect, useState } from "react";
import {
  Package,
  RefreshCw,
  Plus,
  Save,
  X,
  CalendarDays,
  Pencil,
  ShoppingBag,
  CircleAlert,
  EyeOff,
  Filter,
  Archive,
  ArchiveRestore,
  AlertTriangle,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import "./AdminProducts.css";

const peso = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value || 0));

function manilaToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) =>
    parts.find((part) => part.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function getStockStatus(item, today) {
  if (item.is_archived) return "Archived";
  if (Number(item.quantity_available) === 0) return "Sold Out";
  if (item.available_date < today) return "Expired";
  if (!item.is_listed) return "Unpublished";
  if (item.available_date > today) return "Scheduled";
  return "In Stock";
}

const statusColors = {
  "In Stock": ["#276749", "#eaf6ee"],
  "Sold Out": ["#b42318", "#fef0ee"],
  Expired: ["#7b5760", "#f5eaf0"],
  Unpublished: ["#8a623e", "#f7efe5"],
  Scheduled: ["#315d89", "#eaf2fa"],
  Archived: ["#66616a", "#eeecef"],
};

const initialForm = () => ({
  product_id: "",
  selectedOptions: {},
  quantity_available: "1",
  price_per_unit: "",
  available_date: manilaToday(),
  is_listed: false,
  notes: "",
});

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #e4d9ce",
  borderRadius: 10,
  background: "#fff",
  color: "#39291f",
  font: "inherit",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  marginBottom: 7,
  fontSize: 13,
  fontWeight: 600,
  color: "#70523e",
};

const buttonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "11px 16px",
  borderRadius: 10,
  border: "1px solid #e4d9ce",
  background: "#fff",
  color: "#654630",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 600,
};

const primaryButtonStyle = {
  ...buttonStyle,
  background: "#76543c",
  borderColor: "#76543c",
  color: "#fff",
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e9dfd5",
  borderRadius: 18,
  padding: 24,
};

function SummaryCard({ title, value, icon: Icon, subtitle }) {
  return (
    <div
      style={{
        ...cardStyle,
        display: "flex",
        alignItems: "flex-start",
        gap: 15,
        minWidth: 0,
      }}
    >
      <div
        style={{
          background: "#f4eee8",
          color: "#76543c",
          borderRadius: 12,
          width: 48,
          height: 48,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={21} />
      </div>

      <div>
        <div
          style={{
            fontSize: 13,
            color: "#947c6d",
            marginBottom: 5,
          }}
        >
          {title}
        </div>

        <strong
          style={{
            display: "block",
            color: "#39291f",
            fontSize: 27,
          }}
        >
          {value}
        </strong>

        <span
          style={{
            display: "block",
            marginTop: 7,
            fontSize: 12,
            color: "#9b8679",
          }}
        >
          {subtitle}
        </span>
      </div>
    </div>
  );
}

export default function AdminReadyStock() {
  const [stock, setStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [options, setOptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const today = manilaToday();

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [stockResult, productResult, optionResult] =
        await Promise.all([
          supabase
            .from("ready_stock")
            .select("*")
            .order("created_at", { ascending: false }),

          supabase
            .from("products")
            .select("id, name, base_price, is_available")
            .order("name"),

          supabase
            .from("product_options")
            .select(
              "id, product_id, option_group, option_name, additional_price, is_available"
            )
            .order("option_group"),
        ]);

      const failed = [
        stockResult,
        productResult,
        optionResult,
      ].find((result) => result.error);

      if (failed) throw failed.error;

      setStock(stockResult.data || []);
      setProducts(productResult.data || []);
      setOptions(optionResult.data || []);
    } catch (err) {
      setError(err.message || "Unable to load stock.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeStock = stock.filter(
    (item) => !item.is_archived
  );

  const archivedStock = stock.filter(
    (item) => item.is_archived
  );

  const availableUnits = activeStock
    .filter(
      (item) => getStockStatus(item, today) === "In Stock"
    )
    .reduce(
      (total, item) =>
        total + Number(item.quantity_available),
      0
    );

  const soldOutCount = activeStock.filter(
    (item) => Number(item.quantity_available) === 0
  ).length;

  const unpublishedCount = activeStock.filter(
    (item) => !item.is_listed
  ).length;

  const filteredStock = stock.filter((item) => {
    if (statusFilter === "All") return !item.is_archived;

    return getStockStatus(item, today) === statusFilter;
  });

  const selectedProduct = products.find(
    (product) => product.id === form.product_id
  );

  const productOptions = options.filter(
    (option) =>
      option.product_id === form.product_id &&
      option.is_available
  );

  const optionGroups = [
    ...new Set(
      productOptions.map((option) => option.option_group)
    ),
  ];

  function calculatePrice(productId, selectedOptions) {
    const product = products.find(
      (item) => item.id === productId
    );

    if (!product) return 0;

    const extras = Object.values(selectedOptions).reduce(
      (total, optionId) => {
        const option = options.find(
          (item) => item.id === optionId
        );

        return total + Number(option?.additional_price || 0);
      },
      0
    );

    return Number(product.base_price || 0) + extras;
  }

  function updateField(name, value) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function chooseProduct(productId) {
    setForm((previous) => ({
      ...previous,
      product_id: productId,
      selectedOptions: {},
      price_per_unit: productId
        ? String(calculatePrice(productId, {}))
        : "",
    }));
  }

  function chooseOption(group, optionId) {
    setForm((previous) => {
      const selectedOptions = {
        ...previous.selectedOptions,
        [group]: optionId,
      };

      return {
        ...previous,
        selectedOptions,
        price_per_unit: String(
          calculatePrice(previous.product_id, selectedOptions)
        ),
      };
    });
  }

  function openAddForm() {
    setEditingId(null);
    setForm(initialForm());
    setShowForm(true);
    setArchiveTarget(null);
    setError("");
    setMessage("");
  }

  function openEditForm(item) {
    if (item.is_archived) {
      setError("Restore this listing before editing it.");
      return;
    }

    const selectedOptions = {};

    (item.option_ids || []).forEach((optionId) => {
      const option = options.find(
        (entry) => entry.id === optionId
      );

      if (option) {
        selectedOptions[option.option_group] = optionId;
      }
    });

    setForm({
      product_id: item.product_id,
      selectedOptions,
      quantity_available: String(item.quantity_available),
      price_per_unit: String(item.price_per_unit),
      available_date: item.available_date,
      is_listed: item.is_listed,
      notes: item.notes || "",
    });

    setEditingId(item.id);
    setShowForm(true);
    setArchiveTarget(null);
    setError("");
    setMessage("");
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(initialForm());
    setError("");
  }

  async function handleSave(event) {
    event.preventDefault();
    if (saving) return;

    setError("");
    setMessage("");

    if (!form.product_id) {
      setError("Please select a product.");
      return;
    }

    if (
      optionGroups.some(
        (group) => !form.selectedOptions[group]
      )
    ) {
      setError("Please select an option for every group.");
      return;
    }

    const quantity = Number(form.quantity_available);
    const price = Number(form.price_per_unit);

    if (
      form.quantity_available.trim() === "" ||
      !Number.isInteger(quantity) ||
      quantity < 0
    ) {
      setError("Quantity must be a whole number of 0 or more.");
      return;
    }

    if (
      form.price_per_unit.trim() === "" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setError("Please enter a valid selling price.");
      return;
    }

    if (!form.available_date) {
      setError("Please select an available date.");
      return;
    }

    if (form.is_listed && quantity === 0) {
      setError("Cannot publish a listing with zero stock.");
      return;
    }

    // NEW: Prevent expired stock from being published.
    if (
      form.is_listed &&
      form.available_date < manilaToday()
    ) {
      setError(
        "Cannot publish expired stock. Please select today or a future date."
      );
      return;
    }

    const optionIds = Object.values(
      form.selectedOptions
    ).sort();

    const payload = {
      product_id: form.product_id,
      option_ids: optionIds,
      quantity_available: quantity,
      price_per_unit: price,
      available_date: form.available_date,
      is_listed: form.is_listed,
      notes: form.notes.trim() || null,
    };

    setSaving(true);

    try {
      let result;

      if (editingId) {
        result = await supabase
          .from("ready_stock")
          .update(payload)
          .eq("id", editingId)
          .eq("is_archived", false)
          .select("id");
      } else {
        result = await supabase
          .from("ready_stock")
          .insert(payload)
          .select("id");
      }

      if (result.error) {
        if (result.error.code === "23505") {
          setError(
            "This product variation already has a stock listing " +
            "for the selected date. Please edit the existing " +
            "listing to update its quantity."
          );
        } else {
          setError(result.error.message);
        }
        return;
      }

      if (!result.data?.length) {
        setError("No stock record was saved.");
        return;
      }

      const wasEditing = Boolean(editingId);

      closeForm();
      await loadData();

      setMessage(
        wasEditing
          ? "Stock listing updated successfully."
          : "Ready stock added successfully."
      );
    } catch (err) {
      setError(err.message || "Unable to save stock.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleListing(item) {
    if (busyId) return;

    setError("");
    setMessage("");

    if (item.is_archived) {
      setError("Restore this listing before publishing it.");
      return;
    }

    if (!item.is_listed && item.quantity_available <= 0) {
      setError("Cannot publish a listing with zero stock.");
      return;
    }

    // NEW: Prevent publishing a listing from a past date.
    if (
      !item.is_listed &&
      item.available_date < manilaToday()
    ) {
      setError(
        "Cannot publish expired stock. Edit the listing and select today or a future date."
      );
      return;
    }

    setBusyId(item.id);

    try {
      const { data, error: updateError } = await supabase
        .from("ready_stock")
        .update({ is_listed: !item.is_listed })
        .eq("id", item.id)
        .eq("is_archived", false)
        .select("id, is_listed");

      if (updateError) throw updateError;

      if (!data?.length) {
        throw new Error("The listing could not be updated.");
      }

      await loadData();

      setMessage(
        data[0].is_listed
          ? "Listing published."
          : "Listing unpublished."
      );
    } catch (err) {
      setError(err.message || "Unable to update listing.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmArchive() {
    if (!archiveTarget || busyId) return;

    const target = archiveTarget;
    setBusyId(target.id);
    setError("");
    setMessage("");

    try {
      const { data, error: updateError } = await supabase
        .from("ready_stock")
        .update({
          is_archived: true,
          is_listed: false,
        })
        .eq("id", target.id)
        .eq("is_archived", false)
        .select("id, is_archived, is_listed");

      if (updateError) throw updateError;

      if (
        !data?.length ||
        !data[0].is_archived ||
        data[0].is_listed
      ) {
        throw new Error("The listing was not archived.");
      }

      setArchiveTarget(null);
      closeForm();

      await loadData();

      setMessage(
        "Stock listing archived successfully. " +
        "You can restore it using the Archived filter."
      );
    } catch (err) {
      setError(err.message || "Unable to archive listing.");
    } finally {
      setBusyId(null);
    }
  }

  async function restoreListing(item) {
    if (busyId) return;

    setBusyId(item.id);
    setError("");
    setMessage("");

    try {
      const { data, error: updateError } = await supabase
        .from("ready_stock")
        .update({
          is_archived: false,
          is_listed: false,
        })
        .eq("id", item.id)
        .eq("is_archived", true)
        .select("id, is_archived, is_listed");

      if (updateError) throw updateError;

      if (
        !data?.length ||
        data[0].is_archived ||
        data[0].is_listed
      ) {
        throw new Error("The listing was not restored.");
      }

      await loadData();

      setMessage(
        "Stock listing restored successfully. " +
        "It remains unpublished until you publish it."
      );
    } catch (err) {
      setError(err.message || "Unable to restore listing.");
    } finally {
      setBusyId(null);
    }
  }

  function getProductName(productId) {
    return (
      products.find((product) => product.id === productId)
        ?.name || "Unknown Product"
    );
  }

  function getOptionNames(optionIds) {
    return (optionIds || [])
      .map((id) =>
        options.find((option) => option.id === id)
      )
      .filter(Boolean)
      .map((option) => option.option_name)
      .join(" • ");
  }

  return (
    <section className="admin-products-page">
      <div className="admin-products-heading">
        <div>
          <p className="admin-kicker">
            BAKERY MANAGEMENT
          </p>

          <h1>Available Today</h1>

          <p>
            Manage freshly prepared products ready for sale.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            style={buttonStyle}
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            style={primaryButtonStyle}
            onClick={openAddForm}
          >
            <Plus size={17} />
            Add Ready Stock
          </button>
        </div>
      </div>

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          style={{
            padding: 14,
            color: "#33654b",
            background: "#eef7f0",
            borderRadius: 10,
            marginBottom: 18,
          }}
        >
          {message}
        </p>
      )}

      {/* ARCHIVE CONFIRMATION */}
      {archiveTarget && (
        <div
          role="presentation"
          onClick={() => {
            if (!busyId) setArchiveTarget(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(35, 25, 20, 0.45)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-dialog-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              ...cardStyle,
              width: "100%",
              maxWidth: 460,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "#f7efe5",
                color: "#76543c",
                display: "grid",
                placeItems: "center",
                marginBottom: 16,
              }}
            >
              <AlertTriangle size={23} />
            </div>

            <h2
              id="archive-dialog-title"
              style={{
                fontFamily: "Georgia, serif",
                color: "#39291f",
                margin: "0 0 12px",
              }}
            >
              Archive Stock Listing?
            </h2>

            <p
              style={{
                color: "#806d60",
                lineHeight: 1.6,
                marginBottom: 12,
              }}
            >
              Are you sure you want to archive{" "}
              <strong>
                {getProductName(archiveTarget.product_id)}
              </strong>
              {getOptionNames(archiveTarget.option_ids)
                ? ` — ${getOptionNames(archiveTarget.option_ids)}`
                : ""}
              ?
            </p>

            <p
              style={{
                color: "#806d60",
                lineHeight: 1.6,
                marginBottom: 22,
              }}
            >
              This listing will be unpublished and removed
              from active inventory. Its stock history will
              be preserved, and you can restore it later.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                style={buttonStyle}
                disabled={Boolean(busyId)}
                onClick={() => setArchiveTarget(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                style={primaryButtonStyle}
                disabled={Boolean(busyId)}
                onClick={confirmArchive}
              >
                <Archive size={16} />
                {busyId ? "Archiving..." : "Archive Listing"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT FORM */}
      {showForm && (
        <div
          style={{
            ...cardStyle,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 15,
              marginBottom: 22,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: "Georgia, serif",
                color: "#39291f",
              }}
            >
              {editingId
                ? "Edit Ready Stock"
                : "Add Ready Stock"}
            </h2>

            <button
              type="button"
              onClick={closeForm}
              style={buttonStyle}
            >
              <X size={16} />
              Cancel
            </button>
          </div>

          <form onSubmit={handleSave}>
            <div style={{ marginBottom: 18 }}>
              <label
                htmlFor="stock-product"
                style={labelStyle}
              >
                Product *
              </label>

              <select
                id="stock-product"
                value={form.product_id}
                onChange={(event) =>
                  chooseProduct(event.target.value)
                }
                style={inputStyle}
                required
              >
                <option value="">
                  Select a bakery product
                </option>

                {products.map((product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.name} —{" "}
                    {peso(product.base_price)}
                    {!product.is_available
                      ? " (Catalog Unavailable)"
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct &&
              optionGroups.map((group) => (
                <div
                  style={{ marginBottom: 18 }}
                  key={group}
                >
                  <label style={labelStyle}>
                    {group} *
                  </label>

                  <select
                    value={
                      form.selectedOptions[group] || ""
                    }
                    onChange={(event) =>
                      chooseOption(
                        group,
                        event.target.value
                      )
                    }
                    style={inputStyle}
                    required
                  >
                    <option value="">
                      Select {group}
                    </option>

                    {productOptions
                      .filter(
                        (option) =>
                          option.option_group === group
                      )
                      .map((option) => (
                        <option
                          key={option.id}
                          value={option.id}
                        >
                          {option.option_name} (
                          {Number(option.additional_price) > 0
                            ? "+"
                            : ""}
                          {peso(option.additional_price)})
                        </option>
                      ))}
                  </select>
                </div>
              ))}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 18,
              }}
            >
              <div style={{ marginBottom: 18 }}>
                <label
                  htmlFor="stock-quantity"
                  style={labelStyle}
                >
                  Quantity Available *
                </label>

                <input
                  id="stock-quantity"
                  type="number"
                  min="0"
                  step="1"
                  value={form.quantity_available}
                  onChange={(event) =>
                    updateField(
                      "quantity_available",
                      event.target.value
                    )
                  }
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label
                  htmlFor="stock-price"
                  style={labelStyle}
                >
                  Selling Price (₱) *
                </label>

                <input
                  id="stock-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price_per_unit}
                  onChange={(event) =>
                    updateField(
                      "price_per_unit",
                      event.target.value
                    )
                  }
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label
                  htmlFor="stock-date"
                  style={labelStyle}
                >
                  Available Date *
                </label>

                <input
                  id="stock-date"
                  type="date"
                  value={form.available_date}
                  onChange={(event) =>
                    updateField(
                      "available_date",
                      event.target.value
                    )
                  }
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label
                htmlFor="stock-notes"
                style={labelStyle}
              >
                Notes (Optional)
              </label>

              <textarea
                id="stock-notes"
                value={form.notes}
                onChange={(event) =>
                  updateField("notes", event.target.value)
                }
                placeholder="Example: Freshly baked this morning."
                rows={3}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                }}
              />
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 22,
                color: "#654630",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={form.is_listed}
                onChange={(event) =>
                  updateField(
                    "is_listed",
                    event.target.checked
                  )
                }
              />
              Publish this stock listing
            </label>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...primaryButtonStyle,
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Save size={17} />
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Add Ready Stock"}
            </button>
          </form>
        </div>
      )}

      {/* INVENTORY SUMMARY */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <SummaryCard
          title="Total Listings"
          value={loading ? "..." : activeStock.length}
          icon={Package}
          subtitle="Active inventory records"
        />

        <SummaryCard
          title="Available Units"
          value={loading ? "..." : availableUnits}
          icon={ShoppingBag}
          subtitle="Published and available today"
        />

        <SummaryCard
          title="Sold Out"
          value={loading ? "..." : soldOutCount}
          icon={CircleAlert}
          subtitle="Active listings with zero quantity"
        />

        <SummaryCard
          title="Unpublished"
          value={loading ? "..." : unpublishedCount}
          icon={EyeOff}
          subtitle="Active listings hidden from customers"
        />
      </div>

      {/* STOCK FILTER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 15,
          marginBottom: 18,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "Georgia, serif",
              color: "#39291f",
              fontSize: 23,
              margin: "0 0 5px",
            }}
          >
            Stock Listings
          </h2>

          <p
            style={{
              color: "#947c6d",
              fontSize: 13,
              margin: 0,
            }}
          >
            {loading
              ? "Loading inventory..."
              : statusFilter === "Archived"
                ? `Showing ${filteredStock.length} archived listings`
                : `Showing ${filteredStock.length} of ${activeStock.length} active listings`}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Filter size={17} color="#76543c" />

          <select
            aria-label="Filter stock by status"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            style={{
              ...inputStyle,
              width: "auto",
              minWidth: 175,
            }}
          >
            <option value="All">All Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Unpublished">Unpublished</option>
            <option value="Sold Out">Sold Out</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Expired">Expired</option>
            <option value="Archived">
              Archived ({archivedStock.length})
            </option>
          </select>
        </div>
      </div>

      {/* STOCK LIST */}
      <div className="admin-products-list">
        {loading ? (
          <p>Loading stock...</p>
        ) : filteredStock.length === 0 ? (
          <div className="admin-welcome-panel">
            {statusFilter === "Archived" ? (
              <Archive size={32} />
            ) : (
              <Package size={32} />
            )}

            <h2>
              {statusFilter === "Archived"
                ? "No Archived Listings"
                : activeStock.length === 0
                  ? "No Ready Stock Yet"
                  : "No Matching Listings"}
            </h2>

            <p>
              {statusFilter === "Archived"
                ? "Archived stock listings will appear here."
                : activeStock.length === 0
                  ? "Click Add Ready Stock to create a listing."
                  : "No listings match the selected status."}
            </p>

            {statusFilter !== "All" && (
              <button
                type="button"
                style={buttonStyle}
                onClick={() => setStatusFilter("All")}
              >
                Show Active Listings
              </button>
            )}
          </div>
        ) : (
          filteredStock.map((item) => {
            const status = getStockStatus(item, today);
            const [color, background] = statusColors[status];

            return (
              <article
                className="admin-product-card"
                key={item.id}
              >
                <div className="admin-product-icon">
                  {item.is_archived ? (
                    <Archive size={22} />
                  ) : (
                    <Package size={22} />
                  )}
                </div>

                <div className="admin-product-details">
                  <div
                    className="admin-product-title-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <h3>
                      {getProductName(item.product_id)}
                    </h3>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: 20,
                        padding: "5px 11px",
                        fontSize: 12,
                        fontWeight: 600,
                        color,
                        background,
                      }}
                    >
                      {status}
                    </span>
                  </div>

                  {getOptionNames(item.option_ids) && (
                    <p className="admin-product-description">
                      {getOptionNames(item.option_ids)}
                    </p>
                  )}

                  {item.notes && (
                    <p className="admin-product-description">
                      {item.notes}
                    </p>
                  )}

                  <div
                    className="admin-product-meta"
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 15,
                    }}
                  >
                    <span>
                      <Package size={14} />
                      Quantity: {item.quantity_available}
                    </span>

                    <span>
                      <CalendarDays size={14} />
                      {item.available_date}
                    </span>

                    <span>
                      {item.is_archived
                        ? "Archived"
                        : item.is_listed
                          ? "Published"
                          : "Not published"}
                    </span>
                  </div>

                  {item.is_archived && item.archived_at && (
                    <p
                      style={{
                        color: "#947c6d",
                        fontSize: 12,
                        marginTop: 10,
                      }}
                    >
                      Archived on{" "}
                      {new Date(item.archived_at).toLocaleString(
                        "en-PH",
                        { timeZone: "Asia/Manila" }
                      )}
                    </p>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 14,
                    }}
                  >
                    {item.is_archived ? (
                      <button
                        type="button"
                        style={buttonStyle}
                        disabled={Boolean(busyId)}
                        onClick={() => restoreListing(item)}
                      >
                        <ArchiveRestore size={16} />
                        {busyId === item.id
                          ? "Restoring..."
                          : "Restore"}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          style={buttonStyle}
                          onClick={() => openEditForm(item)}
                          disabled={Boolean(busyId)}
                        >
                          <Pencil size={15} />
                          Edit
                        </button>

                        <button
                          type="button"
                          style={buttonStyle}
                          onClick={() => toggleListing(item)}
                          disabled={Boolean(busyId)}
                        >
                          {busyId === item.id
                            ? "Updating..."
                            : item.is_listed
                              ? "Unpublish"
                              : "Publish"}
                        </button>

                        <button
                          type="button"
                          style={{
                            ...buttonStyle,
                            color: "#8a623e",
                          }}
                          disabled={Boolean(busyId)}
                          onClick={() => {
                            setError("");
                            setMessage("");
                            setArchiveTarget(item);
                          }}
                        >
                          <Archive size={16} />
                          Archive
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="admin-product-price">
                  <small>Price per unit</small>
                  <strong>{peso(item.price_per_unit)}</strong>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
