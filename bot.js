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

const PORT =
  process.env.PORT || 10000;

// ======================================================
// TASKA CHECK-IN SETTINGS
// ======================================================
//
// Day 1 = ৳0.10
// Day 2 = ৳0.20
// Day 3 = ৳0.30
// Day 4 = ৳0.40
// Day 5 = ৳0.50
// Day 6 = ৳0.60
// Day 7 = ৳0.70
//
// After Day 7:
// Next day = Day 1 = ৳0.10
//
// If user misses one or more days:
// Next check-in = Day 1 = ৳0.10
//
// ======================================================

const CHECKIN_REWARD_PER_DAY = 0.10;
const CHECKIN_CYCLE_DAYS = 7;

const DHAKA_TIMEZONE =
  "Asia/Dhaka";


// ======================================================
// ENVIRONMENT CHECK
// ======================================================

if (!BOT_TOKEN) {
  console.error(
    "BOT_TOKEN is missing!"
  );

  process.exit(1);
}


if (!DATABASE_URL) {
  console.error(
    "DATABASE_URL is missing!"
  );

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


// ======================================================
// IMPORTANT
// Always use Bangladesh time for database date logic.
// ======================================================

pool.on(
  "connect",
  (client) => {

    client
      .query(
        `SET TIME ZONE '${DHAKA_TIMEZONE}'`
      )
      .catch(
        (error) => {

          console.error(
            "Unable to set database timezone:",
            error.message
          );

        }
      );

  }
);


pool.on(
  "error",
  (error) => {

    console.error(
      "Database pool error:",
      error.message
    );

  }
);


// ======================================================
// CREATE / PREPARE DATABASE TABLES
// ======================================================

async function initDatabase() {

  // ----------------------------------------------------
  // USERS
  // ----------------------------------------------------

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


// ----------------------------------------------------
  // REFERRAL TRACKING
  // ----------------------------------------------------

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS referred_by BIGINT;
  `);


  await pool.query(`
    CREATE INDEX IF NOT EXISTS
    users_referred_by_index
    ON users(referred_by);
  `);

  // ----------------------------------------------------
  // DAILY CHECK-INS
  // ----------------------------------------------------

  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_checkins (
      id BIGSERIAL PRIMARY KEY,

      telegram_id BIGINT NOT NULL,

      checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,

      reward NUMERIC(18, 2) NOT NULL DEFAULT 0,

      streak INTEGER NOT NULL DEFAULT 1,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);


  // ----------------------------------------------------
  // PREVENT DOUBLE CHECK-IN
  // One user = one check-in per day
  // ----------------------------------------------------

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    daily_checkins_user_date_unique
    ON daily_checkins (
      telegram_id,
      checkin_date
    );
  `);


  // ----------------------------------------------------
  // TASK COMPLETION UNIQUE INDEX
  // ----------------------------------------------------

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    task_completions_task_user_unique
    ON task_completions(
      task_id,
      telegram_id
    );
  `);


  // ----------------------------------------------------
  // DEFAULT TEST TASK
  // ----------------------------------------------------

  await pool.query(`
    INSERT INTO tasks
      (
        title,
        description,
        task_type,
        reward,
        target_url,
        is_active
      )

    SELECT
      'Visit Taska Bot (Test)',

      'Open the Taska bot, return to the app, then claim the test reward.',

      'visit',

      0.10,

      'https://t.me/TaskaEarn_bot',

      TRUE

    WHERE NOT EXISTS (
      SELECT 1
      FROM tasks
    );
  `);


  console.log(
    "Database tables are ready."
  );

}


// ======================================================
// TELEGRAM API
// ======================================================

function telegram(
  method,
  data
) {

  return new Promise(
    (resolve, reject) => {

      const postData =
        JSON.stringify(data);


      const options = {

        hostname:
          "api.telegram.org",

        path:
          `/bot${BOT_TOKEN}/${method}`,

        method:
          "POST",

        headers: {

          "Content-Type":
            "application/json",

          "Content-Length":
            Buffer.byteLength(
              postData
            )

        }

      };


      const req =
        https.request(
          options,
          (res) => {

            let body = "";


            res.on(
              "data",
              (chunk) => {

                body += chunk;

              }
            );


            res.on(
              "end",
              () => {

                try {

                  resolve(
                    JSON.parse(body)
                  );

                } catch (error) {

                  reject(error);

                }

              }
            );

          }
        );


      req.on(
        "error",
        reject
      );


      req.write(
        postData
      );


      req.end();

    }
  );

}


// ======================================================
// BOT /START MESSAGE
// ======================================================

async function sendStartMessage(
  chatId,
  firstName = "there"
) {

  await telegram(
    "sendMessage",
    {

      chat_id:
        chatId,

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

              text:
                "Open Taska",

              web_app: {

                url:
                  WEB_APP_URL

              }

            }

          ]

        ]

      }

    }
  );

}


// ======================================================
// PROCESS TELEGRAM UPDATES
// ======================================================

async function processUpdate(
  update
) {

  if (!update.message) {
    return;
  }


  const message =
    update.message;


  const chatId =
    message.chat.id;


  const text =
    message.text || "";


 if (
  text === "/start" ||
  text.startsWith("/start ")
) {

  const firstName =
    message.from?.first_name ||
    "there";


  // -----------------------------------------------
  // REFERRAL PAYLOAD
  // Example:
  // /start 1949689268
  // -----------------------------------------------

  let referredById = null;


  if (
    text.startsWith("/start ")
  ) {

    const payload =
      text
        .slice(7)
        .trim();


    if (
      /^\d+$/.test(payload)
    ) {

      referredById =
        payload;

    }

  }


  // -----------------------------------------------
  // SAVE USER + REFERRAL
  // -----------------------------------------------

  if (
    message.from?.id
  ) {

    await saveTelegramUser(
      message.from,
      referredById
    );

  }


  await sendStartMessage(
    chatId,
    firstName
  );

} 

}


// ======================================================
// TELEGRAM POLLING
// ======================================================

let offset = 0;


async function startBot() {

  console.log(
    "Taska bot is starting..."
  );


  while (true) {

    try {

      const result =
        await telegram(
          "getUpdates",
          {

            offset:
              offset,

            timeout:
              30,

            allowed_updates:
              ["message"]

          }
        );


      if (
        result.ok &&
        Array.isArray(
          result.result
        )
      ) {

        for (
          const update
          of result.result
        ) {

          offset =
            update.update_id + 1;


          try {

            await processUpdate(
              update
            );

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


      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            5000
          )
      );

    }

  }

}


// ======================================================
// TELEGRAM MINI APP INIT DATA VALIDATION
// ======================================================

function validateTelegramInitData(
  initData
) {

  if (
    !initData ||
    typeof initData !== "string"
  ) {

    return {

      valid:
        false,

      error:
        "Missing Telegram initData"

    };

  }


  const params =
    new URLSearchParams(
      initData
    );


  const receivedHash =
    params.get("hash");


  if (!receivedHash) {

    return {

      valid:
        false,

      error:
        "Missing Telegram hash"

    };

  }


  params.delete(
    "hash"
  );


  const dataCheckString =
    Array
      .from(
        params.entries()
      )
      .sort(
        ([a], [b]) =>
          a.localeCompare(b)
      )
      .map(
        ([key, value]) =>
          `${key}=${value}`
      )
      .join("\n");


  const secretKey =
    crypto
      .createHmac(
        "sha256",
        "WebAppData"
      )
      .update(
        BOT_TOKEN
      )
      .digest();


  const calculatedHash =
    crypto
      .createHmac(
        "sha256",
        secretKey
      )
      .update(
        dataCheckString
      )
      .digest("hex");


  let hashMatches =
    false;


  try {

    const receivedBuffer =
      Buffer.from(
        receivedHash,
        "hex"
      );


    const calculatedBuffer =
      Buffer.from(
        calculatedHash,
        "hex"
      );


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

    hashMatches =
      false;

  }


  if (!hashMatches) {

    return {

      valid:
        false,

      error:
        "Invalid Telegram authentication data"

    };

  }


  const authDate =
    Number(
      params.get("auth_date")
    );


  if (
    !authDate ||
    !Number.isFinite(authDate)
  ) {

    return {

      valid:
        false,

      error:
        "Invalid auth_date"

    };

  }


  const now =
    Math.floor(
      Date.now() / 1000
    );


  if (
    now - authDate >
    86400
  ) {

    return {

      valid:
        false,

      error:
        "Telegram authentication data expired"

    };

  }


  const userString =
    params.get("user");


  if (!userString) {

    return {

      valid:
        false,

      error:
        "Telegram user data missing"

    };

  }


  let user;


  try {

    user =
      JSON.parse(
        userString
      );

  } catch (error) {

    return {

      valid:
        false,

      error:
        "Invalid Telegram user data"

    };

  }


  if (
    !user ||
    !user.id
  ) {

    return {

      valid:
        false,

      error:
        "Telegram user ID missing"

    };

  }


  return {

    valid:
      true,

    user

  };

}


// ======================================================
// SAVE / UPDATE USER
// ======================================================

async function saveTelegramUser(
  user,
  referredById = null
) {

  const telegramId =
    String(
      user.id
    );


  const result =
    await pool.query(
      `
      INSERT INTO users (
        telegram_id,
        username,
        first_name,
        last_name,
        photo_url,
					 referral_code,
 						referred_by,
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
    MD5(
      $1::TEXT ||
      RANDOM()::TEXT
    ),
    1,
    8
  )
),

