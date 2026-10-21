import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const API = process.env.REACT_APP_API_BASE || "http://localhost:3000";

function parseJwt(token) {
  try {
    const b = token.split(".")[1] || "";
    const json = JSON.parse(atob(b.replace(/-/g, "+").replace(/_/g, "/")));
    return json;
  } catch (e) {
    return null;
  }
}

export default function LoginPage() {
  const usernameRef= useRef(null);
  const passwordRef = useRef(null);
  const [error, setError]= useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();

  //check if already logged in
  useEffect(() =>{
    const token = localStorage.getItem( "token" );
    if (token) {
      navigate( "/files");
    }
  }, [navigate]);
  
  //handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    // get username and password 
    const username =usernameRef.current.value.trim();
    const password =passwordRef.current.value.trim();

    if (!username){
      setError("username is required");
      return;
    }
    if (!password) {
      setError("password is required");
      return;
    }
    setLoading(true);

    //make api request to get the token
    try {
      const res = await fetch(`${API}/api/tokens`, {
        method: "POST",
        headers: {
          "Content-Type":"application/json",
        },
        body: JSON.stringify({
          username:username,
          password:password,
        }),
      });

      //handle response from api
      if (res.ok){
        const data= await res.json();
        let token;
        if (data.userId) {
          token = data.userId;
        } else if (data.token) {
          token = data.token;
        }
        //store token and username, then navigate to files page
        if (token) {
          // use AuthContext to persist token and userId
          const payload = parseJwt(token);
          auth.login(token, payload?.userId);
          navigate("/files");
        } else {
          setError("invalid credentials");
        }
        // error from api and server
      } else{
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setError("invalid credentials");
        }
      }
    } catch (err) {
      setError("server error");
    } finally{
      setLoading(false);
    }
  };

  
  return (
    //background
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
          Log in
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
            //button text
          >
            {loading ? "Loading..." : "Log in"}
          </button>
        </form>
        <p style={{ 
          marginTop: "24px", 
          textAlign: "center",
          fontSize: "14px",
          color: "#666"
        }}>
          Don't have an account? <a href="/signup" style={{ color: "#4285f4" }}>Sign Up</a>
        </p>
      </div>
    </div>
  );
}
