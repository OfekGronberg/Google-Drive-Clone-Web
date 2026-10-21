"use strict";

const memoryStore = require("../lib/memoryStore");
const tcp = require("../lib/tcpConnector");
const permissionsModel = require("./permissions.models");

// Generate a filesystem-safe EX2 name from id + display name
const makeEx2Name = (id, name) => {
  const safeName = String(name || "").replace(/\s+/g, "_");
  return `${id}_${safeName}`;
};

// Helper: Check if user has permission to access a file
const hasPermission = (fileId, userId) => {
  const perms = memoryStore.getPermissionsByFileId(fileId);
  return perms.some(p => String(p.userId) === String(userId));
};

// Helper: Check if user can edit a file (must be Owner or Editor)
const canEditFile = (fileId, userId) => {
  if (!userId) return false;
  
  const item = memoryStore.getFileById(fileId);
  // Check if user is the owner
  if (item && item.ownerId && String(item.ownerId) === String(userId)) {
    return true;
  }
  
  // Check if user has Editor or Owner role
  const perms = memoryStore.getPermissionsByFileId(fileId);
  const userPerm = perms.find(p => String(p.userId) === String(userId));
  if (userPerm) {
    const role = String(userPerm.role || "").toLowerCase();
    return role === "editor" || role === "owner";
  }
  
  return false;
};

// Helper: Check if moving a file to newParentId would create a circular dependency
const wouldCreateCircularMove = (fileId, newParentId) => {
  if (!newParentId) return false; // Moving to root is always safe
  
  // Traverse up the parent chain from newParentId
  let currentId = newParentId;
  const visited = new Set();
  
  while (currentId) {
    if (currentId === fileId) {
      // newParentId is a descendant of fileId - circular!
      return true;
    }
    
    if (visited.has(currentId)) {
      // Prevent infinite loops
      break;
    }
    visited.add(currentId);
    
    // Move to parent
    const parent = memoryStore.getFileById(currentId);
    currentId = parent?.parentId || null;
  }
  
  return false;
};

// Parse EX2 protocol response into { code, body }
const parseEx2 = (resp) => {
  const s = String(resp || "");
  const code = parseInt(s.split(/\s+/)[0], 10) || 500;
  const parts = s.split(/\r?\n\r?\n/);
  const body = parts.length >= 2 ? parts.slice(1).join("\n\n") : "";
  return { code, body };
};

// GET all top-level items (filtered by user permissions)
exports.listTopLevel = (userId = null) => {
  const items = memoryStore.getTopLevel();
  
  // Filter by user permissions if userId provided
  const filteredItems = userId 
    ? items.filter(item => {
        // Exclude deleted files
        if (item.deletedAt) return false;
        // Check permissions
        return hasPermission(item.id, userId);
      })
    : items;
  
  // Return only public lightweight metadata to avoid leaking ex2Name
  return filteredItems.map(n => ({ id: n.id, name: n.name, type: n.type, starred: n.starred || false }));
};

exports.createFileOrFolder = async (name, type, ownerId = null, parentId = null, content = "") => {
  const id = String(memoryStore.newFileId()); // force string consistency

  const item = {
    id,
    name,
    type, // "file" or "folder"
    parentId: parentId ? String(parentId) : null,
    starred: false, // Initialize as not starred
  };

  // Add owner if provided
  if (ownerId) {
    item.ownerId = String(ownerId);
  }

  // Add content array for folders
  if (type === "folder") {
    item.content = [];
  }

  if (type === "file") {
    const ex2Name = makeEx2Name(id, name);
    item.ex2Name = ex2Name;

    const safeContent = (typeof content === "string") ? content : "";
    const resp = await tcp.postFile(ex2Name, safeContent);

    if (!String(resp).startsWith("201")) {
      const status = parseInt(String(resp).split(/\s+/)[0], 10) || 500;
      const err = new Error(`Ex2 post failed: ${resp}`);
      err.status = status;
      throw err;
    }
  }

  memoryStore.addFile(item);

  // Create owner permission if ownerId provided
  if (ownerId) {
    permissionsModel.create(id, ownerId, 'owner');
  }

  // DO NOT expose ex2Name or parentId in response
  const { ex2Name, parentId: _, ...pub } = item;
  
    // Add to recent files
    memoryStore.addToRecent(item.id);
  
  return pub;
};

