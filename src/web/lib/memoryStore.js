"use strict";

/**
 * In-memory store for the web server.
 * Resets when the Node process restarts.
 * 
 * Data Structures:
 * - users: Map<id, user>
 * - files: 
 *   - fileMap: Map<id, node> for O(1) lookups
 *   - roots: array of root-level nodes (for iteration)
 *   Each node: { id, name, type, ex2Name, children[] }
 * - permissions: Map<id, permission>
 */

// internal state object (not exported directly)
const store = {
  nextUserId: 1,
  nextFileId: 1,
  nextPermissionId: 1,

  users: new Map(),        // id -> { id, username, password }
  files: {
    fileMap: new Map(),    // id -> node (for O(1) lookups)
    roots: []              // array of root-level file/folder nodes
  },
  permissions: new Map(),  // id -> { id, fileId, userId, role }
  recent: [],              // array of fileIds (queue), max 50 items
  trashed: new Map()       // fileId -> parentId (for restore to original location)
};

const MAX_RECENT_SIZE = 10;


// === ID Generators ===
exports.newUserId = () => {
  return String(store.nextUserId++);
};

exports.newFileId = () => {
  return String(store.nextFileId++);
};

exports.newPermissionId = () => {
  return String(store.nextPermissionId++);
};


// === USER OPERATIONS ===

// === RECENT FILES OPERATIONS ===
/**
 * Add file to recent queue (most recent at the end)
 * Maintains max size by removing oldest if needed
 */
exports.addToRecent = (fileId) => {
  const id = String(fileId);
  // Remove if already exists (to move to end)
  const idx = store.recent.indexOf(id);
  if (idx !== -1) store.recent.splice(idx, 1);
  
  // Add to end
  store.recent.push(id);
  
  // Maintain max size by removing oldest (from front)
  while (store.recent.length > MAX_RECENT_SIZE) {
    store.recent.shift();
  }
};

/**
 * Get all recent file IDs (most recent at the end)
 */
exports.getRecent = () => {
  return [...store.recent];
};

/**
 * Clear recent queue
 */
exports.clearRecent = () => {
  store.recent = [];
};

// === TRASHED FILES OPERATIONS ===
/**
 * Mark a file as trashed and store its original parent
 */
exports.addToTrash = (fileId, parentId) => {
  const id = String(fileId);
  const parent = parentId ? String(parentId) : null;
  store.trashed.set(id, parent);
};

/**
 * Get the original parent of a trashed file
 */
exports.getTrashedParentId = (fileId) => {
  return store.trashed.get(String(fileId)) || null;
};

/**
 * Check if a file is in trash
 */
exports.isInTrash = (fileId) => {
  return store.trashed.has(String(fileId));
};

/**
 * Remove a file from trash (when restored or permanently deleted)
 */
exports.removeFromTrash = (fileId) => {
  return store.trashed.delete(String(fileId));
};

/**
 * Get all trashed files
 */
exports.getTrash = () => {
  return new Map(store.trashed);
};

/**
 * Clear all trash
 */
exports.clearTrash = () => {
  store.trashed.clear();
};


exports.getUsers = () => {
  return Array.from(store.users.values());
};

exports.getUserById = (userId) => {
  return store.users.get(String(userId)) || null;
};

exports.addUser = (user) => {
  store.users.set(String(user.id), user);
};

exports.removeUserById = (userId) => {
  return store.users.delete(String(userId));
};


// === FILE OPERATIONS (Tree + Map Hybrid) ===

/**
 * Helper: Find parent node of a given id (O(n) but only needed for operations)
 * @private
 */
