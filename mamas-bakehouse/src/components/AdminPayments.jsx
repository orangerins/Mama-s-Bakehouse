
import { useEffect, useState } from "react";
import {
  CreditCard,
  RefreshCw,
  Search,
  Wallet,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";

import { supabase } from "../lib/supabase";

// Format Philippine peso amounts.
function money(value) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Format payment types and statuses.
function pretty(value) {
  return String(value || "Unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Display the correct payment method.
function formatPaymentMethod(method) {
  const value = String(method || "").trim().toLowerCase();

  if (value === "gcash") {
    return "GCash";
  }

  if (value === "cash") {
    return "Cash";
  }

  return pretty(method);
}

// Format transaction dates.
function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Load all payments with their related orders.
  async function loadPayments() {
    setLoading(true);
    setError("");

    try {
      const { data, error: queryError } = await supabase
        .from("payments")
        .select(`
          id,
          order_id,
          payment_type,
          payment_method,
          amount,
          status,
          admin_notes,
          created_at,
          verified_at,
          orders!inner (
            order_number,
            is_test
          )
        `)
        .order("created_at", {
          ascending: false,
        });

      if (queryError) {
        throw queryError;
      }

      setPayments(data || []);
    } catch (err) {
      console.error("Payments loading error:", err);

      setError(
        err.message || "Unable to load payment transactions."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  // Filter payment transactions.
  const filtered = payments.filter((payment) => {
    const order = payment.orders;

    const isTest = order?.is_test === true;

    // Filter real and test payments.
    if (typeFilter === "real" && isTest) {
      return false;
    }

    if (typeFilter === "test" && !isTest) {
      return false;
    }

    // Filter by payment status.
    if (
      statusFilter !== "all" &&
      payment.status !== statusFilter
    ) {
      return false;
    }

    // Search payment records.
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return true;
    }

    return [
      order?.order_number,
      payment.payment_method,
      formatPaymentMethod(payment.payment_method),
      payment.payment_type,
      payment.status,
      payment.admin_notes,
    ].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(keyword)
    );
  });

  // Only real payments are included in summary cards.
  const realPayments = payments.filter(
    (payment) => payment.orders?.is_test === false
  );

  // Total verified real payment amounts.
  // This is not net revenue after refunds.
  const verifiedPaymentsTotal = realPayments
    .filter(
      (payment) =>
        payment.status === "verified" &&
        payment.payment_type !== "refund"
    )
    .reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  const pendingCount = realPayments.filter(
    (payment) => payment.status === "pending"
  ).length;

  const verifiedCount = realPayments.filter(
    (payment) => payment.status === "verified"
  ).length;

  const rejectedCount = realPayments.filter(
    (payment) => payment.status === "rejected"
  ).length;

  const summaryCards = [
    {
      label: "Verified Payments",
      value: money(verifiedPaymentsTotal),
      icon: Wallet,
    },
    {
      label: "Pending Reviews",
      value: pendingCount,
      icon: Clock3,
    },
    {
      label: "Verified Transactions",
      value: verifiedCount,
      icon: CheckCircle2,
    },
    {
      label: "Rejected Transactions",
      value: rejectedCount,
      icon: XCircle,
    },
  ];

  const fieldStyle = {
    padding: "12px 14px",
    border: "1px solid #e9ded2",
    borderRadius: 10,
    background: "#fff",
    color: "#4b3023",
    fontSize: 14,
    minHeight: 44,
  };

  return (
    <>
      {/* PAGE HEADER */}
      <header className="admin-header">
        <div>
          <p className="admin-kicker">
            BAKERY MANAGEMENT
          </p>

          <h1>Payments</h1>

          <p>
            Review payment transactions and identify test
            records.
          </p>
        </div>

        <button
          type="button"
          onClick={loadPayments}
          disabled={loading}
          style={{
            ...fieldStyle,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </header>

      {/* ERROR MESSAGE */}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      {/* PAYMENT SUMMARY */}
      <section className="admin-stats">
        {summaryCards.map((card) => {
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

      <p
        style={{
          color: "#8d7565",
          fontSize: 13,
          marginBottom: 24,
        }}
      >
        Summary statistics exclude test payments.
        The transaction list includes both real and test
        payments. Verified Payments shows recorded verified
        amounts, not net revenue after refunds.
      </p>

      {/* PAYMENT TRANSACTIONS */}
      <section
        style={{
          background: "#fff",
          border: "1px solid #eadfd4",
          borderRadius: 18,
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#44291c",
              fontSize: 24,
            }}
          >
            Payment Transactions
          </h2>

          <span
            style={{
              color: "#937b69",
            }}
          >
            {filtered.length} transaction(s)
          </span>
        </div>

        {/* SEARCH AND FILTERS */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              ...fieldStyle,
              flex: "1 1 230px",
            }}
          >
            <Search
              size={17}
              color="#9a8171"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search order or payment..."
              style={{
                border: "none",
                outline: "none",
                flex: 1,
                minWidth: 0,
                background: "transparent",
              }}
            />
          </div>

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value)
            }
            style={fieldStyle}
          >
            <option value="all">
              All Transactions
            </option>

            <option value="real">
              Real Only
            </option>

            <option value="test">
              Test Only
            </option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            style={fieldStyle}
          >
            <option value="all">
              All Statuses
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="verified">
              Verified
            </option>

            <option value="rejected">
              Rejected
            </option>
          </select>
        </div>

        {/* PAYMENT TABLE */}
        {loading ? (
          <p>Loading payments...</p>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: 45,
              textAlign: "center",
              color: "#9a8171",
            }}
          >
            <CreditCard
              size={34}
              style={{
                marginBottom: 12,
              }}
            />

            <p>
              No payment transactions found.
            </p>
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: 14,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom:
                      "1px solid #e9ded2",
                    color: "#8c7361",
                  }}
                >
                  {[
                    "Order",
                    "Payment",
                    "Method",
                    "Amount",
                    "Status",
                    "Date",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "14px 12px",
                        fontWeight: 600,
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((payment) => {
                  const isTest =
                    payment.orders?.is_test === true;

                  const statusColor =
                    payment.status === "verified"
                      ? "#21764e"
                      : payment.status === "pending"
                      ? "#aa7628"
                      : "#b54a4a";

                  return (
                    <tr
                      key={payment.id}
                      style={{
                        borderBottom:
                          "1px solid #f0e9e2",
                        background: isTest
                          ? "#fffcf4"
                          : "transparent",
                      }}
                    >
                      {/* ORDER NUMBER */}
                      <td
                        style={{
                          padding: "16px 12px",
                          fontWeight: 600,
                        }}
                      >
                        <div>
                          {payment.orders?.order_number ||
                            "Unknown"}
                        </div>

                        <span
                          style={{
                            display: "inline-block",
                            marginTop: 6,
                            fontSize: 11,
                            padding: "4px 9px",
                            borderRadius: 20,
                            background: isTest
                              ? "#fff0c9"
                              : "#e9f3ec",
                            color: isTest
                              ? "#8a641d"
                              : "#256c49",
                          }}
                        >
                          {isTest
                            ? "TEST PAYMENT"
                            : "REAL PAYMENT"}
                        </span>
                      </td>

                      {/* PAYMENT TYPE */}
                      <td
                        style={{
                          padding: "16px 12px",
                        }}
                      >
                        {pretty(payment.payment_type)}
                      </td>

                      {/* PAYMENT METHOD */}
                      <td
                        style={{
                          padding: "16px 12px",
                        }}
                      >
                        {formatPaymentMethod(
                          payment.payment_method
                        )}
                      </td>

                      {/* AMOUNT */}
                      <td
                        style={{
                          padding: "16px 12px",
                          fontWeight: 700,
                        }}
                      >
                        {money(payment.amount)}
                      </td>

                      {/* STATUS */}
                      <td
                        style={{
                          padding: "16px 12px",
                        }}
                      >
                        <span
                          style={{
                            color: statusColor,
                            fontWeight: 600,
                          }}
                        >
                          {pretty(payment.status)}
                        </span>
                      </td>

                      {/* DATE */}
                      <td
                        style={{
                          padding: "16px 12px",
                          color: "#8c7361",
                        }}
                      >
                        {formatDate(payment.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
