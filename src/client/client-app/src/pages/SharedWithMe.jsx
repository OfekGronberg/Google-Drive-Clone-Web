import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getRole } from "../utils/permissions";

//helper to get current user
function getCurrentUser() {
  return localStorage.getItem("username") || "";
}

//shared with me page
export default function SharedWithMePage({ files: propsFiles, currentUser: propsCurrentUser, onOpen }) {
  const navigate = useNavigate();
  const currentUser = propsCurrentUser || getCurrentUser();

  const files = propsFiles || [];

  //get shared files
  const sharedFiles = useMemo(() => {
    return files
      .map((file) => {
        const role = getRole(file, currentUser);
        return { file, role };
      })
      .filter((item) => item.role === "Editor" || item.role === "Reader");
  }, [files, currentUser]);

  //handle open file
  const handleOpen = (file) => {
    if (onOpen) {
      onOpen(file);
      return;
    }
    // Default behavior: navigate to the files route with id
    navigate(`/files/${file.id}`);
  };

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{
        fontSize: "24px",
        fontWeight: "bold",
        marginBottom: "24px"
      }}>
        Shared with me
      </h1>

      {sharedFiles.length === 0 && (
        <div style={{
          fontSize: "14px",
          color: "#666"
        }}>
          No shared files
        </div>
      )}

      {sharedFiles.length > 0 && (
        <div style={{
          borderTop: "1px solid #ddd",
          marginTop: 8
        }}>
          //map shared files
          {sharedFiles.map(({ file, role }) => (
            <div
              key={file.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid #eee"
              }}
            >
              //file details
              <div style={{
                display: "flex",
                gap: 16,
                alignItems: "center"
              }}>
                <div style={{
                  fontWeight: "500",
                  fontSize: "14px"
                }}>
                  {file.name}
                </div>
                <div style={{
                  fontSize: "13px",
                  color: "#555"
                }}>
                  {file.type === "folder" ? "Folder" : "File"}
                </div>
                <div style={{
                  fontSize: "13px",
                  color: "#333"
                }}>
                  {role}
                </div>
              </div>
              <button
                //open file
                onClick={() => handleOpen(file)}
                style={{
                  padding: "12px 24px",
                  borderRadius: "4px",
                  border: "none",
                  backgroundColor: "#4285f4",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                Open
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


