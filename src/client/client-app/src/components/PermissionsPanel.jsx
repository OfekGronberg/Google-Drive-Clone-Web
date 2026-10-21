import { useState } from "react";

export default function PermissionsPanel({ file, currentUser, onChange }) {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("Reader");
  const [error, setError] = useState("");

  //check file and owner are valid
  if (!file || !currentUser || file.owner !== currentUser) {
    return null;
  }

  //handle add permission
  const handleAdd = () => {
    const trimmed = username.trim();
    setError("");
    if (!trimmed) {
      setError( "Username is required" );
      return;
    }
    if (trimmed=== currentUser) {
      setError( "Cannot change owner permissions");
      return;
    }

    //get copy of permission
    function getPermissionsCopy(permissions) {
      if (Array.isArray(permissions)) {
        return permissions.slice();
      }
      return [];
    }
    const existingPermissions = getPermissionsCopy(file.permissions);

    const index = existingPermissions.findIndex((p) => p.username === trimmed);

    if (index === -1) {
      existingPermissions.push({ username: trimmed, role: role });
    } else {
      // Simple behavior: update existing role
      existingPermissions[index] = { username: trimmed, role: role };
    }

    const updatedFile = {
      ...file,
      permissions: existingPermissions,
    };

    //update file
    onChange && onChange(updatedFile);
    setUsername("");
    setRole("Reader");
  };


  //handle remove permission  
  const handleRemove = (userToRemove) => {
    //get copy of permission
    function getPermissionsCopy(permissions) {
      if (permissions) {
        return [...permissions];
      }
      return [];
    }
    const existingPermissions = getPermissionsCopy(file.permissions);

    const updatedPermissions = existingPermissions.filter(
      (p) => p.username !== userToRemove
    );

    const updatedFile = {
      ...file,
      permissions: updatedPermissions,
    };

    onChange && onChange(updatedFile);
  };

  function getPermissionsList(permissions) {
    if (permissions) {
      return permissions;
    }
    return [];
  }
  const list = getPermissionsList(file.permissions);

  return (
    //permissions panel
    <div style={{
      marginTop: 16,
      padding: 12,
      border: "1px solid #ddd",
      borderRadius: "4px",
      backgroundColor: "white"
    }}>
    //title
      <h3 style={{
        margin: "0 0 16px 0",
        fontSize: "18px",
        fontWeight: "bold"
      }}>
        Permissions
      </h3>

      <div style={{
        display: "flex",
        gap: 8,
        marginBottom: 8
      }}>
        //username input
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          style={{
            flex: 1,
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
            boxSizing: "border-box"
          }}
        />
        //role select
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
            boxSizing: "border-box"
          }}
        >
          //role options
          <option value="Reader">Reader</option>
          <option value="Editor">Editor</option>
        </select>
        <button
          onClick={handleAdd}
          style={{
            padding: "12px 24px",
            border: "none",
            borderRadius: "4px",
            backgroundColor: "#4285f4",
            color: "white",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer"
          }}
        >
          Add
        </button>
      </div>

      {error && (
        <div style={{
          color: "red",
          marginBottom: "16px",
          fontSize: "14px"
        }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        {list.length === 0 && (
          <div style={{
            fontSize: "14px",
            color: "#666"
          }}>
            No extra permissions
          </div>
        )}
        {list.map((p) => (
          <div
            key={p.username}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 0",
              borderTop: "1px solid #eee"
            }}
          >
            <span style={{ flex: 1, fontSize: "14px" }}>{p.username}</span>
            <span style={{
              width: 80,
              textAlign: "center",
              fontSize: "14px",
              color: "#555"
            }}>
              {p.role}
            </span>
            <button
              onClick={() => handleRemove(p.username)}
              style={{
                padding: "6px 12px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: "#d9534f",
                color: "white",
                fontSize: "14px",
                cursor: "pointer",
                marginLeft: 8
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


