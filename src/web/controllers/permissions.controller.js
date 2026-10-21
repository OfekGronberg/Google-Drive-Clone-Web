"use strict";

const memoryStore = require("../lib/memoryStore");
const Permissions = require("../modules/permissions.models");

function listPermissions(request, response) {
  const fileId = String(request.params.id || "");
  const userId = request.user?.userId;

  const fileExists = memoryStore.getFiles().some((file) => file.id === fileId);
  if (!fileExists) {
    return response.status(404).json({ error: "File not found" });
  }

  const file = memoryStore.getFileById(fileId);
  
  // If user has no permission to access this file, return empty array or unauthorized
  const userPermission = Permissions.findAll(fileId).find(p => String(p.userId) === String(userId));
  if (!userPermission) {
    return response.status(403).json({ error: "Access denied" });
  }

  // Return user's own permission first, then all permissions if they're the owner
  if (String(userPermission.role) === "owner") {
    const permissions = Permissions.findAll(fileId);
    return response.status(200).json(permissions);
  } else {
    // Non-owner users only see their own permission
    return response.status(200).json([userPermission]);
  }
}

function createPermission(request, response) {
  const fileId = String(request.params.id || "");
  const currentUserId = request.user?.userId;

  const userIdOrUsername = request.body && request.body.userId ? String(request.body.userId) : "";
  const role = request.body && request.body.role ? String(request.body.role) : "";

  if (!userIdOrUsername || !role) {
    return response.status(400).json({ error: "userId and role are required" });
  }

  const fileExists = memoryStore.getFiles().some((file) => file.id === fileId);
  if (!fileExists) {
    return response.status(404).json({ error: "File not found" });
  }

  // Check if current user is the owner of the file
  const userPermissions = Permissions.findAll(fileId);
  const currentUserPerm = userPermissions.find(p => String(p.userId) === String(currentUserId));
  
  if (!currentUserPerm || String(currentUserPerm.role) !== "owner") {
    return response.status(403).json({ error: "Only the file owner can grant permissions" });
  }

  // Look up user by ID or username
  const allUsers = memoryStore.getUsers();
  const targetUser = allUsers.find((user) => user.id === userIdOrUsername || user.username === userIdOrUsername);
  
  if (!targetUser) {
    return response.status(404).json({ error: "User not found" });
  }

  const userId = targetUser.id;

  // Check if permission already exists for this user
  const existingPerm = userPermissions.find(p => String(p.userId) === String(userId));
  if (existingPerm) {
    return response.status(400).json({ error: "Permission already exists for this user" });
  }

  const permission = Permissions.create(fileId, userId, role);
  
  // Create shortcut in the user's Shared with me folder
  const sharedModel = require("../modules/shared.models");
  sharedModel.createShortcutInShared(fileId, userId);
  
  return response.status(201).json(permission);
}

function updatePermission(request, response) {
  const fileId = String(request.params.id || "");
  const permissionId = String(request.params.pId || "");
  const currentUserId = request.user?.userId;

  // File must exist
  const fileExists = memoryStore.getFiles().some((file) => file.id === fileId);
  if (!fileExists) {
    return response.status(404).json({ error: "File not found" });
  }

  const permission = Permissions.findById(fileId, permissionId);
  if (!permission) {
    return response.status(404).json({ error: "Permission not found" });
  }

  // Check if current user is the owner of the file
  const userPermissions = Permissions.findAll(fileId);
  const currentUserPerm = userPermissions.find(p => String(p.userId) === String(currentUserId));
  
  if (!currentUserPerm || String(currentUserPerm.role) !== "owner") {
    return response.status(403).json({ error: "Only the file owner can modify permissions" });
  }

  const userId = request.body && request.body.userId ? String(request.body.userId) : "";
  const role = request.body && request.body.role ? String(request.body.role) : "";

  if (!userId && !role) {
    return response.status(400).json({ error: "userId or role is required" });
  }

  if (userId) {
    const userExists = memoryStore.getUsers().some((user) => user.id === userId);
    if (!userExists) {
      return response.status(404).json({ error: "User not found" });
    }
  }

  // Only update provided fields (avoid overwriting with "")
  const patch = {};
  if (userId) patch.userId = userId;
  if (role) patch.role = role;

  Permissions.update(fileId, permissionId, patch);

  // Match assignment style: PATCH -> 204 No Content
  return response.status(204).send();
}

function deletePermission(request, response) {
  const fileId = String(request.params.id || "");
  const permissionId = String(request.params.pId || "");
  const currentUserId = request.user?.userId;

  // File must exist
  const fileExists = memoryStore.getFiles().some((file) => file.id === fileId);
  if (!fileExists) {
    return response.status(404).json({ error: "File not found" });
  }

  const permission = Permissions.findById(fileId, permissionId);
  if (!permission) {
    return response.status(404).json({ error: "Permission not found" });
  }

  // Check if current user is the owner of the file
  const userPermissions = Permissions.findAll(fileId);
  const currentUserPerm = userPermissions.find(p => String(p.userId) === String(currentUserId));
  
  if (!currentUserPerm || String(currentUserPerm.role) !== "owner") {
    return response.status(403).json({ error: "Only the file owner can revoke permissions" });
  }

  // Owner cannot remove their own permission
  if (String(permission.userId) === String(currentUserId) && String(permission.role) === "owner") {
    return response.status(403).json({ error: "Owner cannot remove their own permission" });
  }
  
  // Remove shortcut from the user's Shared with me folder
  const sharedModel = require("../modules/shared.models");
  sharedModel.removeShortcutFromShared(fileId, permission.userId);
  
  const deleted = Permissions.deletePermission(fileId, permissionId);
  if (!deleted) {
    return response.status(404).json({ error: "Permission not found" });
  }

  // Match assignment style: DELETE -> 204 No Content
  return response.status(204).send();
}

module.exports = {
  listPermissions,
  createPermission,
  updatePermission,
  deletePermission,
};
