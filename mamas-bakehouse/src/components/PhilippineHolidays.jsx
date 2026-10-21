
import { useEffect, useState } from "react";
import {
  CalendarDays,
  RefreshCw,
  Gift,
  Clock3,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lightbulb,
  MapPin,
} from "lucide-react";

const TIME_ZONE = "Asia/Manila";

const cardStyle = {
  background: "#fff",
  border: "1px solid #e9dfd5",
  borderRadius: 18,
  padding: 24,
  marginBottom: 24,
  color: "#39291f",
};

function getToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) =>
    parts.find((part) => part.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function dateToUTC(dateString) {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  return Date.UTC(year, month - 1, day);
}

function daysUntil(dateString, today) {
  return Math.round(
    (dateToUTC(dateString) - dateToUTC(today)) /
      86400000
  );
}

function formatDate(dateString) {
  return new Date(
    `${dateString}T12:00:00Z`
  ).toLocaleDateString("en-PH", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPreparationTip(holidayName) {
  const name = holidayName.toLowerCase();

  if (
    name.includes("christmas") ||
    name.includes("new year")
  ) {
    return "Consider promoting party trays, cakes, and family bundles early. Check ingredient supplies and preorder deadlines.";
  }

  if (
    name.includes("eid") ||
    name.includes("fitr") ||
    name.includes("adha")
  ) {
    return "Consider family-sharing trays and advance orders. Confirm ingredient and dietary preferences with customers.";
  }

  if (
    name.includes("holy week") ||
    name.includes("good friday") ||
    name.includes("maundy thursday") ||
    name.includes("easter")
  ) {
    return "Plan your operating schedule and promote suitable family-sharing food options ahead of time.";
  }

  if (
    name.includes("all saints") ||
    name.includes("all souls")
  ) {
    return "Consider promoting convenient family food trays and advance pickup arrangements.";
  }

  if (
    name.includes("independence") ||
    name.includes("heroes") ||
    name.includes("bonifacio") ||
    name.includes("rizal")
  ) {
    return "Consider offering family bundles and promoting advance orders for gatherings.";
  }

  return "Review expected demand, prepare ingredients, and announce preorder availability in advance.";
}

function HolidayItem({ holiday, today }) {
  const remaining = daysUntil(holiday.date, today);

  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "16px 0",
        borderBottom: "1px solid #f0e8df",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 45,
          height: 45,
          background: "#f7efe6",
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          color: "#9b6948",
          flexShrink: 0,
        }}
      >
        <Gift size={20} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <strong
          style={{
            fontSize: 15,
            color: "#39291f",
            display: "block",
          }}
        >
          {holiday.name}
        </strong>

        <p
          style={{
            color: "#8e7665",
            fontSize: 13,
            margin: "6px 0",
          }}
        >
          <CalendarDays
            size={14}
            style={{ verticalAlign: "middle" }}
          />{" "}
          {formatDate(holiday.date)}
        </p>

        <p
          style={{
            color: "#76543c",
            fontSize: 12,
            margin: "8px 0 0",
            lineHeight: 1.6,
          }}
        >
          <Lightbulb
            size={14}
            style={{ verticalAlign: "middle" }}
          />{" "}
          {getPreparationTip(holiday.name)}
        </p>
      </div>

      <span
        style={{
          background: "#f5eee7",
          color: "#76543c",
          padding: "7px 10px",
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {remaining === 0
          ? "Today"
          : `${remaining} day${remaining === 1 ? "" : "s"}`}
      </span>
    </div>
  );
}

export default function PhilippineHolidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  const today = getToday();
  const currentYear = Number(today.slice(0, 4));

  async function loadHolidays(signal, manual = false) {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      // Fetch the current year and the next year,
      // so upcoming holidays remain visible in December.
      const years = [currentYear, currentYear + 1];

      const results = await Promise.all(
        years.map(async (year) => {
          const response = await fetch(
            `https://nagerholidays.com/api/v4/Holidays/PH/${year}`,
            { signal }
          );

          if (!response.ok) {
            throw new Error(
              `Holiday API error: ${response.status}`
            );
          }

          const data = await response.json();

          if (!Array.isArray(data)) {
            throw new Error(
              "Unexpected holiday data received."
            );
          }

          return data;
        })
      );

      const unique = new Map();

      results.flat().forEach((holiday) => {
        if (
          holiday.date &&
          holiday.name &&
          holiday.nationalHoliday !== false &&
          holiday.holidayTypes?.includes("Public")
        ) {
          unique.set(
            `${holiday.date}-${holiday.name}`,
            holiday
          );
        }
      });

      const sorted = [...unique.values()].sort(
        (a, b) => a.date.localeCompare(b.date)
      );

      if (!signal?.aborted) {
        setHolidays(sorted);
      }
    } catch (err) {
      if (err.name === "AbortError") return;

      if (!signal?.aborted) {
        setError(
          err.message || "Unable to load holidays."
        );
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    loadHolidays(controller.signal);

    return () => controller.abort();
  }, [currentYear]);

  const upcoming = holidays.filter(
    (holiday) => holiday.date >= today
  );

  const displayed = showAll
    ? holidays.filter((holiday) =>
        holiday.date.startsWith(String(currentYear))
      )
    : upcoming.slice(0, 5);

  return (
    <section style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 15,
          marginBottom: 20,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              letterSpacing: 2,
              color: "#b08c70",
              fontWeight: 700,
              margin: "0 0 8px",
            }}
          >
            HOLIDAY SALES PLANNING
          </p>

          <h2
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 25,
              margin: "0 0 8px",
              color: "#39291f",
            }}
          >
            Philippine Holiday Planner
          </h2>

          <p
            style={{
              color: "#917968",
              fontSize: 13,
              margin: 0,
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <MapPin size={15} />
            Philippines — {currentYear}
          </p>
        </div>

        <button
          type="button"
          disabled={loading || refreshing}
          onClick={() =>
            loadHolidays(undefined, true)
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#f4eee8",
            border: "1px solid #e9dfd5",
            borderRadius: 10,
            padding: "10px 15px",
            color: "#76543c",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={15} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div
        style={{
          background: "#faf6f0",
          borderRadius: 12,
          padding: 16,
          marginBottom: 14,
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          color: "#76543c",
        }}
      >
        <Clock3 size={20} />

        <div>
          <strong style={{ fontSize: 14 }}>
            Plan Ahead for Holiday Orders
          </strong>

          <p
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              margin: "5px 0 0",
            }}
          >
            Use upcoming holidays to plan bakery
            promotions, ingredient purchases, and
            advance orders. Higher sales are possible,
            but not guaranteed.
          </p>
        </div>
      </div>

      {loading && (
        <p style={{ color: "#917968" }}>
          Loading Philippine holidays...
        </p>
      )}

      {error && (
        <div
          role="alert"
          style={{
            background: "#fff1ef",
            color: "#a13f36",
            padding: 14,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {!loading && !error && displayed.length === 0 && (
        <p style={{ color: "#917968" }}>
          No holidays found for this period.
        </p>
      )}

      {!loading &&
        displayed.map((holiday) => (
          <HolidayItem
            key={`${holiday.date}-${holiday.name}`}
            holiday={holiday}
            today={today}
          />
        ))}

      {!loading && holidays.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          style={{
            marginTop: 18,
            background: "#f4eee8",
            color: "#76543c",
            border: "1px solid #e9dfd5",
            borderRadius: 10,
            padding: "11px 16px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
          }}
        >
          {showAll ? (
            <>
              <ChevronUp size={16} />
              Show Upcoming Holidays
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              View All {currentYear} Holidays
            </>
          )}
        </button>
      )}

      <p
        style={{
          margin: "18px 0 0",
          fontSize: 11,
          color: "#a18d7d",
          lineHeight: 1.6,
        }}
      >
        Source: Nager.Date Community API.
        Confirm official Philippine holiday announcements
        before making business decisions. Local Iligan
        City events and special proclamations may not
        appear in this calendar.
      </p>
    </section>
  );
}
