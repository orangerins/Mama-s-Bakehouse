
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import AdminDashboard from "./components/AdminDashboard";
import CustomerDashboard from "./components/CustomerDashboard";
import "./App.css";
import "./components/AdminDashboard.css";

export default function App() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [checkingSession, setCheckingSession] = useState(true);
  const [checkingRole, setCheckingRole] = useState(false);

  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Track which user's role has already been checked.
  // This prevents repeated SIGNED_IN events from
  // resetting the customer or admin dashboard.
  const currentUserIdRef = useRef(null);
  const roleRequestIdRef = useRef(0);

  const checkUserRole = useCallback(async (user, requestId) => {
    try {
      const { data, error: roleError } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      // Ignore results from an outdated request.
      if (requestId !== roleRequestIdRef.current) {
        return;
      }

      if (roleError) {
        console.error("Admin role check failed:", roleError);
        setIsAdmin(false);
      } else {
        setIsAdmin(Boolean(data));
      }
    } catch (err) {
      if (requestId !== roleRequestIdRef.current) {
        return;
      }

      console.error("Unexpected role check error:", err);
      setIsAdmin(false);
    } finally {
      if (requestId === roleRequestIdRef.current) {
        setCheckingRole(false);
        setCheckingSession(false);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const pendingTimers = new Set();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;

        const newUserId = newSession?.user?.id ?? null;
        const previousUserId = currentUserIdRef.current;

        // Handle logout or an initial session with no user.
        if (!newUserId) {
          roleRequestIdRef.current += 1;
          currentUserIdRef.current = null;

          setSession(null);
          setIsAdmin(false);
          setCheckingRole(false);
          setCheckingSession(false);
          return;
        }

        // IMPORTANT:
        // The same user is still signed in.
        //
        // Supabase can emit SIGNED_IN again when the
        // browser regains focus, and TOKEN_REFRESHED
        // when refreshing authentication.
        //
        // Do not recheck the role or show the loading
        // screen for these routine events.
        if (previousUserId === newUserId) {
          if (event === "USER_UPDATED") {
            setSession(newSession);
          } else {
            setSession((previousSession) => {
              // Preserve the existing dashboard whenever
              // the authenticated user has not changed.
              if (
                previousSession?.user?.id === newUserId
              ) {
                return previousSession;
              }

              return newSession;
            });
          }

          return;
        }

        // A genuinely different user has signed in,
        // or the application is loading its first session.
        currentUserIdRef.current = newUserId;

        const requestId = ++roleRequestIdRef.current;

        setSession(newSession);
        setIsAdmin(false);
        setCheckingRole(true);
        setCheckingSession(true);

        // Do not make Supabase database requests directly
        // inside the authentication callback.
        const timer = setTimeout(() => {
          pendingTimers.delete(timer);

          if (
            mounted &&
            roleRequestIdRef.current === requestId
          ) {
            checkUserRole(newSession.user, requestId);
          }
        }, 0);

        pendingTimers.add(timer);
      }
    );

    return () => {
      mounted = false;

      roleRequestIdRef.current += 1;

      pendingTimers.forEach((timer) => {
        clearTimeout(timer);
      });

      subscription.unsubscribe();
    };
  }, [checkUserRole]);

  async function handleLogin(event) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        throw loginError;
      }

      // The authentication listener will handle the
      // new session and check whether the user is admin.
      // Avoid performing a duplicate role check here.
    } catch (err) {
      setError(
        err.message ||
          "Unable to log in. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim();

    if (!normalizedName) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Your password must contain at least 6 characters."
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error: registrationError } =
        await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: normalizedName,
            },
          },
        });

      if (registrationError) {
        throw registrationError;
      }

      if (data.user) {
        // Create or update the customer profile.
        // The profile ID matches the Auth user ID.
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: data.user.id,
              full_name: normalizedName,
              phone_number: phoneNumber.trim() || null,
            },
            {
              onConflict: "id",
            }
          );

        if (profileError) {
          console.error(
            "Profile creation failed:",
            profileError
          );

          setError(
            "Your account was created, but the profile " +
              "could not be saved. " +
              profileError.message
          );

          return;
        }
      }

      if (data.session) {
        // The auth listener handles the signed-in user.
        setSuccess(
          "Your account was created successfully."
        );
      } else {
        setSuccess(
          "Registration successful! Please check your email " +
            "to confirm your account, then log in."
        );

        setIsRegistering(false);
        setPassword("");
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { error: logoutError } =
        await supabase.auth.signOut();

      if (logoutError) {
        throw logoutError;
      }

      // The SIGNED_OUT event also clears the session.
      roleRequestIdRef.current += 1;
      currentUserIdRef.current = null;

      setSession(null);
      setIsAdmin(false);
      setCheckingRole(false);
      setCheckingSession(false);

      setEmail("");
      setPassword("");
      setFullName("");
      setPhoneNumber("");
      setIsRegistering(false);
    } catch (err) {
      setError(
        err.message ||
          "Unable to log out. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // Only display the full loading screen during the
  // initial session check or when changing accounts.
  // Routine authentication refreshes will not trigger it.
  if (checkingSession || checkingRole) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-card">
          <div className="auth-brand-mark">MB</div>

          <h2>Mama's Bakehouse</h2>

          <p>Preparing your bakery experience...</p>

          <div className="auth-loading-spinner" />
        </div>
      </div>
    );
  }

  // Admin dashboard
  if (session && isAdmin) {
    return (
      <AdminDashboard
        user={session.user}
        onLogout={handleLogout}
      />
    );
  }

  // Customer dashboard
  if (session) {
    return (
      <CustomerDashboard
        user={session.user}
        onLogout={handleLogout}
      />
    );
  }

  // Login and registration screens
  return (
    <div className="auth-page">
      <div
        className="auth-background-decoration auth-decoration-one"
      />

      <div
        className="auth-background-decoration auth-decoration-two"
      />

      <main className="auth-container">
        <section className="auth-brand-panel">
          <div className="auth-brand-mark">
            MB
          </div>

          <p className="auth-eyebrow">
            BAKED WITH LOVE
          </p>

          <h1>Mama's Bakehouse</h1>

          <p className="auth-brand-description">
            A little sweetness goes a long way. Discover
            freshly prepared treats made for life's special
            moments.
          </p>

          <div className="auth-brand-decoration">
            <span>♡</span>
            <span>Freshly made, just for you</span>
            <span>♡</span>
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-form-header">
            <p className="auth-eyebrow">
              WELCOME TO OUR BAKERY
            </p>

            <h2>
              {isRegistering
                ? "Create your account"
                : "Welcome back"}
            </h2>

            <p>
              {isRegistering
                ? "Join us and discover your new favorite treats."
                : "Log in to explore our freshly baked goodies."}
            </p>
          </div>

          {error && (
            <div
              className="auth-error-message"
              role="alert"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="auth-success-message"
              role="status"
            >
              {success}
            </div>
          )}

          <form
            className="auth-form"
            onSubmit={
              isRegistering
                ? handleRegister
                : handleLogin
            }
          >
            {isRegistering && (
              <>
                <div className="auth-form-field">
                  <label htmlFor="fullName">
                    Full Name
                  </label>

                  <input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                    autoComplete="name"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="auth-form-field">
                  <label htmlFor="phoneNumber">
                    Phone Number (Optional)
                  </label>

                  <input
                    id="phoneNumber"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phoneNumber}
                    onChange={(event) =>
                      setPhoneNumber(event.target.value)
                    }
                    autoComplete="tel"
                    disabled={loading}
                  />
                </div>
              </>
            )}

            <div className="auth-form-field">
              <label htmlFor="email">
                Email Address
              </label>

              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            <div className="auth-form-field">
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                placeholder={
                  isRegistering
                    ? "At least 6 characters"
                    : "Enter your password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete={
                  isRegistering
                    ? "new-password"
                    : "current-password"
                }
                minLength={
                  isRegistering ? 6 : undefined
                }
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="auth-submit-button"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isRegistering
                  ? "Create Account"
                  : "Log In"}
            </button>
          </form>

          <div className="auth-switch-section">
            <span>
              {isRegistering
                ? "Already have an account?"
                : "New to Mama's Bakehouse?"}
            </span>

            <button
              type="button"
              className="auth-switch-button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
                setSuccess("");
              }}
              disabled={loading}
            >
              {isRegistering
                ? "Log In"
                : "Create an Account"}
            </button>
          </div>

          <p className="auth-footer">
            © {new Date().getFullYear()} Mama's Bakehouse
          </p>
        </section>
      </main>
    </div>
  );
}
