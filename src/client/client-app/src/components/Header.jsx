import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import "./Header.css";
const API = process.env.REACT_APP_API_BASE || "http://localhost:3000";

// Base URL for the API. For now we rely on the browser's current origin.
// If you host the backend elsewhere, update this value or wire it from config.
export default function Header({ onSearch }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [userImage, setUserImage] = useState(null);
  const auth = useAuth();

  const btnRef = useRef(null);
  const menuRef = useRef(null);
  
  // Function to fetch user image
  const fetchUserImage = async () => {
    if (!auth?.userId) return;

    try {
      const res = await fetch(`${API}/api/users/${auth.userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) {
          setUserImage(data.imageUrl);
        } else {
          setUserImage(null);
        }
      }
    } catch (err) {
      // ignore fetch errors
    }
  };
  
  // Fetch user profile image on mount or when userId changes
  useEffect(() => {
    fetchUserImage();
  }, [auth?.userId]);
  
  // Refetch image when navigating away from settings (in case it was updated)
  useEffect(() => {
    if (location.pathname !== '/settings') {
      fetchUserImage();
    }
  }, [location.pathname]);

  useEffect(() => {
    function document_MouseDown(e) {
      if (!menuOpen) return;

      const btn = btnRef.current;
      const menu = menuRef.current;

      if (btn && btn.contains(e.target)) return;
      if (menu && menu.contains(e.target)) return;

      setMenuOpen(false);
    }

    document.addEventListener("mousedown", document_MouseDown);
    return () => document.removeEventListener("mousedown", document_MouseDown);
  }, [menuOpen]);

  // ---------- Event functions ----------
  function profile_Clicked() {
    setMenuOpen((v) => !v);
  }

  function settings_Clicked() {
    setMenuOpen(false);
    navigate("/settings");
  }

  function logout_Clicked() {
    setMenuOpen(false);
    auth.logout();
    navigate("/login", { replace: true });
  }

  function search_Changed(e) {
    setSearchText(e.target.value);
  }

function search_Clicked() {
  console.log("Search:", searchText);
  onSearch?.(searchText);
}

  // -------------------------------

  return (
    <header className="appHeader">
      <div className="appHeaderCenter">
        <div className="searchBox">
          <input
            className="searchInput"
            type="text"
            placeholder="Search..."
            value={searchText}
            onChange={search_Changed}
          />
          <button className="searchBtn" type="button" aria-label="Search" onClick={search_Clicked}>
            🔍
          </button>
        </div>
      </div>

      <div className="appHeaderRight">
        <button
          ref={btnRef}
          type="button"
          onClick={profile_Clicked}
          aria-label="Open profile menu"
          className="profileBtn"
        >
          {userImage ? (
            <img src={userImage} alt="Profile" className="profileImg" />
          ) : (
            <div className="profileImgPlaceholder">?</div>
          )}
        </button>

        {menuOpen && (
          <div ref={menuRef} className="profileMenu" role="menu">
            <div className="profileMenuTop">
              {userImage ? (
                <img src={userImage} alt="Profile" className="profileMenuImg" />
              ) : (
                <div className="profileMenuImgPlaceholder">?</div>
              )}
              {auth?.userId && (
                <div className="profileMenuUserId">User-ID: {auth.userId}</div>
              )}
            </div>
            <div className="profileMenuDivider" />
            <button
              type="button"
              className="profileMenuItem"
              onClick={settings_Clicked}
              role="menuitem"
            >
              Settings
            </button>
            <div className="profileMenuDivider" />
            <button
              type="button"
              className="profileMenuItem profileMenuItemLogout"
              onClick={logout_Clicked}
              role="menuitem"
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
