const https = require("https");
const http = require("http");
const crypto = require("crypto");
const { Pool } = require("pg");

// ======================================================
// CONFIG
// ======================================================

const BOT_TOKEN = process.env.BOT_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;

const WEB_APP_URL =
  "https://frelancershorif.github.io/taska-mini-app/";

const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is missing!");
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error("DATABASE_URL is missing!");
  process.exit(1);
}

// ======================================================
// DATABASE
// ======================================================

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on("error", (error) => {
  console.error("Database pool error:", error.message);
});

// ======================================================
// CREATE DATABASE TABLES
// ======================================================

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id BIGINT PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      photo_url TEXT,
      balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("Database tables are ready.");
}

// ======================================================
// TELEGRAM API
// ======================================================

function telegram(method, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: "api.telegram.org",
      path: `/bot${BOT_TOKEN}/${method}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", reject);

    req.write(postData);
    req.end();
  });
}

// ======================================================
// BOT /START MESSAGE
// ======================================================

async function sendStartMessage(chatId, firstName = "there") {
  await telegram("sendMessage", {
    chat_id: chatId,

    text:
      `Welcome to Taska, ${firstName}!\n\n` +
      `Complete tasks\n` +
      `Watch ads\n` +
      `Refer friends\n` +
      `Earn rewards\n\n` +
      `Tap below to open Taska`,

    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Open Taska",
            web_app: {
              url: WEB_APP_URL
            }
          }
        ]
      ]
    }
  });
}

// ======================================================
// PROCESS TELEGRAM UPDATES
// ======================================================

async function processUpdate(update) {
  if (!update.message) return;

  const message = update.message;
  const chatId = message.chat.id;
  const text = message.text || "";

  if (text === "/start" || text.startsWith("/start ")) {
    const firstName =
      message.from?.first_name || "there";

    await sendStartMessage(chatId, firstName);
  }
}

// ======================================================
// TELEGRAM POLLING
// ======================================================

let offset = 0;

async function startBot() {
  console.log("Taska bot is starting...");

  while (true) {
    try {
      const result = await telegram("getUpdates", {
        offset: offset,
        timeout: 30,
        allowed_updates: ["message"]
      });

      if (result.ok && Array.isArray(result.result)) {
        for (const update of result.result) {
          offset = update.update_id + 1;

          try {
            await processUpdate(update);
          } catch (error) {
            console.error(
              "Update processing error:",
              error.message
            );
          }
        }
      }
    } catch (error) {
      console.error(
        "Telegram connection error:",
        error.message
      );

      await new Promise((resolve) =>
        setTimeout(resolve, 5000)
      );
    }
  }
}

// ======================================================
// TELEGRAM MINI APP INIT DATA VALIDATION
// ======================================================

function validateTelegramInitData(initData) {
  if (!initData || typeof initData !== "string") {
    return {
      valid: false,
      error: "Missing Telegram initData"
    };
  }

  const params = new URLSearchParams(initData);

  const receivedHash = params.get("hash");

  if (!receivedHash) {
    return {
      valid: false,
      error: "Missing Telegram hash"
    };
  }

  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  let hashMatches = false;

  try {
    const receivedBuffer = Buffer.from(receivedHash, "hex");
    const calculatedBuffer = Buffer.from(
      calculatedHash,
      "hex"
    );

    if (
      receivedBuffer.length === calculatedBuffer.length
    ) {
      hashMatches = crypto.timingSafeEqual(
        receivedBuffer,
        calculatedBuffer
      );
    }
  } catch (error) {
    hashMatches = false;
  }

  if (!hashMatches) {
    return {
      valid: false,
      error: "Invalid Telegram authentication data"
    };
  }

  // Prevent very old authentication data.
  const authDate = Number(params.get("auth_date"));

  if (!authDate || !Number.isFinite(authDate)) {
    return {
      valid: false,
      error: "Invalid auth_date"
    };
  }

  const now = Math.floor(Date.now() / 1000);

  // 24-hour validity window.
  if (now - authDate > 86400) {
    return {
      valid: false,
      error: "Telegram authentication data expired"
    };
  }

  const userString = params.get("user");

  if (!userString) {
    return {
      valid: false,
      error: "Telegram user data missing"
    };
  }

  let user;

  try {
    user = JSON.parse(userString);
  } catch (error) {
    return {
      valid: false,
      error: "Invalid Telegram user data"
    };
  }

  if (!user || !user.id) {
    return {
      valid: false,
      error: "Telegram user ID missing"
    };
  }

  return {
    valid: true,
    user
  };
}

// ======================================================
// SAVE / UPDATE USER
// ======================================================

async function saveTelegramUser(user) {
  const telegramId = String(user.id);

  const result = await pool.query(
    `
    INSERT INTO users (
      telegram_id,
      username,
      first_name,
      last_name,
      photo_url,
      last_login_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())

    ON CONFLICT (telegram_id)
    DO UPDATE SET
      username = EXCLUDED.username,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      photo_url = EXCLUDED.photo_url,
      last_login_at = NOW(),
      updated_at = NOW()

    RETURNING
      telegram_id,
      username,
      first_name,
      last_name,
      photo_url,
      balance,
      created_at,
      last_login_at;
    `,
    [
      telegramId,
      user.username || null,
      user.first_name || null,
      user.last_name || null,
      user.photo_url || null
    ]
  );

  return result.rows[0];
}

// ======================================================
// JSON RESPONSE
// ======================================================

function sendJSON(res, statusCode, data) {
  const body = JSON.stringify(data);

  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });

  res.end(body);
}

// ======================================================
// READ REQUEST BODY
// ======================================================

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      // Basic protection against oversized requests.
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      resolve(body);
    });

    req.on("error", reject);
  });
}

// ======================================================
// HTTP API SERVER
// ======================================================

const server = http.createServer(async (req, res) => {
  try {
    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });

      res.end();
      return;
    }

    // --------------------------------------------------
    // HEALTH CHECK
    // --------------------------------------------------

    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8"
      });

      res.end("Taska Backend is running!");
      return;
    }

    // --------------------------------------------------
    // DATABASE HEALTH CHECK
    // --------------------------------------------------

    if (
      req.method === "GET" &&
      req.url === "/health"
    ) {
      await pool.query("SELECT 1");

      sendJSON(res, 200, {
        ok: true,
        database: "connected",
        service: "Taska Backend"
      });

      return;
    }

    // --------------------------------------------------
    // TELEGRAM AUTH + USER API
    // --------------------------------------------------

    if (
      req.method === "POST" &&
      req.url === "/api/me"
    ) {
      const rawBody = await readBody(req);

      let body;

      try {
        body = JSON.parse(rawBody);
      } catch (error) {
        sendJSON(res, 400, {
          ok: false,
          error: "Invalid JSON"
        });

        return;
      }

      const initData = body.initData;

      const validation =
        validateTelegramInitData(initData);

      if (!validation.valid) {
        sendJSON(res, 401, {
          ok: false,
          error: validation.error
        });

        return;
      }

      const user = validation.user;

      const savedUser =
        await saveTelegramUser(user);

      sendJSON(res, 200, {
        ok: true,

        user: {
          telegram_id: String(
            savedUser.telegram_id
          ),

          username:
            savedUser.username,

          first_name:
            savedUser.first_name,

          last_name:
            savedUser.last_name,

          photo_url:
            savedUser.photo_url,

          balance:
            Number(savedUser.balance),

          created_at:
            savedUser.created_at,

          last_login_at:
            savedUser.last_login_at
        }
      });

      return;
    }

    // --------------------------------------------------
    // 404
    // --------------------------------------------------

    sendJSON(res, 404, {
      ok: false,
      error: "Not Found"
    });

  } catch (error) {
    console.error(
      "HTTP server error:",
      error
    );

    sendJSON(res, 500, {
      ok: false,
      error: "Internal server error"
    });
  }
});

// ======================================================
// START SERVER + DATABASE
// ======================================================

async function startServer() {
  try {
    await initDatabase();

    server.listen(PORT, () => {
      console.log(
        `Taska backend running on port ${PORT}`
      );
    });

    startBot();

  } catch (error) {
    console.error(
      "Startup error:",
      error
    );

    process.exit(1);
  }
}

startServer();
