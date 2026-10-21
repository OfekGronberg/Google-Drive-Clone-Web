"use strict";

const tcp = require("../lib/tcpConnector");
const memoryStore = require("../lib/memoryStore");

/**
 * EX2 search response format examples:
 * "200 Ok\n\nfile1 file2"
 * "404 Not Found\n"
 */
function parseEx2Search(resp) {
  const text = String(resp || "");
  const lines = text.split(/\r?\n/);
  const statusLine = lines[0] || "";
  const status = parseInt(statusLine, 10);

  // body after the blank line (if exists)
  const sep = text.indexOf("\n\n");
  const body = sep >= 0 ? text.slice(sep + 2).trim() : "";

  const names = body ? body.split(/\s+/).filter(Boolean) : [];

  return { status: Number.isFinite(status) ? status : 0, names };
}

/**
 * EX2 get response format examples:
 * "200 Ok\n\n<content>"
 * "404 Not Found\n"
 */
function parseEx2GetContent(resp) {
  const text = String(resp || "");
  const lines = text.split(/\r?\n/);
  const statusLine = lines[0] || "";
  const status = parseInt(statusLine, 10);

  if (status !== 200) return null;

  const sep = text.indexOf("\n\n");
  if (sep < 0) return ""; // 200 but no body
  return text.slice(sep + 2); // content (may include newlines)
}

function includesCaseSensitive(hay, needle) {
  return String(hay || "").includes(String(needle || ""));
}

/**
 * Search must match EX3 requirement: name OR content contains query.
 * We store physical filenames in EX2 as: "<id>_<name>".
 * We must avoid false positives from searching the numeric prefix.
 * Only returns files the user has permission to access.
 *
 * Returns: array of PUBLIC metadata objects (no internal ex2Name leak).
 */
exports.searchFiles = async (query, userId) => {
  const q = String(query || "").trim();
  if (!q) return [];

  // Get all files but filter out deleted ones and check permissions
  const allItems = memoryStore.getFiles();
  const items = allItems.filter(it => {
    // Exclude soft-deleted files
    if (it.deletedAt) return false;
    
    // Check if user has permission to access this file
    const perms = memoryStore.getPermissionsByFileId(it.id);
    return perms.some(p => String(p.userId) === String(userId));
  });

  // 1) Name matches in EX3 metadata (folders + files)
  const byName = items.filter((it) => includesCaseSensitive(it.name, q));

  // 2) Content matches for files using EX2 search -> candidates (physical names)
  const ex2Resp = await tcp.search(q);
  const { status, names: candidatesPhysical } = parseEx2Search(ex2Resp);

  // If EX2 returns 404: no content matches; return only name matches
  if (status === 404) {
    return byName.map(({ ex2Name, ...pub }) => pub);
  }

  // If EX2 is broken: avoid crashing; return only name matches
  if (status !== 200) {
    return byName.map(({ ex2Name, ...pub }) => pub);
  }

  // Build a map from physical filename (EX2 name) -> metadata item
  // Assumption: your file metadata keeps `ex2Name` = "<id>_<name>"
  const byPhysical = new Map();
  for (const it of items) {
    if (it.type === "file" && it.ex2Name) byPhysical.set(it.ex2Name, it);
  }

  // Map EX2 candidate names back to metadata
  const candidates = [];
  for (const phys of candidatesPhysical) {
    const it = byPhysical.get(phys);
    if (it) candidates.push(it);
  }

  // 3) Filter false positives: accept if (name contains q) OR (content contains q)
  const verified = [];
  for (const it of candidates) {
    if (includesCaseSensitive(it.name, q)) {
      verified.push(it);
      continue;
    }

    // Verify by content using EX2 get on the physical filename
    const getResp = await tcp.getFile(it.ex2Name);
    const content = parseEx2GetContent(getResp);

    if (content !== null && includesCaseSensitive(content, q)) {
      verified.push(it);
    }
  }

  // 4) Merge unique results by id; return public objects (hide ex2Name)
  const merged = new Map();
  for (const it of [...byName, ...verified]) merged.set(it.id, it);

  return [...merged.values()].map(({ ex2Name, ...pub }) => pub);
};
