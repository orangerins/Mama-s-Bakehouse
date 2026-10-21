
import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  Wallet,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Download,
  BarChart3,
  Trophy,
  CreditCard,
  Banknote,
  RotateCcw,
} from "lucide-react";

import { supabase } from "../lib/supabase";

const TIME_ZONE = "Asia/Manila";

function money(value) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function localDate(value) {
  if (!value) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));

  const get = (type) =>
    parts.find((part) => part.type === type)?.value || "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function localMonth(value) {
  return localDate(value).slice(0, 7);
}

function monthLabel(month) {
  if (!month) return "";

  const [year, number] = month.split("-").map(Number);

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, number - 1, 1));
}

function csvCell(value) {
  const text = String(value ?? "");

  const safe = /^[=+\-@\t\r]/.test(text)
    ? `'${text}`
    : text;

  return `"${safe.replaceAll('"', '""')}"`;
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #eadfd4",
  borderRadius: 18,
  padding: 24,
};

const controlStyle = {
  padding: "11px 14px",
  border: "1px solid #e5d8cc",
  borderRadius: 10,
  background: "#fff",
  color: "#4b3023",
  fontSize: 14,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  textAlign: "left",
  fontSize: 14,
};

const cellStyle = {
  padding: 12,
};

export default function AdminSalesReports() {
  const [orders, setOrders] = useState([]);
  const [productSales, setProductSales] = useState([]);
  const [verifiedPayments, setVerifiedPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [period, setPeriod] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const today = localDate(new Date());
  const currentMonth = today.slice(0, 7);

  // LOAD ALL REPORT DATA
  async function loadReports() {
    setLoading(true);
    setError("");

    try {
      const [
        ordersResult,
        productsResult,
        paymentsResult,
      ] = await Promise.all([
        supabase
          .from("real_sales_orders")
          .select(`
            id,
            order_number,
            created_at,
            completed_at,
            status,
            payment_status,
            total_amount,
            amount_paid
          `)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("real_product_sales")
          .select(`
            product_name,
            product_id,
            completed_at,
            quantity,
            line_total
          `),

        supabase
          .from("real_verified_payments")
          .select(`
            id,
            order_id,
            order_number,
            payment_type,
            payment_method,
            amount,
            verified_at
          `)
          .order("verified_at", {
            ascending: false,
          }),
      ]);

      if (ordersResult.error) {
        throw ordersResult.error;
      }

      if (productsResult.error) {
        throw productsResult.error;
      }

      if (paymentsResult.error) {
        throw paymentsResult.error;
      }

      setOrders(ordersResult.data || []);
      setProductSales(productsResult.data || []);
      setVerifiedPayments(paymentsResult.data || []);
    } catch (err) {
      console.error("Sales Reports Error:", err);

      setError(
        err.message || "Unable to load sales reports."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  // FILTER BY PHILIPPINE LOCAL DATE
  function matchesPeriod(dateString) {
    if (!dateString) return false;

    const date = localDate(dateString);

    if (period === "today") {
      return date === today;
    }

    if (period === "month") {
      return date.slice(0, 7) === currentMonth;
    }

    if (period === "custom") {
      if (startDate && date < startDate) {
        return false;
      }

      if (endDate && date > endDate) {
        return false;
      }
    }

    return true;
  }

  // COMPLETED SALES AND OUTSTANDING BALANCES
  const report = useMemo(() => {
    const completed = orders.filter(
      (order) =>
        order.status === "completed" &&
        order.completed_at &&
        matchesPeriod(order.completed_at)
    );

    const completedSales = completed.reduce(
      (sum, order) =>
        sum + Number(order.total_amount || 0),
      0
    );

    const activeOrders = orders.filter(
      (order) =>
        !["completed", "cancelled", "rejected"].includes(
          order.status
        ) && matchesPeriod(order.created_at)
    );

    const outstandingBalances = activeOrders.reduce(
      (sum, order) =>
        sum +
        Math.max(
          0,
          Number(order.total_amount || 0) -
            Number(order.amount_paid || 0)
        ),
      0
    );

    const monthlyMap = {};

    completed.forEach((order) => {
      const month = localMonth(order.completed_at);

      monthlyMap[month] =
        (monthlyMap[month] || 0) +
        Number(order.total_amount || 0);
    });

    const monthlySales = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month,
        amount,
      }));

    return {
      completed,
      completedSales,
      outstandingBalances,
      completedCount: completed.length,
      monthlySales,
    };
  }, [
    orders,
    period,
    startDate,
    endDate,
    today,
    currentMonth,
  ]);

  // VERIFIED PAYMENT REPORTING
  const paymentReport = useMemo(() => {
    const filteredPayments = verifiedPayments.filter(
      (payment) => matchesPeriod(payment.verified_at)
    );

    let gcashPayments = 0;
    let cashPayments = 0;
    let otherPayments = 0;
    let refunds = 0;

    filteredPayments.forEach((payment) => {
      const amount = Number(payment.amount || 0);

      const type = String(
        payment.payment_type || ""
      ).toLowerCase();

      const method = String(
        payment.payment_method || ""
      ).toLowerCase();

      if (type === "refund") {
        refunds += Math.abs(amount);
        return;
      }

      if (method === "gcash") {
        gcashPayments += amount;
      } else if (method === "cash") {
        cashPayments += amount;
      } else {
        otherPayments += amount;
      }
    });

    const grossPayments =
      gcashPayments + cashPayments + otherPayments;

    const netCollections = grossPayments - refunds;

    return {
      filteredPayments,
      gcashPayments,
      cashPayments,
      otherPayments,
      refunds,
      grossPayments,
      netCollections,
    };
  }, [
    verifiedPayments,
    period,
    startDate,
    endDate,
    today,
    currentMonth,
  ]);

  // BEST-SELLING PRODUCTS
  const bestSellingProducts = useMemo(() => {
    const productMap = new Map();

    productSales
      .filter((item) => matchesPeriod(item.completed_at))
      .forEach((item) => {
        const name =
          item.product_name || "Unknown Product";

        const key = item.product_id || name;

        const current = productMap.get(key) || {
          name,
          quantity: 0,
          revenue: 0,
        };

        current.quantity += Number(item.quantity || 0);
        current.revenue += Number(item.line_total || 0);

        productMap.set(key, current);
      });

    return [...productMap.values()].sort(
      (a, b) =>
        b.quantity - a.quantity ||
        b.revenue - a.revenue
    );
  }, [
    productSales,
    period,
    startDate,
    endDate,
    today,
    currentMonth,
  ]);

  // EXPORT REPORTS TO CSV
  function exportCSV() {
    const completedOrders = report.completed;

    const rows = [
      [
        "Mama's Bakehouse Sales Report",
      ],
      [
        "Reporting Period",
        period === "custom"
          ? `${startDate || "Start"} to ${endDate || "End"}`
          : period,
      ],
      [],
      ["SUMMARY"],
      [
        "Completed Sales",
        report.completedSales.toFixed(2),
      ],
      [
        "Completed Orders",
        report.completedCount,
      ],
      [
        "Gross Verified Payments",
        paymentReport.grossPayments.toFixed(2),
      ],
      [
        "GCash Payments",
        paymentReport.gcashPayments.toFixed(2),
      ],
      [
        "Cash Payments",
        paymentReport.cashPayments.toFixed(2),
      ],
      [
        "Other Payments",
        paymentReport.otherPayments.toFixed(2),
      ],
      [
        "Verified Refunds",
        paymentReport.refunds.toFixed(2),
      ],
      [
        "Net Collections",
        paymentReport.netCollections.toFixed(2),
      ],
      [
        "Outstanding Balances",
        report.outstandingBalances.toFixed(2),
      ],
      [],
      ["COMPLETED SALES"],
      [
        "Order Number",
        "Completed Date",
        "Order Total",
        "Amount Paid",
      ],
      ...completedOrders.map((order) => [
        order.order_number,
        localDate(order.completed_at),
        Number(order.total_amount || 0).toFixed(2),
        Number(order.amount_paid || 0).toFixed(2),
      ]),
      [],
      ["VERIFIED PAYMENT RECORDS"],
      [
        "Order Number",
        "Verified Date",
        "Payment Type",
        "Payment Method",
        "Amount",
      ],
      ...paymentReport.filteredPayments.map(
        (payment) => [
          payment.order_number,
          localDate(payment.verified_at),
          payment.payment_type,
          payment.payment_method,
          Number(payment.amount || 0).toFixed(2),
        ]
      ),
      [],
      ["BEST-SELLING PRODUCTS"],
      [
        "Product",
        "Units Sold",
        "Sales Revenue",
      ],
      ...bestSellingProducts.map((product) => [
        product.name,
        product.quantity,
        product.revenue.toFixed(2),
      ]),
    ];

    const csv = rows
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "mamas-bakehouse-sales-report.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  const summaryCards = [
    {
      label: "Completed Sales",
      value: money(report.completedSales),
      icon: TrendingUp,
    },
    {
      label: "Payments Collected",
      value: money(paymentReport.netCollections),
      icon: Wallet,
    },
    {
      label: "Completed Orders",
      value: report.completedCount,
      icon: CheckCircle2,
    },
    {
      label: "Outstanding Balances",
      value: money(report.outstandingBalances),
      icon: Clock3,
    },
  ];

  const paymentCards = [
    {
      label: "Gross Payments",
      value: money(paymentReport.grossPayments),
      icon: Wallet,
    },
    {
      label: "GCash Payments",
      value: money(paymentReport.gcashPayments),
      icon: CreditCard,
    },
    {
      label: "Cash Payments",
      value: money(paymentReport.cashPayments),
      icon: Banknote,
    },
    {
      label: "Verified Refunds",
      value: money(paymentReport.refunds),
      icon: RotateCcw,
    },
    {
      label: "Net Collections",
      value: money(paymentReport.netCollections),
      icon: TrendingUp,
    },
  ];

  const maxMonthly = Math.max(
    1,
    ...report.monthlySales.map((item) => item.amount)
  );

  return (
    <>
      {/* PAGE HEADER */}
      <header className="admin-header">
        <div>
          <p className="admin-kicker">
            BAKERY MANAGEMENT
          </p>

          <h1>Sales Reports</h1>

          <p>
            Monitor real bakery sales, payments,
            and order performance.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReports}
          disabled={loading}
          style={{
            ...controlStyle,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
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

      {/* DATE FILTERS */}
      <section
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <select
          value={period}
          onChange={(event) =>
            setPeriod(event.target.value)
          }
          style={controlStyle}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="month">This Month</option>
          <option value="custom">
            Custom Date Range
          </option>
        </select>

        {period === "custom" && (
          <>
            <input
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(event.target.value)
              }
              style={controlStyle}
            />

            <span>to</span>

            <input
              type="date"
              value={endDate}
              onChange={(event) =>
                setEndDate(event.target.value)
              }
              style={controlStyle}
            />
          </>
        )}

        <button
          type="button"
          onClick={exportCSV}
          disabled={loading || Boolean(error)}
          style={{
            ...controlStyle,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            marginLeft: "auto",
          }}
        >
          <Download size={17} />
          Export CSV
        </button>
      </section>

      {/* MAIN SUMMARY CARDS */}
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

      {/* REPORTING NOTE */}
      <p
        style={{
          color: "#8d7565",
          fontSize: 13,
          marginBottom: 24,
        }}
      >
        Test orders and payments are excluded.
        Completed Sales uses completion dates.
        Payments Collected uses verified payment
        dates and deducts verified refunds.
        Outstanding Balances represents current
        unpaid amounts on active orders created
        in the selected period.
      </p>

      {/* VERIFIED PAYMENT BREAKDOWN */}
      <section
        style={{
          ...cardStyle,
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            margin: "0 0 20px",
            color: "#44291c",
            fontSize: 22,
          }}
        >
          Verified Payment Breakdown
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
          }}
        >
          {paymentCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                style={{
                  padding: 18,
                  background: "#faf7f3",
                  border: "1px solid #eee4da",
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 16,
                    color: "#927866",
                    fontSize: 13,
                  }}
                >
                  <span>{card.label}</span>
                  <Icon size={18} />
                </div>

                <strong
                  style={{
                    fontSize: 23,
                    color: "#44291c",
                  }}
                >
                  {loading ? "..." : card.value}
                </strong>
              </div>
            );
          })}
        </div>

        <p
          style={{
            marginTop: 16,
            fontSize: 12,
            color: "#9a8171",
          }}
        >
          Payments are grouped by admin verification
          date in Philippine time. Gross payments
          exclude refunds; net collections subtract
          verified refunds.
        </p>
      </section>

      {/* MONTHLY COMPLETED SALES */}
      <section
        style={{
          ...cardStyle,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 24,
          }}
        >
          <BarChart3
            size={23}
            color="#79513b"
          />

          <h2
            style={{
              margin: 0,
              color: "#44291c",
              fontSize: 22,
            }}
          >
            Monthly Completed Sales
          </h2>
        </div>

        {report.monthlySales.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "45px 20px",
              color: "#9a8171",
            }}
          >
            <BarChart3
              size={40}
              style={{ marginBottom: 12 }}
            />

            <p>
              No completed real sales for this period.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 20,
              minHeight: 240,
              overflowX: "auto",
              paddingBottom: 12,
            }}
          >
            {report.monthlySales.map((item) => {
              const height = Math.max(
                8,
                (item.amount / maxMonthly) * 175
              );

              return (
                <div
                  key={item.month}
                  style={{
                    minWidth: 105,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <strong
                    style={{
                      fontSize: 12,
                      color: "#604532",
                    }}
                  >
                    {money(item.amount)}
                  </strong>

                  <div
                    title={`${monthLabel(item.month)}: ${money(
                      item.amount
                    )}`}
                    style={{
                      height,
                      width: 65,
                      borderRadius: "8px 8px 0 0",
                      background: "#98735b",
                    }}
                  />

                  <span
                    style={{
                      fontSize: 12,
                      color: "#8c7361",
                    }}
                  >
                    {monthLabel(item.month)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* COMPLETED SALES RECORDS */}
      <section
        style={{
          ...cardStyle,
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            margin: "0 0 20px",
            color: "#44291c",
            fontSize: 22,
          }}
        >
          Completed Sales Records
        </h2>

        {report.completed.length === 0 ? (
          <p style={{ color: "#9a8171" }}>
            No completed real orders for this period.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #eadfd4",
                    color: "#8c7361",
                  }}
                >
                  {[
                    "Order Number",
                    "Completed Date",
                    "Order Total",
                    "Amount Paid",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={cellStyle}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {report.completed.map((order) => (
                  <tr
                    key={order.id}
                    style={{
                      borderBottom:
                        "1px solid #f0e9e2",
                    }}
                  >
                    <td style={cellStyle}>
                      {order.order_number}
                    </td>

                    <td style={cellStyle}>
                      {localDate(order.completed_at)}
                    </td>

                    <td style={cellStyle}>
                      {money(order.total_amount)}
                    </td>

                    <td style={cellStyle}>
                      {money(order.amount_paid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* BEST-SELLING PRODUCTS */}
      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <Trophy
            size={23}
            color="#79513b"
          />

          <h2
            style={{
              margin: 0,
              color: "#44291c",
              fontSize: 22,
            }}
          >
            Best-Selling Products
          </h2>
        </div>

        {bestSellingProducts.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "35px 20px",
              color: "#9a8171",
            }}
          >
            <Trophy
              size={40}
              style={{ marginBottom: 12 }}
            />

            <p>
              No completed real product sales
              for this period.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr
                  style={{
                    borderBottom:
                      "1px solid #eadfd4",
                    color: "#8c7361",
                  }}
                >
                  {[
                    "Rank",
                    "Product",
                    "Units Sold",
                    "Sales Revenue",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={cellStyle}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {bestSellingProducts.map(
                  (product, index) => (
                    <tr
                      key={`${product.name}-${index}`}
                      style={{
                        borderBottom:
                          "1px solid #f0e9e2",
                      }}
                    >
                      <td style={cellStyle}>
                        #{index + 1}
                      </td>

                      <td style={cellStyle}>
                        <strong>
                          {product.name}
                        </strong>
                      </td>

                      <td style={cellStyle}>
                        {product.quantity}
                      </td>

                      <td style={cellStyle}>
                        {money(product.revenue)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
