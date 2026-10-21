
import { useEffect, useState } from "react";
import {
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  Sun,
  CloudDrizzle,
  CloudFog,
  RefreshCw,
  MapPin,
  Thermometer,
  Droplets,
  CalendarDays,
  AlertCircle,
} from "lucide-react";

// Iligan City, Philippines
const LATITUDE = 8.228;
const LONGITUDE = 124.245;

const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast" +
  `?latitude=${LATITUDE}` +
  `&longitude=${LONGITUDE}` +
  "&current=temperature_2m,weather_code" +
  "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
  "&timezone=Asia%2FManila" +
  "&forecast_days=5";

function getWeatherInfo(code) {
  if (code === 0) {
    return {
      label: "Clear Sky",
      icon: Sun,
      color: "#d99837",
    };
  }

  if ([1, 2].includes(code)) {
    return {
      label: "Partly Cloudy",
      icon: CloudSun,
      color: "#b88948",
    };
  }

  if (code === 3) {
    return {
      label: "Cloudy",
      icon: Cloud,
      color: "#8b8d93",
    };
  }

  if ([45, 48].includes(code)) {
    return {
      label: "Foggy",
      icon: CloudFog,
      color: "#8b8d93",
    };
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return {
      label: "Drizzle",
      icon: CloudDrizzle,
      color: "#5e86a1",
    };
  }

  if (
    [61, 63, 65, 66, 67, 80, 81, 82].includes(code)
  ) {
    return {
      label: "Rainy",
      icon: CloudRain,
      color: "#547d9d",
    };
  }

  if ([95, 96, 99].includes(code)) {
    return {
      label: "Thunderstorm",
      icon: CloudLightning,
      color: "#775b9c",
    };
  }

  return {
    label: "Weather Unavailable",
    icon: Cloud,
    color: "#8b8d93",
  };
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getMeetupAdvice(rainChance) {
  if (rainChance == null) {
    return "Check local conditions before arranging customer meetups.";
  }

  if (rainChance >= 70) {
    return "High chance of rain. Consider a covered meetup location and confirm arrangements with customers.";
  }

  if (rainChance >= 40) {
    return "Rain is possible. Prepare a backup covered meetup location.";
  }

  return "Lower chance of rain. Continue checking the forecast before confirming meetups.";
}

const styles = {
  container: {
    background: "#ffffff",
    border: "1px solid #e9dfd5",
    borderRadius: 18,
    padding: 24,
    marginBottom: 24,
    color: "#39291f",
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 22,
  },

  kicker: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "2px",
    color: "#b08c70",
    margin: "0 0 8px",
  },

  title: {
    fontFamily: "Georgia, serif",
    fontSize: 25,
    fontWeight: 600,
    margin: "0 0 8px",
    color: "#39291f",
  },

  location: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#917968",
    fontSize: 13,
    margin: 0,
  },

  refresh: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 15px",
    background: "#f4eee8",
    border: "1px solid #e9dfd5",
    borderRadius: 10,
    color: "#76543c",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },

  current: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    background: "#faf7f3",
    border: "1px solid #eee5dc",
    borderRadius: 14,
    padding: 22,
    marginBottom: 22,
  },

  temperature: {
    fontSize: 36,
    fontWeight: 700,
    margin: 0,
    color: "#39291f",
  },

  forecastGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(145px, 1fr))",
    gap: 12,
    marginBottom: 20,
  },

  dayCard: {
    padding: 17,
    borderRadius: 12,
    border: "1px solid #e9dfd5",
    background: "#ffffff",
    textAlign: "center",
  },

  advice: {
    background: "#f8f2e9",
    border: "1px solid #eee0ce",
    borderRadius: 12,
    padding: "15px 17px",
    color: "#76543c",
    fontSize: 13,
    lineHeight: 1.6,
  },
};

