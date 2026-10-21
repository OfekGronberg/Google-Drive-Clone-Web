// App.js
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./auth/AuthContext";

import * as FileManager from "./api/FileManager.js";

import * as FilesPageMod from "./pages/Files.jsx";
import * as EditPageMod from "./pages/Edit.jsx";
import * as SettingsPageMod from "./pages/Settings.jsx";
import * as NotFoundPageMod from "./pages/404.jsx";
import * as AppLayoutMod from "./components/AppLayout.jsx";
import * as LoginPageMod from "./pages/Login.jsx";
import * as SignupPageMod from "./pages/Signup.jsx";

// Pick a real React component from a module (handles default OR named export)
function pickComponent(mod) {
  if (mod?.default) return mod.default;
  for (const k of [
    "AppLayout",
    "FilesPage",
    "EditPage",
    "SettingsPage",
    "LoginPage",
    "SignupPage",
    "NotFoundPage",
  ]) {
    if (mod?.[k]) return mod[k];
  }
  const first = mod && Object.values(mod)[0];
  return first || null;
}

const FilesPage = pickComponent(FilesPageMod);
const EditPage = pickComponent(EditPageMod);
const SettingsPage = pickComponent(SettingsPageMod);
const NotFoundPage = pickComponent(NotFoundPageMod);
const AppLayout = pickComponent(AppLayoutMod);
const LoginPage = pickComponent(LoginPageMod);
const SignupPage = pickComponent(SignupPageMod);

// -------------------- helpers --------------------
function toErrorText(e) {
  if (!e) return "Unknown error";
  if (e instanceof Error) return e.message || String(e);
  return String(e);
}

function useEffectiveUserId() {
  const auth = useAuth();
  // try several likely shapes + fallback to localStorage
  const uid =
    auth?.user?.id ??
    auth?.userId ??
    auth?.id ??
    localStorage.getItem("userId") ??
    localStorage.getItem("userid") ??
    localStorage.getItem("uid");

  return uid != null ? String(uid) : null;
}

function isFolderIdResponse(x) {
  return (
    typeof x === "string" ||
    typeof x === "number" ||
    (x && typeof x === "object" && (x.id != null || x.folderId != null))
  );
}

function getIdFromResponse(x) {
  if (x == null) return null;
  if (typeof x === "string" || typeof x === "number") return String(x);
  if (typeof x === "object") {
    if (x.id != null) return String(x.id);
    if (x.folderId != null) return String(x.folderId);
  }
  return null;
}

async function fetchNodesFromList(list) {
  if (!Array.isArray(list) || list.length === 0) return [];

  // list of ids
  if (typeof list[0] === "string" || typeof list[0] === "number") {
    const nodes = [];
    for (const id of list) {
      try {
        const n = await FileManager.getFileById(String(id));
        if (n) nodes.push(n);
      } catch {
        // ignore missing/inaccessible nodes
      }
    }
    return nodes;
  }

  // list of node objects
  return list.filter(Boolean);
}

// FileManager.refer() is currently unreliable (buggy), so resolve shortcuts here.
async function resolveShortcutTargetId(startId, maxHops = 20) {
  const seen = new Set();
  let current = String(startId);

  for (let i = 0; i < maxHops; i++) {
    if (seen.has(current)) return null; // cycle
    seen.add(current);

    const node = await FileManager.getFileById(current);
    if (!node) return null;

    if (node.type !== "shortcut") return current;

    const next =
      node.content ?? node.targetId ?? node.to ?? node.ref ?? node.referenceId ?? null;
    if (next == null) return null;

    current = String(next);
  }

  return null;
}

// -------------------- auth guards --------------------
function RequireAuth() {
  const auth = useAuth();
  return auth?.token ? <Outlet /> : <Navigate to="/login" replace />;
}

function RequireGuest() {
  const auth = useAuth();
  return !auth?.token ? <Outlet /> : <Navigate to="/files" replace />;
}

function HomeRedirect() {
  const auth = useAuth();
  return <Navigate to={auth?.token ? "/files" : "/login"} replace />;
}

// -------------------- route components --------------------
function RootFilesRoute() {
  const userId = useEffectiveUserId();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        if (!userId) throw new Error("Missing userId (cannot load root folder)");

        const res = await FileManager.getRoot(userId);
        const rootId = getIdFromResponse(res);

        if (!alive) return;

        if (!rootId) {
          setErr("Root folder not found");
          setLoading(false);
          return;
        }

        navigate(`/files/${rootId}`, { replace: true });
      } catch (e) {
        if (!alive) return;
        setErr(toErrorText(e));
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId, navigate]);

  if (loading) return <div>Loading...</div>;
  if (err) return <div>{err}</div>;
  return null;
}

