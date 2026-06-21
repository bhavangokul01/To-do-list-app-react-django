import { useState, useEffect, createContext, useContext, useMemo } from "react";

const themes = {
  dark: {
    bg: "#0B0D10",
    bgSubtle: "#0F1216",
    surface: "#15181C",
    surfaceRaised: "#1A1E23",
    border: "#262B31",
    borderStrong: "#343A42",
    text: "#E8EAED",
    textMuted: "#8B9199",
    textFaint: "#5B6168",
    accent: "#F2B33D",
    accentText: "#1A1404",
    success: "#5FA88A",
    danger: "#E2725B",
    dangerBg: "#2A1714",
    shadow: "0 8px 30px rgba(0,0,0,0.45)",
    shadowSoft: "0 2px 10px rgba(0,0,0,0.3)",
  },
  light: {
    bg: "#FAF9F6",
    bgSubtle: "#F2F0EA",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    border: "#E5E2D9",
    borderStrong: "#D3CFC2",
    text: "#1C1A15",
    textMuted: "#6B6759",
    textFaint: "#9D9885",
    accent: "#B9791F",
    accentText: "#FFFBF0",
    success: "#3E7A60",
    danger: "#B5483A",
    dangerBg: "#FBEEEA",
    shadow: "0 8px 30px rgba(28,26,21,0.08)",
    shadowSoft: "0 2px 10px rgba(28,26,21,0.05)",
  },
};

const fonts = {
  display: "'Inter', -apple-system, sans-serif",
  body: "'Inter', -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
};

const radii = {
  sm: "6px",
  md: "10px",
  lg: "16px",
  pill: "999px",
};

/*API CLIENT*/

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// The csrftoken cookie is set on the BACKEND's domain (onrender.com), not the
// frontend's (vercel.app) — cross-origin pages can't read each other's cookies
// via document.cookie. So instead of reading the cookie, we grab the token
// straight from the JSON body that /csrf/ returns, and keep it in memory here.
let csrfToken = null;

// GET/HEAD/OPTIONS are CSRF-safe by definition; only mutating verbs need the token.
const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const fetchJSON = (url, opts = {}) => {
  const method = (opts.method || "GET").toUpperCase();
  const headers = {
    "Content-Type": "application/json",
    ...opts.headers,
  };

  if (!CSRF_SAFE_METHODS.has(method) && csrfToken) {
    headers["X-CSRFToken"] = csrfToken;
  }

  return fetch(url, {
    credentials: "include",
    ...opts,
    headers,
  });
};

// DRF returns errors as { field: ["msg1", "msg2"], other_field: [...] }.
// I flattened that into one readable string for display.
const parseApiError = async (res, fallback) => {
  try {
    const data = await res.json();
    if (typeof data.error === "string") return data.error;
    if (Array.isArray(data.error)) return data.error.join(" ");
    const messages = Object.values(data).flat().filter(Boolean);
    return messages.length ? messages.join(" ") : fallback;
  } catch {
    return fallback;
  }
};

const api = {
  // Fetches a fresh CSRF token and stores it in memory. Call this once on
  // app load, before any POST/PUT/DELETE (including login) — otherwise
  // there's no token yet to send.
  primeCsrf: () =>
    fetchJSON(`${API_BASE}/csrf/`)
      .then((r) => r.json())
      .then((data) => {
        csrfToken = data.csrfToken;
      }),

  me: () => fetchJSON(`${API_BASE}/me/`).then((r) => r.json()),

  login: (username, password) =>
    fetchJSON(`${API_BASE}/login/`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }).then(async (res) => {
      // Logging in changes the session, which can rotate the CSRF token.
      // Refresh our in-memory copy so it matches the new cookie.
      if (res.ok) {
        try {
          const r = await fetchJSON(`${API_BASE}/csrf/`);
          const data = await r.json();
          csrfToken = data.csrfToken;
        } catch {
          // non-fatal — worst case the next mutating request 403s and
          // surfaces a normal error message
        }
      }
      return res;
    }),

  register: (username, password) =>
    fetchJSON(`${API_BASE}/register/`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  logout: () => fetchJSON(`${API_BASE}/logout/`, { method: "POST" }),

  listTasks: () => fetchJSON(`${API_BASE}/tasks/`),

  createTask: (task) =>
    fetchJSON(`${API_BASE}/tasks/`, {
      method: "POST",
      body: JSON.stringify(task),
    }),

  updateTask: (id, task) =>
    fetchJSON(`${API_BASE}/taskops/${id}/`, {
      method: "PUT",
      body: JSON.stringify(task),
    }),

  deleteTask: (id) =>
    fetchJSON(`${API_BASE}/taskops/${id}/`, { method: "DELETE" }),
};