// GET by id - returns metadata + content (for files) or children (for folders)
// If it's a shortcut, resolves to the target file
exports.getById = async (id, userId = null) => {
  let item = memoryStore.getFileById(id);
  if (!item) return null;

  // Check permissions if userId provided
  if (userId && !hasPermission(id, userId)) {
    const err = new Error("Permission denied");
    err.status = 403;
    throw err;
  }

  // If it's a shortcut, resolve to the target (but keep shortcut id in response)
  let targetItem = item;
  if (item.type === "shortcut" && item.targetId) {
    targetItem = memoryStore.getFileById(item.targetId);
    if (!targetItem) return null; // Target was deleted

    // Check permissions on target if userId provided
    if (userId && !hasPermission(targetItem.id, userId)) {
      const err = new Error("Permission denied");
      err.status = 403;
      throw err;
    }
  }

  // DO NOT expose ex2Name; build a public representation
  const pub = { 
    id: item.id,  // Use shortcut id if this is a shortcut
    name: targetItem.name, // Use target name
    type: targetItem.type,  // Use target type
    starred: targetItem.starred || false,
    targetId: item.type === "shortcut" ? item.targetId : undefined
  };
  
  // Add to recent files
  memoryStore.addToRecent(id);

  // For files: fetch content from EX2 and parse the protocol
  if (targetItem.type === "file") {
    try {
      const physicalName = targetItem.ex2Name || targetItem.name;
      const resp = await tcp.getFile(physicalName);
      const { code, body } = parseEx2(resp);
      if (code === 200) pub.content = body;
      else if (code === 404) pub.content = null;
      else {
        const err = new Error(`Ex2 get failed: ${resp}`);
        err.status = code || 500;
        throw err;
      }
    } catch (e) {
      pub.content = null;
    }
  }

  // For folders: return sanitized direct children, filtered by user permissions
  // Special handling for virtual folders (Trash, Starred, Recent, Shared with me)
  if (targetItem.type === "folder") {
    let visibleChildren = [];
    
    // Check for virtual folder views
    if (userId) {
      const user = memoryStore.getUsers().find(u => u.id === String(userId));
      const isTrashFolder = user && user.trashFolderId === targetItem.id;
      const isStarredFolder = user && user.starredFolderId === targetItem.id;
      const isRecentFolder = user && user.recentFolderId === targetItem.id;
      const isSharedFolder = user && user.sharedFolderId === targetItem.id;
      
      if (isTrashFolder) {
        // Trash folder is a virtual view of deleted files
        const trashModel = require("./trash.models");
        const trashedFiles = trashModel.getTrashedFiles(userId);
        visibleChildren = trashedFiles;
      } else if (isStarredFolder) {
        // Starred folder is a virtual view of starred files
        const starredModel = require("./starred.models");
        const starredFiles = starredModel.getStarredFiles(userId);
        visibleChildren = starredFiles;
      } else if (isRecentFolder) {
        // Recent folder is a virtual view of recently accessed files
        const recentModel = require("./recent.models");
        const recentFiles = recentModel.getRecentFiles(userId);
        visibleChildren = recentFiles;
      } else if (isSharedFolder) {
        // Shared folder is a virtual view of files shared with user
        const sharedModel = require("./shared.models");
        const sharedFiles = sharedModel.getSharedFiles(userId);
        visibleChildren = sharedFiles;
      } else {
        // Regular folder - show children filtered by permissions and exclude deleted
        const children = memoryStore.getChildrenOf(targetItem.id);
        visibleChildren = children
          .filter(child => !child.deletedAt && hasPermission(child.id, userId))
          .map(child => ({
            id: child.id,
            name: child.name,
            type: child.type,
            starred: child.starred || false
          }));
      }
    } else {
      // No userId - just show regular children, exclude deleted
      const children = memoryStore.getChildrenOf(targetItem.id);
      visibleChildren = children
        .filter(child => !child.deletedAt)
        .map(child => ({
          id: child.id,
          name: child.name,
          type: child.type,
          starred: child.starred || false
        }));
    }
    
    // Use 'content' field name to match React expectations
    pub.content = visibleChildren;
  }

  return pub;
};

