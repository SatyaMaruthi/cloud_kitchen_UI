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
            <button className="btn full" onClick={() => subscribe(p.id)}>Subscribe</button>
          </div>
        ))}
      </div>
      {msg && <p className="toast">{msg}</p>}
    </div>
  );
}

function MySubscriptions() {
  const [subs, setSubs] = React.useState([]);
  React.useEffect(() => {
    client.get("/subscriptions", { headers: { "X-User-Id": "1" } }).then((r) => setSubs(r.data));
  }, []);

  return (
    <div className="page">
      <h2 className="title">My Subscriptions</h2>
      <div className="grid">
        {subs.map((s) => (
          <div className="card" key={s.subscriptionId}>
            <h4>Subscription #{s.subscriptionId}</h4>
            <p className="status">{s.status}</p>
            <p className="muted">Deliveries: {s.deliveries.length}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = React.useState({ email: "user@test.com", password: "pass123" });
  const [msg, setMsg] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  async function login() {
    try {
      const { data } = await client.post("/auth/login", form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("email", data.email);
      setMsg("Welcome back!");
      setTimeout(() => navigate("/home"), 400);
    } catch {
      setMsg("Invalid credentials");
    }
  }

  return (
    <div className="page">
      <div className="hero-card">
        <h2 className="title">Get Fresh Home Food</h2>
        <p className="muted">Healthy subscriptions from trusted nearby kitchens.</p>
      </div>
      <div className="card">
        <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <div className="password-wrap">
          <input
            className="input password-input"
            type={showPassword ? "text" : "password"}
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
        <button className="btn full" onClick={login}>Continue</button>
        <p className="muted">{msg}</p>
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

function Profile() {
  const navigate = useNavigate();
  const email = localStorage.getItem("email") || "user@test.com";

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    navigate("/login");
  }

  return (
    <div className="page">
      <div className="card">
        <h2 className="title">Profile</h2>
        <p className="muted">Signed in as</p>
        <p><strong>{email}</strong></p>
        <button className="btn secondary full" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}

function Page({ title, desc }) {
  return <div className="page card"><h2 className="title">{title}</h2><p className="muted">{desc || "Screen scaffold is ready."}</p></div>;
}

function AppShell() {
  const isLoggedIn = !!localStorage.getItem("token");

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
            <Route path="/login" element={<Login />} />
            <Route path="/location" element={isLoggedIn ? <Page title="Location Selection" /> : <Navigate to="/login" replace />} />
            <Route path="/home" element={isLoggedIn ? <Home /> : <Navigate to="/login" replace />} />
            <Route path="/sellers" element={isLoggedIn ? <NearbySellers /> : <Navigate to="/login" replace />} />
            <Route path="/seller/:id" element={isLoggedIn ? <SellerDetail /> : <Navigate to="/login" replace />} />
            <Route path="/subscription" element={isLoggedIn ? <Page title="Subscription Screen" /> : <Navigate to="/login" replace />} />
            <Route path="/payments" element={isLoggedIn ? <Page title="Payment Screen" /> : <Navigate to="/login" replace />} />
            <Route path="/my-subscriptions" element={isLoggedIn ? <MySubscriptions /> : <Navigate to="/login" replace />} />
            <Route path="/calendar" element={isLoggedIn ? <Page title="Delivery Calendar" /> : <Navigate to="/login" replace />} />
            <Route path="/profile" element={isLoggedIn ? <Profile /> : <Navigate to="/login" replace />} />
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
