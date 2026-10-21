"use strict";
// helper functions for checking user permissions 
// (owner/editor/reader) for files 

// Get the role of the current user for a specific file
export function getRole(file, currentUser) {
  if (!file || !currentUser) {
    return null;
  }
  if (file.owner === currentUser){
    return "Owner";
  }
  if(Array.isArray(file.permissions)) {
    const entry = file.permissions.find((p) => p.username === currentUser);
    if (entry && entry.role) {
      return entry.role;
    }
  }
  return null;
}

//check if user can view the file
export function canView(role) {
  return role === "Owner" || role === "Editor" || role === "Reader";
}

// check if user can edit the file
export function canEdit(role) {
  return role=== "Owner" || role === "Editor";
}

// check if user is the owner
export function isOwner(role){
  return role ==="Owner";
}