function FolderRoute({ folderId, context = "drive" }) {
  const userId = useEffectiveUserId();
  const [items, setItems] = useState([]);
  const [folder, setFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const f = await FileManager.getFileById(String(folderId));
        const content = await FileManager.getFolderContent(String(folderId));

        if (!alive) return;

        setFolder(f);
        setItems(Array.isArray(content) ? content : []);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setErr(toErrorText(e));
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [folderId, tick]);

  async function renameClicked(id) {
    const node = items.find((x) => String(x.id) === String(id));
    const currentName = node?.name ?? "";
    var next = window.prompt("Rename to:", currentName);
    if (next == null || next.trim() === "") return;

    try {
      await FileManager.patchFileFields(String(id), { name: next });
      setTick((t) => t + 1);
    } catch (e) {
      alert(toErrorText(e));
    }
  }

  function permissionsClicked(id) {
    alert(`Permissions: ${id} (not wired yet)`);
  }

  async function deleteClicked(id) {
    try {
      await FileManager.deleteFile(String(id));
      setTick((t) => t + 1);
    } catch (e) {
      alert(toErrorText(e));
    }
  }

  async function restoreClicked(id) {
    try {
      await FileManager.restoreFile(String(id));
      setTick((t) => t + 1);
    } catch (e) {
      alert(toErrorText(e));
    }
  }

  async function moveClicked(id, dest) {
    try {
      var step = 0
      const d = await FileManager.getFileById(dest); // validate dest
      if (!d || d.type !== "folder") {
        alert("Destination is not a valid folder.");
        return;
      }
      step = 1
      await FileManager.patchFileFields(String(id), { parentId: String(dest) });
      setTick((t) => t + 1);
    } catch (e) {
      const status = e?.response?.status;
      if (step === 0 && status === 404) {
        alert("Destination folder not found.");
        return;
      }
      else if (step === 0 && status === 403) {
        alert("You do not have permission to access the destination folder.");
        return;
      }
      alert(toErrorText(e));
    }
  }

  // If your Files.jsx calls createFile?.(name, folderId, "") + refreshFiles?.(),
  // it can call these props below (we pass BOTH styles for compatibility):
  async function createFileClicked() {
    const name = window.prompt("New file name:", "New file.txt");
    if (name == null) return;

    try {
      const file = await FileManager.createFile(name, String(folderId), "", "file", false);
      file.content = ""; // server expects content for file
      await FileManager.postFile(file);
      setTick((t) => t + 1);
    } catch (e) {
      alert(toErrorText(e));
    }
  }

  async function createFolderClicked() {
    const name = window.prompt("New folder name:", "New folder");
    if (name == null) return;

    try {
      const f = await FileManager.createFile(name, String(folderId), null, "folder", false);
      f.content = []; // server typically stores children ids
      await FileManager.postFile(f);
      setTick((t) => t + 1);
    } catch (e) {
      alert(toErrorText(e));
    }
  }

  async function toggleStar(id) {
    if (!id) throw new Error("toggleStarOnServer: id is required");
    let currentId = String(id);
    for (let hops = 0; hops < 20; hops++) {
      const node = await FileManager.getFileById(currentId);
      if (!node) throw new Error("File not found");
      if (node.type !== "shortcut") {
        const next = !Boolean(node.starred);
        await FileManager.starFile(currentId, next);
        return next;
      }
      if (node.content == null) throw new Error("Broken shortcut");
      currentId = String(node.content);
    }
    throw new Error("Shortcut loop detected");
  }

  return (
    <FilesPage
      context={context}
      folderId={String(folderId)}
      userId={userId}
      files={items}
      loading={loading}
      error={err}
      refreshFiles={() => setTick((t) => t + 1)}
      folderName={folder?.name ?? "Folder"}
      renameClicked={renameClicked}
      permissionsClicked={permissionsClicked}
      deleteClicked={deleteClicked}
      moveClicked={moveClicked}
      restoreClicked={restoreClicked}
      toggleStar={toggleStar}
      folderStarred={Boolean(folder?.starred)}
      // New props (if your Files.jsx uses them)
      createFileClicked={createFileClicked}
      createFolderClicked={createFolderClicked}
      // Old props (if your Files.jsx uses them)
      createFile={FileManager.createFile}
      createFolder={FileManager.createFile}
      postFile={FileManager.postFile}
    />
  );
}

function VirtualListRoute({ title, loader, context }) {
  const userId = useEffectiveUserId();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        if (!userId) throw new Error("Missing userId");

        const res = await loader(userId);

        if (!alive) return;

        // If API returns a folder id/object -> show its contents
        if (isFolderIdResponse(res)) {
          const fid = getIdFromResponse(res);
          if (!fid) {
            setItems([]);
            setLoading(false);
            return;
          }

          const content = await FileManager.getFolderContent(fid);

          if (!alive) return;

          setItems(Array.isArray(content) ? content : []);
          setLoading(false);
          return;
        }

        // If API returns a list (ids or nodes)
        const nodes = await fetchNodesFromList(res);

        if (!alive) return;

        setItems(nodes);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setErr(toErrorText(e));
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId, tick, loader]);

  return (
    <FilesPage
      context={context}
      userId={userId}
      files={items}
      loading={loading}
      error={err}
      refreshFiles={() => setTick((t) => t + 1)}
      folderName={title}
      renameClicked={(id) => alert(`Rename (not wired here): ${id}`)}
      deleteClicked={async (id) => {
        try {
          await FileManager.deleteFile(String(id));
          setTick((t) => t + 1);
        } catch (e) {
          alert(toErrorText(e));
        }
      }}
      restoreClicked={async (id) => {
        try {
          await FileManager.restoreFile(String(id));
          setTick((t) => t + 1);
        } catch (e) {
          alert(toErrorText(e));
        }
      }}
      moveClicked={(id) => alert(`Move (not wired here): ${id}`)}
    />
  );
}

