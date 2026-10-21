"use strict";

const memoryStore = require("../lib/memoryStore");

/**
 * Get all recent files for a user
 * Returns files from the recent access queue in order (deduplicated, most recent first)
 */
exports.getRecentFiles = (userId, limit = 50) => {
  const recentIds = memoryStore.getRecent();
  
  // Reverse to get most recent first, and deduplicate
  const seen = new Set();
  const recentFilesReversed = [];
  
  for (let i = recentIds.length - 1; i >= 0; i--) {
    const fileId = recentIds[i];
    
    // Skip if already added (deduplication)
    if (seen.has(fileId)) continue;
    seen.add(fileId);
    
    const file = memoryStore.getFileById(fileId);
    
    if (!file) continue;
    
    // Exclude system folders
    if (file.isSystem) continue;
    
    // Exclude deleted files
    if (file.deletedAt) continue;
    
    // Check permissions
    const perms = memoryStore.getPermissionsByFileId(file.id);
    if (!perms.some(p => String(p.userId) === String(userId))) continue;
    
    recentFilesReversed.push({
      id: file.id,
      name: file.name,
      type: file.type,
      starred: file.starred || false
    });
    
    if (recentFilesReversed.length >= limit) break;
  }
  
  return recentFilesReversed;
};
