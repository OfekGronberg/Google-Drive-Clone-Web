import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Files.css";
import PermissionsModal from "../components/PermissionsModal";
import {
  listPermissions as apiListPermissions,
  createPermission as apiCreatePermission,
  updatePermission as apiUpdatePermission,
  deletePermission as apiDeletePermission,
} from "../api/FileManager";

export default function FilesPage({
  files,
  loading,
  error,
  refreshFiles,
  folderId,
  folderName,
  userId,
  folderStarred,

  // "drive" -> show Move + allow Create (+)
  // "trash" -> show Restore + NO Create (+)
  // others  -> NO Create (+), no Move/Restore
  context = "drive",

  // Context-menu callbacks (called with caller_id)
  renameClicked,
  deleteClicked,
  createFile,
  createFolder,
  postFile,
  toggleStar,

  // Drive-only menu callback
  moveClicked,

  // Trash-only menu callback
  restoreClicked,
}) {
  const navigate = useNavigate();

  const canCreate = context === "drive";

  const [selectedId, setSelectedId] = useState(null);
  const [starred, setStarred] = useState(false);
  const [isCurrentUserOwner, setIsCurrentUserOwner] = useState(false);
  
  useEffect(() => {
    setStarred(Boolean(folderStarred));
  }, [folderId, folderStarred]);

  // Fetch folder permissions to check if user is owner
  useEffect(() => {
    if (!folderId || !userId) return;
    
    (async () => {
      try {
        const perms = await apiListPermissions(folderId);
        // Check if current user is owner
        const isOwner = perms.some(p => String(p.userId) === String(userId) && String(p.role) === "owner");
        setIsCurrentUserOwner(isOwner);
      } catch (err) {
        // Silently fail - not critical
        setIsCurrentUserOwner(false);
      }
    })();
  }, [folderId, userId]);
  const [isPermOpen, setIsPermOpen] = useState(false);
  const [permFileId, setPermFileId] = useState(null);
  const [permPermissions, setPermPermissions] = useState([]);
  const [permError, setPermError] = useState("");

  // FAB create-menu
  const [menuOpen, setMenuOpen] = useState(false);
  const fabRef = useRef(null);
  const menuRef = useRef(null);

  // List click-outside support
  const listRef = useRef(null);

  // Context menu: { id, type, x, y }
  const [ctxMenu, setCtxMenu] = useState(null);
  const ctxMenuRef = useRef(null);

  const list = files ?? [];

  // ---------------- Event functions ----------------
  function closeContextMenu() {
    setCtxMenu(null);
  }

  function openItem(item) {
    const targetId = item?.targetId ?? item?.id;
    navigate(`/files/${targetId}`);
  }

  // Files.jsx
  async function star_Clicked(e) {
    e?.stopPropagation?.();

    const prev = Boolean(starred);
    const optimistic = !prev;
    setStarred(optimistic);

    try {
      const serverValue = await toggleStar?.(folderId); // <-- ONLY ID
      if (typeof serverValue === "boolean") setStarred(serverValue);

      // if you want the list to reflect Starred/Recent shortcuts etc:
      refreshFiles?.();
    } catch (err) {
      setStarred(prev); // revert
      alert(err?.message ?? String(err));
    }
  }


  function refresh_Clicked(e) {
    e.stopPropagation();
    refreshFiles?.();
  }

  function row_Clicked(caller_id) {
    setSelectedId(caller_id);
    closeContextMenu();
  }

  function row_DoubleClicked(item) {
    closeContextMenu();
    openItem(item);
  }

  function row_RightClicked(e, item) {
    e.preventDefault();
    e.stopPropagation();

    setSelectedId(item.id);

    // Don't allow both menus at once
    if (canCreate) setMenuOpen(false);

    setCtxMenu({
      id: item.id,
      type: item.type,
      x: e.clientX,
      y: e.clientY,
    });
  }

  function rename_Clicked(caller_id) {
    closeContextMenu();
    (renameClicked ?? ((id) => console.log("renameClicked:", id)))(caller_id);
  }

  function permissions_Clicked(caller_id) {
    closeContextMenu();

    (async () => {
      try {
        setPermError("");
        setIsPermOpen(true);

        // Find the file to check if it's a shortcut
        const file = files.find(f => String(f.id) === String(caller_id));
        const targetId = file?.targetId || caller_id; // Use targetId if it's a shortcut

        setPermFileId(targetId);
        const list = await apiListPermissions(targetId);
        setPermPermissions(list);
      } catch (e) {
        const msg =
          (e && e.details && e.details.error) ||
          (e && e.message) ||
          "Failed to load permissions";
        setPermError(msg);
        setPermPermissions([]);
      }
    })();
  }

  function delete_Clicked(caller_id) {
    closeContextMenu();
    (deleteClicked ?? ((id) => console.log("deleteClicked:", id)))(caller_id);
    refreshFiles?.();
  }

  function move_Clicked(caller_id) {
    closeContextMenu();
    var dest = prompt("Enter destination folder ID:", folderId.toString());
    if (dest == null || !dest.trim() || isNaN(dest)) {
      alert('Invalid folder ID. The operation was canceled.');
      return
    } // canceled or empty
    (moveClicked ?? ((id) => console.log("moveClicked:", id)))(caller_id, dest);
  }

  function restore_Clicked(caller_id) {
    closeContextMenu();
    (restoreClicked ?? ((id) => console.log("restoreClicked:", id)))(caller_id);
  }

  function closePermissions() {
    setIsPermOpen(false);
    setPermFileId(null);
    setPermError("");
    setPermPermissions([]);
  }

  async function addPermission(usernameOrId, role) {
    if (!permFileId) return;
    try {
      setPermError("");
      const created = await apiCreatePermission(permFileId, usernameOrId, role);
      setPermPermissions((prev) => [...(prev || []), created]);
    } catch (e) {
      const msg =
        (e && e.details && e.details.error) ||
        (e && e.message) ||
        "Failed to add permission";
      setPermError(msg);
    }
  }

  async function updatePermission(permissionId, role) {
    if (!permFileId) return;
    try {
      setPermError("");
      await apiUpdatePermission(permFileId, permissionId, role);
      setPermPermissions((prev) =>
        (prev || []).map((p) =>
          p.id === permissionId
            ? {
              ...p,
              role,
            }
            : p
        )
      );
    } catch (e) {
      const msg =
        (e && e.details && e.details.error) ||
        (e && e.message) ||
        "Failed to update permission";
      setPermError(msg);
    }
  }

  async function removePermission(permissionId) {
    if (!permFileId) return;
    try {
      setPermError("");
      await apiDeletePermission(permFileId, permissionId);
      setPermPermissions((prev) => (prev || []).filter((p) => p.id !== permissionId));
    } catch (e) {
      const msg =
        (e && e.details && e.details.error) ||
        (e && e.message) ||
        "Failed to remove permission";
      setPermError(msg);
    }
  }

  function fab_Clicked() {
    closeContextMenu();
    setMenuOpen((v) => !v);
  }

  async function createFile_Clicked() {
    setMenuOpen(false);

    const name = prompt("Enter file name:", "New File.txt");
    if (name == null) return;                 // user canceled
    const trimmed = name.trim();
    if (!trimmed) return;                     // empty

    try {
      await postFile?.(await createFile?.(trimmed, folderId, "", "file", false)); // assuming createFile returns a Promise
      await refreshFiles?.();                    // refresh after create completes
    } catch (e) {
      alert("Create failed: " + (e?.message ?? String(e)));
    }
  }

  async function createFolder_Clicked() {
    setMenuOpen(false);

    const name = prompt("Enter folder name:", "New Folder");
    if (name == null) return;                 // user canceled
    const trimmed = name.trim();
    if (!trimmed) return;                     // empty

    try {
      await postFile?.(await createFile?.(trimmed, folderId, [], "folder", false)); // assuming createFile returns a Promise
      await refreshFiles?.();                    // refresh after create completes
    } catch (e) {
      alert("Create failed: " + (e?.message ?? String(e)));
    }
  }
  // --------------------------------------------------

  useEffect(() => {
    function handleGlobalMouseDown(e) {
      // Close FAB menu if click outside menu+fab (only relevant when canCreate)
      if (canCreate && menuOpen) {
        const fabEl = fabRef.current;
        const menuEl = menuRef.current;
        const insideFab = fabEl && fabEl.contains(e.target);
        const insideMenu = menuEl && menuEl.contains(e.target);
        if (!insideFab && !insideMenu) setMenuOpen(false);
      }

      // Close context menu if click outside it
      if (ctxMenu) {
        const ctxEl = ctxMenuRef.current;
        const insideCtx = ctxEl && ctxEl.contains(e.target);
        if (!insideCtx) closeContextMenu();
      }

      // Unselect list item if click outside list
      const listEl = listRef.current;
      const insideList = listEl && listEl.contains(e.target);
      if (!insideList) setSelectedId(null);
    }

    document.addEventListener("mousedown", handleGlobalMouseDown);
    return () => document.removeEventListener("mousedown", handleGlobalMouseDown);
  }, [canCreate, menuOpen, ctxMenu]);

  // Optional: close context menu on scroll
  useEffect(() => {
    function onAnyScroll() {
      if (ctxMenu) closeContextMenu();
    }
    window.addEventListener("scroll", onAnyScroll, true);
    return () => window.removeEventListener("scroll", onAnyScroll, true);
  }, [ctxMenu]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="files">
      <div className="filesTop">
        <h1 className="filesTitle">{folderName ?? "My Drive"}</h1>

        <div className="filesActions">
          <button
            type="button"
            className={`filesStar ${starred ? "isStarred" : ""}`}
            aria-label={starred ? "Unstar" : "Star"}
            title={isCurrentUserOwner ? (starred ? "Unstar" : "Star") : "Only owner can star"}
            onClick={star_Clicked}
            disabled={!isCurrentUserOwner}
          >
            ★
          </button>

          <button className="filesRefresh" onClick={refresh_Clicked}>
            Refresh
          </button>
        </div>
      </div>

      <div ref={listRef} className="filesList">
        {list.map((item) => {
          const selected = item.id === selectedId;

          return (
            <button
              key={item.id}
              type="button"
              className={`filesRow ${selected ? "isSelected" : ""}`}
              onClick={() => row_Clicked(item.id)}
              onDoubleClick={() => row_DoubleClicked(item)}
              onContextMenu={(e) => row_RightClicked(e, item)}
            >
              <div className="filesLeft">
                <span className="filesIcon">
                  {item.type === "folder" ? "📁" : item.type === "shortcut" ? "🔗" : "📄"}
                </span>
                <span className="filesName">{item.name}</span>
              </div>

              <div className="filesMeta">
                {item.type === "file"
                  ? "file"
                  : item.type === "folder"
                    ? `folder (${(item.content ?? []).length})`
                    : `shortcut → ${item.content}`}
              </div>
            </button>
          );
        })}
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (
        <div
          ref={ctxMenuRef}
          className="filesCtxMenu"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          role="menu"
        >
          {/* Rename: folders + shortcuts only */}
          {/* Rename: folders + shortcuts only */}
          {renameClicked && ctxMenu.type !== "file" && (
            <button
              type="button"
              className="filesCtxItem filesCtxItemRename"
              onClick={(e) => {
                e.stopPropagation();
                rename_Clicked(ctxMenu.id);
              }}
              role="menuitem"
            >
              Rename
            </button>
          )}


          {/* Permissions: all types */}
          <button
            type="button"
            className="filesCtxItem filesCtxItemPermissions"
            onClick={(e) => {
              e.stopPropagation();
              permissions_Clicked(ctxMenu.id);
            }}
            role="menuitem"
          >
            Permissions
          </button>

          {/* My Drive only */}
          {context === "drive" && (
            <button
              type="button"
              className="filesCtxItem"
              onClick={(e) => {
                e.stopPropagation();
                move_Clicked(ctxMenu.id);
              }}
              role="menuitem"
            >
              Move
            </button>
          )}

          {/* Trash only */}
          {context === "trash" && (
            <button
              type="button"
              className="filesCtxItem"
              onClick={(e) => {
                e.stopPropagation();
                restore_Clicked(ctxMenu.id);
              }}
              role="menuitem"
            >
              Restore
            </button>
          )}

          {/* Delete: all types (in drive = move to trash; in trash = permanent delete) */}
          {deleteClicked && ctxMenu && (
            <button
              type="button"
              className="filesCtxItem filesCtxItemDelete"
              onClick={(e) => {
                e.stopPropagation();
                delete_Clicked(ctxMenu.id);
              }}
              role="menuitem"
            >
              Delete
            </button>
          )}
        </div>
      )}

      {/* Create UI ONLY in drive */}
      {canCreate && (
        <>
          {menuOpen && (
            <div ref={menuRef} className="filesMenu">
              <button type="button" className="filesMenuItem" onClick={createFile_Clicked}>
                Create a file
              </button>
              <button type="button" className="filesMenuItem" onClick={createFolder_Clicked}>
                Create a folder
              </button>
            </div>
          )}

          <button
            ref={fabRef}
            type="button"
            className="filesFab"
            onClick={fab_Clicked}
            aria-label="Create"
          >
            +
          </button>
        </>
      )}

      <PermissionsModal
        isOpen={isPermOpen}
        fileId={permFileId}
        userId={userId}
        permissions={permPermissions}
        error={permError}
        onClose={closePermissions}
        onAdd={addPermission}
        onUpdate={updatePermission}
        onRemove={removePermission}
      />
    </div>
  );
}
