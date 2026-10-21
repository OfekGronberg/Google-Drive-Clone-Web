import { useEffect, useState } from "react";
import "./PermissionsModal.css";

export default function PermissionsModal({
  isOpen,
  fileId,
  userId,
  permissions,
  error,
  onClose,
  onAdd,
  onUpdate,
  onRemove,
}) {
  const [newUser, setNewUser] = useState("");
  const [newRole, setNewRole] = useState("reader");

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const list = Array.isArray(permissions) ? permissions : [];
  
  // Determine if the current user is the owner (only owner permission means current user is owner)
  const isCurrentUserOwner = list.length > 0 && list.some(p => p.role === "owner");

  function handleAddClick() {
    const trimmed = newUser.trim();
    if (!trimmed) {
      return;
    }
    onAdd(trimmed, newRole);
    setNewUser("");
    setNewRole("reader");
  }

  return (
    <div className="permModalBackdrop" onClick={onClose}>
      <div
        className="permModalPanel"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="permModalHeader">
          <div>
            <h2 className="permModalTitle">Permissions</h2>
            <div className="permModalSubtitle">
              File: <span className="permModalFileId">{fileId ?? "-"}</span>
            </div>
          </div>
          <button
            type="button"
            className="permModalClose"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="permModalBody">
          {!isCurrentUserOwner && list.length === 1 && (
            <div className="permModalReadOnlyNotice">
              You have <strong>{list[0].role}</strong> permission on this file.
            </div>
          )}

          {isCurrentUserOwner && (
            <div className="permModalAddRow">
              <input
                type="text"
                value={newUser}
                onChange={(e) => setNewUser(e.target.value)}
                placeholder="Username or user id"
                className="permModalInput"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="permModalSelect"
              >
                <option value="owner">Owner</option>
                <option value="editor">Editor</option>
                <option value="reader">Reader</option>
              </select>
              <button
                type="button"
                className="permModalAddButton"
                onClick={handleAddClick}
              >
                Add
              </button>
            </div>
          )}

          {error && <div className="permModalError">{error}</div>}

          <div className="permModalList">
            {list.length === 0 && (
              <div className="permModalEmpty">No permissions yet.</div>
            )}

            {list.map((perm) => (
              <div key={perm.id} className="permModalItem">
                <div className="permModalUser">
                  {perm.userId || perm.username || "(unknown user)"}
                </div>
                <select
                  value={perm.role}
                  onChange={(e) => isCurrentUserOwner && onUpdate(perm.id, e.target.value)}
                  disabled={!isCurrentUserOwner}
                  className="permModalSelect"
                >
                  <option value="owner">Owner</option>
                  <option value="editor">Editor</option>
                  <option value="reader">Reader</option>
                </select>
                <button
                  type="button"
                  className="permModalRemoveButton"
                  onClick={() => isCurrentUserOwner && onRemove(perm.id)}
                  disabled={!isCurrentUserOwner || (String(perm.userId) === String(userId) && perm.role === "owner")}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


