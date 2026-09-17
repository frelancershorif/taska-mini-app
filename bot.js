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

// Taska earning defaults
// Daily Check-in reward
// 7-day cycle:
// Day 1 = ৳0.10
// Day 2 = ৳0.20
// ...
// Day 7 = ৳0.70
const CHECKIN_REWARD_PER_DAY = 0.10;
const CHECKIN_CYCLE_DAYS = 7;

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

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    task_completions_task_user_unique
    ON task_completions(task_id, telegram_id);
  `);

  await pool.query(`
    INSERT INTO tasks
      (title, description, task_type, reward, target_url, is_active)
    SELECT
      'Visit Taska Bot (Test)',
      'Open the Taska bot, return to the app, then claim the test reward.',
      'visit',
      0.10,
      'https://t.me/TaskaEarn_bot',
      TRUE
    WHERE NOT EXISTS (SELECT 1 FROM tasks);
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
    const receivedBuffer =
      Buffer.from(receivedHash, "hex");

    const calculatedBuffer =
      Buffer.from(calculatedHash, "hex");

    if (
      receivedBuffer.length ===
      calculatedBuffer.length
    ) {
      hashMatches =
        crypto.timingSafeEqual(
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

  const authDate =
    Number(params.get("auth_date"));

  if (
    !authDate ||
    !Number.isFinite(authDate)
  ) {
    return {
      valid: false,
      error: "Invalid auth_date"
    };
  }

  const now =
    Math.floor(Date.now() / 1000);

  if (now - authDate > 86400) {
    return {
      valid: false,
      error:
        "Telegram authentication data expired"
    };
  }

  const userString =
    params.get("user");

  if (!userString) {
    return {
      valid: false,
      error:
        "Telegram user data missing"
    };
  }

  let user;

  try {
    user =
      JSON.parse(userString);
  } catch (error) {
    return {
      valid: false,
      error:
        "Invalid Telegram user data"
    };
  }

  if (!user || !user.id) {
    return {
      valid: false,
      error:
        "Telegram user ID missing"
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
      referral_code,
      last_login_at,
      updated_at
    )
    VALUES (
      $1::BIGINT,
      $2::TEXT,
      $3::TEXT,
      $4::TEXT,
      $5::TEXT,
      UPPER(
        SUBSTRING(
          MD5($1::TEXT || RANDOM()::TEXT),
          1,
          8
        )
      ),
      NOW(),
      NOW()
    )

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

function sendJSON(
  res,
  statusCode,
  data
) {
  const body =
    JSON.stringify(data);

  res.writeHead(
    statusCode,
    {
      "Content-Type":
        "application/json; charset=utf-8",

      "Access-Control-Allow-Origin":
        "*",

      "Access-Control-Allow-Methods":
        "GET, POST, OPTIONS",

      "Access-Control-Allow-Headers":
        "Content-Type"
    }
  );

  res.end(body);
}

// ======================================================
// READ REQUEST BODY
// ======================================================

function readBody(req) {
  return new Promise(
    (resolve, reject) => {

      let body = "";

      req.on(
        "data",
        (chunk) => {

          body += chunk;

          if (
            body.length >
            1024 * 1024
          ) {
            reject(
              new Error(
                "Request body too large"
              )
            );

            req.destroy();
          }

        }
      );

      req.on(
        "end",
        () => {
          resolve(body);
        }
      );

      req.on(
        "error",
        reject
      );

    }
  );
}

// ======================================================
// AUTHENTICATED API HELPERS
// ======================================================

async function getAuthenticatedUserFromBody(
  body
) {
  const validation =
    validateTelegramInitData(
      body?.initData
    );

  if (!validation.valid) {
    return {
      ok: false,
      status: 401,
      error: validation.error
    };
  }

  const telegramId =
    String(validation.user.id);

  const result =
    await pool.query(
      `
      SELECT
        telegram_id,
        username,
        first_name,
        last_name,
        photo_url,
        balance,
        total_earned,
        total_withdrawn,
        referral_code,
        is_banned,
        created_at,
        last_login_at
      FROM users
      WHERE telegram_id = $1
      `,
      [telegramId]
    );

  if (!result.rows[0]) {
    return {
      ok: false,
      status: 404,
      error:
        "Taska user account not found"
    };
  }

  if (result.rows[0].is_banned) {
    return {
      ok: false,
      status: 403,
      error:
        "This Taska account is restricted"
    };
  }

  return {
    ok: true,
    user: result.rows[0]
  };
}

// ======================================================
// PUBLIC USER
// ======================================================

function publicUser(row) {
  return {
    telegram_id:
      String(row.telegram_id),

    username:
      row.username,

    first_name:
      row.first_name,

    last_name:
      row.last_name,

    photo_url:
      row.photo_url,

    balance:
      Number(row.balance || 0),

    total_earned:
      Number(row.total_earned || 0),

    total_withdrawn:
      Number(row.total_withdrawn || 0),

    referral_code:
      row.referral_code,

    created_at:
      row.created_at,

    last_login_at:
      row.last_login_at
  };
}

// ======================================================
// AWARD BALANCE
// ======================================================

async function awardBalance(
  client,
  telegramId,
  amount,
  type,
  referenceId,
  description
) {
  const userResult =
    await client.query(
      `
      SELECT
        telegram_id,
        balance,
        total_earned,
        total_withdrawn
      FROM users
      WHERE telegram_id = $1
      FOR UPDATE
      `,
      [telegramId]
    );

  if (!userResult.rows[0]) {
    throw new Error(
      "User account not found"
    );
  }

  const user =
    userResult.rows[0];

  const before =
    Number(user.balance || 0);

  const reward =
    Number(amount);

  const after =
    before + reward;

  await client.query(
    `
    UPDATE users
    SET
      balance = $1,
      total_earned =
        total_earned + $2,
      updated_at = NOW()
    WHERE telegram_id = $3
    `,
    [
      after,
      reward,
      telegramId
    ]
  );

  await client.query(
    `
    INSERT INTO transactions
    (
      telegram_id,
      type,
      amount,
      balance_before,
      balance_after,
      reference_id,
      description
    )
    VALUES
    (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7
    )
    `,
    [
      telegramId,
      type,
      reward,
      before,
      after,
      referenceId,
      description
    ]
  );

  return {
    before,
    after,
    reward
  };
}

// ======================================================
// HTTP SERVER
// ======================================================

const server =
  http.createServer(
    async (req, res) => {

      try {

        // ------------------------------------------------
        // CORS
        // ------------------------------------------------

        if (
          req.method === "OPTIONS"
        ) {

          res.writeHead(
            204,
            {
              "Access-Control-Allow-Origin":
                "*",

              "Access-Control-Allow-Methods":
                "GET, POST, OPTIONS",

              "Access-Control-Allow-Headers":
                "Content-Type"
            }
          );

          res.end();

          return;
        }

        // ------------------------------------------------
        // ROOT
        // ------------------------------------------------

        if (
          req.method === "GET" &&
          req.url === "/"
        ) {

          res.writeHead(
            200,
            {
              "Content-Type":
                "text/plain; charset=utf-8"
            }
          );

          res.end(
            "Taska Backend is running!"
          );

          return;
        }

        // ------------------------------------------------
        // HEALTH
        // ------------------------------------------------

        if (
          req.method === "GET" &&
          req.url === "/health"
        ) {

          await pool.query(
            "SELECT 1"
          );

          sendJSON(
            res,
            200,
            {
              ok: true,
              database:
                "connected",
              service:
                "Taska Backend"
            }
          );

          return;
        }

        // ------------------------------------------------
        // USER AUTH
        // ------------------------------------------------

        if (
          req.method === "POST" &&
          req.url === "/api/me"
        ) {

          const rawBody =
            await readBody(req);

          let body;

          try {
            body =
              JSON.parse(
                rawBody
              );
          } catch {

            sendJSON(
              res,
              400,
              {
                ok: false,
                error:
                  "Invalid JSON"
              }
            );

            return;
          }

          const validation =
            validateTelegramInitData(
              body.initData
            );

          if (
            !validation.valid
          ) {

            sendJSON(
              res,
              401,
              {
                ok: false,
                error:
                  validation.error
              }
            );

            return;
          }

          const user =
            validation.user;

          const savedUser =
            await saveTelegramUser(
              user
            );

          sendJSON(
            res,
            200,
            {
              ok: true,

              user: {
                telegram_id:
                  String(
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
                  Number(
                    savedUser.balance
                  ),

                created_at:
                  savedUser.created_at,

                last_login_at:
                  savedUser.last_login_at
              }
            }
          );

          return;
        }

        // ------------------------------------------------
        // GET TASKS
        // ------------------------------------------------

        if (
          req.method === "POST" &&
          req.url === "/api/tasks"
        ) {

          const rawBody =
            await readBody(req);

          let body;

          try {
            body =
              JSON.parse(
                rawBody
              );
          } catch {

            sendJSON(
              res,
              400,
              {
                ok: false,
                error:
                  "Invalid JSON"
              }
            );

            return;
          }

          const auth =
            await getAuthenticatedUserFromBody(
              body
            );

          if (!auth.ok) {

            sendJSON(
              res,
              auth.status,
              {
                ok: false,
                error:
                  auth.error
              }
            );

            return;
          }

          const result =
            await pool.query(
              `
              SELECT
                t.id,
                t.title,
                t.description,
                t.task_type,
                t.reward,
                t.target_url,
                t.icon_url,
                t.daily_limit,

                EXISTS (
                  SELECT 1
                  FROM task_completions tc
                  WHERE
                    tc.task_id = t.id
                    AND
                    tc.telegram_id = $1
                    AND
                    tc.status =
                      'completed'
                ) AS completed

              FROM tasks t

              WHERE
                t.is_active = TRUE

              ORDER BY
                t.created_at DESC,
                t.id DESC
              `,
              [
                String(
                  auth.user.telegram_id
                )
              ]
            );

          sendJSON(
            res,
            200,
            {
              ok: true,

              tasks:
                result.rows.map(
                  (task) => ({
                    id:
                      Number(
                        task.id
                      ),

                    title:
                      task.title,

                    description:
                      task.description,

                    task_type:
                      task.task_type,

                    reward:
                      Number(
                        task.reward || 0
                      ),

                    target_url:
                      task.target_url,

                    icon_url:
                      task.icon_url,

                    daily_limit:
                      task.daily_limit,

                    completed:
                      Boolean(
                        task.completed
                      )
                  })
                )
            }
          );

          return;
        }

        // ------------------------------------------------
        // COMPLETE TASK
        // ------------------------------------------------

        if (
          req.method === "POST" &&
          req.url ===
            "/api/tasks/complete"
        ) {

          const rawBody =
            await readBody(req);

          let body;

          try {
            body =
              JSON.parse(
                rawBody
              );
          } catch {

            sendJSON(
              res,
              400,
              {
                ok: false,
                error:
                  "Invalid JSON"
              }
            );

            return;
          }

          const auth =
            await getAuthenticatedUserFromBody(
              body
            );

          if (!auth.ok) {

            sendJSON(
              res,
              auth.status,
              {
                ok: false,
                error:
                  auth.error
              }
            );

            return;
          }

          const taskId =
            Number(
              body.task_id
            );

          if (
            !Number.isInteger(
              taskId
            ) ||
            taskId <= 0
          ) {

            sendJSON(
              res,
              400,
              {
                ok: false,
                error:
                  "Invalid task ID"
              }
            );

            return;
          }

          const client =
            await pool.connect();

          try {

            await client.query(
              "BEGIN"
            );

            const taskResult =
              await client.query(
                `
                SELECT
                  id,
                  title,
                  reward,
                  is_active
                FROM tasks
                WHERE id = $1
                FOR UPDATE
                `,
                [taskId]
              );

            if (
              !taskResult.rows[0] ||
              !taskResult.rows[0]
                .is_active
            ) {

              await client.query(
                "ROLLBACK"
              );

              sendJSON(
                res,
                404,
                {
                  ok: false,
                  error:
                    "Task not available"
                }
              );

              return;
            }

            const task =
              taskResult.rows[0];

            const telegramId =
              String(
                auth.user.telegram_id
              );

            const existing =
              await client.query(
                `
                SELECT id
                FROM task_completions
                WHERE
                  task_id = $1
                  AND
                  telegram_id = $2
                LIMIT 1
                `,
                [
                  taskId,
                  telegramId
                ]
              );

            if (
              existing.rows[0]
            ) {

              await client.query(
                "ROLLBACK"
              );

              sendJSON(
                res,
                409,
                {
                  ok: false,
                  error:
                    "This task has already been completed"
                }
              );

              return;
            }

            const reward =
              Number(
                task.reward || 0
              );

            if (reward <= 0) {

              await client.query(
                "ROLLBACK"
              );

              sendJSON(
                res,
                400,
                {
                  ok: false,
                  error:
                    "Task reward is not configured"
                }
              );

              return;
            }

            await client.query(
              `
              INSERT INTO task_completions
              (
                task_id,
                telegram_id,
                reward,
                status
              )
              VALUES
              (
                $1,
                $2,
                $3,
                'completed'
              )
              `,
              [
                taskId,
                telegramId,
                reward
              ]
            );

            const balance =
              await awardBalance(
                client,
                telegramId,
                reward,
                "task_reward",
                String(taskId),
                `Reward for completing: ${task.title}`
              );

            await client.query(
              "COMMIT"
            );

            sendJSON(
              res,
              200,
              {
                ok: true,
                message:
                  "Task completed successfully",
                reward:
                  balance.reward,
                balance:
                  balance.after
              }
            );

            return;

          } catch (error) {

            try {
              await client.query(
                "ROLLBACK"
              );
            } catch {}

            if (
              error.code ===
              "23505"
            ) {

              sendJSON(
                res,
                409,
                {
                  ok: false,
                  error:
                    "This task has already been completed"
                }
              );

              return;
            }

            throw error;

          } finally {

            client.release();

          }
        }

     // ------------------------------------------------
// DAILY CHECK-IN
// ------------------------------------------------

if (
  req.method === "POST" &&
  req.url ===
    "/api/checkin"
) {

  const rawBody =
    await readBody(req);

  let body;

  try {

    body =
      JSON.parse(
        rawBody
      );

  } catch {

    sendJSON(
      res,
      400,
      {
        ok: false,
        error:
          "Invalid JSON"
      }
    );

    return;
  }


  const auth =
    await getAuthenticatedUserFromBody(
      body
    );


  if (!auth.ok) {

    sendJSON(
      res,
      auth.status,
      {
        ok: false,
        error:
          auth.error
      }
    );

    return;
  }


  const telegramId =
    String(
      auth.user.telegram_id
    );


  const client =
    await pool.connect();


  try {

    await client.query(
      "BEGIN"
    );


    // ----------------------------------------------
    // CHECK IF USER ALREADY CLAIMED TODAY
    // ----------------------------------------------

    const existing =
      await client.query(
        `
        SELECT id
        FROM daily_checkins
        WHERE
          telegram_id = $1
          AND
          checkin_date = CURRENT_DATE
        LIMIT 1
        `,
        [telegramId]
      );


    if (
      existing.rows[0]
    ) {

      await client.query(
        "ROLLBACK"
      );


      sendJSON(
        res,
        409,
        {
          ok: false,
          error:
            "Daily check-in already claimed today"
        }
      );


      return;
    }


    // ----------------------------------------------
    // GET PREVIOUS CHECK-IN
    // ----------------------------------------------

    const previous =
      await client.query(
        `
        SELECT
          streak,
          checkin_date
        FROM daily_checkins
        WHERE
          telegram_id = $1
        ORDER BY
          checkin_date DESC
        LIMIT 1
        `,
        [telegramId]
      );


    // ----------------------------------------------
    // CALCULATE STREAK
    // ----------------------------------------------

    let streak = 1;


    if (
      previous.rows[0]
    ) {

      const lastDate =
        new Date(
          previous.rows[0]
            .checkin_date
        );


      const today =
        new Date();


      const lastUTC =
        Date.UTC(
          lastDate.getUTCFullYear(),
          lastDate.getUTCMonth(),
          lastDate.getUTCDate()
        );


      const todayUTC =
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate()
        );


      const isNextDay =
        todayUTC -
          lastUTC ===
        86400000;


      if (isNextDay) {

        const previousStreak =
          Number(
            previous.rows[0]
              .streak || 1
          );


        // ------------------------------------------
        // 7-DAY CYCLE
        // After Day 7, next day starts from Day 1
        // ------------------------------------------

        if (
          previousStreak <
          CHECKIN_CYCLE_DAYS
        ) {

          streak =
            previousStreak + 1;

        } else {

          streak = 1;

        }

      } else {

        // Missed one or more days
        streak = 1;

      }

    }


    // ----------------------------------------------
    // CALCULATE REWARD
    // ----------------------------------------------
    //
    // Day 1 = 0.10
    // Day 2 = 0.20
    // Day 3 = 0.30
    // Day 4 = 0.40
    // Day 5 = 0.50
    // Day 6 = 0.60
    // Day 7 = 0.70
    //
    // Then cycle starts again at 0.10
    // ----------------------------------------------

    const reward =
      Number(
        (
          CHECKIN_REWARD_PER_DAY *
          streak
        ).toFixed(2)
      );


    // ----------------------------------------------
    // SAVE DAILY CHECK-IN
    // ----------------------------------------------

    await client.query(
      `
      INSERT INTO daily_checkins
      (
        telegram_id,
        checkin_date,
        reward,
        streak
      )
      VALUES
      (
        $1,
        CURRENT_DATE,
        $2,
        $3
      )
      `,
      [
        telegramId,
        reward,
        streak
      ]
    );


    // ----------------------------------------------
    // ADD REWARD TO USER BALANCE
    // ----------------------------------------------

    const balance =
      await awardBalance(
        client,
        telegramId,
        reward,
        "daily_checkin",
        new Date()
          .toISOString()
          .slice(0, 10),
        `Daily check-in reward - Day ${streak}`
      );


    // ----------------------------------------------
    // UPDATE USER CHECK-IN TIME
    // ----------------------------------------------

    await client.query(
      `
      UPDATE users
      SET
        last_checkin_at =
          NOW(),
        updated_at =
          NOW()
      WHERE
        telegram_id = $1
      `,
      [telegramId]
    );


    // ----------------------------------------------
    // COMMIT
    // ----------------------------------------------

    await client.query(
      "COMMIT"
    );


    // ----------------------------------------------
    // RESPONSE
    // ----------------------------------------------

    sendJSON(
      res,
      200,
      {
        ok: true,

        message:
          "Daily check-in claimed",

        reward:
          balance.reward,

        balance:
          balance.after,

        streak
      }
    );


    return;


  } catch (error) {

    try {

      await client.query(
        "ROLLBACK"
      );

    } catch {}


    if (
      error.code ===
      "23505"
    ) {

      sendJSON(
        res,
        409,
        {
          ok: false,
          error:
            "Daily check-in already claimed today"
        }
      );

      return;
    }


    throw error;


  } finally {

    client.release();

  }

}

        // ------------------------------------------------
        // 404
        // ------------------------------------------------

        sendJSON(
          res,
          404,
          {
            ok: false,
            error:
              "Not Found"
          }
        );

      } catch (error) {

        console.error(
          "HTTP server error:",
          error
        );

        sendJSON(
          res,
          500,
          {
            ok: false,
            error:
              "Internal server error"
          }
        );
      }

    }
  );

// ======================================================
// START SERVER + DATABASE
// ======================================================

async function startServer() {

  try {

    await initDatabase();

    server.listen(
      PORT,
      () => {

        console.log(
          `Taska backend running on port ${PORT}`
        );

      }
    );

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
