import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getRole, canEdit } from "../utils/permissions";
import "./Edit.css";
import { listPermissions } from "../api/FileManager";

export default function EditPage({ file, userId, updateName, toggleStar, updateContent }) {
  const { id } = useParams();
  const auth = useAuth();

  const [starred, setStarred] = useState(false);
  const [isCurrentUserOwner, setIsCurrentUserOwner] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [initialName, setInitialName] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  // Fill fields from the file prop (provided by App) whenever route/file changes
  useEffect(() => {
    const matches = file && String(file.id) === String(id);

    if (!matches) {
      setLoading(true);
      return;
    }

    const nextName = file?.name ?? "";
    const nextContent = file?.content ?? "";

    setStarred(Boolean(file?.starred));
    setName(nextName);
    setContent(nextContent);
    setInitialName(nextName);
    setInitialContent(nextContent);
    setStatus("");
    setLoading(false);
  }, [id, file]);

  // Check if current user is owner
  useEffect(() => {
    if (!file?.id || !userId) {
      setIsCurrentUserOwner(false);
      return;
    }

    (async () => {
      try {
        const targetId = file?.targetId ?? file?.id;
        const perms = await listPermissions(targetId);
        const isOwner = perms.some(p => String(p.userId) === String(userId) && String(p.role) === "owner");
        setIsCurrentUserOwner(isOwner);
      } catch (err) {
        // Silently fail - not critical
        setIsCurrentUserOwner(false);
      }
    })();
  }, [file?.id, file?.targetId, userId]);

  const isDirty = useMemo(() => {
    return name !== initialName || content !== initialContent;
  }, [name, content, initialName, initialContent]);

  // Check if user can edit this file
  // Try to get username first (permissions use username), fall back to userId
  const currentUser = localStorage.getItem("username") || auth?.userId || localStorage.getItem("userId");
  const userRole = file && currentUser ? getRole(file, currentUser) : null;
  const canEditFile = userRole ? canEdit(userRole) : true; // Default to true if we can't determine (backend will reject)

  // ---------- Event functions ----------
  // Edit.jsx
async function star_Clicked(e) {
  e?.stopPropagation?.();
  const prev = Boolean(starred);
  const optimistic = !prev;
  setStarred(optimistic);
  try {
    const targetId = file?.targetId ?? file?.id ?? id;
    const serverValue = await toggleStar?.(targetId);
    if (typeof serverValue === "boolean") setStarred(serverValue);
  } catch (err) {
    setStarred(prev); // revert
    setStatus?.(err?.message ?? String(err));
  }
}


  function name_Changed(e) {
    setName(e.target.value);
    setStatus("");
  }

  function content_Changed(e) {
    setContent(e.target.value);
    setStatus("");
  }

  async function save_Clicked(e) {
    e?.stopPropagation?.();

    if (!updateName || !updateContent) {
      setStatus("Save is not wired");
      return;
    }

    setSaving(true);
    setStatus("");
    try {
      const targetId = file?.targetId ?? file?.id ?? id;
      await Promise.resolve(updateName(targetId, name));
      await Promise.resolve(updateContent(targetId, content));

      setInitialName(name);
      setInitialContent(content);
      setStatus("Saved");
    } catch (err) {
      setStatus(err?.message ? `Save failed: ${err.message}` : "Save failed");
    } finally {
      setSaving(false);
    }
  }
  // -------------------------------

  if (loading) return <div>Loading…</div>;

  return (
    <div className="edit">
      <div className="editHeader">
        <button
          type="button"
          onClick={star_Clicked}
          aria-label={starred ? "Unstar" : "Star"}
          title={isCurrentUserOwner ? (starred ? "Unstar" : "Star") : "Only owner can star"}
          className={`editStar ${starred ? "isStarred" : ""}`}
          style={starred ? { color: "yellow" } : undefined}
          disabled={!isCurrentUserOwner}
        >
          ★
        </button>

        <input 
          className="editName" 
          value={name} 
          onChange={name_Changed}
          disabled={!canEditFile}
          title={!canEditFile ? "You don't have permission to edit this file" : ""}
        />

        <button
          className="editSave"
          type="button"
          onClick={save_Clicked}
          disabled={!isDirty || saving || !canEditFile}
          title={!canEditFile ? "You don't have permission to edit this file" : ""}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <textarea 
        className="editContent" 
        value={content} 
        onChange={content_Changed}
        disabled={!canEditFile}
        title={!canEditFile ? "You don't have permission to edit this file" : ""}
      />

      {status && <div className="editStatus">{status}</div>}
    </div>
  );
}
