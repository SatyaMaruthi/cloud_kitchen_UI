import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import client from "./api/client";
import "./styles.css";

function sellerMatchesQuery(seller, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return true;
  const hay = (seller.brandName || "").toLowerCase();
  return q
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => hay.includes(token));
}

function sellerMatchesCategory(seller, categoryLabel) {
  const cat = (categoryLabel || "").toLowerCase();
  if (!cat) return true;
  const name = (seller.brandName || "").toLowerCase();
  if (cat.includes("home")) return /home|kitchen|meal|cook|thali|daily|bowl/.test(name);
  if (cat.includes("fruit")) return /fruit|berry|fresh|juice|smoothie|salad|bowl/.test(name);
  if (cat.includes("protein")) return /protein|gym|fit|muscle|keto|healthy|egg|chicken|paneer|tofu/.test(name);
  return true;
}

function SellerDetail() {
  const { id } = useParams();
  const [detail, setDetail] = React.useState(null);
  const [msg, setMsg] = React.useState("");
  const [weeklyEstimate, setWeeklyEstimate] = React.useState({});
  const [quantities, setQuantities] = React.useState({});

  React.useEffect(() => {
    client.get(`/sellers/${id}`).then((r) => setDetail(r.data));
  }, [id]);

  async function subscribe(planId) {
    try {
      const payload = {
        sellerId: Number(id),
        planId,
        startDate: new Date().toISOString().slice(0, 10)
      };
      await client.post("/subscriptions", payload, { headers: { "X-User-Id": "1" } });
      setMsg("Subscription created");
    } catch (e) {
      setMsg(e?.response?.data?.message || "Could not subscribe");
    }
  }

  async function calculateWeeklyAmount(planId) {
    try {
      const quantity = Number(quantities[planId] || 1);
      const { data } = await client.get(`/sellers/weekly-amount?planId=${planId}&quantity=${quantity}&days=7`);
      setWeeklyEstimate((prev) => ({ ...prev, [planId]: data.amount }));
    } catch {
      setMsg("Could not calculate weekly amount");
    }
  }

  if (!detail) return <div className="page card">Loading seller details...</div>;
  return (
    <div className="page">
      <div className="hero-card">
        <p className="chip">Popular Kitchen</p>
        <h2 className="title">{detail.brandName}</h2>
        <p className="muted">Delivery radius: {detail.deliveryRadiusKm} km • 4.7 ★</p>
      </div>
      <h3 className="section-title">Plans</h3>
      <div className="grid">
        {detail.plans.map((p) => (
          <div className="card plan-card" key={p.id}>
            <p className="badge">{p.durationDays} Days</p>
            <h4>{p.name}</h4>
            <p className="price">Rs. {p.price}</p>
            <div className="row">
              <input
                className="input"
                style={{ maxWidth: 96 }}
                type="number"
                min="1"
                value={quantities[p.id] || 1}
                onChange={(e) => setQuantities((prev) => ({ ...prev, [p.id]: e.target.value }))}
              />
              <button className="btn secondary" onClick={() => calculateWeeklyAmount(p.id)}>Weekly Amount</button>
            </div>
            {weeklyEstimate[p.id] && <p className="muted">Weekly amount: Rs. {weeklyEstimate[p.id]}</p>}
            <button className="btn full" onClick={() => subscribe(p.id)}>Subscribe</button>
          </div>
        ))}
      </div>
      {msg && <p className="toast">{msg}</p>}
    </div>
  );
}

