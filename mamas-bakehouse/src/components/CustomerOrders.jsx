
import { useEffect, useState } from "react";
import {
  Package,
  RefreshCw,
  CalendarDays,
  MapPin,
  Clock3,
  CreditCard,
  Upload,
  CheckCircle2,
} from "lucide-react";

import { supabase } from "../lib/supabase";

// ========================================
// HELPERS
// ========================================

const peso = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value || 0));

const readable = (value) =>
  String(value || "Pending")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function dateLabel(value) {
  if (!value) return "Not yet confirmed";

  return new Date(`${value}T12:00:00`).toLocaleDateString(
    "en-PH",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
}

function timeLabel(value) {
  if (!value) return "Not yet confirmed";

  const [hours, minutes] = String(value).split(":");
  const hour = Number(hours);

  if (!Number.isFinite(hour) || !minutes) {
    return String(value);
  }

  return `${hour % 12 || 12}:${minutes} ${
    hour >= 12 ? "PM" : "AM"
  }`;
}

// ========================================
// ORDER STATUS INFORMATION
// ========================================

const statuses = {
  pending: {
    label: "Pending Admin Approval",
    color: "#96632f",
    background: "#fff3e4",
    message: "The bakery is reviewing your order.",
  },

  awaiting_down_payment: {
    label: "Awaiting Down Payment",
    color: "#96632f",
    background: "#fff3e4",
    message:
      "Your order has been approved. Submit your required GCash down payment for verification.",
  },

  approved: {
    label: "Approved",
    color: "#2563a0",
    background: "#eaf2ff",
    message: "Your order has been approved.",
  },

  confirmed: {
    label: "Confirmed",
    color: "#2563a0",
    background: "#eaf2ff",
    message: "Your order is confirmed.",
  },

  preparing: {
    label: "Preparing",
    color: "#79563b",
    background: "#f3ebe2",
    message: "The bakery is preparing your order.",
  },

  ready: {
    label: "Ready for Meetup",
    color: "#236748",
    background: "#e9f6ee",
    message:
      "Your order is ready for meetup. You may pay your remaining balance through GCash or cash during meetup.",
  },

  completed: {
    label: "Completed",
    color: "#236748",
    background: "#e9f6ee",
    message: "Your order has been completed.",
  },

  rejected: {
    label: "Rejected",
    color: "#b42318",
    background: "#fff0ee",
    message: "The bakery could not accept this order.",
  },

  cancelled: {
    label: "Cancelled",
    color: "#b42318",
    background: "#fff0ee",
    message: "This order was cancelled.",
  },
};

// ========================================
// SHARED STYLES
// ========================================

const panel = {
  background: "#ffffff",
  border: "1px solid #eaded3",
  borderRadius: 16,
  padding: 20,
};

const fieldStyle = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 10,
  border: "1px solid #e5d5c7",
  background: "#ffffff",
  color: "#3b291f",
  fontSize: 14,
  boxSizing: "border-box",
};

const mutedText = {
  color: "#927a68",
  fontSize: 13,
  lineHeight: 1.6,
};

const noticeStyle = {
  borderRadius: 10,
  padding: 14,
  fontSize: 13,
  lineHeight: 1.6,
};

function SectionTitle({ icon: Icon, children }) {
  return (
    <h3
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        color: "#3b291f",
        marginTop: 0,
      }}
    >
      <Icon size={19} color="#76543c" />
      {children}
    </h3>
  );
}

function InformationRow({ label, children }) {
  return (
    <p
      style={{
        color: "#79563b",
        lineHeight: 1.7,
        margin: "10px 0",
        overflowWrap: "anywhere",
      }}
    >
      {label}:{" "}
      <strong style={{ color: "#3b291f" }}>
        {children}
      </strong>
    </p>
  );
}

// ========================================
// GCASH PAYMENT FORM
// ========================================

