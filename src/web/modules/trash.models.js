"use strict";

const memoryStore = require("../lib/memoryStore");

/**
 * Get all trashed files for a user (filtered by permissions)
 * @param {string} userId - The user ID
 * @returns {Array} - Array of trashed file objects
 */
exports.getTrashedFiles = (userId) => {
  const allFiles = memoryStore.getFiles();
  
  return allFiles
    .filter(file => {
      // Only include deleted files
      if (!file.deletedAt) return false;
      
      // Check permissions
      const perms = memoryStore.getPermissionsByFileId(file.id);
      return perms.some(p => String(p.userId) === String(userId));
    })
    .map(({ ex2Name, ...pub }) => ({
      ...pub,
      starred: pub.starred || false,
      deletedAt: pub.deletedAt
    }));
};
