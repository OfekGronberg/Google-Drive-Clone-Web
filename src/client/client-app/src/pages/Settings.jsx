import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import "./Settings.css";
const API = process.env.REACT_APP_API_BASE || "http://localhost:3000";

export default function SettingsPage() {
  const auth = useAuth();
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    imageUrl: "",
    theme: "light",
  });
  const [showPassword, setShowPassword] = useState(false);

  // Fetch current user data on mount
  async function fetchUser(id) {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/users/${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }
      const userData = await response.json();
      console.log("[fetchUser] Received user data:", userData);
      setUser(userData);
      setFormData({
        username: userData.username || "",
        password: "",
        imageUrl: userData.imageUrl || "",
        theme: userData.theme || "light",
      });
      applyTheme(userData.theme || "light");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const storedUserId = auth?.userId || localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
      fetchUser(storedUserId);
    }
  }, [auth?.userId]);

  

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const toggleShowPassword = () => setShowPassword(s => !s);

  const handleThemeChange = (newTheme) => {
    const prevTheme = formData.theme;
    setFormData(prev => ({ ...prev, theme: newTheme }));
    // Apply theme immediately in UI
    applyTheme(newTheme);
    setSuccess(null);

    // Auto-save theme to server
    (async () => {
      try {
        const id = userId;
        if (!id) return;
        const token = auth?.token || localStorage.getItem("token");
        const res = await fetch(`${API}/api/users/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ theme: newTheme }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || "Failed to save theme");
          // revert UI on failure
          applyTheme(prevTheme);
          setFormData(prev => ({ ...prev, theme: prevTheme }));
        } else {
          const updated = await res.json();
          setUser(updated);
          setSuccess("Theme saved");
        }
      } catch (e) {
        setError("Failed to save theme");
        applyTheme(prevTheme);
        setFormData(prev => ({ ...prev, theme: prevTheme }));
      }
    })();
  };

  const applyTheme = (theme) => {
    const root = document.documentElement;

    // remove all theme classes
    root.classList.remove("theme-light", "theme-dark", "theme-bball");
    root.classList.remove("dark-mode");

    // add selected theme
    if (theme === "dark") root.classList.add("theme-dark");
    else if (theme === "bball") root.classList.add("theme-bball");
    else root.classList.add("theme-light");

    // legacy selector compatibility: some styles use `.dark-mode`
    if (theme === "dark") root.classList.add("dark-mode");

    localStorage.setItem("theme", theme);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      setError("User ID not found");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Build patch object (only include changed fields)
      const patch = {};
      if (formData.username && formData.username !== user.username) {
        patch.username = formData.username;
      }
      if (formData.password) {
        patch.password = formData.password;
      }
      if (formData.imageUrl !== (user.imageUrl || "")) {
        patch.imageUrl = formData.imageUrl;
      }
      if (formData.theme !== user.theme) {
        patch.theme = formData.theme;
      }

      console.log("[handleSubmit] User object:", user);
      console.log("[handleSubmit] FormData:", formData);
      console.log("[handleSubmit] Patch to send:", patch);

      if (Object.keys(patch).length === 0) {
        setError("No changes to save");
        return;
      }

          const token = auth?.token || localStorage.getItem("token");
          const response = await fetch(`${API}/api/users/${userId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(patch),
          });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user");
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setSuccess("Profile updated successfully!");
      
      // Clear password field after successful update
      setFormData(prev => ({ ...prev, password: "" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return <div className="settings-container"><p>Loading...</p></div>;
  }

  return (
    <div className="settings-container">
      <h1>Settings</h1>
      
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="settings-form">
        {/* Username */}
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            placeholder="Enter new username"
          />
          <small>Leave blank to keep current username</small>
        </div>

        {/* Password */}
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-wrapper">
            <input
              className="password-input"
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter new password"
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={toggleShowPassword}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          <small>Leave blank to keep current password</small>
        </div>

        {/* Logo/Image URL */}
        <div className="form-group">
          <label htmlFor="imageUrl">Logo / Image URL</label>
          <input
            type="text"
            id="imageUrl"
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleInputChange}
            placeholder="https://example.com/image.png"
          />
          {formData.imageUrl && (
            <div className="image-preview">
              <img src={formData.imageUrl} alt="Logo preview" />
            </div>
          )}
        </div>

        {/* Theme */}
        <div className="form-group">
          <label>Theme</label>
          <div className="theme-options">
            <button
              type="button"
              className={`theme-btn ${formData.theme === "light" ? "active" : ""}`}
              onClick={() => handleThemeChange("light")}
            >
              ☀️ Light Mode
            </button>
            <button
              type="button"
              className={`theme-btn ${formData.theme === "dark" ? "active" : ""}`}
              onClick={() => handleThemeChange("dark")}
            >
              🌙 Dark Mode
            </button>
            <button
              type="button"
              className={`theme-btn ${formData.theme === "bball" ? "active" : ""}`}
              onClick={() => handleThemeChange("bball")}
            >
              🏀 Bball Mode Special
            </button>
          </div>
        </div>

        {/* Submit */}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