CASE
  WHEN
    $6::BIGINT IS NOT NULL
    AND
    $6::BIGINT <> $1::BIGINT
    AND
    EXISTS (
      SELECT 1
      FROM users
      WHERE telegram_id = $6::BIGINT
    )
  THEN $6::BIGINT
  ELSE NULL
END,

NOW(),
NOW()
)

      ON CONFLICT (telegram_id)

      DO UPDATE SET

        username =
          EXCLUDED.username,

        first_name =
          EXCLUDED.first_name,

        last_name =
          EXCLUDED.last_name,

        photo_url =
          EXCLUDED.photo_url,

        last_login_at =
          NOW(),

        updated_at =
          NOW()

      RETURNING
		   telegram_id,
 			  username,
 			  first_name,
 			  last_name,
 			  photo_url,
 			  balance,
 			  total_earned,
 			  total_withdrawn,
 			  referred_by,
 			  created_at,
  			 last_login_at;
      `,
      [

        telegramId,

        user.username ||
          null,

        user.first_name ||
          null,

        user.last_name ||
          null,

        user.photo_url ||
  null,

					 referredById
  ? String(referredById)
  : null

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
    JSON.stringify(
      data
    );


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


  res.end(
    body
  );

}


// ======================================================
// READ REQUEST BODY
// ======================================================

function readBody(
  req
) {

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

          resolve(
            body
          );

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

      ok:
        false,

      status:
        401,

      error:
        validation.error

    };

  }


  const telegramId =
    String(
      validation.user.id
    );


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
      [
        telegramId
      ]
    );


  if (!result.rows[0]) {

    return {

      ok:
        false,

      status:
        404,

      error:
        "Taska user account not found"

    };

  }


  if (
    result.rows[0].is_banned
  ) {

    return {

      ok:
        false,

      status:
        403,

      error:
        "This Taska account is restricted"

    };

  }


  return {

    ok:
      true,

    user:
      result.rows[0]

  };

}


// ======================================================
// PUBLIC USER
// ======================================================

function publicUser(
  row
) {

  return {

    telegram_id:
      String(
        row.telegram_id
      ),

    username:
      row.username,

    first_name:
      row.first_name,

    last_name:
      row.last_name,

    photo_url:
      row.photo_url,

    balance:
      Number(
        row.balance || 0
      ),

    total_earned:
      Number(
        row.total_earned || 0
      ),

    total_withdrawn:
      Number(
        row.total_withdrawn || 0
      ),

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
      [
        telegramId
      ]
    );


  if (!userResult.rows[0]) {

    throw new Error(
      "User account not found"
    );

  }


  const user =
    userResult.rows[0];


  const before =
    Number(
      user.balance || 0
    );


  const reward =
    Number(
      amount
    );


  const after =
    Number(
      (
        before +
        reward
      ).toFixed(2)
    );


  await client.query(
    `
    UPDATE users

    SET
      balance = $1,

      total_earned =
        total_earned + $2,

      updated_at =
        NOW()

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
// CHECK-IN HELPERS
// ======================================================