function GCashPaymentForm({
  order,
  user,
  onSuccess,
  paymentType = "down_payment",
}) {
  const [reference, setReference] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isRemaining =
    paymentType === "remaining_balance";

  const amount = isRemaining
    ? Math.max(
        0,
        Number(order.total_amount || 0) -
          Number(order.amount_paid || 0)
      )
    : Number(order.down_payment_required || 0);

  const canSubmit =
    reference.trim().length > 0 ||
    screenshot !== null;

  // ========================================
  // SUBMIT PAYMENT TO SUPABASE
  // ========================================

  async function submitPayment(event) {
    event.preventDefault();

    if (submitting) return;

    setError("");
    setSuccess("");

    if (!canSubmit) {
      setError(
        "Enter a GCash reference number or upload a screenshot."
      );
      return;
    }

    if (amount <= 0) {
      setError(
        "There is no outstanding amount to pay."
      );
      return;
    }

    if (
      screenshot &&
      screenshot.size > 5 * 1024 * 1024
    ) {
      setError(
        "Screenshot must be 5 MB or smaller."
      );
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      screenshot &&
      !allowedTypes.includes(screenshot.type)
    ) {
      setError(
        "Only JPG, PNG, or WebP screenshots are allowed."
      );
      return;
    }

    setSubmitting(true);

    let receiptPath = null;

    try {
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (
        !currentUser ||
        currentUser.id !== user?.id
      ) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      // ========================================
      // UPLOAD PAYMENT SCREENSHOT
      // ========================================

      if (screenshot) {
        const extension = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        }[screenshot.type];

        const filename =
          `${crypto.randomUUID()}.${extension}`;

        receiptPath =
          `${currentUser.id}/${filename}`;

        const { error: uploadError } =
          await supabase.storage
            .from("payment-receipts")
            .upload(receiptPath, screenshot, {
              contentType: screenshot.type,
              upsert: false,
            });

        if (uploadError) {
          throw uploadError;
        }
      }

      // ========================================
      // CALL EXISTING PAYMENT RPC
      // ========================================

      const functionName = isRemaining
        ? "submit_remaining_balance_payment"
        : "submit_customer_down_payment";

      const { data, error: rpcError } =
        await supabase.rpc(functionName, {
          p_order_id: order.id,
          p_reference_number:
            reference.trim() || null,
          p_receipt_path: receiptPath,
        });

      if (rpcError) {
        throw rpcError;
      }

      if (!data?.success) {
        throw new Error(
          "Payment submission was not confirmed."
        );
      }

      setSuccess(
        "Payment submitted successfully! Please wait for admin verification."
      );

      setReference("");
      setScreenshot(null);

      if (typeof onSuccess === "function") {
        await onSuccess();
      }
    } catch (err) {
      console.error(
        "GCash payment submission error:",
        err
      );

      setError(
        err.message ||
          "Unable to submit payment. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ========================================
  // PAYMENT FORM INTERFACE
  // ========================================

  return (
    <div
      style={{
        ...panel,
        background: "#faf5ef",
      }}
    >
      <SectionTitle icon={CreditCard}>
        {isRemaining
          ? "Pay Remaining Balance via GCash"
          : "Submit GCash Down Payment"}
      </SectionTitle>

      <p
        style={{
          color: "#79563b",
          lineHeight: 1.6,
        }}
      >
        {isRemaining
          ? "Your order is ready for meetup. You may pay the remaining balance through GCash now, or choose to pay cash during your meetup."
          : "Your order has been approved. Pay the required down payment to the bakery's official GCash account, then submit your payment details."}
      </p>

      {/* PAYMENT AMOUNT */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #eaded3",
          borderRadius: 12,
          padding: 18,
          marginBottom: 20,
        }}
      >
        <p
          style={{
            ...mutedText,
            margin: "0 0 6px",
          }}
        >
          {isRemaining
            ? "Remaining Balance"
            : "Required Down Payment"}
        </p>

        <strong
          style={{
            fontSize: 27,
            color: "#76543c",
          }}
        >
          {peso(amount)}
        </strong>

        <p style={mutedText}>
          Order: {order.order_number}
        </p>
      </div>

      {/* CASH OPTION */}
      {isRemaining && (
        <p
          style={{
            ...noticeStyle,
            background: "#e9f6ee",
            color: "#236748",
          }}
        >
          <strong>
            Prefer Cash on Meetup?
          </strong>{" "}
          You do not need to submit this form.
          Pay the remaining balance directly to
          the bakery during your confirmed meetup.
        </p>
      )}

      <p
        style={{
          ...noticeStyle,
          background: "#fff3e4",
          color: "#96632f",
        }}
      >
        Use only the official GCash payment
        details provided by the bakery.
        Do not submit a payment you have
        not actually made.
      </p>

      {/* GCASH FORM */}
      <form
        onSubmit={submitPayment}
        style={{
          display: "grid",
          gap: 18,
        }}
      >
        <label
          style={{
            display: "grid",
            gap: 8,
            color: "#3b291f",
            fontWeight: 600,
          }}
        >
          GCash Reference Number

          <input
            type="text"
            value={reference}
            onChange={(event) => {
              setReference(event.target.value);
              setError("");
            }}
            placeholder="Enter GCash reference number"
            maxLength={100}
            style={fieldStyle}
            disabled={submitting}
          />
        </label>

        {/* SCREENSHOT UPLOAD */}
        <label
          style={{
            display: "grid",
            gap: 8,
            color: "#3b291f",
            fontWeight: 600,
          }}
        >
          Payment Screenshot

          <div
            style={{
              border: "1px dashed #c9b29e",
              borderRadius: 12,
              padding: 20,
              textAlign: "center",
              background: "#ffffff",
            }}
          >
            <Upload
              size={25}
              style={{
                color: "#927a68",
                marginBottom: 10,
              }}
            />

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={submitting}
              onChange={(event) => {
                setError("");
                setScreenshot(
                  event.target.files?.[0] || null
                );
              }}
              style={{
                display: "block",
                margin: "0 auto",
                maxWidth: "100%",
              }}
            />

            <p
              style={{
                ...mutedText,
                marginBottom: 0,
              }}
            >
              PNG, JPG, or WebP — Maximum 5 MB
            </p>
          </div>
        </label>

        <p
          style={{
            ...mutedText,
            margin: 0,
          }}
        >
          You may provide a reference number,
          screenshot, or both.
        </p>

        {/* ERROR */}
        {error && (
          <p
            role="alert"
            style={{
              ...noticeStyle,
              background: "#fff0ee",
              color: "#b42318",
              margin: 0,
            }}
          >
            {error}
          </p>
        )}

        {/* SUCCESS */}
        {success && (
          <p
            role="status"
            style={{
              ...noticeStyle,
              background: "#e9f6ee",
              color: "#236748",
              margin: 0,
            }}
          >
            <CheckCircle2
              size={17}
              style={{
                verticalAlign: "middle",
                marginRight: 7,
              }}
            />
            {success}
          </p>
        )}

        {/* SUBMIT */}
        <button
          type="submit"
          className="customer-primary-button"
          disabled={!canSubmit || submitting}
          style={{
            justifyContent: "center",
            padding: "14px 18px",
            opacity:
              !canSubmit || submitting ? 0.65 : 1,
          }}
        >
          {submitting
            ? "Submitting Payment..."
            : isRemaining
            ? "Submit Remaining Balance for Verification"
            : "Submit Payment for Verification"}
        </button>
      </form>
    </div>
  );
}

// ========================================
// CUSTOMER ORDERS COMPONENT
// ========================================

export default function CustomerOrders({ user }) {
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);

  // ========================================
  // LOAD CUSTOMER ORDERS
  // ========================================

  async function loadOrders() {
    if (!user?.id) {
      setOrders([]);
      setItems([]);
      setPayments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const {
        data: orderData,
        error: orderError,
      } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (orderError) {
        throw orderError;
      }

      const customerOrders = orderData || [];

      setOrders(customerOrders);

      if (customerOrders.length === 0) {
        setItems([]);
        setPayments([]);
      } else {
        const orderIds = customerOrders.map(
          (order) => order.id
        );

        // LOAD PRODUCTS AND PAYMENTS
        const [
          itemsResult,
          paymentsResult,
        ] = await Promise.all([
          supabase
            .from("order_items")
            .select("*")
            .in("order_id", orderIds),

          supabase
            .from("payments")
            .select(
              "id, order_id, payment_type, amount, status, created_at"
            )
            .in("order_id", orderIds)
            .eq(
              "payment_type",
              "remaining_balance"
            )
            .order("created_at", {
              ascending: false,
            }),
        ]);

        if (itemsResult.error) {
          throw itemsResult.error;
        }

        if (paymentsResult.error) {
          throw paymentsResult.error;
        }

        setItems(itemsResult.data || []);
        setPayments(paymentsResult.data || []);
      }
    } catch (err) {
      console.error(
        "Customer orders loading error:",
        err
      );

      setError(
        err.message ||
          "Unable to load your orders."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [user?.id]);

  // ========================================
  // CUSTOMER ORDERS INTERFACE
  // ========================================

  return (
    <section
      id="my-orders"
      style={{
        marginTop: 45,
        marginBottom: 45,
      }}
    >
      {/* PAGE HEADER */}
      <div
        className="customer-section-heading"
        style={{
          marginBottom: 22,
        }}
      >
        <div>
          <p className="customer-eyebrow">
            TRACK YOUR PURCHASES
          </p>

          <h2>My Orders</h2>

          <p>
            Check your order status and
            confirmed meetup details.
          </p>
        </div>

        <button
          type="button"
          className="customer-refresh-button"
          onClick={loadOrders}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh Orders
        </button>
      </div>

      {/* LOADING ERROR */}
      {error && (
        <div
          className="customer-error-message"
          role="alert"
          style={{
            marginBottom: 18,
          }}
        >
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="customer-empty-state">
          <RefreshCw size={28} />
          <h3>Loading your orders...</h3>
        </div>
      ) : orders.length === 0 ? (
        <div className="customer-empty-state">
          <Package size={42} />
          <h3>No orders yet</h3>
          <p>
            Your submitted orders will
            appear here.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 18,
          }}
        >
          {orders.map((order) => {
            const status =
              statuses[order.status] ||
              statuses.pending;

            const orderProducts = items.filter(
              (item) =>
                item.order_id === order.id
            );

            const isExpanded =
              expanded === order.id;

            // ========================================
            // MEETUP DETAILS
            // ========================================

            const meetupDate =
              order.confirmed_meetup_date ||
              order.requested_meetup_date;

            const meetupTime =
              order.confirmed_meetup_time ||
              order.requested_meetup_time;

            const meetupLocation =
              order.confirmed_meetup_location ||
              order.requested_meetup_location;

            const confirmed = Boolean(
              order.confirmed_meetup_date
            );

            // ========================================
            // PAYMENT INFORMATION
            // ========================================

            const awaitingPayment =
              order.status ===
                "awaiting_down_payment" &&
              order.payment_status ===
                "unpaid" &&
              Number(
                order.down_payment_required
              ) > 0;

            const remainingBalance = Math.max(
              0,
              Number(
                order.total_amount || 0
              ) -
                Number(
                  order.amount_paid || 0
                )
            );

            const balancePayments =
              payments.filter(
                (payment) =>
                  payment.order_id ===
                  order.id
              );

            const latestBalancePayment =
              balancePayments[0] || null;

            const pendingBalancePayment =
              balancePayments.some(
                (payment) =>
                  payment.status ===
                  "pending"
              );

            const canPayRemaining =
              order.status === "ready" &&
              remainingBalance > 0 &&
              !pendingBalancePayment;

            return (
              <article
                key={order.id}
                style={panel}
              >
                {/* ORDER SUMMARY */}
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    flexWrap: "wrap",
                    gap: 15,
                  }}
                >
                  <div>
                    <strong
                      style={{
                        color: "#3b291f",
                        fontSize: 19,
                      }}
                    >
                      {order.order_number}
                    </strong>

                    <p
                      style={{
                        ...mutedText,
                        margin: "8px 0",
                      }}
                    >
                      Placed{" "}
                      {new Date(
                        order.created_at
                      ).toLocaleString(
                        "en-PH",
                        {
                          timeZone:
                            "Asia/Manila",
                          dateStyle:
                            "medium",
                          timeStyle:
                            "short",
                        }
                      )}
                    </p>
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                    }}
                  >
                    <span
                      style={{
                        display:
                          "inline-block",
                        background:
                          status.background,
                        color:
                          status.color,
                        padding:
                          "7px 12px",
                        borderRadius: 30,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {status.label}
                    </span>

                    <p
                      style={{
                        fontWeight: 700,
                        fontSize: 20,
                        color: "#3b291f",
                        margin:
                          "12px 0 0",
                      }}
                    >
                      {peso(
                        order.total_amount
                      )}
                    </p>
                  </div>
                </div>

                {/* ORDER STATUS MESSAGE */}
                <p
                  style={{
                    background:
                      "#faf5ef",
                    borderRadius: 10,
                    padding: 14,
                    color: "#79563b",
                    lineHeight: 1.6,
                    fontSize: 14,
                  }}
                >
                  <Clock3
                    size={16}
                    style={{
                      verticalAlign:
                        "middle",
                      marginRight: 8,
                    }}
                  />
                  {status.message}
                </p>

                {/* EXPAND ORDER */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    marginTop: 16,
                  }}
                >
                  <button
                    type="button"
                    className="customer-primary-button"
                    onClick={() =>
                      setExpanded(
                        isExpanded
                          ? null
                          : order.id
                      )
                    }
                  >
                    {isExpanded
                      ? "Hide Order Details"
                      : "View Order Details"}
                  </button>
                </div>

                {/* ORDER DETAILS */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: 20,
                      paddingTop: 20,
                      borderTop:
                        "1px solid #eaded3",
                      display: "grid",
                      gap: 16,
                    }}
                  >
                    {/* ORDERED PRODUCTS */}
                    <div style={panel}>
                      <SectionTitle
                        icon={Package}
                      >
                        Ordered Products
                      </SectionTitle>

                      {orderProducts.length ===
                        0 && (
                        <p style={mutedText}>
                          No product details
                          available.
                        </p>
                      )}

                      {orderProducts.map(
                        (item) => (
                          <div
                            key={item.id}
                            style={{
                              padding:
                                "12px 0",
                              borderBottom:
                                "1px solid #eee4da",
                            }}
                          >
                            <strong
                              style={{
                                color:
                                  "#3b291f",
                              }}
                            >
                              {item.product_name}
                            </strong>

                            <p
                              style={mutedText}
                            >
                              Quantity:{" "}
                              {item.quantity}{" "}
                              ·{" "}
                              {peso(
                                item.unit_price
                              )}{" "}
                              each
                            </p>

                            {Array.isArray(
                              item.selected_options
                            ) &&
                              item.selected_options.map(
                                (
                                  option,
                                  index
                                ) => (
                                  <p
                                    key={index}
                                    style={
                                      mutedText
                                    }
                                  >
                                    {
                                      option.option_group
                                    }
                                    :{" "}
                                    {
                                      option.option_name
                                    }
                                  </p>
                                )
                              )}

                            <strong
                              style={{
                                color:
                                  "#76543c",
                              }}
                            >
                              {peso(
                                item.line_total
                              )}
                            </strong>
                          </div>
                        )
                      )}
                    </div>

                    {/* PAYMENT DETAILS */}
                    <div style={panel}>
                      <SectionTitle
                        icon={CreditCard}
                      >
                        Payment Information
                      </SectionTitle>

                      <InformationRow
                        label="Initial Payment Method"
                      >
                        {order.payment_method ===
                        "gcash"
                          ? "GCash"
                          : "Cash on Meetup"}
                      </InformationRow>

                      <InformationRow
                        label="Payment Status"
                      >
                        {readable(
                          order.payment_status
                        )}
                      </InformationRow>

                      <InformationRow
                        label="Total"
                      >
                        {peso(
                          order.total_amount
                        )}
                      </InformationRow>

                      {Number(
                        order.down_payment_required
                      ) > 0 && (
                        <InformationRow
                          label="Required GCash Down Payment"
                        >
                          {peso(
                            order.down_payment_required
                          )}
                        </InformationRow>
                      )}

                      <InformationRow
                        label="Amount Paid"
                      >
                        {peso(
                          order.amount_paid
                        )}
                      </InformationRow>

                      <InformationRow
                        label="Remaining Balance"
                      >
                        {peso(
                          remainingBalance
                        )}
                      </InformationRow>

                      {/* WAIT FOR APPROVAL */}
                      {order.status ===
                        "pending" &&
                        Number(
                          order.down_payment_required
                        ) > 0 && (
                          <p
                            style={{
                              color:
                                "#96632f",
                              fontWeight:
                                600,
                            }}
                          >
                            Do not pay yet.
                            Wait for admin
                            approval.
                          </p>
                        )}

                      {/* PAYMENT VERIFICATION */}
                      {order.payment_status ===
                        "pending_verification" && (
                        <p
                          style={{
                            color:
                              "#96632f",
                            fontWeight:
                              600,
                          }}
                        >
                          Your GCash payment
                          details have been
                          submitted. Please
                          wait for admin
                          verification.
                        </p>
                      )}
                    </div>

                    {/* DOWN PAYMENT FORM */}
                    {awaitingPayment && (
                      <GCashPaymentForm
                        key={`down-${order.id}`}
                        order={order}
                        user={user}
                        paymentType="down_payment"
                        onSuccess={loadOrders}
                      />
                    )}

                    {/* REMAINING BALANCE */}
                    {order.status ===
                      "ready" &&
                      remainingBalance > 0 && (
                        <>
                          {/* PENDING VERIFICATION */}
                          {pendingBalancePayment && (
                            <div
                              style={{
                                ...panel,
                                background:
                                  "#fff3e4",
                                color:
                                  "#96632f",
                              }}
                            >
                              <strong>
                                Remaining GCash
                                Payment Awaiting
                                Verification
                              </strong>

                              <p
                                style={{
                                  marginBottom: 0,
                                }}
                              >
                                Your payment
                                submission is
                                being reviewed
                                by the bakery.
                                Do not submit
                                another payment
                                while verification
                                is pending.
                              </p>
                            </div>
                          )}

                          {/* REJECTED PAYMENT */}
                          {!pendingBalancePayment &&
                            latestBalancePayment?.status ===
                              "rejected" && (
                              <div
                                style={{
                                  ...panel,
                                  background:
                                    "#fff0ee",
                                  color:
                                    "#b42318",
                                }}
                              >
                                <strong>
                                  Previous GCash
                                  Payment Rejected
                                </strong>

                                <p
                                  style={{
                                    marginBottom: 0,
                                  }}
                                >
                                  Your previous
                                  submission was
                                  not verified.
                                  Please check
                                  your payment
                                  details before
                                  submitting
                                  again, or pay
                                  cash during
                                  meetup.
                                </p>
                              </div>
                            )}

                          {/* PAYMENT FORM */}
                          {canPayRemaining && (
                            <GCashPaymentForm
                              key={`balance-${order.id}`}
                              order={order}
                              user={user}
                              paymentType="remaining_balance"
                              onSuccess={loadOrders}
                            />
                          )}
                        </>
                      )}

                    {/* MEETUP DETAILS */}
                    <div style={panel}>
                      <SectionTitle
                        icon={CalendarDays}
                      >
                        {confirmed
                          ? "Confirmed Meetup"
                          : "Requested Meetup"}
                      </SectionTitle>

                      <InformationRow
                        label="Date"
                      >
                        {dateLabel(
                          meetupDate
                        )}
                      </InformationRow>

                      <InformationRow
                        label="Time"
                      >
                        {timeLabel(
                          meetupTime
                        )}
                      </InformationRow>

                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "flex-start",
                          gap: 8,
                          marginTop: 12,
                        }}
                      >
                        <MapPin
                          size={17}
                          color="#76543c"
                          style={{
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        />

                        <span
                          style={{
                            color:
                              "#79563b",
                            overflowWrap:
                              "anywhere",
                          }}
                        >
                          {meetupLocation ||
                            "Not yet specified"}
                        </span>
                      </div>
                    </div>

                    {/* ADMIN MESSAGE */}
                    {order.admin_notes && (
                      <div style={panel}>
                        <h3
                          style={{
                            color:
                              "#3b291f",
                            marginTop: 0,
                          }}
                        >
                          Message from
                          the Bakery
                        </h3>

                        <p
                          style={{
                            color:
                              "#79563b",
                            lineHeight: 1.7,
                          }}
                        >
                          {order.admin_notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
