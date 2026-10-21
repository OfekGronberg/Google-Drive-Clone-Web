"use strict";

const memoryStore = require("../lib/memoryStore");

// return all permissions for a file
const findAll = (fileId) => {
  return memoryStore.getPermissionsByFileId(fileId);
};

// find single permission by file id and permission id
const findById = (fileId, permissionId) => {
  const perm = memoryStore.getPermissionById(permissionId);
  if (!perm || String(perm.fileId) !== String(fileId)) return null;
  return perm;
};

// create new permission
const create = (fileId, userId, role) => {
  const newPerm = {
    id: memoryStore.newPermissionId(),
    fileId: String(fileId),
    userId: String(userId),
    role: String(role),
  };

  memoryStore.addPermission(newPerm);
  return newPerm;
};

// update existing permission fields
const update = (fileId, permissionId, updates = {}) => {
  const existingPermission = findById(fileId, permissionId);
  if (!existingPermission) return null;

  if (updates.userId) existingPermission.userId = String(updates.userId);
  if (updates.role) existingPermission.role = String(updates.role);

  return existingPermission;
};

// delete permission by id
const deletePermission = (fileId, permissionId) => {
  const perm = memoryStore.getPermissionById(permissionId);
  if (!perm || String(perm.fileId) !== String(fileId)) return null;

  memoryStore.removePermissionById(permissionId);
  return perm;
};

// delete all permissions for a file (cascade delete)
const deleteByFileId = (fileId) => {
  const perms = memoryStore.getPermissionsByFileId(fileId);
  for (const perm of perms) {
    memoryStore.removePermissionById(perm.id);
  }
  return perms.length;
};

module.exports = {
  findAll,
  findById,
  create,
  update,
  deletePermission,
  deleteByFileId,
};