// ------------------------------------------------------
// Calculate next streak.
//
// Rules:
//
// Today already claimed:
//     current streak stays.
//
// Last claim was yesterday:
//     streak + 1
//
// Last claim was older than yesterday:
//     Day 1
//
// Day 7 -> next day Day 1
// ------------------------------------------------------

function calculateNextStreak(
  previousRow
) {

  if (!previousRow) {

    return 1;

  }


  const previousStreak =
    Number(
      previousRow.streak || 1
    );


  const daysSince =
    Number(
      previousRow.days_since || 0
    );


  // Yesterday
  if (
    daysSince === 1
  ) {

    if (
      previousStreak <
      CHECKIN_CYCLE_DAYS
    ) {

      return (
        previousStreak + 1
      );

    }


    // Day 7 completed.
    // Next day starts Day 1.

    return 1;

  }


  // Missed one or more days.
  return 1;

}


// ------------------------------------------------------
// Check-in status
// ------------------------------------------------------

async function getCheckinStatus(
  telegramId
) {

  // ----------------------------------------------------
  // Today's check-in
  // ----------------------------------------------------

  const todayResult =
    await pool.query(
      `
      SELECT
        id,
        checkin_date,
        reward,
        streak

      FROM daily_checkins

      WHERE
        telegram_id = $1
        AND
        checkin_date = CURRENT_DATE

      LIMIT 1
      `,
      [
        telegramId
      ]
    );


  const todayClaimed =
    Boolean(
      todayResult.rows[0]
    );


  // ----------------------------------------------------
  // Last check-in
  // ----------------------------------------------------

  const previousResult =
    await pool.query(
      `
      SELECT
        checkin_date,
        reward,
        streak,

        (
          CURRENT_DATE -
          checkin_date
        ) AS days_since

      FROM daily_checkins

      WHERE telegram_id = $1

      ORDER BY
        checkin_date DESC

      LIMIT 1
      `,
      [
        telegramId
      ]
    );


  const previous =
    previousResult.rows[0] ||
    null;


  let nextStreak = 1;


  if (todayClaimed) {

    nextStreak =
      Number(
        todayResult.rows[0].streak
      );

  } else {

    nextStreak =
      calculateNextStreak(
        previous
      );

  }


  const nextReward =
    Number(
      (
        CHECKIN_REWARD_PER_DAY *
        nextStreak
      ).toFixed(2)
    );


  // ----------------------------------------------------
  // Last 7 check-ins
  // ----------------------------------------------------

  const historyResult =
    await pool.query(
      `
      SELECT
        checkin_date,
        reward,
        streak

      FROM daily_checkins

      WHERE telegram_id = $1

      ORDER BY
        checkin_date DESC

      LIMIT 7
      `,
      [
        telegramId
      ]
    );


  // ----------------------------------------------------
  // Next midnight in Bangladesh time
  // ----------------------------------------------------

  const nextCheckinResult =
    await pool.query(
      `
      SELECT
        (
          (
            CURRENT_DATE + 1
          )::timestamp
          AT TIME ZONE 'Asia/Dhaka'
        ) AS next_checkin_at
      `
    );


  return {

    today_claimed:
      todayClaimed,

    today_reward:
      todayClaimed
        ? Number(
            todayResult.rows[0].reward
          )
        : 0,

    today_streak:
      todayClaimed
        ? Number(
            todayResult.rows[0].streak
          )
        : 0,

    next_streak:
      nextStreak,

    next_reward:
      nextReward,

    cycle_days:
      CHECKIN_CYCLE_DAYS,

    reward_per_day:
      CHECKIN_REWARD_PER_DAY,

    next_checkin_at:
      nextCheckinResult
        .rows[0]
        ?.next_checkin_at ||
      null,

    history:
      historyResult.rows.map(
        (row) => ({

          checkin_date:
            row.checkin_date,

          reward:
            Number(
              row.reward || 0
            ),

          streak:
            Number(
              row.streak || 0
            )

        })
      )

  };

}


