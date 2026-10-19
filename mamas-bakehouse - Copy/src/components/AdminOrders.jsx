
import { useEffect, useState } from "react";
import {
  ClipboardList,
  RefreshCw,
  ShoppingBag,
  Clock3,
  CheckCircle2,
  Package,
  ChevronDown,
  ChevronUp,
  UserRound,
  Phone,
  CalendarDays,
  MapPin,
  CreditCard,
  FileText,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import "./AdminProducts.css";

const peso = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value || 0));

const formatStatus = (value) =>
  String(value || "Not specified")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const displayValue = (value) =>
  value === null || value === undefined || value === ""
    ? "Not specified"
    : String(value);

const formatDate = (value) => {
  if (!value) return "Not specified";

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "Not specified";

  const [hours, minutes] = String(value).split(":");
  const hour = Number(hours);

  if (!Number.isInteger(hour) || !minutes) {
    return String(value);
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minutes} ${period}`;
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e9dfd5",
  borderRadius: 18,
  padding: 24,
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

const statusColors = {
  pending: ["#8a623e", "#f7efe5"],
  approved: ["#315d89", "#eaf2fa"],
  awaiting_down_payment: ["#9b6421", "#fff3dc"],
  confirmed: ["#315d89", "#eaf2fa"],
  preparing: ["#76543c", "#f4eee8"],
  ready: ["#276749", "#eaf6ee"],
  completed: ["#276749", "#eaf6ee"],
  cancelled: ["#7b5760", "#f5eaf0"],
  rejected: ["#b42318", "#fef0ee"],
};

function StatusBadge({ value }) {
  const [color, background] =
    statusColors[value] || ["#66616a", "#eeecef"];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 11px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        color,
        background,
      }}
    >
      {formatStatus(value)}
    </span>
  );
}

function DetailRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        padding: "10px 0",
        borderBottom: "1px solid #f2ece6",
      }}
    >
      <span
        style={{
          color: "#947c6d",
          fontSize: 13,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color: "#39291f",
          fontSize: 13,
          fontWeight: 600,
          textAlign: "right",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function DetailSection({ title, icon: Icon, children }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eee4da",
        borderRadius: 14,
        padding: 20,
        minWidth: 0,
      }}
    >
      <h3
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          fontFamily: "Georgia, serif",
          color: "#39291f",
          fontSize: 17,
          margin: "0 0 14px",
        }}
      >
        <Icon size={19} color="#76543c" />
        {title}
      </h3>

      {children}
    </div>
  );
}

function formatOptions(selectedOptions) {
  if (!selectedOptions) return [];

  if (Array.isArray(selectedOptions)) {
    return selectedOptions.map((option) => {
      if (typeof option === "string") return option;

      if (option && typeof option === "object") {
        return (
          option.option_name ||
          option.name ||
          option.label ||
          option.value ||
          JSON.stringify(option)
        );
      }

      return String(option);
    });
  }

  if (typeof selectedOptions === "object") {
    return Object.entries(selectedOptions).map(
      ([group, value]) => {
        if (value && typeof value === "object") {
          const name =
            value.option_name ||
            value.name ||
            value.label ||
            value.value;

          return name
            ? `${group}: ${name}`
            : `${group}: ${JSON.stringify(value)}`;
        }

        return `${group}: ${String(value)}`;
      }
    );
  }

  return [String(selectedOptions)];
}

function OrderDetails({ order, profile, items }) {
  return (
    <div
      style={{
        marginTop: 20,
        paddingTop: 20,
        borderTop: "1px solid #eee4da",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        <DetailSection
          title="Customer Information"
          icon={UserRound}
        >
          <DetailRow
            label="Full Name"
            value={displayValue(profile?.full_name)}
          />

          <DetailRow
            label="Phone Number"
            value={displayValue(profile?.phone_number)}
          />

          <DetailRow
            label="Order Type"
            value={formatStatus(order.order_type)}
          />

          <DetailRow
            label="Order Date"
            value={new Date(order.created_at).toLocaleString(
              "en-PH",
              {
                timeZone: "Asia/Manila",
                dateStyle: "medium",
                timeStyle: "short",
              }
            )}
          />
        </DetailSection>

        <DetailSection
          title="Payment Information"
          icon={CreditCard}
        >
          <DetailRow
            label="Payment Method"
            value={formatStatus(order.payment_method)}
          />

          <DetailRow
            label="Payment Status"
            value={formatStatus(order.payment_status)}
          />

          <DetailRow
            label="Subtotal"
            value={peso(order.subtotal)}
          />

          <DetailRow
            label="Total Amount"
            value={peso(order.total_amount)}
          />

          <DetailRow
            label="Down Payment Required"
            value={peso(order.down_payment_required)}
          />

          <DetailRow
            label="Amount Paid"
            value={peso(order.amount_paid)}
          />

          <DetailRow
            label="Remaining Balance"
            value={peso(
              Math.max(
                0,
                Number(order.total_amount || 0) -
                  Number(order.amount_paid || 0)
              )
            )}
          />
        </DetailSection>

        <DetailSection
          title="Requested Meetup"
          icon={CalendarDays}
        >
          <DetailRow
            label="Date"
            value={formatDate(order.requested_meetup_date)}
          />

          <DetailRow
            label="Time"
            value={formatTime(order.requested_meetup_time)}
          />

          <DetailRow
            label="Location"
            value={displayValue(
              order.requested_meetup_location
            )}
          />
        </DetailSection>

        <DetailSection
          title="Confirmed Meetup"
          icon={MapPin}
        >
          <DetailRow
            label="Date"
            value={formatDate(order.confirmed_meetup_date)}
          />

          <DetailRow
            label="Time"
            value={formatTime(order.confirmed_meetup_time)}
          />

          <DetailRow
            label="Location"
            value={displayValue(
              order.confirmed_meetup_location
            )}
          />
        </DetailSection>
      </div>

      <div style={{ marginTop: 16 }}>
        <DetailSection
          title="Ordered Products"
          icon={ShoppingBag}
        >
          {items.length === 0 ? (
            <p style={{ color: "#947c6d" }}>
              No order items found for this order.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {items.map((item) => {
                const selectedOptions = formatOptions(
                  item.selected_options
                );

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: 16,
                      background: "#faf7f3",
                      border: "1px solid #eee4da",
                      borderRadius: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <strong
                          style={{
                            color: "#39291f",
                            fontSize: 15,
                          }}
                        >
                          {item.product_name ||
                            "Unnamed Product"}
                        </strong>

                        <p
                          style={{
                            margin: "8px 0",
                            color: "#806d60",
                            fontSize: 13,
                          }}
                        >
                          {item.ready_stock_id
                            ? "Ready Stock"
                            : "Preorder Item"}
                        </p>

                        {selectedOptions.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                              marginTop: 8,
                            }}
                          >
                            {selectedOptions.map(
                              (option, index) => (
                                <span
                                  key={index}
                                  style={{
                                    background: "#f0e8df",
                                    color: "#70523e",
                                    padding: "5px 9px",
                                    borderRadius: 8,
                                    fontSize: 12,
                                  }}
                                >
                                  {option}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      <strong
                        style={{
                          color: "#39291f",
                          fontSize: 17,
                        }}
                      >
                        {peso(item.line_total)}
                      </strong>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 18,
                        flexWrap: "wrap",
                        marginTop: 14,
                        color: "#806d60",
                        fontSize: 13,
                      }}
                    >
                      <span>
                        Quantity: {item.quantity}
                      </span>

                      <span>
                        Unit Price: {peso(item.unit_price)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DetailSection>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginTop: 16,
        }}
      >
        <DetailSection
          title="Customer Notes"
          icon={FileText}
        >
          <p
            style={{
              color: "#806d60",
              lineHeight: 1.6,
              margin: 0,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {order.customer_notes ||
              "No customer notes provided."}
          </p>
        </DetailSection>

        <DetailSection
          title="Admin Notes"
          icon={FileText}
        >
          <p
            style={{
              color: "#806d60",
              lineHeight: 1.6,
              margin: 0,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {order.admin_notes ||
              "No admin notes yet."}
          </p>
        </DetailSection>
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [orderItems, setOrderItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedOrderId, setExpandedOrderId] =
    useState(null);

  async function loadOrders() {
    setLoading(true);
    setError("");

    try {
      const [ordersResult, profilesResult, itemsResult] =
        await Promise.all([
          supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false }),

          supabase
            .from("profiles")
            .select("id, full_name, phone_number"),

          supabase
            .from("order_items")
            .select("*")
            .order("created_at", { ascending: true }),
        ]);

      const failed = [
        ordersResult,
        profilesResult,
        itemsResult,
      ].find((result) => result.error);

      if (failed) throw failed.error;

      setOrders(ordersResult.data || []);
      setProfiles(profilesResult.data || []);
      setOrderItems(itemsResult.data || []);
    } catch (err) {
      setError(err.message || "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const pending = orders.filter(
    (order) => order.status === "pending"
  ).length;

  const completed = orders.filter(
    (order) => order.status === "completed"
  ).length;

  const preparing = orders.filter(
    (order) => order.status === "preparing"
  ).length;

  const cards = [
    {
      label: "Total Orders",
      value: orders.length,
      icon: ShoppingBag,
    },
    {
      label: "Pending",
      value: pending,
      icon: Clock3,
    },
    {
      label: "Preparing",
      value: preparing,
      icon: Package,
    },
    {
      label: "Completed",
      value: completed,
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="admin-products-page">
      <div className="admin-products-heading">
        <div>
          <p className="admin-kicker">
            BAKERY MANAGEMENT
          </p>

          <h1>Orders</h1>

          <p>
            Manage customer purchases and preorders.
          </p>
        </div>

        <button
          type="button"
          onClick={loadOrders}
          disabled={loading}
          style={buttonStyle}
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div key={card.label} style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#947c6d",
                  marginBottom: 12,
                }}
              >
                <span>{card.label}</span>
                <Icon size={20} />
              </div>

              <strong
                style={{
                  fontSize: 28,
                  color: "#39291f",
                }}
              >
                {loading ? "..." : card.value}
              </strong>
            </div>
          );
        })}
      </div>

      <div style={cardStyle}>
        <h2
          style={{
            fontFamily: "Georgia, serif",
            color: "#39291f",
            marginTop: 0,
          }}
        >
          Recent Orders
        </h2>

        {loading ? (
          <p>Loading customer orders...</p>
        ) : orders.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 10px",
              color: "#947c6d",
            }}
          >
            <ClipboardList
              size={36}
              style={{ marginBottom: 12 }}
            />

            <h3>No Orders Yet</h3>

            <p>
              Customer orders will appear here once
              they are submitted.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {orders.map((order) => {
              const expanded =
                expandedOrderId === order.id;

              const profile = profiles.find(
                (item) => item.id === order.customer_id
              );

              const items = orderItems.filter(
                (item) => item.order_id === order.id
              );

              return (
                <article
                  key={order.id}
                  style={{
                    border: "1px solid #eee4da",
                    borderRadius: 14,
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          color: "#39291f",
                          fontSize: 18,
                        }}
                      >
                        {order.order_number}
                      </strong>

                      <p
                        style={{
                          margin: "8px 0",
                          color: "#806d60",
                        }}
                      >
                        <UserRound
                          size={14}
                          style={{
                            verticalAlign: "middle",
                            marginRight: 6,
                          }}
                        />
                        {profile?.full_name ||
                          "Customer profile unavailable"}
                      </p>

                      {profile?.phone_number && (
                        <p
                          style={{
                            margin: "8px 0",
                            color: "#806d60",
                            fontSize: 13,
                          }}
                        >
                          <Phone
                            size={14}
                            style={{
                              verticalAlign: "middle",
                              marginRight: 6,
                            }}
                          />
                          {profile.phone_number}
                        </p>
                      )}

                      <p
                        style={{
                          color: "#947c6d",
                          fontSize: 13,
                          marginBottom: 0,
                        }}
                      >
                        {formatStatus(order.order_type)}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 10,
                      }}
                    >
                      <StatusBadge value={order.status} />

                      <strong
                        style={{
                          color: "#39291f",
                          fontSize: 20,
                        }}
                      >
                        {peso(order.total_amount)}
                      </strong>

                      <span
                        style={{
                          color: "#947c6d",
                          fontSize: 12,
                        }}
                      >
                        Payment:{" "}
                        {formatStatus(order.payment_status)}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <button
                      type="button"
                      style={buttonStyle}
                      aria-expanded={expanded}
                      onClick={() =>
                        setExpandedOrderId(
                          expanded ? null : order.id
                        )
                      }
                    >
                      {expanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}

                      {expanded
                        ? "Hide Details"
                        : "View Details"}
                    </button>
                  </div>

                  {expanded && (
                    <OrderDetails
                      order={order}
                      profile={profile}
                      items={items}
                    />
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
