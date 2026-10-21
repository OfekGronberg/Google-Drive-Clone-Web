"use strict";

const memoryStore = require("../lib/memoryStore");

/**
 * Get or create system folders for a user (Starred, Trash, Recent)
 * These folders are hidden from normal navigation (isSystemFolder: true)
 * @param {string} userId - The user ID
 * @returns {Object} - { starred, trash, recent } folder objects
 */
exports.getOrCreateSystemFolders = (userId) => {
  const userId_str = String(userId);
  
  // Helper to find or create a system folder
  const getOrCreateFolder = (name, type = "system-folder") => {
    const allFiles = memoryStore.getFiles();
    
    // Look for existing system folder for this user
    const existing = allFiles.find(f => 
      f.isSystemFolder && 
      f.ownerId === userId_str && 
      f.name === name &&
      f.type === "folder"
    );
    
    if (existing) return existing;
    
    // Create new system folder
    const id = String(memoryStore.newFileId());
    const folder = {
      id,
      name,
      type: "folder",
      ownerId: userId_str,
      isSystemFolder: true,  // Hidden from normal navigation
      parentId: null,        // Root level
      children: []
    };
    
    memoryStore.addFile(folder);
    
    // Auto-grant permission to owner
    const permissionsModel = require("./permissions.models");
    permissionsModel.create(id, userId_str, "owner");
    
    return folder;
  };
  
  return {
    starred: getOrCreateFolder("Starred"),
    trash: getOrCreateFolder("Trash"),
    recent: getOrCreateFolder("Recent")
  };
};

/**
 * Create a shortcut to a file in a target folder
 * @param {string} targetId - ID of file being linked to
 * @param {string} parentId - ID of folder to create shortcut in
 * @returns {Object} - The shortcut object
 */
exports.createShortcut = (targetId, parentId) => {
  const targetId_str = String(targetId);
  const parentId_str = String(parentId);
  
  const target = memoryStore.getFileById(targetId_str);
  if (!target) {
    const err = new Error("Target file not found");
    err.status = 404;
    throw err;
  }
  
  const parent = memoryStore.getFileById(parentId_str);
  if (!parent || parent.type !== "folder") {
    const err = new Error("Parent must be a folder");
    err.status = 400;
    throw err;
  }
  
  const id = String(memoryStore.newFileId());
  const shortcut = {
    id,
    name: target.name,
    type: "shortcut",
    targetId: targetId_str,
    parentId: parentId_str
  };
  
  memoryStore.addFile(shortcut);
  
  return shortcut;
};

/**
 * Resolve a shortcut or return the file as-is
 * If file is a shortcut, returns the target file
 * @param {string} fileId - ID of file (could be shortcut or regular file)
 * @returns {Object|null} - The resolved file or null
 */
exports.resolveFile = (fileId) => {
  const file = memoryStore.getFileById(fileId);
  if (!file) return null;
  
  if (file.type === "shortcut" && file.targetId) {
    return memoryStore.getFileById(file.targetId);
  }
  
  return file;
};

/**
 * Get all shortcuts pointing to a target
 * @param {string} targetId - ID of target file
 * @returns {Array} - Array of shortcut objects
 */
exports.getShortcutsTo = (targetId) => {
  const targetId_str = String(targetId);
  const allFiles = memoryStore.getFiles();
  
  return allFiles.filter(f => 
    f.type === "shortcut" && 
    f.targetId === targetId_str
  );
};

/**
 * Delete shortcut by ID
 * @param {string} shortcutId - ID of shortcut to delete
 * @returns {boolean} - Success
 */
exports.deleteShortcut = (shortcutId) => {
  return memoryStore.removeFileById(shortcutId);
};
