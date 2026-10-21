"use strict";

const memoryStore = require("../lib/memoryStore");

/**
 * Get all files in the user's Shared with me folder (shortcuts to shared files)
 * @param {string} userId - The user ID
 * @returns {Array} - Array of shortcut objects pointing to shared files
 */
exports.getSharedFiles = (userId) => {
  const user = memoryStore.getUsers().find(u => u.id === String(userId));
  if (!user || !user.sharedFolderId) return [];

  // Get all shortcuts in the user's Shared folder
  const shortcuts = memoryStore.getChildrenOf(user.sharedFolderId);
  
  const result = shortcuts
    .filter(shortcut => {
      // Only include shortcuts
      if (shortcut.type !== "shortcut") return false;
      
      // Check that target exists and is not deleted
      if (!shortcut.targetId) return false;
      const target = memoryStore.getFileById(shortcut.targetId);
      if (!target || target.deletedAt) return false;
      
      return true;
    })
    .map(shortcut => {
      const target = memoryStore.getFileById(shortcut.targetId);
      return {
        id: shortcut.id,
        name: target.name,
        type: target.type,
        starred: target.starred || false,
        targetId: shortcut.targetId
      };
    });
  
  return result;
};

/**
 * Create a shortcut to a file in the user's Shared with me folder
 * @param {string} targetFileId - The ID of the file being shared
 * @param {string} userId - The user ID to share with
 * @returns {object|null} - The created shortcut, or null if failed
 */
exports.createShortcutInShared = (targetFileId, userId) => {
  const user = memoryStore.getUsers().find(u => u.id === String(userId));
  if (!user || !user.sharedFolderId) return null;

  const originalFile = memoryStore.getFileById(targetFileId);
  if (!originalFile) return null;

  // Check if shortcut already exists
  const sharedFolder = memoryStore.getFileById(user.sharedFolderId);
  if (!sharedFolder || sharedFolder.type !== "folder") return null;

  const children = memoryStore.getChildrenOf(user.sharedFolderId);
  const shortcutExists = children.some(child => 
    child.type === "shortcut" && child.targetId === targetFileId
  );

  if (shortcutExists) return null; // Already has shortcut

  // Create new shortcut
  const shortcutId = String(memoryStore.newFileId());
  const shortcut = {
    id: shortcutId,
    name: originalFile.name,
    type: "shortcut",
    targetId: targetFileId,
    parentId: user.sharedFolderId,
    starred: false,
  };

  memoryStore.addFile(shortcut);

  // Create owner permission for the shortcut itself (user owns the shortcut)
  const permissionsModel = require("./permissions.models");
  permissionsModel.create(shortcutId, userId, "owner");

  return shortcut;
};

/**
 * Remove shortcut from user's Shared with me folder
 * @param {string} targetFileId - The ID of the file being unshared
 * @param {string} userId - The user ID
 * @returns {boolean} - True if removed, false if not found
 */
exports.removeShortcutFromShared = (targetFileId, userId) => {
  const user = memoryStore.getUsers().find(u => u.id === String(userId));
  if (!user || !user.sharedFolderId) return false;

  const children = memoryStore.getChildrenOf(user.sharedFolderId);
  const shortcut = children.find(child => 
    child.type === "shortcut" && child.targetId === targetFileId
  );

  if (shortcut) {
    memoryStore.removeFileById(shortcut.id);
    return true;
  }

  return false;
};