// PATCH update by id (supports name, starred, parentId for moving, and content for files)
exports.updateById = async (id, patch, userId = null) => {
  const item = memoryStore.getFileById(id);
  if (!item) return null;

  // Check permissions if userId provided
  if (userId && !hasPermission(id, userId)) {
    const err = new Error("Permission denied");
    err.status = 403;
    throw err;
  }

  // Check edit permissions for name/content changes (only Editor/Owner can edit)
  const requiresEdit = patch.name !== undefined || patch.content !== undefined;
  if (requiresEdit && userId && !canEditFile(id, userId)) {
    const err = new Error("Permission denied: only Editor or Owner can modify file name or content");
    err.status = 403;
    throw err;
  }

  const oldEx2Name = item.type === "file" ? item.ex2Name : null;
  
  if (patch.name !== undefined) {
    item.name = patch.name;
    // Update ex2Name if this is a file
    if (item.type === "file") {
      item.ex2Name = makeEx2Name(item.id, patch.name);
    }
  }

  if (patch.starred !== undefined) {
    item.starred = Boolean(patch.starred);
  }

  // Handle content updates for files
  if (patch.content !== undefined && item.type === "file") {
    const newEx2Name = item.ex2Name || makeEx2Name(item.id, item.name);
    
    try {
      // Post the new content first, then delete old if it's different
      const resp = await tcp.postFile(newEx2Name, patch.content);
      
      // If we get 409, it means file exists. Delete it first and retry
      if (String(resp).startsWith("409")) {
        try {
          await tcp.deleteFile(newEx2Name);
          const retryResp = await tcp.postFile(newEx2Name, patch.content);
          if (!String(retryResp).startsWith("201")) {
            const status = parseInt(String(retryResp).split(/\s+/)[0], 10) || 500;
            const err = new Error(`Ex2 post failed after retry: ${retryResp}`);
            err.status = status;
            throw err;
          }
        } catch (retryErr) {
          throw retryErr;
        }
      } else if (!String(resp).startsWith("201")) {
        const status = parseInt(String(resp).split(/\s+/)[0], 10) || 500;
        const err = new Error(`Ex2 post failed: ${resp}`);
        err.status = status;
        throw err;
      }
      
      // Now delete old file if name changed
      if (oldEx2Name && oldEx2Name !== newEx2Name) {
        try {
          await tcp.deleteFile(oldEx2Name);
        } catch (e) {
          // Don't fail the operation if delete fails
        }
      }
    } catch (e) {
      // Re-throw EX2 errors
      throw e;
    }
  }

  // Handle move (change parentId)
  if (patch.parentId !== undefined) {
    const newParentId = patch.parentId ? String(patch.parentId) : null;
    
    // Validate new parent exists and is a folder (if not null)
    if (newParentId) {
      const newParent = memoryStore.getFileById(newParentId);
      if (!newParent) {
        const err = new Error("Parent folder not found");
        err.status = 404;
        throw err;
      }
      if (newParent.type !== "folder") {
        const err = new Error("Parent must be a folder");
        err.status = 400;
        throw err;
      }
      
      // Check user has permission to the new parent folder
      if (userId && !hasPermission(newParentId, userId)) {
        const err = new Error("Permission denied to parent folder");
        err.status = 403;
        throw err;
      }
    }
    
    // Prevent circular moves
    if (wouldCreateCircularMove(id, newParentId)) {
      const err = new Error("Cannot move folder into itself or its descendants");
      err.status = 400;
      throw err;
    }
    
    // Find and remove from old parent's children
    if (item.parentId) {
      const oldParent = memoryStore.getFileById(item.parentId);
      if (oldParent && oldParent.children) {
        const idx = oldParent.children.findIndex(c => c.id === id);
        if (idx !== -1) oldParent.children.splice(idx, 1);
      }
    } else {
      // Remove from roots
      const roots = memoryStore.getTopLevel();
      const idx = roots.findIndex(r => r.id === id);
      if (idx !== -1) roots.splice(idx, 1);
    }
    
    // Add to new parent's children
    item.parentId = newParentId;
    if (newParentId) {
      const newParent = memoryStore.getFileById(newParentId);
      if (newParent && !newParent.children) newParent.children = [];
      if (newParent) newParent.children.push(item);
    } else {
      // Add to roots
      memoryStore.getTopLevel().push(item);
    }
  }

  // Sanitize output: do not expose ex2Name or nested raw nodes
  
    // Add to recent files
    memoryStore.addToRecent(id);
  
  const pub = { id: item.id, name: item.name, type: item.type };
  if (item.type === "folder") {
    const children = item.children || [];
    pub.children = children.map(c => ({ id: c.id, name: c.name, type: c.type }));
  }
  return pub;
};

