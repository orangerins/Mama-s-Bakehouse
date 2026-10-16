
import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  X,
  Wallet,
  Smartphone,
  Upload,
  CheckCircle2,
} from "lucide-react";

const peso = (amount) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(amount || 0));

function getManilaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) =>
    parts.find((part) => part.type === type)?.value || "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

const fieldStyle = {
  width: "100%",
  padding: "13px 15px",
  border: "1px solid #e7d7c8",
  borderRadius: 12,
  fontSize: 15,
  background: "#fff",
  color: "#493426",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const labelStyle = {
  display: "block",
  fontWeight: 600,
  fontSize: 14,
  marginBottom: 8,
  color: "#493426",
};

const cardStyle = {
  background: "white",
  border: "1px solid #eadbcf",
  borderRadius: 16,
  padding: 20,
  marginBottom: 22,
};

export default function CustomerCheckout({
  cart = [],
  onBack,
  onClose,
}) {
  const [meetupDate, setMeetupDate] = useState("");
  const [meetupTime, setMeetupTime] = useState("");
  const [meetupLocation, setMeetupLocation] = useState("");
  const [notes, setNotes] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [gcashReference, setGcashReference] = useState("");
  const [gcashScreenshot, setGcashScreenshot] = useState(null);

  const [error, setError] = useState("");
  const [validated, setValidated] = useState(false);

  const total = cart.reduce(
    (sum, item) =>
      sum +
      Number(item.finalPrice) * Number(item.quantity),
    0
  );

  const minimumPreparationDays = Math.max(
    0,
    ...cart.map((item) =>
      Number(item.product?.preparation_days || 0)
    )
  );

  function clearValidation() {
    setValidated(false);
    setError("");
  }

  function handleScreenshotChange(event) {
    clearValidation();

    const file = event.target.files?.[0] || null;

    if (!file) {
      setGcashScreenshot(null);
      return;
    }

    const acceptedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!acceptedTypes.includes(file.type)) {
      setError(
        "Please upload a JPG, PNG, or WebP screenshot."
      );
      setGcashScreenshot(null);
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Your screenshot must be 5 MB or smaller."
      );
      setGcashScreenshot(null);
      event.target.value = "";
      return;
    }

    setGcashScreenshot(file);
  }

  function validateCheckout(event) {
    event.preventDefault();

    setError("");
    setValidated(false);

    if (cart.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (
      !meetupDate ||
      !meetupTime ||
      !meetupLocation.trim()
    ) {
      setError("Please complete the meetup details.");
      return;
    }

    if (meetupDate < getManilaToday()) {
      setError(
        "The requested meetup date cannot be in the past."
      );
      return;
    }

    if (meetupLocation.trim().length < 5) {
      setError(
        "Please enter a more specific meetup location."
      );
      return;
    }

    if (
      paymentMethod === "gcash" &&
      !gcashReference.trim() &&
      !gcashScreenshot
    ) {
      setError(
        "For GCash, provide a transaction reference number " +
        "or upload a payment screenshot."
      );
      return;
    }

    setValidated(true);
  }

  return (
    <section
      style={{
        padding: 24,
        color: "#493426",
        background: "#faf8f5",
        minHeight: "100%",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            border: "none",
            background: "transparent",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            color: "#684832",
          }}
        >
          <ArrowLeft size={18} />
          Back to Cart
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close checkout"
          style={{
            border: "1px solid #e7d7c8",
            borderRadius: 10,
            background: "white",
            padding: 9,
            cursor: "pointer",
          }}
        >
          <X size={19} />
        </button>
      </div>

      <p
        style={{
          color: "#a47d60",
          letterSpacing: 2,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        MAMA'S BAKEHOUSE
      </p>

      <h2
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 32,
          margin: "8px 0 12px",
          fontWeight: 400,
        }}
      >
        Checkout
      </h2>

      <p
        style={{
          color: "#937a69",
          marginBottom: 24,
        }}
      >
        Review your order, meetup details, and payment method.
      </p>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>
          Order Summary
        </h3>

        {cart.map((item) => (
          <div
            key={item.key}
            style={{
              padding: "12px 0",
              borderBottom: "1px solid #f0e6dd",
            }}
          >
            <strong>{item.product.name}</strong>

            <p
              style={{
                fontSize: 13,
                color: "#937a69",
              }}
            >
              {item.selectedOptions
                .map((option) => option.option_name)
                .join(", ")}
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span>
                Quantity: {item.quantity}
              </span>

              <strong>
                {peso(
                  item.finalPrice * item.quantity
                )}
              </strong>
            </div>
          </div>
        ))}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 18,
            fontSize: 19,
          }}
        >
          <strong>Total</strong>
          <strong>{peso(total)}</strong>
        </div>
      </div>

      <form onSubmit={validateCheckout}>
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>
            Meetup Details
          </h3>

          <p
            style={{
              color: "#937a69",
              fontSize: 13,
            }}
          >
            Meetups are within Iligan City proper only.
            Your requested date, time, and location are
            subject to confirmation by Mama's Bakehouse.
          </p>

          <div style={{ marginTop: 20 }}>
            <label
              htmlFor="checkout-date"
              style={labelStyle}
            >
              <CalendarDays
                size={16}
                style={{ verticalAlign: "middle" }}
              />{" "}
              Preferred Meetup Date
            </label>

            <input
              id="checkout-date"
              type="date"
              min={getManilaToday()}
              value={meetupDate}
              onChange={(event) => {
                setMeetupDate(event.target.value);
                clearValidation();
              }}
              style={fieldStyle}
              required
            />
          </div>

          <div style={{ marginTop: 18 }}>
            <label
              htmlFor="checkout-time"
              style={labelStyle}
            >
              <Clock3
                size={16}
                style={{ verticalAlign: "middle" }}
              />{" "}
              Preferred Meetup Time
            </label>

            <input
              id="checkout-time"
              type="time"
              value={meetupTime}
              onChange={(event) => {
                setMeetupTime(event.target.value);
                clearValidation();
              }}
              style={fieldStyle}
              required
            />
          </div>

          <div style={{ marginTop: 18 }}>
            <label
              htmlFor="checkout-location"
              style={labelStyle}
            >
              <MapPin
                size={16}
                style={{ verticalAlign: "middle" }}
              />{" "}
              Proposed Meetup Location
            </label>

            <input
              id="checkout-location"
              type="text"
              placeholder="e.g. Gaisano City Mall, Iligan City"
              value={meetupLocation}
              onChange={(event) => {
                setMeetupLocation(event.target.value);
                clearValidation();
              }}
              style={fieldStyle}
              required
            />
          </div>

          <div style={{ marginTop: 18 }}>
            <label
              htmlFor="checkout-notes"
              style={labelStyle}
            >
              Special Instructions (Optional)
            </label>

            <textarea
              id="checkout-notes"
              rows={4}
              placeholder="Any requests or details for your order..."
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                clearValidation();
              }}
              style={{
                ...fieldStyle,
                resize: "vertical",
              }}
            />
          </div>

          <p
            style={{
              color: "#937a69",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            The longest preparation time among your
            selected products is{" "}
            {minimumPreparationDays} day(s).
            The bakery will confirm whether your
            requested meetup schedule is possible.
          </p>
        </div>

        {/* PAYMENT METHOD */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>
            Payment Method
          </h3>

          <p
            style={{
              color: "#937a69",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Choose how you would like to pay for your order.
          </p>

          <div
            style={{
              display: "grid",
              gap: 12,
              marginTop: 18,
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                border:
                  paymentMethod === "cash"
                    ? "2px solid #654630"
                    : "1px solid #eadbcf",
                borderRadius: 12,
                padding: 16,
                cursor: "pointer",
                background:
                  paymentMethod === "cash"
                    ? "#fbf4ec"
                    : "#fff",
              }}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="cash"
                checked={paymentMethod === "cash"}
                onChange={() => {
                  setPaymentMethod("cash");
                  clearValidation();
                }}
              />

              <Wallet size={22} />

              <span>
                <strong>Cash on Meetup</strong>

                <small
                  style={{
                    display: "block",
                    marginTop: 4,
                    color: "#937a69",
                  }}
                >
                  Pay when you receive your order.
                </small>
              </span>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                border:
                  paymentMethod === "gcash"
                    ? "2px solid #654630"
                    : "1px solid #eadbcf",
                borderRadius: 12,
                padding: 16,
                cursor: "pointer",
                background:
                  paymentMethod === "gcash"
                    ? "#fbf4ec"
                    : "#fff",
              }}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="gcash"
                checked={paymentMethod === "gcash"}
                onChange={() => {
                  setPaymentMethod("gcash");
                  clearValidation();
                }}
              />

              <Smartphone size={22} />

              <span>
                <strong>GCash</strong>

                <small
                  style={{
                    display: "block",
                    marginTop: 4,
                    color: "#937a69",
                  }}
                >
                  Pay using GCash and provide proof
                  of payment.
                </small>
              </span>
            </label>
          </div>

          {paymentMethod === "cash" && (
            <div
              style={{
                marginTop: 18,
                padding: 15,
                background: "#f8f3ed",
                borderRadius: 12,
                color: "#684832",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              <strong>Cash on Meetup</strong>

              <p style={{ marginBottom: 0 }}>
                You will pay {peso(total)} in cash
                when you receive your order at the
                confirmed meetup location.
              </p>
            </div>
          )}

          {paymentMethod === "gcash" && (
            <div
              style={{
                marginTop: 18,
                padding: 16,
                background: "#f8f3ed",
                borderRadius: 12,
              }}
            >
              <strong>GCash Payment Instructions</strong>

              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                Send your payment to the bakery's
                verified GCash account and provide
                the transaction reference number or
                payment screenshot.
              </p>

              <p
                style={{
                  fontSize: 13,
                  color: "#937a69",
                }}
              >
                The official GCash account details
                will be configured by the bakery.
                Do not send payment until the correct
                account is displayed.
              </p>

              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Order total: {peso(total)}
              </p>

              <div style={{ marginTop: 20 }}>
                <label
                  htmlFor="gcash-reference"
                  style={labelStyle}
                >
                  GCash Transaction Reference Number
                </label>

                <input
                  id="gcash-reference"
                  type="text"
                  placeholder="Enter GCash reference number"
                  value={gcashReference}
                  onChange={(event) => {
                    setGcashReference(event.target.value);
                    clearValidation();
                  }}
                  style={fieldStyle}
                />
              </div>

              <div style={{ marginTop: 20 }}>
                <label
                  htmlFor="gcash-screenshot"
                  style={labelStyle}
                >
                  <Upload
                    size={16}
                    style={{ verticalAlign: "middle" }}
                  />{" "}
                  Payment Screenshot
                </label>

                <input
                  id="gcash-screenshot"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleScreenshotChange}
                  style={{
                    ...fieldStyle,
                    padding: 10,
                  }}
                />

                {gcashScreenshot && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "#28664b",
                      marginTop: 10,
                    }}
                  >
                    <CheckCircle2
                      size={15}
                      style={{
                        verticalAlign: "middle",
                      }}
                    />{" "}
                    Selected: {gcashScreenshot.name}
                  </p>
                )}

                <p
                  style={{
                    fontSize: 12,
                    color: "#937a69",
                    lineHeight: 1.6,
                  }}
                >
                  Upload JPG, PNG, or WebP only.
                  Maximum file size: 5 MB.
                  Provide at least a reference number
                  or a screenshot.
                </p>
              </div>

              <p
                style={{
                  fontSize: 12,
                  color: "#937a69",
                  lineHeight: 1.6,
                }}
              >
                Selecting a screenshot does not upload
                it yet. Payment proof will be submitted
                when the order submission feature is
                implemented. Payment remains unverified
                until checked by the bakery.
              </p>
            </div>
          )}
        </div>

        {error && (
          <p
            role="alert"
            style={{
              color: "#a32d20",
              background: "#fff0ed",
              padding: 14,
              borderRadius: 10,
              marginTop: 16,
            }}
          >
            {error}
          </p>
        )}

        {validated && (
          <p
            role="status"
            style={{
              color: "#28664b",
              background: "#eaf6ee",
              padding: 14,
              borderRadius: 10,
              marginTop: 16,
            }}
          >
            Checkout details validated successfully.
            Payment method:{" "}
            {paymentMethod === "cash"
              ? "Cash on Meetup"
              : "GCash"}
            . Your order has not been submitted yet.
            {paymentMethod === "gcash" &&
              " Your payment has not been verified."}
          </p>
        )}

        <button
          type="submit"
          style={{
            width: "100%",
            padding: 16,
            border: "none",
            borderRadius: 12,
            background: "#654630",
            color: "white",
            fontSize: 15,
            fontWeight: 700,
            marginTop: 20,
            cursor: "pointer",
          }}
        >
          Review Checkout Details
        </button>
      </form>
    </section>
  );
}