/* THEME CONTEXT (dark mode) */

const ThemeContext = createContext(null);

function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "dark";
  });

  useEffect(() => {
    document.body.style.background = themes[mode].bg;
    document.body.style.transition = "background 0.2s ease";
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")),
      colors: themes[mode],
    }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/* ICONS*/

function CheckIcon({ done, color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle
        cx="8"
        cy="8"
        r="7"
        stroke={done ? color.accent : color.borderStrong}
        strokeWidth="1.5"
        fill={done ? color.accent : "transparent"}
      />
      {done && (
        <polyline
          points="4.5,8 7,10.5 11.5,5.5"
          stroke={color.accentText}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
    </svg>
  );
}

function SunIcon({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3.2" stroke={color} strokeWidth="1.4" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="8"
          y1="1.6"
          x2="8"
          y2="3"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          transform={`rotate(${deg} 8 8)`}
        />
      ))}
    </svg>
  );
}

function MoonIcon({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M13.5 9.8A5.8 5.8 0 0 1 6.2 2.5a5.8 5.8 0 1 0 7.3 7.3z"
        fill={color}
      />
    </svg>
  );
}

function EditIcon({ color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M9.5 1.5L12.5 4.5L4.5 12.5H1.5V9.5L9.5 1.5Z"
        stroke={color}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon({ color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M2.5 3.5H11.5M5 3.5V2C5 1.7 5.2 1.5 5.5 1.5H8.5C8.8 1.5 9 1.7 9 2V3.5M5.8 6V10.5M8.2 6V10.5M3.3 3.5L3.8 12C3.8 12.3 4 12.5 4.3 12.5H9.7C10 12.5 10.2 12.3 10.2 12L10.7 3.5"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/*SHARED UI PRIMITIVES */

function ThemeToggle() {
  const { mode, toggle, colors } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      style={{
        width: "34px",
        height: "34px",
        borderRadius: "50%",
        border: `1px solid ${colors.border}`,
        background: colors.surface,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "border-color 0.15s",
      }}
    >
      {mode === "dark" ? (
        <SunIcon color={colors.textMuted} />
      ) : (
        <MoonIcon color={colors.textMuted} />
      )}
    </button>
  );
}

function Field({ as = "input", ...props }) {
  const { colors } = useTheme();
  const Tag = as;
  return (
    <Tag
      {...props}
      style={{
        width: "100%",
        padding: "11px 14px",
        border: `1.5px solid ${colors.border}`,
        borderRadius: radii.md,
        fontSize: "14px",
        outline: "none",
        boxSizing: "border-box",
        fontFamily: fonts.body,
        color: colors.text,
        background: colors.bgSubtle,
        resize: as === "textarea" ? "vertical" : undefined,
        ...props.style,
      }}
    />
  );
}

function ErrorBanner({ children, style }) {
  const { colors } = useTheme();
  if (!children) return null;
  return (
    <div
      style={{
        padding: "10px 14px",
        background: colors.dangerBg,
        border: `1px solid ${colors.danger}33`,
        borderRadius: radii.sm,
        color: colors.danger,
        fontSize: "13px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SuccessBanner({ children, style }) {
  const { colors } = useTheme();
  if (!children) return null;
  return (
    <div
      style={{
        padding: "10px 14px",
        background: `${colors.success}1A`,
        border: `1px solid ${colors.success}55`,
        borderRadius: radii.sm,
        color: colors.success,
        fontSize: "13px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Button({ children, variant = "primary", disabled, style, ...props }) {
  const { colors } = useTheme();

  const variants = {
    primary: {
      background: disabled ? colors.border : colors.accent,
      color: disabled ? colors.textFaint : colors.accentText,
      border: "none",
    },
    ghost: {
      background: "none",
      color: colors.textMuted,
      border: `1px solid ${colors.border}`,
    },
    danger: {
      background: "none",
      color: colors.danger,
      border: `1px solid ${colors.border}`,
    },
  };

  return (
    <button
      disabled={disabled}
      {...props}
      style={{
        padding: "11px 18px",
        borderRadius: radii.md,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: "14px",
        fontWeight: 500,
        fontFamily: fonts.body,
        transition: "opacity 0.15s",
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/*AUTH SHELL + PAGES */

function AuthCard({ children, title, subtitle }) {
  const { colors } = useTheme();
  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: fonts.body,
        padding: "16px",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: "20px", right: "20px" }}>
        <ThemeToggle />
      </div>
      <div
        style={{
          background: colors.surface,
          borderRadius: radii.lg,
          padding: "40px 36px",
          width: "100%",
          maxWidth: "380px",
          boxShadow: colors.shadow,
          border: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "20px",
            }}
          >
            <span
              style={{
                fontFamily: fonts.mono,
                fontSize: "13px",
                fontWeight: 600,
                color: colors.accent,
                letterSpacing: "0.04em",
              }}
            >
              TASKZERO
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: 600,
              color: colors.text,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: "14px",
              color: colors.textMuted,
            }}
          >
            {subtitle}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoginPage({ onLogin, onRegister }) {
  const { colors } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.login(username, password);
      if (res.ok) {
        const data = await res.json();
        onLogin(data.username);
      } else {
        setError(await parseApiError(res, "Login failed."));
      }
    } catch {
      setError("Could not reach server. Is it running?");
    }
    setLoading(false);
  };

  const isReady = username.trim() && password.trim();

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your tasks">
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Field
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
        <Field
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        <ErrorBanner>{error}</ErrorBanner>

        <Button
          onClick={handleLogin}
          disabled={loading || !isReady}
          style={{ marginTop: "4px" }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>

        <p
          style={{
            textAlign: "center",
            fontSize: "13px",
            color: colors.textMuted,
            margin: "4px 0 0",
          }}
        >
          Don't have an account?{" "}
          <span
            onClick={onRegister}
            style={{
              color: colors.accent,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Create one
          </span>
        </p>
      </div>
    </AuthCard>
  );
}

function RegisterPage({ onSwitch, onLogin }) {
  const { colors } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.register(username, password);
      if (res.ok) {
        const loginRes = await api.login(username, password);
        if (loginRes.ok) {
          const loginData = await loginRes.json();
          onLogin(loginData.username);
        } else {
          setSuccess("Account created. Please sign in.");
          setTimeout(() => onSwitch(), 1500);
        }
      } else {
        setError(await parseApiError(res, "Registration failed."));
      }
    } catch {
      setError("Could not reach server. Is it running?");
    }
    setLoading(false);
  };

  const isReady = username.trim() && password.trim();

  return (
    <AuthCard title="Create account" subtitle="Start managing your tasks">
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Field
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRegister()}
        />
        <Field
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRegister()}
        />

        <ErrorBanner>{error}</ErrorBanner>
        <SuccessBanner>{success}</SuccessBanner>

        <Button
          onClick={handleRegister}
          disabled={loading || !isReady}
          style={{ marginTop: "4px" }}
        >
          {loading ? "Creating account…" : "Create account"}
        </Button>

        <p
          style={{
            textAlign: "center",
            fontSize: "13px",
            color: colors.textMuted,
            margin: "4px 0 0",
          }}
        >
          Already have an account?{" "}
          <span
            onClick={onSwitch}
            style={{
              color: colors.accent,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Sign in
          </span>
        </p>
      </div>
    </AuthCard>
  );
}

/* TASK CARD + MODAL*/

function TaskCard({ task, onToggle, onDelete, onEdit }) {
  const { colors } = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
        padding: "16px 4px",
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <button
        onClick={() => onToggle(task)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "2px 0",
          flexShrink: 0,
          marginTop: "2px",
        }}
      >
        <CheckIcon done={task.completed} color={colors} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: "15px",
            fontWeight: 500,
            color: task.completed ? colors.textFaint : colors.text,
            textDecoration: task.completed ? "line-through" : "none",
            fontFamily: fonts.body,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {task.title}
        </p>
        {task.description && (
          <p
            style={{
              margin: "3px 0 0",
              fontSize: "13px",
              color: task.completed ? colors.textFaint : colors.textMuted,
              lineHeight: 1.5,
            }}
          >
            {task.description}
          </p>
        )}
      </div>
      <div
        style={{
          display: "flex",
          gap: "4px",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.15s",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => onEdit(task)}
          style={{
            background: "none",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            padding: "6px",
          }}
        >
          <EditIcon color={colors.textMuted} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          style={{
            background: "none",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            padding: "6px",
          }}
        >
          <TrashIcon color={colors.danger} />
        </button>
      </div>
    </div>
  );
}

function Modal({ task, onClose, onSave, error }) {
  const { colors } = useTheme();
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title: title.trim(), description: description.trim() });
    setSaving(false);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.surfaceRaised,
          borderRadius: radii.lg,
          padding: "28px",
          width: "100%",
          maxWidth: "420px",
          boxShadow: colors.shadow,
          border: `1px solid ${colors.border}`,
        }}
      >
        <h3
          style={{
            margin: "0 0 20px",
            fontFamily: fonts.display,
            fontWeight: 600,
            fontSize: "18px",
            color: colors.text,
          }}
        >
          {task ? "Edit task" : "New task"}
        </h3>
        <Field
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          style={{ marginBottom: "12px" }}
        />
        <Field
          as="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={3}
          style={{ marginBottom: "16px" }}
        />

        {error && (
          <ErrorBanner style={{ marginBottom: "16px" }}>{error}</ErrorBanner>
        )}

        <div
          style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}
        >
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || saving}>
            {saving ? "Saving…" : task ? "Save changes" : "Add task"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/*COUNTDOWN SIGNATURE*/

function CountSignature({ remaining, total }) {
  const { colors } = useTheme();
  const allDone = remaining === 0 && total > 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "10px",
        fontFamily: fonts.mono,
      }}
    >
      <span
        style={{
          fontSize: "44px",
          fontWeight: 600,
          color: allDone ? colors.success : colors.accent,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          transition: "color 0.3s",
        }}
      >
        {String(remaining).padStart(2, "0")}
      </span>
      <span
        style={{
          fontSize: "13px",
          color: colors.textMuted,
          letterSpacing: "0.02em",
        }}
      >
        {allDone
          ? "→ Zero.Well done."
          : total === 0
            ? "Add your first task"
            : "left to zero"}
      </span>
    </div>
  );
}

/*MAIN APP (logged-in task view) */

function TaskApp() {
  const { colors } = useTheme();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");

  // Prime the csrftoken cookie as early as possible — must happen before
  // the first mutating request (login/register), or that request will 403.
  useEffect(() => {
    api.primeCsrf().catch(() => {});
  }, []);

  useEffect(() => {
    api
      .me()
      .then((d) => {
        if (d.username) setUser(d.username);
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api
      .listTasks()
      .then((r) => r.json())
      .then((data) => {
        setTasks(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load tasks.");
        setLoading(false);
      });
  }, [user]);

  const handleLogin = (username) => setUser(username);

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setTasks([]);
    setFilter("all");
  };

  const addTask = async ({ title, description }) => {
    setModalError("");
    try {
      const res = await api.createTask({
        title,
        description,
        completed: false,
      });
      if (res.ok) {
        const t = await res.json();
        setTasks((prev) => [t, ...prev]);
        setModal(false);
      } else {
        setModalError(await parseApiError(res, "Could not add task."));
      }
    } catch {
      setModalError("Could not reach server.");
    }
  };

  const updateTask = async ({ title, description }) => {
    setModalError("");
    try {
      const res = await api.updateTask(editTask.id, {
        title,
        description,
        completed: editTask.completed,
      });
      if (res.ok) {
        const t = await res.json();
        setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)));
        setEditTask(null);
      } else {
        setModalError(await parseApiError(res, "Could not save changes."));
      }
    } catch {
      setModalError("Could not reach server.");
    }
  };

  const toggleTask = async (task) => {
    try {
      const res = await api.updateTask(task.id, {
        ...task,
        completed: !task.completed,
      });
      if (res.ok) {
        const t = await res.json();
        setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)));
      } else {
        setError("Could not update task. Try again.");
      }
    } catch {
      setError("Could not reach server.");
    }
  };

  const deleteTask = async (id) => {
    try {
      const res = await api.deleteTask(id);
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      } else {
        setError("Could not delete task. Try again.");
      }
    } catch {
      setError("Could not reach server.");
    }
  };

  const filtered = tasks.filter((t) =>
    filter === "all" ? true : filter === "active" ? !t.completed : t.completed,
  );
  const counts = {
    all: tasks.length,
    active: tasks.filter((t) => !t.completed).length,
    done: tasks.filter((t) => t.completed).length,
  };

  if (!authChecked) return null;

  if (!user) {
    return showRegister ? (
      <RegisterPage
        onSwitch={() => setShowRegister(false)}
        onLogin={handleLogin}
      />
    ) : (
      <LoginPage
        onLogin={handleLogin}
        onRegister={() => setShowRegister(true)}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        fontFamily: fonts.body,
        padding: "40px 16px 80px",
      }}
    >
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: "12px",
              fontWeight: 600,
              color: colors.accent,
              letterSpacing: "0.06em",
            }}
          >
            TASKZERO
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ThemeToggle />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.pill,
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: colors.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  color: colors.accentText,
                  fontWeight: 700,
                }}
              >
                {user[0].toUpperCase()}
              </div>
              <span
                style={{
                  fontSize: "13px",
                  color: colors.textMuted,
                  fontWeight: 500,
                }}
              >
                {user}
              </span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: "7px 13px",
                background: "none",
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                cursor: "pointer",
                fontSize: "13px",
                color: colors.textMuted,
                fontFamily: fonts.body,
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "28px",
            paddingBottom: "20px",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <CountSignature remaining={counts.active} total={counts.all} />
          <button
            onClick={() => {
              setModalError("");
              setModal(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 18px",
              background: colors.accent,
              color: colors.accentText,
              border: "none",
              borderRadius: radii.md,
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500,
              fontFamily: fonts.body,
            }}
          >
            <span style={{ fontSize: "16px", lineHeight: 1 }}>+</span> New task
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "20px",
            marginBottom: "20px",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          {["all", "active", "done"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "0 0 10px",
                border: "none",
                borderBottom:
                  filter === f
                    ? `2px solid ${colors.accent}`
                    : "2px solid transparent",
                background: "transparent",
                color: filter === f ? colors.text : colors.textMuted,
                fontWeight: filter === f ? 600 : 400,
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: fonts.body,
                marginBottom: "-1px",
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span
                style={{
                  marginLeft: "6px",
                  fontFamily: fonts.mono,
                  fontSize: "11px",
                  color: filter === f ? colors.accent : colors.textFaint,
                }}
              >
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: colors.textFaint,
              fontSize: "14px",
            }}
          >
            Loading tasks…
          </div>
        )}

        <ErrorBanner style={{ marginBottom: "16px" }}>{error}</ErrorBanner>

        {!loading && filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "56px 20px",
              color: colors.textFaint,
              fontSize: "14px",
            }}
          >
            {filter === "all"
              ? "No tasks yet. Add one."
              : filter === "active"
                ? "Nothing left. That's the idea."
                : "Nothing completed yet."}
          </div>
        )}

        <div>
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onEdit={(t) => {
                setModalError("");
                setEditTask(t);
              }}
            />
          ))}
        </div>
      </div>

      {modal && (
        <Modal
          onClose={() => {
            setModal(false);
            setModalError("");
          }}
          onSave={addTask}
          error={modalError}
        />
      )}
      {editTask && (
        <Modal
          task={editTask}
          onClose={() => {
            setEditTask(null);
            setModalError("");
          }}
          onSave={updateTask}
          error={modalError}
        />
      )}
    </div>
  );
}

/*ROOT EXPORT */

export default function App() {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap"
        rel="stylesheet"
      />
      <ThemeProvider>
        <TaskApp />
      </ThemeProvider>
    </>
  );
}
