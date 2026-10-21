
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
  Banknote,
  Check,
  X,
  ExternalLink,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import "./AdminProducts.css";

// ========================================
// HELPERS
// ========================================

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

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "Not specified";

  const [hours, minutes] = String(value).split(":");
  const hour = Number(hours);

  if (!Number.isInteger(hour) || !minutes) {
    return String(value);
  }

  return `${hour % 12 || 12}:${minutes} ${
    hour >= 12 ? "PM" : "AM"
  }`;
}

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

function formatDateTime(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });
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
          return `${group}: ${
            value.option_name ||
            value.name ||
            value.label ||
            JSON.stringify(value)
          }`;
        }

        return `${group}: ${String(value)}`;
      }
    );
  }

  return [String(selectedOptions)];
}

// ========================================
// SHARED STYLES
// ========================================

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

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e4d9ce",
  borderRadius: 10,
  padding: "12px 13px",
  background: "#fff",
  color: "#39291f",
  font: "inherit",
};

const mutedStyle = {
  color: "#806d60",
  fontSize: 13,
  lineHeight: 1.6,
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

// ========================================
// STATUS BADGE
// ========================================

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

// ========================================
// DETAIL COMPONENTS
// ========================================

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

// ========================================
// OPENSTREETMAP LOCATION LINK
// ========================================

function MeetupMapLink({ location }) {
  if (!location || !String(location).trim()) {
    return null;
  }

  const mapUrl =
    "https://www.openstreetmap.org/search?query=" +
    encodeURIComponent(String(location).trim());

  return (
    <div style={{ marginTop: 14 }}>
      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          ...buttonStyle,
          textDecoration: "none",
          background: "#f4eee8",
          fontSize: 13,
        }}
      >
        <MapPin size={16} />
        View Location on Map
        <ExternalLink size={14} />
      </a>
    </div>
  );
}

// ========================================
// ORDER DETAILS
// ========================================

