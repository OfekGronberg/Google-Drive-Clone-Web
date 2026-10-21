import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
const API = process.env.REACT_APP_API_BASE || "http://localhost:3000";

export default function SignupPage() {
  const usernameRef= useRef(null);
  const passwordRef = useRef(null);
  const nameRef = useRef(null);
  const [error, setError]= useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const username =usernameRef.current.value.trim();
    const password =passwordRef.current.value.trim();
    const name =nameRef.current.value.trim();

    if (!username){
      setError("username is required");
      return;
    }
    if (!password) {
      setError("password is required");
      return;
    }
    setLoading(true);

    //make api request to create user
    try {
      const body = {
        username: username,
        password: password,
      };

      if (name) {
        body.name = name;
      }      
        //make api request to create user
        const res = await fetch(`${API}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      //handle response from api
      if (res.ok) {
          // After signup, automatically request a token and log the user in
          try {
            const tokenResp = await fetch(`${API}/api/tokens`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: username, password: password }),
            });

            if (tokenResp.ok) {
              const tokenData = await tokenResp.json();
              if (tokenData.token) {
                try {
                  const b = tokenData.token.split('.')[1];
                  const payload = JSON.parse(atob(b.replace(/-/g, '+').replace(/_/g, '/')));
                  auth.login(tokenData.token, payload?.userId);
                } catch (e) {
                  // fallback: still login with token
                  auth.login(tokenData.token);
                }
              }
            }

            navigate("/files");
          } catch (e) {
            // fallback: go to login
            navigate("/login");
          }
      } else{
        try {
          const data = await res.json();
          if (data.error) {
            setError(data.error);
          } else {
            setError(`signup failed (status: ${res.status})`);
          }
        } catch (err) {
          setError(`signup failed (status: ${res.status})`);
        }
      }
    } catch (err) {
      setError(`server error: ${err.message}`);
    } finally{
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display:"flex", 
      minHeight:"100vh",
      backgroundColor:"#f5f5f5"
    }}>
      <div style={{ 
        width: "100%", 
        maxWidth: 600, 
        margin: "0 auto",
        padding: "40px 20px",
        backgroundColor: "white"
      }}>
        <h1 style={{ 
          fontSize: "24px", 
          fontWeight:"bold", 
          marginBottom: "32px" 
        }}>
          Sign up
        </h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "24px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "500"
            }}>
              Username
            </label>
            <input
              type="text"
              ref={usernameRef}
              placeholder="Enter your username"
              style={{ 
                width: "100%", 
                padding: "12px", 
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                boxSizing: "border-box"
              }}
            />
          </div>
          <div style={{ marginBottom: "24px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "500"
            }}>
              Password
            </label>
            <input
              type="password"
              ref={passwordRef}
              placeholder="Enter your password"
              style={{ 
                width: "100%", 
                padding: "12px", 
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                boxSizing: "border-box"
              }}
            />
          </div>
          <div style={{ marginBottom: "24px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "500"
            }}>
              Name
            </label>
            <input
              type="text"
              ref={nameRef}
              placeholder="Enter your name (optional)"
              style={{ 
                width: "100%", 
                padding: "12px", 
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                boxSizing: "border-box"
              }}
            />
            <div style={{ 
              fontSize: "12px", 
              color: "#666", 
              marginTop: "4px" 
            }}>
              Leave blank to keep the current name
            </div>
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
          
          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              padding: "12px 24px", 
              width: "100%",
              backgroundColor: loading ? "#ccc" : "#4285f4",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Loading..." : "Sign Up"}
          </button>
        </form>
        
        <p style={{ 
          marginTop: "24px", 
          textAlign: "center",
          fontSize: "14px",
          color: "#666"
        }}>
          Already have an account? <a href="/login" style={{ color: "#4285f4" }}>Login</a>
        </p>
      </div>
    </div>
  );
}