function TrashRoute() {
  return <VirtualListRoute title="Trash" loader={FileManager.getTrash} context="trash" />;
}
function SharedRoute() {
  return <VirtualListRoute title="Shared" loader={FileManager.getShared} context="shared" />;
}
function RecentRoute() {
  return <VirtualListRoute title="Recent" loader={FileManager.getRecent} context="recent" />;
}
function StarredRoute() {
  return <VirtualListRoute title="Starred" loader={FileManager.getStarred} context="starred" />;
}

function SearchRoute() {
  const userId = useEffectiveUserId();
  const [params] = useSearchParams();
  const q = (params.get("q") ?? "").trim();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!q) {
          setItems([]);
          setErr(null);
          return;
        }

        setLoading(true);
        setErr(null);

        const res = await FileManager.search(q);

        // most likely already array of objects; still support ids list
        const nodes = await fetchNodesFromList(res);

        if (!alive) return;

        setItems(nodes);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setErr(toErrorText(e));
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [q, tick]);

  return (
    <FilesPage
      context="search"
      userId={userId}
      files={items}
      loading={loading}
      error={err}
      refreshFiles={() => setTick((t) => t + 1)}
      folderName={q ? `Search: ${q}` : "Search"}
      renameClicked={null}
      permissionsClicked={(id) => alert(`Permissions (not wired in search): ${id}`)}
      deleteClicked={null}
    />
  );
}

function FileOrFolderRoute() {
  const { id } = useParams();
  const userId = useEffectiveUserId();

  const [node, setNode] = useState(null);
  const [redirectId, setRedirectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Update ops used by EditPage
  async function updateName(fileId, name) {
    await FileManager.patchFileFields(String(fileId), { name });
  }
  async function updateContent(fileId, content) {
    await FileManager.patchFileFields(String(fileId), { content });
  }
  async function toggleStar(id) {
    if (!id) throw new Error("toggleStarOnServer: id is required");
    let currentId = String(id);
    for (let hops = 0; hops < 20; hops++) {
      const node = await FileManager.getFileById(currentId);
      if (!node) throw new Error("File not found");
      if (node.type !== "shortcut") {
        const next = !Boolean(node.starred);
        await FileManager.starFile(currentId, next);
        return next; // let caller sync UI
      }
      if (node.content == null) throw new Error("Broken shortcut");
      currentId = String(node.content);
    }
    throw new Error("Shortcut loop detected");
  }
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        setRedirectId(null);

        const resolved = await resolveShortcutTargetId(id);
        if (!alive) return;

        if (!resolved) {
          setNode(null);
          setLoading(false);
          return;
        }

        if (String(resolved) !== String(id)) {
          setRedirectId(resolved);
          setLoading(false);
          return;
        }

        const n = await FileManager.getFileById(String(id));
        if (!alive) return;

        setNode(n);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setErr(toErrorText(e));
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (err) return <div>{err}</div>;
  if (redirectId) return <Navigate to={`/files/${redirectId}`} replace />;
  if (!node) return <NotFoundPage />;

  if (node.type === "file") {
    return (
      <EditPage
        file={node}
        userId={userId}
        updateName={updateName}
        toggleStar={toggleStar}
        updateContent={updateContent}
      />
    );
  }

  if (node.type === "folder") {
    return <FolderRoute folderId={node.id} context="drive" toggleStar={toggleStar} />;
  }

  return <NotFoundPage />;
}

function SettingsRoute() {
  return <SettingsPage />;
}

// -------------------- main app --------------------
export default function App() {
  const navigate = useNavigate();

  function onSearch(text) {
    const q = (text ?? "").trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />

        <Route element={<RequireGuest />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          {/* Layout wrapper (Header/NavBar + Outlet) */}
          <Route element={<AppLayout onSearch={onSearch} />}>
            {/* /files redirects to the *real* root folder id */}
            <Route path="/files" element={<RootFilesRoute />} />
            <Route path="/files/:id" element={<FileOrFolderRoute />} />

            <Route path="/shared" element={<SharedRoute />} />
            <Route path="/recent" element={<RecentRoute />} />
            <Route path="/starred" element={<StarredRoute />} />
            <Route path="/trash" element={<TrashRoute />} />

            <Route path="/search" element={<SearchRoute />} />
            <Route path="/settings" element={<SettingsRoute />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