const findParentOf = (id, searchIn = store.files.roots) => {
  const idStr = String(id);
  for (const node of searchIn) {
    if (node.type === "folder" && node.children) {
      if (node.children.some(child => child.id === idStr)) {
        return node;
      }
      const found = findParentOf(id, node.children);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Helper: Recursively delete descendants from fileMap
 * @private
 */
const deleteFromMapRecursive = (node) => {
  if (node.type === "folder" && node.children) {
    for (const child of node.children) {
      deleteFromMapRecursive(child);
    }
  }
  store.files.fileMap.delete(node.id);
};

/**
 * Get all top-level items
 */
exports.getTopLevel = () => {
  return store.files.roots;
};

/**
 * Get all files and folders as a flat array (O(n) over stored nodes)
 * Useful for callers that need to search or iterate all nodes.
 */
exports.getFiles = () => {
  return Array.from(store.files.fileMap.values());
};

/**
 * Get file/folder by id (O(1) lookup via Map)
 */
exports.getFileById = (fileId) => {
  return store.files.fileMap.get(String(fileId)) || null;
};

/**
 * Add file or folder to the tree and map
 * @param {Object} file - { id, name, type, ex2Name?, parentId?, targetId?, starred?, deletedAt?, ownerId? }
 */
exports.addFile = (file) => {
  const nodeToAdd = {
    id: String(file.id),
    name: file.name,
    type: file.type,
  };

  // Add ex2Name only for files
  if (file.type === "file" && file.ex2Name) {
    nodeToAdd.ex2Name = file.ex2Name;
  }

  // Add targetId for shortcuts
  if (file.type === "shortcut" && file.targetId) {
    nodeToAdd.targetId = String(file.targetId);
  }

  // Add other optional properties
  if (file.parentId) nodeToAdd.parentId = String(file.parentId);
  if (file.starred !== undefined) nodeToAdd.starred = Boolean(file.starred);
  if (file.deletedAt) nodeToAdd.deletedAt = file.deletedAt;
  if (file.ownerId) nodeToAdd.ownerId = String(file.ownerId);

  // Initialize children array for folders
  if (file.type === "folder") {
    nodeToAdd.children = [];
  }

  // Add to tree: either root or as child of parent
  if (!file.parentId) {
    // Add to roots
    store.files.roots.push(nodeToAdd);
  } else {
    // Find parent and add as child (O(n) search, but only on add)
    const parent = store.files.fileMap.get(String(file.parentId));
    if (parent && parent.type === "folder") {
      if (!parent.children) parent.children = [];
      parent.children.push(nodeToAdd);
    }
  }

  // Add to Map for O(1) lookups
  store.files.fileMap.set(nodeToAdd.id, nodeToAdd);
};

/**
 * Get direct children of a folder
 */
exports.getChildrenOf = (parentId) => {
  const parent = store.files.fileMap.get(String(parentId));
  if (!parent || parent.type !== "folder") return [];
  return parent.children || [];
};

/**
 * Get all descendants of a folder (recursively)
 */
exports.getDescendantsOf = (parentId) => {
  const results = [];
  const parent = store.files.fileMap.get(String(parentId));
  if (!parent || parent.type !== "folder") return results;

  const traverse = (node) => {
    if (node.children) {
      for (const child of node.children) {
        results.push(child);
        if (child.type === "folder") {
          traverse(child);
        }
      }
    }
  };

  traverse(parent);
  return results;
};

/**
 * Remove file/folder from tree and map (cascades to descendants)
 */
exports.removeFileById = (fileId) => {
  const id = String(fileId);
  const node = store.files.fileMap.get(id);
  
  if (!node) return false;

  // Remove from Map (including all descendants)
  deleteFromMapRecursive(node);

  // Remove from tree roots
  const rootIdx = store.files.roots.findIndex(n => n.id === id);
  if (rootIdx !== -1) {
    store.files.roots.splice(rootIdx, 1);
    return true;
  }

  // Remove from parent's children
  const parent = findParentOf(id);
  if (parent && parent.children) {
    const childIdx = parent.children.findIndex(n => n.id === id);
    if (childIdx !== -1) {
      parent.children.splice(childIdx, 1);
      return true;
    }
  }

  return false;
};


// === PERMISSION OPERATIONS ===
exports.getPermissions = () => {
  return Array.from(store.permissions.values());
};

exports.getPermissionById = (permissionId) => {
  return store.permissions.get(String(permissionId)) || null;
};

exports.addPermission = (permission) => {
  store.permissions.set(String(permission.id), permission);
};

exports.removePermissionById = (permissionId) => {
  return store.permissions.delete(String(permissionId));
};

/**
 * Get all permissions for a specific file
 * @param {string} fileId
 * @returns {Array} array of permission objects
 */
exports.getPermissionsByFileId = (fileId) => {
  const file = String(fileId);
  return Array.from(store.permissions.values()).filter(p => p.fileId === file);
};

/**
 * Get all permissions for a specific user
 * @param {string} userId
 * @returns {Array} array of permission objects
 */
exports.getPermissionsByUserId = (userId) => {
  const user = String(userId);
  return Array.from(store.permissions.values()).filter(p => p.userId === user);
};
