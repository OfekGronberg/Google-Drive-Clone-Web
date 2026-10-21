import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "./Navbar.css";

function Item({ icon, label, active, onPress, disabled = false }) {
  return (
    <button
      type="button"
      className={"nav-item" + (active ? " nav-item-active" : "")}
      onClick={disabled ? undefined : onPress}
      disabled={disabled}
      style={disabled ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
    </button>
  );
}

export default function Navbar({ view, setView }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const auth = useAuth();

  const isFiles = pathname === "/files" || pathname.startsWith("/files/");

  // ---------- Event functions ----------
  function myDrive_Clicked() {
    navigate("/files");
  }

  function shared_Clicked() {
    navigate("/shared");
  }

  function recent_Clicked() {
    navigate("/recent");
  }

  function starred_Clicked() {
    navigate("/starred");
  }

  function trash_Clicked() {
    navigate("/trash");
  }
  // -------------------------------

  const isLoggedIn = Boolean(auth?.token);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <nav className="nav">
      <Item icon="📁" label="My Drive" active={isFiles} onPress={myDrive_Clicked} />

      <Item
        icon="👥"
        label="Shared with me"
        active={pathname === "/shared"}
        onPress={shared_Clicked}
      />

      <Item icon="🕒" label="Recent" active={pathname === "/recent"} onPress={recent_Clicked} />

      <Item icon="⭐" label="Starred" active={pathname === "/starred"} onPress={starred_Clicked} />

      <div className="nav-divider" />

      <Item icon="🗑️" label="Trash" active={pathname === "/trash"} onPress={trash_Clicked} />
    </nav>
  );
}