function OrderDetails({ order, profile, items }) {
  const remaining = Math.max(
    0,
    Number(order.total_amount || 0) -
      Number(order.amount_paid || 0)
  );

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
        {/* CUSTOMER INFORMATION */}
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
            value={formatDateTime(order.created_at)}
          />
        </DetailSection>

        {/* PAYMENT INFORMATION */}
        <DetailSection
          title="Payment Information"
          icon={CreditCard}
        >
          <DetailRow
            label="Initial Payment Method"
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
            value={peso(remaining)}
          />
        </DetailSection>

        {/* REQUESTED MEETUP */}
        <DetailSection
          title="Requested Meetup"
          icon={CalendarDays}
        >
          <DetailRow
            label="Date"
            value={formatDate(
              order.requested_meetup_date
            )}
          />

          <DetailRow
            label="Time"
            value={formatTime(
              order.requested_meetup_time
            )}
          />

          <DetailRow
            label="Location"
            value={displayValue(
              order.requested_meetup_location
            )}
          />

          <MeetupMapLink
            location={order.requested_meetup_location}
          />

          <p style={mutedStyle}>
            This is the customer's requested meetup
            location. Check the map before approving
            the order.
          </p>
        </DetailSection>

        {/* CONFIRMED MEETUP */}
        <DetailSection
          title="Confirmed Meetup"
          icon={MapPin}
        >
          <DetailRow
            label="Date"
            value={formatDate(
              order.confirmed_meetup_date
            )}
          />

          <DetailRow
            label="Time"
            value={formatTime(
              order.confirmed_meetup_time
            )}
          />

          <DetailRow
            label="Location"
            value={displayValue(
              order.confirmed_meetup_location
            )}
          />

          <MeetupMapLink
            location={order.confirmed_meetup_location}
          />

          <p style={mutedStyle}>
            This is the meetup arrangement confirmed
            by Mama's Bakehouse.
          </p>
        </DetailSection>
      </div>

      {/* ORDERED PRODUCTS */}
      <div style={{ marginTop: 16 }}>
        <DetailSection
          title="Ordered Products"
          icon={ShoppingBag}
        >
          {items.length === 0 ? (
            <p style={mutedStyle}>
              No order items found for this order.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {items.map((item) => {
                const options = formatOptions(
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
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <strong
                          style={{ color: "#39291f" }}
                        >
                          {item.product_name ||
                            "Unnamed Product"}
                        </strong>

                        <p style={mutedStyle}>
                          {item.ready_stock_id
                            ? "Ready Stock"
                            : "Preorder Item"}
                        </p>
                      </div>

                      <strong>
                        {peso(item.line_total)}
                      </strong>
                    </div>

                    {options.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          marginBottom: 12,
                        }}
                      >
                        {options.map((option, index) => (
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
                        ))}
                      </div>
                    )}

                    <p style={{ ...mutedStyle, margin: 0 }}>
                      Quantity: {item.quantity} · Unit
                      Price: {peso(item.unit_price)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </DetailSection>
      </div>

      {/* CUSTOMER AND ADMIN NOTES */}
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
              ...mutedStyle,
              whiteSpace: "pre-wrap",
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
              ...mutedStyle,
              whiteSpace: "pre-wrap",
            }}
          >
            {order.admin_notes || "No admin notes yet."}
          </p>
        </DetailSection>
      </div>
    </div>
  );
}

// ========================================
// GCASH PAYMENT REVIEW
// ========================================

function GCashPaymentReview({
  order,
  payments,
  paymentType,
  busy,
  onReviewed,
}) {
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const [openingReceipt, setOpeningReceipt] =
    useState(false);

  const [notes, setNotes] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [working, setWorking] = useState(false);

  const isBalance =
    paymentType === "remaining_balance";

  const relevantPayments = payments
    .filter(
      (payment) =>
        payment.order_id === order.id &&
        payment.payment_type === paymentType
    )
    .sort(
      (a, b) =>
        new Date(b.created_at) -
        new Date(a.created_at)
    );

  const pendingPayment = relevantPayments.find(
    (payment) => payment.status === "pending"
  );

  const canReview = isBalance
    ? order.status === "ready" &&
      ["partially_paid", "unpaid"].includes(
        order.payment_status
      )
    : order.status === "awaiting_down_payment" &&
      order.payment_status === "pending_verification";

  async function openReceipt(path) {
    setReceiptError("");
    setReceiptUrl("");
    setOpeningReceipt(true);

    try {
      const { data, error } = await supabase.storage
        .from("payment-receipts")
        .createSignedUrl(path, 120);

      if (error) throw error;

      if (!data?.signedUrl) {
        throw new Error("Could not open receipt.");
      }

      setReceiptUrl(data.signedUrl);
    } catch (err) {
      setReceiptError(
        err.message || "Unable to load the screenshot."
      );
    } finally {
      setOpeningReceipt(false);
    }
  }

  async function reviewPayment(action) {
    if (
      !pendingPayment ||
      working ||
      busy ||
      !canReview
    ) {
      return;
    }

    if (action === "reject" && !notes.trim()) {
      setReviewError(
        "Please enter a reason for rejecting this payment."
      );
      return;
    }

    const question =
      action === "verify"
        ? `Have you independently confirmed that ${peso(
            pendingPayment.amount
          )} was received in the bakery's actual GCash account? Never verify a sample receipt.`
        : `Reject the ${
            isBalance
              ? "remaining-balance"
              : "down-payment"
          } submission for ${order.order_number}?`;

    if (!window.confirm(question)) return;

    setWorking(true);
    setReviewError("");

    try {
      const rpcName = isBalance
        ? "review_remaining_balance_payment"
        : "review_customer_down_payment";

      const { data, error } = await supabase.rpc(
        rpcName,
        {
          p_payment_id: pendingPayment.id,
          p_action: action,
          p_admin_notes: notes.trim() || null,
        }
      );

      if (error) throw error;

      if (!data?.success) {
        throw new Error(
          "Payment review was not confirmed."
        );
      }

      setNotes("");
      setReceiptUrl("");

      await onReviewed(
        action,
        order.order_number,
        paymentType
      );
    } catch (err) {
      setReviewError(
        err.message || "Unable to review this payment."
      );
    } finally {
      setWorking(false);
    }
  }

  if (relevantPayments.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        ...cardStyle,
        marginTop: 16,
        background: "#faf7f3",
      }}
    >
      <h3
        style={{
          color: "#39291f",
          fontFamily: "Georgia, serif",
          marginTop: 0,
        }}
      >
        <CreditCard
          size={18}
          style={{
            verticalAlign: "middle",
            marginRight: 8,
          }}
        />

        {isBalance
          ? "GCash Remaining Balance Verification"
          : "GCash Down Payment Verification"}
      </h3>

      {relevantPayments.map((payment) => (
        <div
          key={payment.id}
          style={{
            padding: "14px 0",
            borderTop: "1px solid #e9dfd5",
          }}
        >
          <DetailRow
            label="Payment Type"
            value={formatStatus(payment.payment_type)}
          />

          <DetailRow
            label="Submitted Amount"
            value={peso(payment.amount)}
          />

          <DetailRow
            label="Verification Status"
            value={formatStatus(payment.status)}
          />

          <DetailRow
            label="GCash Reference"
            value={
              payment.reference_number ||
              "Screenshot only"
            }
          />

          <DetailRow
            label="Submitted"
            value={formatDateTime(payment.created_at)}
          />

          {payment.receipt_path && (
            <button
              type="button"
              style={{
                ...buttonStyle,
                marginTop: 12,
              }}
              disabled={openingReceipt}
              onClick={() =>
                openReceipt(payment.receipt_path)
              }
            >
              <FileText size={16} />
              {openingReceipt
                ? "Opening..."
                : "View Payment Screenshot"}
            </button>
          )}

          {payment.admin_notes && (
            <p
              style={{
                color: "#76543c",
                whiteSpace: "pre-wrap",
              }}
            >
              <strong>Review notes:</strong>{" "}
              {payment.admin_notes}
            </p>
          )}
        </div>
      ))}

      {receiptError && (
        <p role="alert" style={{ color: "#b42318" }}>
          {receiptError}
        </p>
      )}

      {receiptUrl && (
        <div style={{ margin: "16px 0" }}>
          <p style={mutedStyle}>
            Private receipt preview (expires after
            two minutes):
          </p>

          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open screenshot in new tab
          </a>

          <img
            src={receiptUrl}
            alt="Customer-submitted GCash payment screenshot"
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: 450,
              objectFit: "contain",
              borderRadius: 10,
              border: "1px solid #e9dfd5",
              marginTop: 10,
            }}
          />
        </div>
      )}

      {pendingPayment && canReview && (
        <div style={{ marginTop: 16 }}>
          <p
            style={{
              color: "#80551f",
              lineHeight: 1.6,
            }}
          >
            Confirm the transaction in the bakery's
            actual GCash account before verifying.
            A screenshot or reference number alone
            does not prove payment.
          </p>

          <label
            style={{
              display: "block",
              fontWeight: 600,
              color: "#39291f",
            }}
          >
            Admin Notes / Rejection Reason

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              rows={3}
              maxLength={2000}
              disabled={working || busy}
              placeholder="Required when rejecting; optional when verifying"
              style={{
                ...inputStyle,
                marginTop: 8,
                resize: "vertical",
              }}
            />
          </label>

          {reviewError && (
            <p
              role="alert"
              style={{ color: "#b42318" }}
            >
              {reviewError}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            <button
              type="button"
              disabled={working || busy}
              onClick={() => reviewPayment("verify")}
              style={{
                ...buttonStyle,
                background: "#276749",
                borderColor: "#276749",
                color: "#fff",
              }}
            >
              <Check size={16} />
              {working
                ? "Saving..."
                : isBalance
                ? "Verify Remaining Balance"
                : "Verify Payment"}
            </button>

            <button
              type="button"
              disabled={working || busy}
              onClick={() => reviewPayment("reject")}
              style={{
                ...buttonStyle,
                borderColor: "#b42318",
                color: "#b42318",
              }}
            >
              <X size={16} />
              {isBalance
                ? "Reject Remaining Balance"
                : "Reject Payment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// ORDER APPROVAL / REJECTION FORM
// ========================================

function ReviewForm({
  order,
  action,
  busy,
  onCancel,
  onSubmit,
}) {
  const [date, setDate] = useState(
    order.requested_meetup_date || ""
  );

  const [time, setTime] = useState(
    order.requested_meetup_time?.slice(0, 5) || ""
  );

  const [location, setLocation] = useState(
    order.requested_meetup_location || ""
  );

  const [notes, setNotes] = useState(
    order.admin_notes || ""
  );

  const approving = action === "approve";

  async function handleSubmit(event) {
    event.preventDefault();

    await onSubmit({
      order,
      action,
      date,
      time,
      location,
      notes,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginTop: 18,
        padding: 20,
        border: "1px solid #e9dfd5",
        borderRadius: 14,
        background: "#faf7f3",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          fontFamily: "Georgia, serif",
          color: "#39291f",
        }}
      >
        {approving
          ? "Approve Customer Order"
          : "Reject Customer Order"}
      </h3>

      <p style={mutedStyle}>
        {approving
          ? "Review the customer's requested meetup location on the map, then confirm the arrangements before approving."
          : "Review the order and provide a reason for rejection."}
      </p>

      {approving && (
        <>
          <div
            style={{
              padding: 14,
              background: "#fff",
              border: "1px solid #eee4da",
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <strong
              style={{
                color: "#39291f",
                fontSize: 13,
              }}
            >
              Customer's Requested Location
            </strong>

            <p
              style={{
                ...mutedStyle,
                overflowWrap: "anywhere",
              }}
            >
              {displayValue(
                order.requested_meetup_location
              )}
            </p>

            <MeetupMapLink
              location={order.requested_meetup_location}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <label>
              <span
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                Confirmed Meetup Date
              </span>

              <input
                type="date"
                value={date}
                min={manilaToday()}
                onChange={(event) =>
                  setDate(event.target.value)
                }
                style={inputStyle}
                disabled={busy}
                required
              />
            </label>

            <label>
              <span
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                Confirmed Meetup Time
              </span>

              <input
                type="time"
                value={time}
                onChange={(event) =>
                  setTime(event.target.value)
                }
                style={inputStyle}
                disabled={busy}
                required
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <span
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                Confirmed Meetup Location
              </span>

              <input
                type="text"
                value={location}
                onChange={(event) =>
                  setLocation(event.target.value)
                }
                placeholder="Meetup location within Iligan City proper"
                style={inputStyle}
                maxLength={300}
                minLength={5}
                disabled={busy}
                required
              />

              <MeetupMapLink location={location} />
            </label>
          </div>
        </>
      )}

      <label>
        <span
          style={{
            display: "block",
            marginBottom: 8,
            fontWeight: 600,
          }}
        >
          {approving
            ? "Admin Notes (Optional)"
            : "Reason for Rejection"}
        </span>

        <textarea
          value={notes}
          onChange={(event) =>
            setNotes(event.target.value)
          }
          placeholder={
            approving
              ? "Additional instructions for the customer..."
              : "Explain why the order cannot be accepted..."
          }
          rows={3}
          maxLength={2000}
          style={{
            ...inputStyle,
            resize: "vertical",
          }}
          disabled={busy}
          required={!approving}
        />
      </label>

      {approving &&
        Number(order.down_payment_required) > 0 && (
          <p
            style={{
              padding: 12,
              borderRadius: 10,
              background: "#fff3dc",
              color: "#80551f",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            This order requires a{" "}
            <strong>
              {peso(order.down_payment_required)}
            </strong>{" "}
            GCash down payment. After approval,
            its status will be Awaiting Down Payment.
            Do not begin preparation until payment
            has been verified.
          </p>
        )}

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginTop: 18,
        }}
      >
        <button
          type="submit"
          disabled={busy}
          style={{
            ...buttonStyle,
            background: approving
              ? "#276749"
              : "#b42318",
            color: "#fff",
            border: "none",
          }}
        >
          {approving ? (
            <Check size={17} />
          ) : (
            <X size={17} />
          )}

          {busy
            ? "Saving..."
            : approving
            ? "Confirm Approval"
            : "Confirm Rejection"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          style={buttonStyle}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ========================================
// MAIN ADMIN ORDERS COMPONENT
// ========================================

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [expandedOrderId, setExpandedOrderId] =
    useState(null);

  const [review, setReview] = useState(null);

  const [busyOrderId, setBusyOrderId] =
    useState(null);

  // ========================================
  // LOAD ORDERS FROM SUPABASE
  // ========================================

  async function loadOrders() {
    setLoading(true);
    setError("");

    try {
      const [
        ordersResult,
        profilesResult,
        itemsResult,
        paymentsResult,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("profiles")
          .select("id, full_name, phone_number"),

        supabase
          .from("order_items")
          .select("*")
          .order("created_at", {
            ascending: true,
          }),

        supabase
          .from("payments")
          .select(
            "id, order_id, payment_type, payment_method, amount, reference_number, receipt_path, status, admin_notes, created_at"
          )
          .order("created_at", {
            ascending: false,
          }),
      ]);

      const failed = [
        ordersResult,
        profilesResult,
        itemsResult,
        paymentsResult,
      ].find((result) => result.error);

      if (failed) throw failed.error;

      setOrders(ordersResult.data || []);
      setProfiles(profilesResult.data || []);
      setOrderItems(itemsResult.data || []);
      setPayments(paymentsResult.data || []);
    } catch (err) {
      setError(
        err.message || "Unable to load orders."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  // ========================================
  // ADVANCE ORDER STATUS
  // ========================================

  async function advanceOrderStatus(order, action) {
    if (busyOrderId) return;

    const actionLabel =
      action === "start_preparing"
        ? "Start Preparing"
        : "Mark as Ready";

    if (
      !window.confirm(
        `${actionLabel} for order ${order.order_number}?`
      )
    ) {
      return;
    }

    setBusyOrderId(order.id);
    setError("");
    setSuccess("");

    try {
      const { data, error: rpcError } =
        await supabase.rpc(
          "advance_customer_order",
          {
            p_order_id: order.id,
            p_action: action,
          }
        );

      if (rpcError) throw rpcError;

      if (!data?.success) {
        throw new Error(
          "Order status update failed."
        );
      }

      await loadOrders();

      setSuccess(
        `Order ${order.order_number} updated to ${formatStatus(
          data.status
        )} successfully.`
      );
    } catch (err) {
      setError(
        err.message ||
          "Unable to update order status."
      );
    } finally {
      setBusyOrderId(null);
    }
  }

  // ========================================
  // APPROVE OR REJECT ORDER
  // ========================================

  async function submitReview({
    order,
    action,
    date,
    time,
    location,
    notes,
  }) {
    if (busyOrderId) return;

    setError("");
    setSuccess("");

    if (action === "reject" && !notes.trim()) {
      setError(
        "Please provide a rejection reason."
      );
      return;
    }

    if (
      action === "approve" &&
      (!date ||
        !time ||
        location.trim().length < 5)
    ) {
      setError(
        "Please complete the confirmed meetup details."
      );
      return;
    }

    if (
      action === "approve" &&
      date < manilaToday()
    ) {
      setError(
        "The confirmed meetup date cannot be in the past."
      );
      return;
    }

    const message =
      action === "approve"
        ? `Approve order ${order.order_number}?`
        : `Reject order ${order.order_number}?`;

    if (!window.confirm(message)) return;

    setBusyOrderId(order.id);

    try {
      const { data, error: rpcError } =
        await supabase.rpc(
          "review_customer_order",
          {
            p_order_id: order.id,
            p_action: action,

            p_confirmed_date:
              action === "approve"
                ? date
                : null,

            p_confirmed_time:
              action === "approve"
                ? time
                : null,

            p_confirmed_location:
              action === "approve"
                ? location.trim()
                : null,

            p_admin_notes:
              notes.trim() || null,
          }
        );

      if (rpcError) throw rpcError;

      if (!data?.success) {
        throw new Error(
          "The order update was not confirmed."
        );
      }

      setReview(null);

      await loadOrders();

      setSuccess(
        `Order ${data.order_number} updated successfully. New status: ${formatStatus(
          data.status
        )}.`
      );
    } catch (err) {
      setError(
        err.message ||
          "Unable to update the order."
      );
    } finally {
      setBusyOrderId(null);
    }
  }

  // ========================================
  // HANDLE PAYMENT REVIEW
  // ========================================

  async function handlePaymentReviewed(
    action,
    orderNumber,
    paymentType
  ) {
    await loadOrders();

    const label =
      paymentType === "remaining_balance"
        ? "Remaining balance"
        : "Down payment";

    setSuccess(
      `${label} for ${orderNumber} ${
        action === "verify"
          ? "verified"
          : "rejected"
      } successfully.`
    );
  }

  // ========================================
  // RECORD CASH RECEIVED
  // ========================================

  async function recordCashPayment(order) {
    if (busyOrderId) return;

    const remaining =
      Number(order.total_amount || 0) -
      Number(order.amount_paid || 0);

    if (remaining <= 0) {
      setError(
        "This order has no remaining balance."
      );
      return;
    }

    const confirmation =
      `Record ${peso(remaining)} as CASH RECEIVED ` +
      `for order ${order.order_number}?\n\n` +
      `Only continue if the customer has actually ` +
      `handed over this amount during meetup.\n\n` +
      `This action will mark the order as fully paid.`;

    if (!window.confirm(confirmation)) return;

    setBusyOrderId(order.id);
    setError("");
    setSuccess("");

    try {
      const { data, error: rpcError } =
        await supabase.rpc(
          "record_cash_meetup_payment",
          {
            p_order_id: order.id,
          }
        );

      if (rpcError) throw rpcError;

      if (!data?.success) {
        throw new Error(
          "Cash payment was not recorded."
        );
      }

      await loadOrders();

      setSuccess(
        `${peso(
          data.amount_received
        )} cash received for ${
          order.order_number
        }. Payment status: Paid.`
      );
    } catch (err) {
      setError(
        err.message ||
          "Unable to record cash payment."
      );
    } finally {
      setBusyOrderId(null);
    }
  }

  // ========================================
  // COMPLETE ORDER
  // ========================================

  async function completeOrder(order) {
    if (busyOrderId) return;

    const confirmation =
      `Complete order ${order.order_number}?\n\n` +
      `Confirm that:\n` +
      `- The customer has received the order.\n` +
      `- The meetup is finished.\n` +
      `- Full payment has been received.\n\n` +
      `The order status will change to Completed.`;

    if (!window.confirm(confirmation)) return;

    setBusyOrderId(order.id);
    setError("");
    setSuccess("");

    try {
      const { data, error: rpcError } =
        await supabase.rpc(
          "complete_customer_order",
          {
            p_order_id: order.id,
          }
        );

      if (rpcError) throw rpcError;

      if (!data?.success) {
        throw new Error(
          "Order completion was not confirmed."
        );
      }

      await loadOrders();

      setSuccess(
        `Order ${order.order_number} completed successfully.`
      );
    } catch (err) {
      setError(
        err.message ||
          "Unable to complete the order."
      );
    } finally {
      setBusyOrderId(null);
    }
  }

  // ========================================
  // STATISTICS
  // ========================================

  const pending = orders.filter(
    (order) => order.status === "pending"
  ).length;

  const preparing = orders.filter(
    (order) => order.status === "preparing"
  ).length;

  const completed = orders.filter(
    (order) => order.status === "completed"
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

  // ========================================
  // MAIN INTERFACE
  // ========================================

  return (
    <section className="admin-products-page">
      {/* PAGE HEADER */}
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
          disabled={
            loading || Boolean(busyOrderId)
          }
          style={buttonStyle}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <p
          className="admin-error"
          role="alert"
          style={{ marginBottom: 16 }}
        >
          {error}
        </p>
      )}

      {/* SUCCESS */}
      {success && (
        <p
          role="status"
          style={{
            padding: 15,
            background: "#eaf6ee",
            color: "#276749",
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <CheckCircle2
            size={18}
            style={{
              verticalAlign: "middle",
              marginRight: 8,
            }}
          />
          {success}
        </p>
      )}

      {/* STATISTIC CARDS */}
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
            <div
              key={card.label}
              style={cardStyle}
            >
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

      {/* RECENT ORDERS */}
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
              Customer orders will appear here
              once they are submitted.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 14,
            }}
          >
            {orders.map((order) => {
              const expanded =
                expandedOrderId === order.id;

              const profile = profiles.find(
                (item) =>
                  item.id === order.customer_id
              );

              const items = orderItems.filter(
                (item) =>
                  item.order_id === order.id
              );

              const isReviewing =
                review?.orderId === order.id;

              const busy =
                busyOrderId === order.id;

              const orderPayments = payments.filter(
                (payment) =>
                  payment.order_id === order.id
              );

              const hasPendingBalance =
                orderPayments.some(
                  (payment) =>
                    payment.payment_type ===
                      "remaining_balance" &&
                    payment.status === "pending"
                );

              const remaining = Math.max(
                0,
                Number(order.total_amount || 0) -
                  Number(order.amount_paid || 0)
              );

              const canRecordCash =
                order.status === "ready" &&
                ["unpaid", "partially_paid"].includes(
                  order.payment_status
                ) &&
                remaining > 0 &&
                !hasPendingBalance;

              const canComplete =
                order.status === "ready" &&
                order.payment_status === "paid" &&
                remaining === 0 &&
                !orderPayments.some(
                  (payment) =>
                    payment.status === "pending"
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
                  {/* ORDER HEADER */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
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
                        {formatStatus(
                          order.order_type
                        )}
                      </p>

                      {/* QUICK MEETUP PREVIEW */}
                      <p
                        style={{
                          ...mutedStyle,
                          marginBottom: 0,
                        }}
                      >
                        <MapPin
                          size={14}
                          style={{
                            verticalAlign: "middle",
                            marginRight: 6,
                          }}
                        />

                        {displayValue(
                          order.requested_meetup_location
                        )}
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
                      <StatusBadge
                        value={order.status}
                      />

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
                        {formatStatus(
                          order.payment_status
                        )}
                      </span>

                      {hasPendingBalance && (
                        <span
                          style={{
                            background: "#fff3dc",
                            color: "#9b6421",
                            padding: "6px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          Remaining Payment Pending Review
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div
                    style={{
                      marginTop: 18,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
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

                    {/* APPROVE / REJECT */}
                    {order.status === "pending" && (
                      <>
                        <button
                          type="button"
                          disabled={Boolean(
                            busyOrderId
                          )}
                          onClick={() => {
                            setError("");
                            setSuccess("");
                            setReview({
                              orderId: order.id,
                              action: "approve",
                            });
                            setExpandedOrderId(
                              order.id
                            );
                          }}
                          style={{
                            ...buttonStyle,
                            background: "#276749",
                            borderColor: "#276749",
                            color: "#fff",
                          }}
                        >
                          <Check size={16} />
                          Approve Order
                        </button>

                        <button
                          type="button"
                          disabled={Boolean(
                            busyOrderId
                          )}
                          onClick={() => {
                            setError("");
                            setSuccess("");
                            setReview({
                              orderId: order.id,
                              action: "reject",
                            });
                            setExpandedOrderId(
                              order.id
                            );
                          }}
                          style={{
                            ...buttonStyle,
                            borderColor: "#b42318",
                            color: "#b42318",
                          }}
                        >
                          <X size={16} />
                          Reject Order
                        </button>
                      </>
                    )}

                    {/* START PREPARING */}
                    {order.status === "confirmed" && (
                      <button
                        type="button"
                        disabled={Boolean(
                          busyOrderId
                        )}
                        onClick={() =>
                          advanceOrderStatus(
                            order,
                            "start_preparing"
                          )
                        }
                        style={{
                          ...buttonStyle,
                          background: "#76543c",
                          borderColor: "#76543c",
                          color: "#fff",
                        }}
                      >
                        <Package size={16} />
                        {busy
                          ? "Updating..."
                          : "Start Preparing"}
                      </button>
                    )}

                    {/* MARK READY */}
                    {order.status === "preparing" && (
                      <button
                        type="button"
                        disabled={Boolean(
                          busyOrderId
                        )}
                        onClick={() =>
                          advanceOrderStatus(
                            order,
                            "mark_ready"
                          )
                        }
                        style={{
                          ...buttonStyle,
                          background: "#276749",
                          borderColor: "#276749",
                          color: "#fff",
                        }}
                      >
                        <CheckCircle2 size={16} />
                        {busy
                          ? "Updating..."
                          : "Mark as Ready"}
                      </button>
                    )}

                    {/* RECORD CASH */}
                    {canRecordCash && (
                      <button
                        type="button"
                        disabled={Boolean(
                          busyOrderId
                        )}
                        onClick={() =>
                          recordCashPayment(order)
                        }
                        style={{
                          ...buttonStyle,
                          background: "#76543c",
                          borderColor: "#76543c",
                          color: "#fff",
                        }}
                      >
                        <Banknote size={16} />
                        {busy
                          ? "Saving..."
                          : `Cash Received (${peso(
                              remaining
                            )})`}
                      </button>
                    )}

                    {/* COMPLETE ORDER */}
                    {canComplete && (
                      <button
                        type="button"
                        disabled={Boolean(
                          busyOrderId
                        )}
                        onClick={() =>
                          completeOrder(order)
                        }
                        style={{
                          ...buttonStyle,
                          background: "#276749",
                          borderColor: "#276749",
                          color: "#fff",
                        }}
                      >
                        <CheckCircle2 size={16} />
                        {busy
                          ? "Completing..."
                          : "Complete Order"}
                      </button>
                    )}
                  </div>

                  {/* PAYMENT REMINDERS */}
                  {order.status === "ready" &&
                    hasPendingBalance && (
                      <p
                        style={{
                          background: "#fff3dc",
                          color: "#80551f",
                          padding: 13,
                          borderRadius: 10,
                          marginTop: 16,
                          fontSize: 13,
                          lineHeight: 1.6,
                        }}
                      >
                        A GCash remaining-balance
                        payment is awaiting review.
                        Verify or reject that submission
                        before recording cash received.
                      </p>
                    )}

                  {order.status === "ready" &&
                    remaining > 0 &&
                    !hasPendingBalance && (
                      <p
                        style={{
                          background: "#faf7f3",
                          color: "#76543c",
                          padding: 13,
                          borderRadius: 10,
                          marginTop: 16,
                          fontSize: 13,
                          lineHeight: 1.6,
                        }}
                      >
                        Remaining balance:{" "}
                        <strong>
                          {peso(remaining)}
                        </strong>
                        . Record cash only after
                        receiving it during meetup,
                        or wait for a verified GCash
                        payment.
                      </p>
                    )}

                  {/* ORDER REVIEW FORM */}
                  {isReviewing &&
                    order.status === "pending" && (
                      <ReviewForm
                        key={`${order.id}-${review.action}`}
                        order={order}
                        action={review.action}
                        busy={busy}
                        onCancel={() =>
                          setReview(null)
                        }
                        onSubmit={submitReview}
                      />
                    )}

                  {/* EXPANDED ORDER DETAILS */}
                  {expanded && (
                    <>
                      <GCashPaymentReview
                        key={`${order.id}-down`}
                        order={order}
                        payments={payments}
                        paymentType="down_payment"
                        busy={Boolean(
                          busyOrderId
                        )}
                        onReviewed={
                          handlePaymentReviewed
                        }
                      />

                      <GCashPaymentReview
                        key={`${order.id}-balance`}
                        order={order}
                        payments={payments}
                        paymentType="remaining_balance"
                        busy={Boolean(
                          busyOrderId
                        )}
                        onReviewed={
                          handlePaymentReviewed
                        }
                      />

                      <OrderDetails
                        order={order}
                        profile={profile}
                        items={items}
                      />
                    </>
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
