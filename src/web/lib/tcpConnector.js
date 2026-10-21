"use strict";

const net = require("net");

const EX2_HOST = process.env.EX2_HOST || "127.0.0.1";
const EX2_PORT = Number(process.env.EX2_PORT || 5555);

const CONNECT_TIMEOUT_MS = Number(process.env.EX2_CONNECT_TIMEOUT_MS || 1500);
const IO_TIMEOUT_MS = Number(process.env.EX2_IO_TIMEOUT_MS || 3000);

function mlpPack(message) {
  const msgBuf = Buffer.from(message, "utf8");
  const header = Buffer.from(String(msgBuf.length) + " ", "utf8");
  return Buffer.concat([header, msgBuf]);
}

function sendOne(cmd, preserveNewlines = false) {
  // For commands with content (like post), preserve newlines
  // For other commands (delete, get, search), strip newlines
  const clean = preserveNewlines ? String(cmd) : String(cmd).replace(/\r?\n/g, "");
  const packet = mlpPack(clean);

  return new Promise((resolve, reject) => {
    const sock = new net.Socket();
    let rxBuf = Buffer.alloc(0);

    const cleanup = () => {
      sock.removeAllListeners();
      try { sock.destroy(); } catch (_) {}
    };

    const fail = (err) => {
      cleanup();
      reject(err);
    };

    const tryParse = () => {
      let i = 0;
      while (i < rxBuf.length && rxBuf[i] >= 48 && rxBuf[i] <= 57) i++;
      if (i === 0) return;
      if (i >= rxBuf.length) return;
      if (rxBuf[i] !== 32) return fail(new Error("Invalid MLP header"));

      const lenStr = rxBuf.slice(0, i).toString("utf8");
      const msgLen = Number(lenStr);
      if (!Number.isFinite(msgLen) || msgLen < 0) return fail(new Error("Invalid MLP length"));

      const headerSize = i + 1;
      const total = headerSize + msgLen;
      if (rxBuf.length < total) return;

      const msg = rxBuf.slice(headerSize, total).toString("utf8");
      cleanup();
      resolve(msg);
    };

    sock.setTimeout(IO_TIMEOUT_MS, () => fail(new Error("Ex2 socket timeout")));
    sock.on("error", fail);
    sock.on("close", () => fail(new Error("Ex2 connection closed")));
    sock.on("data", (chunk) => {
      rxBuf = Buffer.concat([rxBuf, chunk]);
      tryParse();
    });

    sock.connect(EX2_PORT, EX2_HOST, () => {
      sock.write(packet, (err) => {
        if (err) fail(err);
      });
    });

    setTimeout(() => {
      if (!sock.destroyed && sock.readyState !== "open") {
        fail(new Error("Ex2 connect timeout"));
      }
    }, CONNECT_TIMEOUT_MS);
  });
}

async function sendCommand(cmd) {
  return sendOne(cmd);
}

async function postFile(filename, content) {
  // For post command, we need to preserve newlines in the content
  // The command format is: "post <filename> <content>"
  // We only strip newlines from the header part, not the content
  const prefix = `post ${filename} `;
  const safePrefix = prefix.replace(/\r?\n/g, ""); // Strip newlines from header only
  const fullCmd = safePrefix + (content ?? "");
  return sendOne(fullCmd, true); // Pass true to indicate this has content with newlines
}

async function getFile(filename) {
  return sendOne(`get ${filename}`);
}

async function deleteFile(filename) {
  return sendOne(`delete ${filename}`);
}

async function search(text) {
  return sendOne(`search ${text}`);
}

module.exports = {
  sendCommand,
  postFile,
  getFile,
  deleteFile,
  search,
};