// DELETE by id (soft delete if not in trash, permanent delete if already in trash)
exports.deleteById = async (id, userId = null) => {
  const item = memoryStore.getFileById(id);
  if (!item) return false;

  // Check permissions if userId provided
  if (userId && !hasPermission(id, userId)) {
    const err = new Error("Permission denied");
    err.status = 403;
    throw err;
  }

  // If already in trash, permanently delete
  if (item.deletedAt) {
    const descendants = memoryStore.getDescendantsOf(id);
    
    // Permanently delete from EX2
    if (item.type === "file") {
      const ex2Name = item.ex2Name || item.name;
      try {
        await tcp.deleteFile(ex2Name);
      } catch (e) {
        // Continue even if EX2 delete fails
      }
    }

    // Permanently delete descendants from EX2
    for (const descendant of descendants) {
      if (descendant.type === "file") {
        const ex2Name = descendant.ex2Name || descendant.name;
        try {
          await tcp.deleteFile(ex2Name);
        } catch (e) {
          // Continue deletion even if one file fails
        }
      }
    }

    // Remove from trash
    memoryStore.removeFromTrash(id);
    for (const descendant of descendants) {
      memoryStore.removeFromTrash(descendant.id);
    }

    // Permanently delete permissions
    try {
      permissionsModel.deleteByFileId(id);
      for (const descendant of descendants) {
        permissionsModel.deleteByFileId(descendant.id);
      }
    } catch (e) {
      // Continue deletion even if permission deletion fails
    }

    // Permanently remove from memory (hard delete)
    memoryStore.removeFileById(id);
    return true;
  }

  // Otherwise, soft delete: mark as deleted and move to trash (BUT keep in EX2)
  item.deletedAt = new Date().toISOString();
  
  // Store in trash with original parent location
  memoryStore.addToTrash(id, item.parentId);

  // Get all descendants
  const descendants = memoryStore.getDescendantsOf(id);
  
  // Mark all descendants as deleted too
  for (const descendant of descendants) {
    descendant.deletedAt = new Date().toISOString();
    // Store descendants in trash with their original parent
    memoryStore.addToTrash(descendant.id, descendant.parentId);
  }

  // DO NOT delete from EX2 on soft delete - only delete when permanently removing from trash
  // DO NOT delete permissions on soft delete - files in trash should still be accessible by their owner

  return true;
};

// RESTORE by id - restore a deleted file/folder to its original location
exports.restoreById = async (id, userId = null) => {
  const item = memoryStore.getFileById(id);
  if (!item || !item.deletedAt) return null;

  // Check permissions if userId provided
  if (userId && !hasPermission(id, userId)) {
    const err = new Error("Permission denied");
    err.status = 403;
    throw err;
  }

  // Restore files to EX2
  if (item.type === "file") {
    const ex2Name = item.ex2Name || item.name;
    const resp = await tcp.postFile(ex2Name, "");
    if (!String(resp).startsWith("201") && !String(resp).startsWith("409")) {
      const status = parseInt(String(resp).split(/\s+/)[0], 10) || 500;
      const err = new Error(`Ex2 restore failed: ${resp}`);
      err.status = status;
      throw err;
    }
  }

  // Get all descendants and restore them to EX2
  const descendants = memoryStore.getDescendantsOf(id);
  for (const descendant of descendants) {
    if (descendant.type === "file" && descendant.deletedAt) {
      const ex2Name = descendant.ex2Name || descendant.name;
      try {
        await tcp.postFile(ex2Name, "");
      } catch (e) {
        // Continue restoration even if one file fails
      }
    }
  }

  // Clear deletedAt flag on this item and all descendants
  item.deletedAt = null;
  for (const descendant of descendants) {
    descendant.deletedAt = null;
    // Clear deletedAt flag on this item and all descendants
    item.deletedAt = null;
    for (const descendant of descendants) {
      descendant.deletedAt = null;
    }
  
    // Remove from trash
    memoryStore.removeFromTrash(id);
    for (const descendant of descendants) {
      memoryStore.removeFromTrash(descendant.id);
    }
  }

  // Restore permissions for this file and all descendants
  try {
    permissionsModel.restoreByFileId(id);
    for (const descendant of descendants) {
      permissionsModel.restoreByFileId(descendant.id);
    }
  } catch (e) {
    // Continue restoration even if permission restoration fails
  }

  // Add to recent files after restoration
  memoryStore.addToRecent(id);

  // Return public representation
  const pub = { id: item.id, name: item.name, type: item.type };
  if (item.type === "folder") {
    const children = memoryStore.getChildrenOf(id);
    pub.children = children.map(c => ({ id: c.id, name: c.name, type: c.type }));
  }
  return pub;
};
