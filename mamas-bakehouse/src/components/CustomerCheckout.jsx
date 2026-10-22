
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  X,
  Wallet,
  Smartphone,
  CheckCircle2,
  Search,
  Loader2,
  AlertCircle,
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

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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

const mutedText = {
  color: "#937a69",
  fontSize: 13,
  lineHeight: 1.6,
};

const primaryButton = {
  padding: "13px 18px",
  border: "none",
  borderRadius: 12,
  background: "#654630",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
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

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState(null);

  // API #4: OpenStreetMap Nominatim
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  const searchController = useRef(null);
  const lastSearchAt = useRef(0);

  useEffect(() => {
    return () => {
      searchController.current?.abort();
    };
  }, []);

  async function searchLandmarks() {
    const query = locationQuery.trim();

    if (query.length < 3) {
      setLocationMessage("Please enter at least 3 characters.");
      setLocationResults([]);
      return;
    }

    if (locationLoading) return;

    if (Date.now() - lastSearchAt.current < 1200) {
      setLocationMessage(
        "Please wait a moment before searching again."
      );
      return;
    }

    lastSearchAt.current = Date.now();
    searchController.current?.abort();

    const controller = new AbortController();
    searchController.current = controller;

    setLocationLoading(true);
    setLocationResults([]);
    setLocationMessage("");

    try {
      const params = new URLSearchParams({
        q: `${query}, Iligan City, Philippines`,
        format: "jsonv2",
        addressdetails: "1",
        limit: "5",
        countrycodes: "ph",
        viewbox: "124.18,8.30,124.31,8.17",
        bounded: "1",
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Location search unavailable (${response.status}).`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid location search response.");
      }

      const validResults = data.filter(
        (place) =>
          typeof place.display_name === "string" &&
          Number.isFinite(Number(place.lat)) &&
          Number.isFinite(Number(place.lon))
      );

      if (controller.signal.aborted) return;

      setLocationResults(validResults);

      setLocationMessage(
        validResults.length === 0
          ? "No matching landmarks found. You can enter the meetup location manually."
          : "Select a landmark below. All meetup requests require bakery approval."
      );
    } catch (err) {
      if (err.name === "AbortError") return;

      console.error("Nominatim search error:", err);

      setLocationMessage(
        "Location search is temporarily unavailable. You can still enter the meetup location manually."
      );
    } finally {
      if (!controller.signal.aborted) {
        setLocationLoading(false);
      }
    }
  }

  function selectLocation(place) {
    const selectedName = place.display_name;

    setMeetupLocation(selectedName);
    setLocationQuery(selectedName);
    setLocationResults([]);

    setLocationMessage(
      "Landmark selected! Please confirm that the requested meetup point is within Iligan City proper."
    );

    setError("");
  }

  const total = cart.reduce(
    (sum, item) =>
      sum +
      Number(item.finalPrice || 0) *
        Number(item.quantity || 0),
    0
  );

  const requiresDownPayment = cart.some(
    (item) =>
      item.product?.requires_down_payment === true
  );

  const selectedPaymentMethod = requiresDownPayment
    ? "gcash"
    : paymentMethod;

  const estimatedDownPayment = cart.reduce(
    (sum, item) =>
      sum +
      (item.product?.requires_down_payment
        ? Number(item.finalPrice || 0) *
          Number(item.quantity || 0) *
          0.5
        : 0),
    0
  );

  const minimumPreparationDays = Math.max(
    0,
    ...cart.map((item) =>
      Number(item.product?.preparation_days || 0)
    )
  );

  const earliestMeetupDate = addDays(
    getManilaToday(),
    minimumPreparationDays
  );

  const isLocked = submitting || Boolean(submittedOrder);

  // Order submission only.
  // Resend and send-order-email have been removed.
  async function submitCheckout(event) {
    event.preventDefault();

    if (submitting || submittedOrder) return;

    setError("");

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

    if (meetupDate < earliestMeetupDate) {
      setError(
        `Please choose a meetup date on or after ${earliestMeetupDate}.`
      );
      return;
    }

    if (meetupLocation.trim().length < 5) {
      setError(
        "Please enter a more specific meetup location."
      );
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "create_customer_order",
        {
          p_items: cart.map((item) => ({
            product_id: item.product.id,
            option_ids: (
              item.selectedOptions || []
            ).map((option) => option.id),
            quantity: item.quantity,
          })),
          p_meetup_date: meetupDate,
          p_meetup_time: meetupTime,
          p_meetup_location: meetupLocation.trim(),
          p_customer_notes: notes.trim() || null,
          p_payment_method: selectedPaymentMethod,
        }
      );

      if (rpcError) throw rpcError;

      if (!data?.success || !data?.order_number) {
        throw new Error(
          "Order submission did not return a confirmation."
        );
      }

      setSubmittedOrder(data);
    } catch (err) {
      console.error("Checkout error:", err);

      setError(
        err.message ||
          "Unable to submit order. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
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
      {/* HEADER */}
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
          disabled={isLocked}
          style={{
            border: "none",
            background: "transparent",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: isLocked ? "not-allowed" : "pointer",
            color: "#684832",
          }}
        >
          <ArrowLeft size={18} />
          Back to Cart
        </button>

        <button
          type="button"
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            color: "#684832",
            cursor: "pointer",
          }}
          aria-label="Close checkout"
        >
          <X size={22} />
        </button>
      </div>

      <p
        style={{
          color: "#9b765d",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 2,
        }}
      >
        MAMA'S BAKEHOUSE
      </p>

      <h2
        style={{
          fontFamily: "Georgia, serif",
          color: "#493426",
          fontSize: 30,
          marginBottom: 8,
        }}
      >
        Checkout
      </h2>

      <p style={mutedText}>
        Review your order, choose a meetup location,
        and submit your request for bakery approval.
      </p>

      {/* ORDER SUMMARY */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Order Summary</h3>

        {cart.map((item, index) => (
          <div
            key={`${item.product?.id}-${index}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 14,
              padding: "14px 0",
              borderBottom: "1px solid #eee4da",
            }}
          >
            <div>
              <strong>
                {item.product?.name || "Product"}
              </strong>

              <p style={mutedText}>
                Quantity: {item.quantity}
              </p>

              {(item.selectedOptions || []).map(
                (option, optionIndex) => (
                  <p
                    key={option.id || optionIndex}
                    style={{
                      ...mutedText,
                      margin: "4px 0",
                    }}
                  >
                    {option.option_name ||
                      option.name ||
                      option.label ||
                      "Selected option"}
                  </p>
                )
              )}
            </div>

            <strong>
              {peso(
                Number(item.finalPrice || 0) *
                  Number(item.quantity || 0)
              )}
            </strong>
          </div>
        ))}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 20,
          }}
        >
          <strong>Total</strong>
          <strong
            style={{
              color: "#654630",
              fontSize: 24,
            }}
          >
            {peso(total)}
          </strong>
        </div>
      </div>

      <form onSubmit={submitCheckout}>
        {/* MEETUP DETAILS */}
        <div style={cardStyle}>
          <h3
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              marginTop: 0,
            }}
          >
            <CalendarDays size={21} />
            Meetup Details
          </h3>

          <p style={mutedText}>
            Mama's Bakehouse arranges meetups
            within Iligan City proper. Your
            requested schedule is subject to
            admin approval.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
              marginTop: 20,
            }}
          >
            <div>
              <label
                htmlFor="meetup-date"
                style={labelStyle}
              >
                Preferred Meetup Date
              </label>

              <input
                id="meetup-date"
                type="date"
                value={meetupDate}
                min={earliestMeetupDate}
                onChange={(event) => {
                  setMeetupDate(event.target.value);
                  setError("");
                }}
                disabled={isLocked}
                required
                style={fieldStyle}
              />
            </div>

            <div>
              <label
                htmlFor="meetup-time"
                style={labelStyle}
              >
                Preferred Meetup Time
              </label>

              <input
                id="meetup-time"
                type="time"
                value={meetupTime}
                onChange={(event) => {
                  setMeetupTime(event.target.value);
                  setError("");
                }}
                disabled={isLocked}
                required
                style={fieldStyle}
              />
            </div>
          </div>

          {/* LOCATION SEARCH */}
          <div style={{ marginTop: 22 }}>
            <label
              htmlFor="location-search"
              style={labelStyle}
            >
              Search for a Meetup Landmark
            </label>

            <p style={mutedText}>
              Search nearby landmarks using
              OpenStreetMap. You can also enter
              a meetup location manually.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <input
                id="location-search"
                type="text"
                value={locationQuery}
                onChange={(event) =>
                  setLocationQuery(event.target.value)
                }
                placeholder="e.g. Gaisano Mall, Iligan"
                disabled={isLocked}
                style={{
                  ...fieldStyle,
                  flex: "1 1 220px",
                }}
              />

              <button
                type="button"
                onClick={searchLandmarks}
                disabled={isLocked || locationLoading}
                style={primaryButton}
              >
                {locationLoading ? (
                  <Loader2 size={17} />
                ) : (
                  <Search size={17} />
                )}

                {locationLoading
                  ? "Searching..."
                  : "Search"}
              </button>
            </div>

            {locationMessage && (
              <p style={mutedText}>
                {locationMessage}
              </p>
            )}

            {locationResults.length > 0 && (
              <div
                style={{
                  border: "1px solid #eadbcf",
                  borderRadius: 12,
                  marginTop: 12,
                  overflow: "hidden",
                }}
              >
                {locationResults.map(
                  (place, index) => (
                    <button
                      key={place.place_id || index}
                      type="button"
                      onClick={() =>
                        selectLocation(place)
                      }
                      disabled={isLocked}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 9,
                        width: "100%",
                        textAlign: "left",
                        padding: 13,
                        background: "#fff",
                        border: "none",
                        borderBottom:
                          "1px solid #eee4da",
                        color: "#493426",
                        cursor: "pointer",
                      }}
                    >
                      <MapPin
                        size={17}
                        style={{
                          flexShrink: 0,
                        }}
                      />
                      {place.display_name}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* SELECTED LOCATION */}
          <div style={{ marginTop: 20 }}>
            <label
              htmlFor="meetup-location"
              style={labelStyle}
            >
              Requested Meetup Location
            </label>

            <input
              id="meetup-location"
              type="text"
              value={meetupLocation}
              onChange={(event) => {
                setMeetupLocation(event.target.value);
                setError("");
              }}
              placeholder="Enter a specific meetup landmark"
              disabled={isLocked}
              required
              maxLength={500}
              style={fieldStyle}
            />
          </div>

          {/* NOTES */}
          <div style={{ marginTop: 20 }}>
            <label
              htmlFor="customer-notes"
              style={labelStyle}
            >
              Special Instructions (Optional)
            </label>

            <textarea
              id="customer-notes"
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="Any special requests or instructions?"
              rows={4}
              disabled={isLocked}
              style={{
                ...fieldStyle,
                resize: "vertical",
              }}
            />
          </div>

          {/* PREPARATION TIME */}
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              background: "#f7efe6",
              borderRadius: 12,
              padding: 15,
              marginTop: 20,
            }}
          >
            <Clock3
              size={19}
              color="#79563b"
              style={{ flexShrink: 0 }}
            />

            <div>
              <strong>Preparation Time</strong>

              <p
                style={{
                  ...mutedText,
                  marginBottom: 0,
                }}
              >
                Minimum preparation:{" "}
                {minimumPreparationDays} day(s).
                Earliest meetup date:{" "}
                {earliestMeetupDate}.
                Rush orders are not accepted.
              </p>
            </div>
          </div>
        </div>

        {/* PAYMENT METHOD */}
        <div style={cardStyle}>
          <h3
            style={{
              marginTop: 0,
              display: "flex",
              alignItems: "center",
              gap: 9,
            }}
          >
            <Wallet size={21} />
            Payment Method
          </h3>

          {requiresDownPayment ? (
            <div
              style={{
                background: "#fff3e4",
                padding: 17,
                borderRadius: 12,
                color: "#79563b",
              }}
            >
              <strong>
                GCash Down Payment Required
              </strong>

              <p style={{ lineHeight: 1.7 }}>
                Your order includes an item
                requiring a 50% down payment.
                Please wait for the bakery to
                approve your order before paying.
              </p>

              <p
                style={{
                  fontWeight: 700,
                  fontSize: 21,
                }}
              >
                Estimated Down Payment:{" "}
                {peso(estimatedDownPayment)}
              </p>

              <p style={mutedText}>
                GCash payment verification is
                handled after admin approval.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 12,
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
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={paymentMethod === "cash"}
                  onChange={() =>
                    setPaymentMethod("cash")
                  }
                  disabled={isLocked}
                />

                <Wallet size={21} />

                <div>
                  <strong>Cash on Meetup</strong>
                  <p
                    style={{
                      ...mutedText,
                      margin: "4px 0 0",
                    }}
                  >
                    Pay during the confirmed
                    meetup.
                  </p>
                </div>
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
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="gcash"
                  checked={paymentMethod === "gcash"}
                  onChange={() =>
                    setPaymentMethod("gcash")
                  }
                  disabled={isLocked}
                />

                <Smartphone size={21} />

                <div>
                  <strong>GCash</strong>
                  <p
                    style={{
                      ...mutedText,
                      margin: "4px 0 0",
                    }}
                  >
                    Submit payment details
                    when requested by the bakery.
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div
            role="alert"
            style={{
              background: "#fff0ee",
              color: "#b42318",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <AlertCircle size={19} />
            {error}
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {submittedOrder && (
          <div
            role="status"
            style={{
              background: "#e9f6ee",
              border: "1px solid #c9e6d2",
              borderRadius: 16,
              padding: 22,
              marginBottom: 20,
              color: "#236748",
            }}
          >
            <CheckCircle2 size={34} />

            <h3>Order Submitted Successfully!</h3>

            <p>
              Your order has been sent to
              Mama's Bakehouse for review.
            </p>

            <p>
              Order Number:{" "}
              <strong>
                {submittedOrder.order_number}
              </strong>
            </p>

            <p>
              Total Amount:{" "}
              <strong>
                {peso(submittedOrder.total_amount)}
              </strong>
            </p>

            {Number(
              submittedOrder.down_payment_required
            ) > 0 && (
              <p>
                Required Down Payment:{" "}
                <strong>
                  {peso(
                    submittedOrder.down_payment_required
                  )}
                </strong>
              </p>
            )}

            <p>
              Do not send any required down
              payment until your order is approved.
            </p>
          </div>
        )}

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={isLocked || cart.length === 0}
          style={{
            ...primaryButton,
            width: "100%",
            minHeight: 52,
            fontSize: 16,
            opacity:
              isLocked || cart.length === 0
                ? 0.65
                : 1,
          }}
        >
          {submitting
            ? "Submitting Your Order..."
            : submittedOrder
            ? "Order Submitted"
            : "Place Order"}
        </button>
      </form>
    </section>
  );
}
