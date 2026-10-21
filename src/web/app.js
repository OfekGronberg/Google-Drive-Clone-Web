"use strict";
const express = require("express");

const usersRoutes = require("./routes/users.routes");
const tokensRoutes = require("./routes/tokens.routes");
const filesRoutes = require("./routes/files.routes");
const permissionsRoutes = require("./routes/permissions.routes");
const searchRoutes = require("./routes/search.routes");
const starredRoutes = require("./routes/starred.routes");
const trashRoutes = require("./routes/trash.routes");
const recentRoutes = require("./routes/recent.routes");
const requireAuth = require("./middleware/auth.middleware");

const app = express();
const port = Number(process.env.PORT || 3000);

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// parse JSON
app.use(express.json());
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  next(err);
});
// Routes
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/users", usersRoutes);
app.use("/api/tokens", tokensRoutes);

app.use(requireAuth); // Require auth for all routes below

app.use("/api/files", filesRoutes);
app.use("/api/files", permissionsRoutes); // nested under /api/files/:id/...
app.use("/api/search", searchRoutes);
app.use("/api/starred", starredRoutes);
app.use("/api/trash", trashRoutes);
app.use("/api/recent", recentRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  const status = err.status && Number.isInteger(err.status) ? err.status : 500;
  res.status(status).json({ error: status === 500 ? "Internal Server Error" : "Error" });
});

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  console.error('Stack:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise);
  console.error('Reason:', reason);
  if (reason && reason.stack) {
    console.error('Stack:', reason.stack);
  }
});

server.on('clientError', (err, socket) => {
  console.error('Client error:', err);
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

process.on('SIGPIPE', () => {
  console.error('SIGPIPE received');
});