export default function WeatherForecast() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function loadWeather(signal, manual = false) {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch(WEATHER_URL, {
        signal,
      });

      if (!response.ok) {
        throw new Error(
          `Weather service returned ${response.status}.`
        );
      }

      const data = await response.json();

      if (
        !data.current ||
        !data.daily ||
        !Array.isArray(data.daily.time)
      ) {
        throw new Error("Incomplete weather forecast data.");
      }

      if (!signal?.aborted) {
        setWeather(data);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }

      if (!signal?.aborted) {
        setError(
          err.message ||
            "Unable to retrieve the weather forecast."
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

    loadWeather(controller.signal);

    return () => controller.abort();
  }, []);

  const currentInfo = weather
    ? getWeatherInfo(weather.current.weather_code)
    : null;

  const CurrentIcon = currentInfo?.icon || CloudSun;

  const dates = weather?.daily?.time || [];

  const todayRainChance =
    weather?.daily?.precipitation_probability_max?.[0] ??
    null;

  return (
    <section style={styles.container}>
      {/* WEATHER HEADER */}
      <div style={styles.header}>
        <div>
          <p style={styles.kicker}>
            OPEN-METEO WEATHER API
          </p>

          <h2 style={styles.title}>
            Weather Forecast
          </h2>

          <p style={styles.location}>
            <MapPin size={15} />
            Iligan City, Philippines
          </p>
        </div>

        <button
          type="button"
          style={{
            ...styles.refresh,
            opacity: refreshing ? 0.6 : 1,
          }}
          onClick={() => loadWeather(undefined, true)}
          disabled={refreshing || loading}
        >
          <RefreshCw size={15} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* LOADING */}
      {loading && !weather && (
        <div
          style={{
            textAlign: "center",
            padding: "30px 10px",
            color: "#917968",
          }}
        >
          <CloudSun size={30} />

          <p>Loading weather forecast...</p>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: "#fff1ef",
            color: "#a13f36",
            padding: 15,
            borderRadius: 10,
            marginBottom: 16,
          }}
        >
          <AlertCircle size={19} />

          <span>
            {error}
            {weather
              ? " Showing the last loaded forecast."
              : " Please try refreshing."}
          </span>
        </div>
      )}

      {weather && (
        <>
          {/* CURRENT WEATHER */}
          <div style={styles.current}>
            <div
              style={{
                width: 66,
                height: 66,
                borderRadius: 15,
                background: "#ffffff",
                display: "grid",
                placeItems: "center",
              }}
            >
              <CurrentIcon
                size={35}
                color={currentInfo.color}
              />
            </div>

            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: "0 0 5px",
                  fontSize: 13,
                  color: "#947c6d",
                }}
              >
                Current Weather
              </p>

              <p style={styles.temperature}>
                {Math.round(
                  weather.current.temperature_2m
                )}
                °C
              </p>

              <p
                style={{
                  margin: "5px 0 0",
                  fontSize: 13,
                  color: "#76543c",
                }}
              >
                {currentInfo.label}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                fontSize: 13,
                color: "#806d60",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <Thermometer size={16} />
                Temperature
              </span>

              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <Droplets size={16} />
                Rain chance today:{" "}
                {todayRainChance == null
                  ? "N/A"
                  : `${todayRainChance}%`}
              </span>
            </div>
          </div>

          {/* FIVE-DAY FORECAST */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              marginBottom: 15,
            }}
          >
            <CalendarDays
              size={18}
              color="#76543c"
            />

            <h3
              style={{
                margin: 0,
                fontSize: 17,
                color: "#39291f",
              }}
            >
              5-Day Forecast
            </h3>
          </div>

          <div style={styles.forecastGrid}>
            {dates.map((date, index) => {
              const code =
                weather.daily.weather_code?.[index];

              const info = getWeatherInfo(code);
              const Icon = info.icon;

              const maximum =
                weather.daily.temperature_2m_max?.[index];

              const minimum =
                weather.daily.temperature_2m_min?.[index];

              const rain =
                weather.daily
                  .precipitation_probability_max?.[index];

              return (
                <div
                  key={date}
                  style={styles.dayCard}
                >
                  <strong
                    style={{
                      display: "block",
                      fontSize: 13,
                      marginBottom: 13,
                    }}
                  >
                    {index === 0
                      ? "Today"
                      : formatDate(date)}
                  </strong>

                  <Icon
                    size={29}
                    color={info.color}
                  />

                  <p
                    style={{
                      fontSize: 12,
                      color: "#806d60",
                      minHeight: 30,
                      margin: "10px 0",
                    }}
                  >
                    {info.label}
                  </p>

                  <p
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      margin: "0 0 12px",
                    }}
                  >
                    {maximum == null
                      ? "—"
                      : `${Math.round(maximum)}°`}

                    <span
                      style={{
                        fontWeight: 400,
                        color: "#9b8679",
                        marginLeft: 7,
                      }}
                    >
                      {minimum == null
                        ? "—"
                        : `${Math.round(minimum)}°`}
                    </span>
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                      color: "#547d9d",
                      fontSize: 12,
                    }}
                  >
                    <Droplets size={14} />
                    {rain == null
                      ? "N/A"
                      : `${rain}% rain`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* MEETUP ADVICE */}
          <div style={styles.advice}>
            <strong
              style={{
                display: "block",
                marginBottom: 6,
              }}
            >
              Bakery Meetup Planning
            </strong>

            {getMeetupAdvice(todayRainChance)}
          </div>

          {/* ATTRIBUTION */}
          <p
            style={{
              fontSize: 11,
              color: "#a18d7d",
              margin: "15px 0 0",
            }}
          >
            Weather data provided by Open-Meteo.
            Forecasts are estimates and may change.
          </p>
        </>
      )}
    </section>
  );
}