// ======================================================
// HTTP SERVER
// ======================================================

const server =
  http.createServer(
    async (req, res) => {

      try {

        // ==================================================
        // CORS
        // ==================================================

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


        // ==================================================
        // ROOT
        // ==================================================

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


        // ==================================================
        // HEALTH
        // ==================================================

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

              ok:
                true,

              database:
                "connected",

              timezone:
                DHAKA_TIMEZONE,

              service:
                "Taska Backend"

            }
          );


          return;

        }


        // ==================================================
        // USER AUTH
        // ==================================================

        if (
          req.method === "POST" &&
          req.url === "/api/me"
        ) {

          const rawBody =
            await readBody(
              req
            );


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

                ok:
                  false,

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

                ok:
                  false,

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
 
 				// ==================================================
          // HOME STATISTICS
          // ==================================================

          const statisticsResult =
            await pool.query(
              `
              SELECT

                (
                  SELECT COUNT(*)
                  FROM users
                  WHERE referred_by = $1::BIGINT
                ) AS referrals_count,

                (
                  SELECT COUNT(*)
                  FROM task_completions
                  WHERE
                    telegram_id = $1::BIGINT
                    AND status = 'completed'
                ) AS tasks_completed
              `,
              [
                String(
                  savedUser.telegram_id
                )
              ]
            );


          const statistics =
            statisticsResult.rows[0];
						
          sendJSON(
            res,
            200,
            {

              ok:
                true,

              user:
  {

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
        savedUser.balance || 0
      ),

    total_earned:
      Number(
        savedUser.total_earned || 0
      ),

    total_withdrawn:
      Number(
        savedUser.total_withdrawn || 0
      ),

    referrals_count:
      Number(
        statistics.referrals_count || 0
      ),

    tasks_completed:
      Number(
        statistics.tasks_completed || 0
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


        // ==================================================
        // GET TASKS
        // ==================================================

        if (
          req.method === "POST" &&
          req.url === "/api/tasks"
        ) {

          const rawBody =
            await readBody(
              req
            );


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

                ok:
                  false,

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

                ok:
                  false,

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
                    tc.task_id =
                      t.id

                    AND

                    tc.telegram_id =
                      $1

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

              ok:
                true,

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


        // ==================================================
        // COMPLETE TASK
        // ==================================================

        if (
          req.method === "POST" &&
          req.url ===
            "/api/tasks/complete"
        ) {

          const rawBody =
            await readBody(
              req
            );


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

                ok:
                  false,

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

                ok:
                  false,

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

                ok:
                  false,

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
                [
                  taskId
                ]
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

                  ok:
                    false,

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

                  ok:
                    false,

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


            if (
              reward <= 0
            ) {

              await client.query(
                "ROLLBACK"
              );


              sendJSON(
                res,
                400,
                {

                  ok:
                    false,

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
                String(
                  taskId
                ),
                `Reward for completing: ${task.title}`
              );


            await client.query(
              "COMMIT"
            );


            sendJSON(
              res,
              200,
              {

                ok:
                  true,

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

                  ok:
                    false,

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


        // ==================================================
        // DAILY CHECK-IN STATUS
        // ==================================================
        //
        // Frontend can call this when opening the
        // Daily Check-in page.
        //
        // ==================================================

        if (
          req.method === "POST" &&
          req.url ===
            "/api/checkin/status"
        ) {

          const rawBody =
            await readBody(
              req
            );


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

                ok:
                  false,

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

                ok:
                  false,

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


          const status =
            await getCheckinStatus(
              telegramId
            );


          sendJSON(
            res,
            200,
            {

              ok:
                true,

              ...status

            }
          );


          return;

        }


        // ==================================================
        // DAILY CHECK-IN CLAIM
        // ==================================================

        if (
          req.method === "POST" &&
          req.url ===
            "/api/checkin"
        ) {

          const rawBody =
            await readBody(
              req
            );


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

                ok:
                  false,

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

                ok:
                  false,

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


            // ------------------------------------------
            // TODAY'S CHECK-IN
            // ------------------------------------------

            const existing =
              await client.query(
                `
                SELECT
                  id,
                  reward,
                  streak,
                  checkin_date

                FROM daily_checkins

                WHERE
                  telegram_id = $1

                  AND

                  checkin_date =
                    CURRENT_DATE

                LIMIT 1

                FOR UPDATE
                `,
                [
                  telegramId
                ]
              );


            // ------------------------------------------
            // ALREADY CLAIMED TODAY
            // ------------------------------------------

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

                  ok:
                    false,

                  error:
                    "Daily check-in already claimed today",

                  today_claimed:
                    true,

                  reward:
                    Number(
                      existing.rows[0].reward
                    ),

                  streak:
                    Number(
                      existing.rows[0].streak
                    )

                }
              );


              return;

            }


            // ------------------------------------------
            // GET PREVIOUS CHECK-IN
            // ------------------------------------------

            const previous =
              await client.query(
                `
                SELECT
                  streak,
                  checkin_date,

                  (
                    CURRENT_DATE -
                    checkin_date
                  ) AS days_since

                FROM daily_checkins

                WHERE
                  telegram_id = $1

                ORDER BY
                  checkin_date DESC

                LIMIT 1
                `,
                [
                  telegramId
                ]
              );


            const previousRow =
              previous.rows[0] ||
              null;


            // ------------------------------------------
            // CALCULATE STREAK
            // ------------------------------------------

            const streak =
              calculateNextStreak(
                previousRow
              );


            // ------------------------------------------
            // CALCULATE REWARD
            // ------------------------------------------
            //
            // Day 1 = 0.10
            // Day 2 = 0.20
            // Day 3 = 0.30
            // Day 4 = 0.40
            // Day 5 = 0.50
            // Day 6 = 0.60
            // Day 7 = 0.70
            //
            // Then back to Day 1.
            // ------------------------------------------

            const reward =
              Number(
                (
                  CHECKIN_REWARD_PER_DAY *
                  streak
                ).toFixed(2)
              );


            // ------------------------------------------
            // SAVE CHECK-IN
            // ------------------------------------------

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


            // ------------------------------------------
            // ADD REWARD TO BALANCE
            // ------------------------------------------

            const balance =
              await awardBalance(
                client,
                telegramId,
                reward,
                "daily_checkin",

                `checkin-${new Date()
                  .toISOString()
                  .slice(0, 10)}`,

                `Daily check-in reward - Day ${streak}`
              );


            // ------------------------------------------
            // UPDATE USER
            // ------------------------------------------

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
              [
                telegramId
              ]
            );


            // ------------------------------------------
            // COMMIT
            // ------------------------------------------

            await client.query(
              "COMMIT"
            );


            // ------------------------------------------
            // GET FRESH STATUS
            // ------------------------------------------

            const freshStatus =
              await getCheckinStatus(
                telegramId
              );


            // ------------------------------------------
            // SUCCESS RESPONSE
            // ------------------------------------------

            sendJSON(
              res,
              200,
              {

                ok:
                  true,

                message:
                  "Daily check-in claimed successfully",

                reward:
                  balance.reward,

                balance:
                  balance.after,

                streak:
                  streak,

                today_claimed:
                  true,

                today_reward:
                  reward,

                today_streak:
                  streak,

                next_streak:
                  freshStatus.next_streak,

                next_reward:
                  freshStatus.next_reward,

                next_checkin_at:
                  freshStatus.next_checkin_at,

                cycle_days:
                  CHECKIN_CYCLE_DAYS

              }
            );


            return;


          } catch (error) {

            try {

              await client.query(
                "ROLLBACK"
              );

            } catch {}


            // ------------------------------------------
            // UNIQUE CONSTRAINT
            // ------------------------------------------

            if (
              error.code ===
              "23505"
            ) {

              sendJSON(
                res,
                409,
                {

                  ok:
                    false,

                  error:
                    "Daily check-in already claimed today",

                  today_claimed:
                    true

                }
              );


              return;

            }


            throw error;


          } finally {

            client.release();

          }

        }


        // ==================================================
        // 404
        // ==================================================

        sendJSON(
          res,
          404,
          {

            ok:
              false,

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

            ok:
              false,

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

        console.log(
          `Taska timezone: ${DHAKA_TIMEZONE}`
        );

        console.log(
          "Daily Check-in system: 7-day cycle"
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