function MySubscriptions() {
  const [active, setActive] = React.useState([]);
  const [past, setPast] = React.useState([]);
  const [msg, setMsg] = React.useState("");
  const [msgType, setMsgType] = React.useState("");
  const [editingDelivery, setEditingDelivery] = React.useState(null);
  const [editForm, setEditForm] = React.useState({ timeZone: "Asia/Kolkata", mobileNumber: "" });

  async function load() {
    try {
      const [a, p] = await Promise.all([
        client.get("/subscriptions/active-orders", { headers: { "X-User-Id": "1" } }),
        client.get("/subscriptions/past-orders", { headers: { "X-User-Id": "1" } })
      ]);
      setActive(a.data);
      setPast(p.data);
    } catch (e) {
      showMessage("Failed to load orders", "error");
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  function showMessage(text, type = "error") {
    setMsg(text);
    setMsgType(type);
  }

  async function editDelivery(subscriptionId, date) {
    try {
      await client.patch(`/subscriptions/${subscriptionId}/edit-delivery?date=${date}`, {
        timeZone: editForm.timeZone,
        mobileNumber: editForm.mobileNumber
      });
      showMessage("Active order updated", "success");
      setEditingDelivery(null);
      await load();
    } catch (e) {
      showMessage(e?.response?.data?.message || "Could not edit order", "error");
    }
  }

  return (
    <div className="page">
      <h2 className="title">My Subscriptions</h2>
      <h3 className="section-title">Active Orders</h3>
      <div className="grid">
        {active.length === 0 ? (
          <p className="muted">No active orders. Subscribe to a plan to get started.</p>
        ) : (
          active.map((s) => (
            <div className="card" key={`active-${s.subscriptionId}`}>
              <h4>{s.planName} - #{s.subscriptionId}</h4>
              <p className="muted">Weekly menu: {s.weeklyMenuName} (Rs. {s.weeklyAmount})</p>
              {s.deliveries && s.deliveries.map((d) => (
                <div key={`${s.subscriptionId}-${d.date}`} className="card" style={{ marginTop: 8, backgroundColor: "#f0f9ff" }}>
                  <p className="muted"><strong>📍 Delivery Date:</strong> {d.date}</p>
                  <p className="muted"><strong>🚚 Delivery by:</strong> {d.deliveryBy || "-"}</p>
                  <p className="muted"><strong>🌍 Time zone:</strong> {d.timeZone || "-"}</p>
                  <p className="muted"><strong>📱 Mobile:</strong> {d.mobileNumber || "-"}</p>
                  <p className="muted"><strong>📍 Live tracking:</strong> <a href={d.liveTrackingUrl} target="_blank" rel="noopener noreferrer" style={{color: "#0369a1"}}>Track Delivery</a></p>
                  <button
                    className="btn secondary full"
                    onClick={() => {
                      setEditingDelivery(`${s.subscriptionId}-${d.date}`);
                      setEditForm({ timeZone: d.timeZone || "Asia/Kolkata", mobileNumber: d.mobileNumber || "" });
                    }}
                  >
                    Edit Order
                  </button>
                  {editingDelivery === `${s.subscriptionId}-${d.date}` && (
                    <div style={{ marginTop: 8, padding: 8, backgroundColor: "#fff", borderRadius: 8 }}>
                      <input
                        className="input"
                        placeholder="Time zone"
                        value={editForm.timeZone}
                        onChange={(e) => setEditForm({...editForm, timeZone: e.target.value})}
                      />
                      <input
                        className="input"
                        placeholder="Mobile number"
                        value={editForm.mobileNumber}
                        onChange={(e) => setEditForm({...editForm, mobileNumber: e.target.value})}
                      />
                      <div className="row" style={{gap: 4}}>
                        <button className="btn" onClick={() => editDelivery(s.subscriptionId, d.date)} style={{flex: 1}}>Save</button>
                        <button className="btn secondary" onClick={() => setEditingDelivery(null)} style={{flex: 1}}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      <h3 className="section-title">Past Orders</h3>
      <div className="grid">
        {past.length === 0 ? (
          <p className="muted">No past orders yet.</p>
        ) : (
          past.map((s) => (
            <div className="card" key={`past-${s.subscriptionId}`} style={{backgroundColor: "#f8fafc"}}>
              <h4>{s.planName} - #{s.subscriptionId}</h4>
              {s.deliveries && s.deliveries.map((d) => (
                <div key={`${s.subscriptionId}-past-${d.date}`} className="card" style={{ marginTop: 8 }}>
                  <p className="muted"><strong>📦 Delivered by:</strong> {d.deliveredBy || "-"}</p>
                  <p className="muted"><strong>📅 Delivered on:</strong> {d.deliveredOn || "-"}</p>
                  <p className="muted"><strong>⭐ Rating:</strong> {d.rating ? `${d.rating}/5` : "-"}</p>
                  <p className="muted"><strong>💬 Feedback:</strong> {d.feedback || "-"}</p>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      {msg && (
        <p className="toast" style={{backgroundColor: msgType === "success" ? "#d1fae5" : "#fee2e2", color: msgType === "success" ? "#065f46" : "#7f1d1d"}}>
          {msg}
        </p>
      )}
    </div>
  );
}

function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [mode, setMode] = React.useState("email"); // "email", "otp", "register"
  const [form, setForm] = React.useState({ email: "", password: "", fullName: "" });
  const [msg, setMsg] = React.useState("");
  const [msgType, setMsgType] = React.useState(""); // "success" or "error"
  const [showPassword, setShowPassword] = React.useState(false);
  const [otp, setOtp] = React.useState("");
  const [otpRequested, setOtpRequested] = React.useState(false);
  const [otpChannel, setOtpChannel] = React.useState("EMAIL");
  const [mobileNumber, setMobileNumber] = React.useState("");

  function showMessage(text, type = "error") {
    setMsg(text);
    setMsgType(type);
  }

  async function login() {
    if (!form.email || !form.password) {
      showMessage("Please enter both email and password");
      return;
    }
    try {
      const { data } = await client.post("/auth/login", form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("email", data.email);
      onLoginSuccess?.();
      showMessage("Welcome back!", "success");
      setTimeout(() => navigate("/home"), 400);
    } catch (e) {
      const errMsg = e?.response?.data?.message || "Invalid email or password. Please try again.";
      showMessage(errMsg);
    }
  }

  async function requestOtp() {
    if (!form.email) {
      showMessage("Please enter your email");
      return;
    }
    if (otpChannel === "MOBILE" && !mobileNumber) {
      showMessage("Please enter your mobile number");
      return;
    }
    try {
      const { data } = await client.post("/auth/login/otp/request", {
        email: form.email,
        channel: otpChannel,
        mobileNumber
      });

      // Check if user already exists
      if (data.existingUser && mode === "register") {
        showMessage("An account with this email already exists. Please login instead.", "error");
        setMode("email");
        return;
      }

      setOtpRequested(true);
      showMessage(`OTP sent (demo: use 123456) to ${data.destination}`, "success");
    } catch (e) {
      const errMsg = e?.response?.data?.message || "Failed to request OTP";
      showMessage(errMsg);
    }
  }

  async function verifyOtp() {
    if (!otp) {
      showMessage("Please enter the OTP");
      return;
    }
    if (mode === "register" && !form.fullName) {
      showMessage("Please enter your full name");
      return;
    }
    try {
      const { data } = await client.post("/auth/login/otp/verify", {
        email: form.email,
        otp,
        fullName: form.fullName
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("email", data.email);
      onLoginSuccess?.();
      showMessage(mode === "register" ? "Account created! Welcome!" : "Logged in successfully!", "success");
      setTimeout(() => navigate("/home"), 400);
    } catch (e) {
      const errMsg = e?.response?.data?.message || "Invalid OTP";
      showMessage(errMsg);
    }
  }

  async function forgotPassword() {
    if (!form.email) {
      showMessage("Please enter your email");
      return;
    }
    try {
      const { data } = await client.post("/auth/forgot-password", { email: form.email });
      showMessage(`Password reset OTP sent to ${data.destination}`, "success");
    } catch (e) {
      const errMsg = e?.response?.data?.message || "Could not trigger forgot password";
      showMessage(errMsg);
    }
  }

  return (
    <div className="page">
      <div className="hero-card">
        <h2 className="title">Get Fresh Home Food</h2>
        <p className="muted">Healthy subscriptions from trusted nearby kitchens.</p>
      </div>
      <div className="card">
        <div className="row" style={{ marginBottom: 16, gap: 8 }}>
          <button
            className={`btn ${mode === "email" ? "" : "secondary"}`}
            onClick={() => {
              setMode("email");
              setOtpRequested(false);
              setMsg("");
            }}
            style={{ flex: 1 }}
          >
            Login
          </button>
          <button
            className={`btn ${mode === "register" ? "" : "secondary"}`}
            onClick={() => {
              setMode("register");
              setOtpRequested(false);
              setMsg("");
              setForm({ email: "", password: "", fullName: "" });
            }}
            style={{ flex: 1 }}
          >
            Register
          </button>
        </div>

        {mode === "email" ? (
          <>
            <input
              className="input"
              placeholder="Email address"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <div className="password-wrap">
              <input
                className="input password-input"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <button className="btn full" onClick={login}>Login</button>
            <button className="link-btn" onClick={() => { setMode("otp"); setOtpRequested(false); setMsg(""); }}>
              Don't have an account? Use OTP
            </button>
            <button className="link-btn" onClick={forgotPassword}>Forgot password?</button>
          </>
        ) : (
          <>
            <input
              className="input"
              placeholder="Email address"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {!otpRequested && (
              <>
                <div className="row">
                  <select className="input" value={otpChannel} onChange={(e) => setOtpChannel(e.target.value)}>
                    <option value="EMAIL">Email OTP</option>
                    <option value="MOBILE">Mobile OTP</option>
                  </select>
                  {otpChannel === "MOBILE" && (
                    <input
                      className="input"
                      placeholder="Mobile number"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                    />
                  )}
                </div>
                <button className="btn full" onClick={requestOtp}>Send OTP</button>
              </>
            )}
            {otpRequested && (
              <>
                <input
                  className="input"
                  placeholder="Enter OTP (demo: 123456)"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Full name"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
                <button className="btn full" onClick={verifyOtp}>Create Account</button>
                <button className="link-btn" onClick={() => { setOtpRequested(false); setOtp(""); setMsg(""); }}>
                  Back to email
                </button>
              </>
            )}
          </>
        )}

        {msg && (
          <p className={`muted ${msgType === "success" ? "" : ""}`} style={{ color: msgType === "success" ? "#28a745" : "#dc3545" }}>
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}

function Home() {
  const navigate = useNavigate();
  const categories = ["Home Meals", "Fruit Bowls", "Protein Packs"];
  const offers = [
    { title: "40% OFF", sub: "On first subscription" },
    { title: "Free Delivery", sub: "Orders above Rs. 299" }
  ];
  const [search, setSearch] = React.useState("");

  function goToSellers(category = "") {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (category) params.set("category", category);
    navigate(`/sellers?${params.toString()}`);
  }

  return (
    <div className="page">
      <div className="hero-card">
        <p className="chip">Delivering to Bengaluru</p>
        <h2 className="title">What are you craving today?</h2>
        <div className="row">
          <input
            className="input search"
            placeholder="Search kitchens, meals, fruits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn" onClick={() => goToSellers()}>Search</button>
        </div>
      </div>
      <div className="horizontal-scroll">
        {categories.map((c) => (
          <button className="category-pill clickable" key={c} onClick={() => goToSellers(c)}>
            {c}
          </button>
        ))}
      </div>
      <h3 className="section-title">Offers for you</h3>
      <div className="grid">
        {offers.map((o) => (
          <div className="card offer-card" key={o.title}>
            <h4>{o.title}</h4>
            <p className="muted">{o.sub}</p>
          </div>
        ))}
      </div>
      <Link
        className="btn full"
        to={search.trim() ? `/sellers?${new URLSearchParams({ q: search.trim() }).toString()}` : "/sellers"}
      >
        Explore Nearby Sellers
      </Link>
    </div>
  );
}

function NearbySellers() {
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = React.useState([]);
  const [error, setError] = React.useState("");
  const [draftQ, setDraftQ] = React.useState("");

  const { query, category } = React.useMemo(() => {
    const p = new URLSearchParams(location.search);
    return { query: (p.get("q") || "").trim(), category: p.get("category") || "" };
  }, [location.search]);

  React.useEffect(() => {
    setDraftQ(query);
  }, [query]);

  React.useEffect(() => {
    client.get("/sellers/nearby?lat=12.9716&lon=77.5946&radiusKm=10")
      .then((r) => setItems(r.data))
      .catch(() => setError("Failed to load sellers"));
  }, []);

  const filtered = React.useMemo(
    () => items.filter((s) => sellerMatchesQuery(s, query) && sellerMatchesCategory(s, category)),
    [items, query, category]
  );

  const exploreCategories = ["Home Meals", "Fruit Bowls", "Protein Packs"];

  function applyUrl(next) {
    const p = new URLSearchParams(location.search);
    if (next.q !== undefined) {
      const v = (next.q || "").trim();
      if (v) p.set("q", v);
      else p.delete("q");
    }
    if (next.category !== undefined) {
      if (next.category) p.set("category", next.category);
      else p.delete("category");
    }
    const s = p.toString();
    navigate({ pathname: "/sellers", search: s ? `?${s}` : "" }, { replace: true });
  }

  function onSearchSubmit(e) {
    e.preventDefault();
    applyUrl({ q: draftQ });
  }

  function clearFilters() {
    navigate({ pathname: "/sellers", search: "" }, { replace: true });
    setDraftQ("");
  }

  return (
    <div className="page">
      <h2 className="title">Top rated near you</h2>
      <form className="card explore-filters" onSubmit={onSearchSubmit}>
        <p className="muted compact" style={{ marginBottom: 6 }}>Search kitchens</p>
        <div className="row">
          <input
            className="input search"
            placeholder="Name, e.g. Healthy, Bowls…"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
          />
          <button className="btn" type="submit">Search</button>
        </div>
        <p className="muted compact" style={{ margin: "10px 0 6px" }}>Category</p>
        <div className="horizontal-scroll">
          <button
            type="button"
            className={`category-pill ${!category ? "active-filter" : ""}`}
            onClick={() => applyUrl({ category: "" })}
          >
            All
          </button>
          {exploreCategories.map((c) => (
            <button
              type="button"
              key={c}
              className={`category-pill clickable ${category === c ? "active-filter" : ""}`}
              onClick={() => applyUrl({ category: c })}
            >
              {c}
            </button>
          ))}
        </div>
        {(query || category) && (
          <button type="button" className="link-btn clear-filters" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </form>
      {(query || category) && (
        <p className="muted">
          Active: {query ? `search “${query}”` : ""}{query && category ? " · " : ""}{category ? `category “${category}”` : ""}
        </p>
      )}
      {error && <p className="muted">{error}</p>}
      <div className="grid">
        {filtered.map((s, idx) => (
          <Link className="seller-card" key={s.id} to={`/seller/${s.id}`}>
            <div className={`seller-image bg-${(idx % 3) + 1}`}></div>
            <div className="seller-content">
              <h3>{s.brandName}</h3>
              <p className="muted">4.{idx + 5} ★ • {s.deliveryRadiusKm} km</p>
              <p className="tagline">Home-cooked meals, healthy bowls</p>
            </div>
          </Link>
        ))}
      </div>
      {!filtered.length && !error && <p className="muted">No sellers matched your search/filter.</p>}
    </div>
  );
}

function Profile({ onLogout }) {
  const navigate = useNavigate();
  const email = localStorage.getItem("email") || "user@test.com";
  const [rewards, setRewards] = React.useState(null);
  const [favorites, setFavorites] = React.useState([]);
  const [favInput, setFavInput] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [activeOrders, setActiveOrders] = React.useState([]);
  const [pastOrders, setPastOrders] = React.useState([]);
  const [addresses, setAddresses] = React.useState([]);
  const [referralCode, setReferralCode] = React.useState("");

  React.useEffect(() => {
    // Load profile data
    Promise.all([
      client.get("/profile/rewards", { headers: { "X-User-Id": "1" } }).then((r) => setRewards(r.data)),
      client.get("/profile/favorites", { headers: { "X-User-Id": "1" } }).then((r) => setFavorites(r.data)),
      client.get("/subscriptions/active-orders", { headers: { "X-User-Id": "1" } }).then((r) => setActiveOrders(r.data)),
      client.get("/subscriptions/past-orders", { headers: { "X-User-Id": "1" } }).then((r) => setPastOrders(r.data)),
      client.get("/profile/addresses", { headers: { "X-User-Id": "1" } }).then((r) => setAddresses(r.data)),
      client.get("/profile/referral", { headers: { "X-User-Id": "1" } }).then((r) => setReferralCode(r.data.code))
    ]).catch(() => {
      // Handle errors silently for now
    });
  }, []);

  async function addFavorite() {
    if (!favInput.trim()) return;
    await client.post("/profile/favorites", { name: favInput.trim() }, { headers: { "X-User-Id": "1" } });
    setFavorites((prev) => [...prev, favInput.trim()]);
    setFavInput("");
    setMsg("Saved to favourites for future");
  }

  async function addAddress() {
    const address = prompt("Enter new address:");
    if (address?.trim()) {
      await client.post("/profile/addresses", { address: address.trim() }, { headers: { "X-User-Id": "1" } });
      setAddresses((prev) => [...prev, address.trim()]);
      setMsg("Address added successfully");
    }
  }

  async function requestFriend() {
    const friendEmail = prompt("Enter friend's email:");
    if (friendEmail?.trim()) {
      await client.post("/profile/request-friend", { email: friendEmail.trim() }, { headers: { "X-User-Id": "1" } });
      setMsg("Friend request sent!");
    }
  }

  async function referFriend() {
    if (navigator.share) {
      navigator.share({
        title: 'Join Cloud Kitchen',
        text: `Use my referral code: ${referralCode}`,
        url: `https://cloudkitchen.com/referral/${referralCode}`
      });
    } else {
      navigator.clipboard.writeText(`Use my referral code: ${referralCode} - https://cloudkitchen.com/referral/${referralCode}`);
      setMsg("Referral code copied to clipboard!");
    }
  }

  async function contactSupport() {
    const message = prompt("How can we help you?");
    if (message?.trim()) {
      await client.post("/profile/contact", { message: message.trim() }, { headers: { "X-User-Id": "1" } });
      setMsg("Message sent to support!");
    }
  }

  async function submitFeedback() {
    const feedback = prompt("Please share your feedback:");
    if (feedback?.trim()) {
      await client.post("/profile/feedback", { feedback: feedback.trim() }, { headers: { "X-User-Id": "1" } });
      setMsg("Thank you for your feedback!");
    }
  }

  async function deactivate() {
    try {
      await client.post("/auth/deactivate", { email, otp: "123456" });
      setMsg("Account deactivated");
    } catch {
      setMsg("Deactivation failed. Request OTP first.");
    }
  }

  function logout() {
    // Clear local storage first
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    
    // Call logout API (don't wait for it)
    client.post("/auth/logout").catch(() => {});
    
    // Update parent state immediately
    onLogout?.();
    
    // Force navigation to login
    navigate("/login", { replace: true });
  }

  return (
    <div className="page">
      <div className="card">
        <h2 className="title">Profile</h2>
        <p className="muted">Signed in as</p>
        <p><strong>{email}</strong></p>
        {rewards && <p className="muted">Rewards: {rewards.points} points ({rewards.tier})</p>}
      </div>

      <div className="card">
        <h4>Active Orders</h4>
        {activeOrders.length === 0 ? (
          <p className="muted">No active orders</p>
        ) : (
          activeOrders.slice(0, 3).map((order) => (
            <div key={order.subscriptionId} className="card" style={{ marginTop: 8, padding: 12 }}>
              <p className="muted">{order.planName} - #{order.subscriptionId}</p>
              <p className="muted">Next delivery: {order.deliveries?.[0]?.date || "N/A"}</p>
            </div>
          ))
        )}
        {activeOrders.length > 3 && (
          <button className="link-btn" onClick={() => navigate("/my-subscriptions")}>
            View all active orders ({activeOrders.length})
          </button>
        )}
      </div>

      <div className="card">
        <h4>Past Orders</h4>
        {pastOrders.length === 0 ? (
          <p className="muted">No past orders</p>
        ) : (
          pastOrders.slice(0, 3).map((order) => (
            <div key={order.subscriptionId} className="card" style={{ marginTop: 8, padding: 12 }}>
              <p className="muted">{order.planName} - #{order.subscriptionId}</p>
              <p className="muted">Last delivery: {order.deliveries?.[0]?.deliveredOn || "N/A"}</p>
            </div>
          ))
        )}
        {pastOrders.length > 3 && (
          <button className="link-btn" onClick={() => navigate("/my-subscriptions")}>
            View all past orders ({pastOrders.length})
          </button>
        )}
      </div>

      <div className="card">
        <h4>Favourites</h4>
        <div className="row">
          <input className="input" value={favInput} onChange={(e) => setFavInput(e.target.value)} placeholder="Save item for future" />
          <button className="btn" onClick={addFavorite}>Save</button>
        </div>
        {favorites.map((f) => <p key={f} className="muted">{f}</p>)}
      </div>

      <div className="card">
        <h4>Addresses</h4>
        {addresses.map((addr, idx) => (
          <p key={idx} className="muted">{addr}</p>
        ))}
        <button className="btn secondary full" onClick={addAddress}>Add New Address</button>
      </div>

      <div className="card">
        <h4>Refer a Friend</h4>
        <p className="muted">Share your referral code: <strong>{referralCode}</strong></p>
        <button className="btn full" onClick={referFriend}>Share Referral Code</button>
      </div>

      <div className="card">
        <h4>Support & Help</h4>
        <button className="btn secondary full" onClick={requestFriend} style={{ marginBottom: 8 }}>Request Friend</button>
        <button className="btn secondary full" onClick={contactSupport} style={{ marginBottom: 8 }}>Contact Support</button>
        <button className="btn secondary full" onClick={submitFeedback}>Help & Feedback</button>
      </div>

      <div className="card">
        <button className="btn secondary full" onClick={deactivate} style={{ marginBottom: 8 }}>Deactivate Account</button>
        <button className="btn secondary full" onClick={logout}>Logout</button>
      </div>

      {msg && <p className="toast">{msg}</p>}
    </div>
  );
}

function Page({ title, desc }) {
  return <div className="page card"><h2 className="title">{title}</h2><p className="muted">{desc || "Screen scaffold is ready."}</p></div>;
}

function AppShell() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(() => !!localStorage.getItem("token"));

  React.useEffect(() => {
    function syncAuth() {
      setIsLoggedIn(!!localStorage.getItem("token"));
    }
    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  return (
    <div className="app-bg">
      <div className="phone-shell">
        <div className="topbar">
          <div>
            <p className="muted compact">Current location</p>
            <div className="brand">Indiranagar, Bengaluru</div>
          </div>
          <div className="avatar">Y</div>
        </div>
        <div className="content">
          <Routes>
            <Route path="/" element={<Navigate to={isLoggedIn ? "/home" : "/login"} replace />} />
            <Route path="/login" element={<Login onLoginSuccess={() => setIsLoggedIn(true)} />} />
            <Route path="/location" element={isLoggedIn ? <Page title="Location Selection" /> : <Navigate to="/login" replace />} />
            <Route path="/home" element={isLoggedIn ? <Home /> : <Navigate to="/login" replace />} />
            <Route path="/sellers" element={isLoggedIn ? <NearbySellers /> : <Navigate to="/login" replace />} />
            <Route path="/seller/:id" element={isLoggedIn ? <SellerDetail /> : <Navigate to="/login" replace />} />
            <Route path="/subscription" element={isLoggedIn ? <Page title="Subscription Screen" /> : <Navigate to="/login" replace />} />
            <Route path="/payments" element={isLoggedIn ? <Page title="Payment Screen" /> : <Navigate to="/login" replace />} />
            <Route path="/my-subscriptions" element={isLoggedIn ? <MySubscriptions /> : <Navigate to="/login" replace />} />
            <Route path="/calendar" element={isLoggedIn ? <Page title="Delivery Calendar" /> : <Navigate to="/login" replace />} />
            <Route path="/profile" element={isLoggedIn ? <Profile onLogout={() => setIsLoggedIn(false)} /> : <Navigate to="/login" replace />} />
            <Route path="/seller/dashboard" element={isLoggedIn ? <Page title="Seller Dashboard" desc="Manage menu, deliveries and earnings." /> : <Navigate to="/login" replace />} />
            <Route path="/seller/menu" element={isLoggedIn ? <Page title="Menu Management" /> : <Navigate to="/login" replace />} />
            <Route path="/seller/plans" element={isLoggedIn ? <Page title="Subscription Plans" /> : <Navigate to="/login" replace />} />
            <Route path="/seller/deliveries" element={isLoggedIn ? <Page title="Orders / Deliveries" /> : <Navigate to="/login" replace />} />
            <Route path="/seller/earnings" element={isLoggedIn ? <Page title="Earnings" /> : <Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to={isLoggedIn ? "/home" : "/login"} replace />} />
          </Routes>
        </div>
        {isLoggedIn && (
          <div className="bottom-nav">
            <NavLink to="/home" className={({ isActive }) => isActive ? "tab active" : "tab"}>Home</NavLink>
            <NavLink to="/sellers" className={({ isActive }) => isActive ? "tab active" : "tab"}>Explore</NavLink>
            <NavLink to="/my-subscriptions" className={({ isActive }) => isActive ? "tab active" : "tab"}>Plans</NavLink>
            <NavLink to="/profile" className={({ isActive }) => isActive ? "tab active" : "tab"}>Profile</NavLink>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
