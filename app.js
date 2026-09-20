// ======================================================
// TASKA - FRONTEND APP
// Telegram Mini App + Taska Backend
// Daily Check-in + Tasks
// ======================================================

const tg =
  window.Telegram?.WebApp || null;

const API_URL =
  "https://taska-mini-app.onrender.com";

let earnTasks = [];
let taskaUser = null;

const telegramUser =
  tg?.initDataUnsafe?.user ||
  null;

// ======================================================
// TASK STATE
// ======================================================

const taskStartTimes =
  new Map();

const TASK_MINIMUM_WAIT =
  3000;

// ======================================================
// DAILY CHECK-IN STATE
// ======================================================

let checkinClaimedDate =
  null;

let checkinTimer =
  null;

let checkinStatus = {
  today_claimed: false,
  today_reward: 0,
  today_streak: 0,
  next_streak: 1,
  next_reward: 0.10,
  cycle_days: 7,
  reward_per_day: 0.10,
  next_checkin_at: null,
  history: []
};

// ======================================================
// AUTH INIT DATA
// ======================================================

function authInitData() {
  return tg?.initData || "";
}

// ======================================================
// TASKA API
// ======================================================

async function taskaAPI(
  path,
  body = {}
) {
  const initData =
    authInitData();

  if (!initData) {
    throw new Error(
      "Telegram authentication data is missing"
    );
  }

  let response;

  try {
    response =
      await fetch(
        `${API_URL}${path}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              ...body,
              initData
            })
        }
      );

  } catch (error) {
    console.error(
      "Taska API network error:",
      error
    );

    throw new Error(
      "Unable to connect to Taska server"
    );
  }

  let data;

  try {
    data =
      await response.json();

  } catch (error) {
    console.error(
      "Taska API invalid JSON:",
      error
    );

    throw new Error(
      "Invalid server response"
    );
  }

  if (
    !response.ok ||
    !data.ok
  ) {
    const apiError =
      data?.error ||
      data?.message ||
      "Taska server error";

    const error =
      new Error(apiError);

    error.status =
      response.status;

    error.data =
      data;

    throw error;
  }

  return data;
}

// ======================================================
// FORMAT MONEY
// ======================================================

function formatMoney(
  amount
) {
  const number =
    Number(
      amount ?? 0
    );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return "৳0.00";
  }

  return (
    "৳" +
    number.toFixed(2)
  );
}

// ======================================================
// REFRESH BALANCE
// ======================================================

function refreshTaskaBalance(
  balance
) {
  if (!taskaUser) {
    return;
  }

  const number =
    Number(
      balance ?? 0
    );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return;
  }

  taskaUser.balance =
    number;

  const balanceElements =
    document.querySelectorAll(
      "#balance, .balance-value, .wallet-balance, [data-balance]"
    );

  balanceElements.forEach(
    (element) => {
      element.textContent =
        formatMoney(
          number
        );
    }
  );

  console.log(
    "Taska: Balance updated:",
    number
  );
}

// ======================================================
// TELEGRAM STARTUP
// ======================================================

if (tg) {
  try {
    tg.ready();
  } catch (error) {
    console.warn(
      "Taska: Telegram ready error:",
      error
    );
  }

  try {
    tg.expand();
  } catch (error) {
    console.warn(
      "Taska: Telegram expand error:",
      error
    );
  }
}

// ======================================================
// TELEGRAM THEME
// ======================================================

if (
  tg?.themeParams
) {
  const root =
    document.documentElement;

  const theme =
    tg.themeParams;

  if (
    theme.bg_color
  ) {
    root.style.setProperty(
      "--bg",
      theme.bg_color
    );
  }

  if (
    theme.text_color
  ) {
    root.style.setProperty(
      "--text",
      theme.text_color
    );
  }

  if (
    theme.hint_color
  ) {
    root.style.setProperty(
      "--muted",
      theme.hint_color
    );
  }
}

// ======================================================
// USER HELPERS
// ======================================================

function getCurrentUser() {
  return (
    taskaUser ||
    telegramUser ||
    null
  );
}

function getDisplayName() {
  const user =
    getCurrentUser();

  if (!user) {
    return "Taska User";
  }

  if (
    user.username
  ) {
    return (
      "@" +
      user.username
    );
  }

  return (
    [
      user.first_name,
      user.last_name
    ]
      .filter(Boolean)
      .join(" ")
    || "Taska User"
  );
}

function getFirstName() {
  const user =
    getCurrentUser();

  return (
    user?.first_name ||
    "User"
  );
}

function getPhoto() {
  const user =
    getCurrentUser();

  return (
    user?.photo_url ||
    ""
  );
}

function getTelegramId() {
  const user =
    getCurrentUser();

  if (
    !user?.id &&
    !user?.telegram_id
  ) {
    return "";
  }

  return String(
    user.id ||
    user.telegram_id
  );
}

// ======================================================
// HTML ESCAPE
// ======================================================

function escapeHTML(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}

// ======================================================
// APP DOM
// ======================================================

const app =
  document.querySelector(
    ".app"
  );

if (!app) {
  console.error(
    "Taska: .app element was not found."
  );
}

const initialHomeHTML =
  app
    ? app.innerHTML
    : "";

// ======================================================
// ICON HELPER
// ======================================================

function icon(
  name
) {
  return `
    <svg
      aria-hidden="true"
      focusable="false"
    >
      <use href="#icon-${name}"></use>
    </svg>
  `;
}

// ======================================================
// INLINE CLOCK ICON
// ======================================================

function clockIcon() {
  return `
    <svg
      class="checkin-clock-svg"
      viewBox="0 0 24 24"
      width="30"
      height="30"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        stroke-width="1.8"
      />

      <path
        d="M12 7.5V12L15.2 14"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <path
        d="M9 3.8L7.5 2.8M15 3.8L16.5 2.8"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
      />
    </svg>
  `;
}

// ======================================================
// HAPTIC
// ======================================================

function haptic(
  type = "light"
) {
  try {
    if (
      tg?.HapticFeedback &&
      typeof tg.HapticFeedback.impactOccurred ===
      "function"
    ) {
      tg.HapticFeedback
        .impactOccurred(
          type
        );
    }
  } catch (error) {
    console.warn(
      "Taska: Haptic unavailable:",
      error
    );
  }
}

// ======================================================
// TOAST
// ======================================================

function showToast(
  message
) {
  const toast =
    document.getElementById(
      "toast"
    );

  if (!toast) {
    console.log(
      "Taska Toast:",
      message
    );
    return;
  }

  toast.textContent =
    String(
      message
    );

  toast.classList.add(
    "show"
  );

  clearTimeout(
    showToast.timer
  );

  showToast.timer =
    setTimeout(
      () => {
        toast.classList.remove(
          "show"
        );
      },
      2300
    );
}

// ======================================================
// USER UI
// ======================================================

function setupUserUI() {
  const username =
    document.getElementById(
      "username"
    );

  const avatar =
    document.getElementById(
      "avatar"
    );

  if (username) {
    username.textContent =
      getDisplayName();
  }

  const photo =
    getPhoto();

  if (
    avatar &&
    photo
  ) {
    avatar.style.backgroundImage =
      `url("${photo}")`;

    avatar.style.backgroundSize =
      "cover";

    avatar.style.backgroundPosition =
      "center";

    avatar.style.backgroundRepeat =
      "no-repeat";

    avatar.textContent =
      "";
  }
}

// ======================================================
// AUTHENTICATE USER
// ======================================================

async function authenticateTaskaUser() {
  if (!tg?.initData) {
    console.warn(
      "Taska: Telegram initData unavailable."
    );

    return null;
  }

  try {
    console.log(
      "Taska: Authenticating user..."
    );

    const response =
      await fetch(
        `${API_URL}/api/me`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              initData:
                tg.initData
            })
        }
      );

    let data;

    try {
      data =
        await response.json();

    } catch {
      throw new Error(
        "Invalid server response"
      );
    }

    if (
      !response.ok ||
      !data.ok
    ) {
      console.error(
        "Taska authentication failed:",
        data
      );

      showToast(
        data.error ||
        "Unable to connect to Taska server"
      );

      return null;
    }

    taskaUser =
      data.user;

    setupUserUI();

    if (
      taskaUser &&
      taskaUser.balance !== undefined
    ) {
      refreshTaskaBalance(
        taskaUser.balance
      );
    }

    console.log(
      "Taska user authenticated:",
      taskaUser
    );

    return taskaUser;

  } catch (error) {
    console.error(
      "Taska authentication error:",
      error
    );

    showToast(
      error?.message ||
      "Taska server connection failed"
    );

    return null;
  }
}

// ======================================================
// INITIAL USER UI
// ======================================================

setupUserUI();

// ======================================================
// PAGE HEADER
// ======================================================

function pageHeader(
  title,
  subtitle
) {
  return `
    <div class="page-header">
      <h1>
        ${escapeHTML(title)}
      </h1>

      <p>
        ${escapeHTML(subtitle)}
      </p>
    </div>
  `;
}

// ======================================================
// DATE HELPERS
// ======================================================

function dateKey(
  date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return (
    `${year}-${month}-${day}`
  );
}

function startOfToday() {
  const date =
    new Date();

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}

function formatShortDay(
  date
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      weekday:
        "short"
    }
  ).format(
    date
  );
}

function formatMonthDay(
  date
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric"
    }
  ).format(
    date
  );
}

// ======================================================
// CHECK-IN REWARD
// ======================================================

function rewardForStreak(
  streak
) {
  const safeStreak =
    Math.min(
      7,
      Math.max(
        1,
        Number(streak) || 1
      )
    );

  return Number(
    (
      0.10 *
      safeStreak
    ).toFixed(2)
  );
}

function nextStreakFrom(
  streak
) {
  const current =
    Number(
      streak || 0
    );

  if (
    current <= 0
  ) {
    return 1;
  }

  if (
    current >= 7
  ) {
    return 1;
  }

  return current + 1;
}

function getNextMidnight() {
  const date =
    startOfToday();

  date.setDate(
    date.getDate() + 1
  );

  return date.getTime();
}

function getCountdownText() {
  const difference =
    Math.max(
      0,
      getNextMidnight() -
      Date.now()
    );

  const totalSeconds =
    Math.floor(
      difference / 1000
    );

  const hours =
    Math.floor(
      totalSeconds / 3600
    );

  const minutes =
    Math.floor(
      (
        totalSeconds % 3600
      ) / 60
    );

  const seconds =
    totalSeconds % 60;

  return (
    String(hours)
      .padStart(2, "0") +
    ":" +
    String(minutes)
      .padStart(2, "0") +
    ":" +
    String(seconds)
      .padStart(2, "0")
  );
}

    // ======================================================
// LOAD CHECK-IN STATUS FROM BACKEND
// ======================================================

async function loadCheckinStatus() {

  try {

    console.log(
      "Taska: Loading check-in status..."
    );


    const data =
      await taskaAPI(
        "/api/checkin/status"
      );


    console.log(
      "Taska: Check-in status:",
      data
    );


    checkinStatus = {

      today_claimed:
        Boolean(
          data.today_claimed
        ),

      today_reward:
        Number(
          data.today_reward || 0
        ),

      today_streak:
        Number(
          data.today_streak || 0
        ),

      next_streak:
        Number(
          data.next_streak || 1
        ),

      next_reward:
        Number(
          data.next_reward || 0.10
        ),

      cycle_days:
        Number(
          data.cycle_days || 7
        ),

      reward_per_day:
        Number(
          data.reward_per_day || 0.10
        ),

      next_checkin_at:
        data.next_checkin_at ||
        null,

      history:
        Array.isArray(
          data.history
        )
          ? data.history
          : []

    };


    if (
      checkinStatus.today_claimed
    ) {

      checkinClaimedDate =
        dateKey(
          startOfToday()
        );

    } else {

      checkinClaimedDate =
        null;

    }


    renderCheckinCalendar();


    return checkinStatus;


  } catch (error) {

    console.error(
      "Taska: Check-in status error:",
      error
    );


    /*
     * Do not break the page if status endpoint
     * is temporarily unavailable.
     *
     * Use safe default values.
     */

    renderCheckinCalendar();


    return null;

  }

}


// ======================================================
// RENDER 7 DAY CALENDAR
// ======================================================

function renderCheckinCalendar() {

  const grid =
    document.getElementById(
      "checkinDays"
    );


  if (!grid) {

    return;

  }


  const today =
    startOfToday();


  const todayKey =
    dateKey(
      today
    );


  const claimed =
    checkinStatus.today_claimed ||
    checkinClaimedDate ===
      todayKey;


  /*
   * IMPORTANT:
   *
   * If today's check-in is already claimed:
   *
   *   today = today's streak
   *
   * Example:
   *   Day 3 claimed
   *   Today = ৳0.30
   *   Tomorrow = ৳0.40
   *   ...
   *   Day 7 = ৳0.70
   *   Next cycle = ৳0.10
   *
   * If today's check-in is NOT claimed:
   *
   *   today = next_streak
   */

  let startingStreak =
    claimed
      ? Number(
          checkinStatus.today_streak ||
          1
        )
      : Number(
          checkinStatus.next_streak ||
          1
        );


  if (
    startingStreak < 1 ||
    startingStreak > 7
  ) {

    startingStreak =
      1;

  }


  const days =
    [];


  for (
    let i = 0;
    i < 7;
    i++
  ) {

    const date =
      new Date(
        today
      );


    date.setDate(
      today.getDate() +
      i
    );


    const isToday =
      i === 0;


    const isCompleted =
      isToday &&
      claimed;


    const state =
      isCompleted
        ? "completed"
        : isToday
          ? "today"
          : "locked";


    /*
     * Reward increases day by day:
     *
     * 0.10
     * 0.20
     * 0.30
     * ...
     * 0.70
     *
     * Then starts from 0.10.
     */

    let streakForDay =
      startingStreak + i;


    while (
      streakForDay > 7
    ) {

      streakForDay -= 7;

    }


    const dayReward =
      rewardForStreak(
        streakForDay
      );


    days.push(`

      <div
        class="
          checkin-day
          checkin-day-${state}
        "
        data-checkin-date="${dateKey(date)}"
      >

        <span
          class="checkin-day-name"
        >
          ${
            isToday
              ? "Today"
              : escapeHTML(
                  formatShortDay(
                    date
                  )
                )
          }
        </span>


        <strong
          class="checkin-day-number"
        >
          ${date.getDate()}
        </strong>


        <span
          class="checkin-day-month"
        >
          ${escapeHTML(
            formatMonthDay(
              date
            )
          )}
        </span>


        <span
          class="
            checkin-day-status
            ${
              isCompleted
                ? "checkin-status-completed"
                : isToday
                  ? "checkin-status-live"
                  : "checkin-status-locked"
            }
          "
          aria-label="${
            isCompleted
              ? "Completed"
              : isToday
                ? "Live"
                : "Locked"
          }"
        >

          ${
            isCompleted

              ? `
                <svg
                  class="checkin-status-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M5 12.5l4.2 4.2L19 7"
                  ></path>
                </svg>
              `

              : isToday

                ? "LIVE"

                : `
                  <svg
                    class="checkin-status-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <rect
                      x="5"
                      y="10"
                      width="14"
                      height="10"
                      rx="2.5"
                    ></rect>

                    <path
                      d="M8 10V7a4 4 0 0 1 8 0v3"
                    ></path>
                  </svg>
                `
          }

        </span>


        <span
          class="checkin-day-reward"
        >
          +${formatMoney(dayReward)}
        </span>

      </div>

    `);

  }


  grid.innerHTML =
    days.join("");


  // ====================================================
  // PROGRESS
  // ====================================================

  const progressFill =
    document.querySelector(
      ".checkin-progress-fill"
    );


  const progressValue =
    claimed
      ? Number(
          checkinStatus.today_streak ||
          1
        )
      : Math.max(
          0,
          Number(
            checkinStatus.next_streak ||
            1
          ) - 1
        );


  if (progressFill) {

    const percentage =
      Math.min(
        100,
        Math.max(
          0,
          (
            progressValue /
            7
          ) * 100
        )
      );


    progressFill.style.width =
      `${percentage}%`;

  }


  // ====================================================
  // PROGRESS LABEL
  // ====================================================

  const progressLabel =
    document.querySelector(
      ".checkin-progress-label strong"
    );


  if (progressLabel) {

    progressLabel.textContent =
      claimed

        ? `${checkinStatus.today_streak} / 7 days`

        : `${Math.max(
            0,
            Number(
              checkinStatus.next_streak ||
              1
            ) - 1
          )} / 7 days`;

  }


  // ====================================================
  // CLAIM BUTTON
  // ====================================================

  const action =
    document.getElementById(
      "dailyCheckinAction"
    );


  const status =
    document.getElementById(
      "dailyCheckinStatus"
    );


  const countdown =
    document.getElementById(
      "dailyCheckinCountdown"
    );


  const nextReward =
    claimed

      ? rewardForStreak(
          nextStreakFrom(
            checkinStatus.today_streak
          )
        )

      : Number(
          checkinStatus.next_reward ||
          rewardForStreak(
            checkinStatus.next_streak
          )
        );


  if (action) {

    action.disabled =
      claimed;


    action.dataset.claimed =
      claimed
        ? "true"
        : "false";


    action.dataset.claiming =
      "false";


    action.textContent =
      claimed
        ? "✓ Completed"
        : `Claim ${formatMoney(
            checkinStatus.next_reward ||
            0.10
          )}`;

  }


  if (status) {

    status.textContent =
      claimed

        ? `Today's reward ${formatMoney(
            checkinStatus.today_reward
          )} has been collected successfully.`

        : `Today's reward is LIVE. Claim ${formatMoney(
            checkinStatus.next_reward ||
            0.10
          )} now.`;

  }


  if (countdown) {

    countdown.textContent =
      getCountdownText();

  }


  // ====================================================
  // NEXT REWARD TEXT
  // ====================================================

  const nextRewardElement =
    document.querySelector(
      ".checkin-live-content"
    );


  /*
   * We intentionally do not inject extra text here.
   * The existing countdown UI remains clean.
   */

}


// ======================================================
// START DAILY COUNTDOWN
// ======================================================

function startCheckinCountdown() {

  clearInterval(
    checkinTimer
  );


  renderCheckinCalendar();


  checkinTimer =
    setInterval(
      async () => {

        const countdown =
          document.getElementById(
            "dailyCheckinCountdown"
          );


        if (countdown) {

          countdown.textContent =
            getCountdownText();

        }


        /*
         * When midnight is reached,
         * reload server status.
         */

        const remaining =
          getNextMidnight() -
          Date.now();


        if (
          remaining <= 1000
        ) {

          await loadCheckinStatus();

        }


        if (
          !document.getElementById(
            "checkinDays"
          )
        ) {

          clearInterval(
            checkinTimer
          );


          checkinTimer =
            null;

        }

      },
      1000
    );

}


// ======================================================
// DAILY CHECK-IN PAGE
// ======================================================

function dailyCheckinPage() {

  return `

    ${pageHeader(
      "Daily Check-in",
      "Come back every day and collect your reward"
    )}


    <section
      class="daily-checkin-card"
    >


      <!-- HEADER -->

      <div
        class="daily-checkin-head"
      >

        <div
          class="daily-checkin-icon"
        >
          ${icon("calendar")}
        </div>


        <div
          class="daily-checkin-head-text"
        >

          <span
            class="daily-checkin-label"
          >
            7 DAY REWARD
          </span>


          <h2>
            Daily Check-in
          </h2>


          <p>
            Claim
            <strong>
              ৳0.10
            </strong>
            or more every day.
          </p>

        </div>

      </div>


      <!-- PROGRESS -->

      <div
        class="checkin-progress-wrap"
      >

        <div
          class="checkin-progress-label"
        >

          <span>
            Weekly streak
          </span>

          <strong>
            0 / 7 days
          </strong>

        </div>


        <div
          class="checkin-progress-track"
        >

          <span
            class="checkin-progress-fill"
          ></span>

        </div>

      </div>


      <!-- 7 DAYS -->

      <div
        id="checkinDays"
        class="checkin-days"
      ></div>


      <!-- LIVE COUNTDOWN -->

      <div
        class="checkin-live-panel"
      >

        <div
          class="checkin-live-icon"
        >

          ${clockIcon()}

        </div>


        <div
          class="checkin-live-content"
        >

          <span>
            Next check-in
          </span>


          <strong
            id="dailyCheckinCountdown"
          >
            00h 00m 00s
          </strong>

        </div>


        <span
          class="checkin-live-badge"
        >
          LIVE
        </span>

      </div>


      <!-- STATUS -->

      <div
        class="daily-checkin-status"
        id="dailyCheckinStatus"
      >
        Today's reward is LIVE. Claim it now.
      </div>


      <!-- CLAIM -->

      <button
        type="button"
        class="
          primary-action
          daily-checkin-action
        "
        id="dailyCheckinAction"
        data-claimed="false"
      >
        Claim ৳0.10
      </button>


      <!-- BACK -->

      <button
        type="button"
        class="
          secondary-action
          daily-checkin-back
        "
        id="backToEarn"
      >

        ${icon("arrow")}

        Back to Earn

      </button>


    </section>

  `;

}


// ======================================================
// DAILY CHECK-IN CLAIM
// ======================================================

async function claimDailyCheckin(
  sourceButton = null
) {

  const button =
    sourceButton ||
    document.getElementById(
      "dailyCheckinAction"
    );


  if (!button) {

    return;

  }


  if (
    button.dataset.claiming ===
    "true"
  ) {

    return;

  }


  if (
    button.dataset.claimed ===
    "true"
  ) {

    button.textContent =
      "✓ Completed";


    showToast(
      "Today's reward is already completed"
    );


    return;

  }


  button.dataset.claiming =
    "true";


  button.disabled =
    true;


  button.textContent =
    "Claiming...";


  haptic(
    "light"
  );


  try {

    console.log(
      "Taska: Claiming daily check-in..."
    );


    const data =
      await taskaAPI(
        "/api/checkin"
      );


    console.log(
      "Taska: Daily check-in response:",
      data
    );


    // --------------------------------------------------
    // UPDATE BALANCE
    // --------------------------------------------------

    if (
      data.balance !==
      undefined &&
      data.balance !==
      null
    ) {

      refreshTaskaBalance(
        data.balance
      );

    }


    // --------------------------------------------------
    // UPDATE CHECK-IN STATE FROM SERVER
    // --------------------------------------------------

    checkinClaimedDate =
      dateKey(
        startOfToday()
      );


    checkinStatus.today_claimed =
      true;


    checkinStatus.today_reward =
      Number(
        data.reward ??
        0.10
      );


    checkinStatus.today_streak =
      Number(
        data.streak ??
        1
      );


    checkinStatus.next_streak =
      Number(
        data.next_streak ??
        nextStreakFrom(
          data.streak
        )
      );


    checkinStatus.next_reward =
      Number(
        data.next_reward ??
        rewardForStreak(
          checkinStatus.next_streak
        )
      );


    checkinStatus.next_checkin_at =
      data.next_checkin_at ||
      null;


    // --------------------------------------------------
    // BUTTON = COMPLETED
    // --------------------------------------------------

    button.dataset.claiming =
      "false";


    button.dataset.claimed =
      "true";


    button.disabled =
      true;


    button.textContent =
      "✓ Completed";


    // --------------------------------------------------
    // UPDATE STATUS TEXT
    // --------------------------------------------------

    const status =
      document.getElementById(
        "dailyCheckinStatus"
      );


    if (status) {

      status.textContent =
        `Today's reward ${formatMoney(
          checkinStatus.today_reward
        )} has been collected successfully.`;

    }


    // --------------------------------------------------
    // UPDATE CALENDAR
    // --------------------------------------------------

    renderCheckinCalendar();


    // --------------------------------------------------
    // SUCCESS TOAST
    // --------------------------------------------------

    showToast(
      `Daily reward added: ${formatMoney(
        data.reward ?? 0.10
      )}`
    );


    haptic(
      "medium"
    );


  } catch (error) {

    console.error(
      "Taska: Daily check-in error:",
      error
    );


    /*
     * If backend says already claimed,
     * update UI to Completed instead of
     * showing Claim again.
     */

    if (
      error.status === 409 ||
      error?.data?.today_claimed === true
    ) {

      checkinClaimedDate =
        dateKey(
          startOfToday()
        );


      checkinStatus.today_claimed =
        true;


      button.dataset.claimed =
        "true";


      button.dataset.claiming =
        "false";


      button.disabled =
        true;


      button.textContent =
        "✓ Completed";


      renderCheckinCalendar();


      showToast(
        "Today's reward is already completed"
      );


      return;

    }


    button.dataset.claiming =
      "false";


    button.disabled =
      false;


    button.textContent =
      `Claim ${formatMoney(
        checkinStatus.next_reward ||
        0.10
      )}`;


    showToast(
      error?.message ||
      "Unable to claim daily reward"
    );


    haptic(
      "light"
    );

  }

}


// ======================================================
// EARN PAGE
// ======================================================

function earnPage() {

  return `

    ${pageHeader(
      "Earn Rewards",
      "Complete activities and earn rewards"
    )}


    <div
      class="feature-list"
    >

      <button
        class="feature-card"
        data-action="checkin"
        type="button"
      >

        <div
          class="feature-icon"
        >
          ${icon("calendar")}
        </div>


        <div>

          <strong>
            Daily Check-in
          </strong>


          <span>
            Claim your daily reward once every day
          </span>

        </div>


        <b>
          ${icon("arrow")}
        </b>

      </button>


      <button
        class="feature-card"
        data-action="ads"
        type="button"
      >

        <div
          class="feature-icon"
        >
          ${icon("play")}
        </div>


        <div>

          <strong>
            Watch Ads
          </strong>


          <span>
            Verified ad rewards will appear here
          </span>

        </div>


        <b>
          ${icon("arrow")}
        </b>

      </button>

    </div>


    <div
      class="section-title"
    >

      <h2>
        ${icon("checklist")}
        Available Tasks
      </h2>

    </div>


    <section
      id="taskList"
      class="feature-list"
    >

      <div
        class="empty"
      >

        <strong>
          Loading tasks...
        </strong>


        <span>
          Please wait
        </span>

      </div>

    </section>

  `;

}


// ======================================================
// REFERRAL PAGE
// ======================================================

function referralPage() {

  const code =
    getTelegramId() ||
    "YOUR_ID";


  const link =
    `https://t.me/TaskaEarn_bot?start=${encodeURIComponent(
      code
    )}`;


  return `

    ${pageHeader(
      "Referral",
      "Invite friends and earn rewards"
    )}


    <div
      class="referral-card"
    >

    // ======================================================
// REFERRAL PAGE
// ======================================================

function referralPage() {

  const code =
    getTelegramId() ||
    "YOUR_ID";


  const link =
    `https://t.me/TaskaEarn_bot?start=${encodeURIComponent(
      code
    )}`;


  return `

    ${pageHeader(
      "Referral",
      "Invite friends and earn rewards"
    )}


    <div
      class="referral-card"
    >

      <div
        class="referral-icon"
      >
        ${icon("users")}
      </div>


      <h2>
        Refer & Earn
      </h2>


      <p>
        Share your referral link with friends.
        Qualified referrals can earn rewards.
      </p>


      <div
        class="referral-box"
      >
        ${escapeHTML(link)}
      </div>


      <button
        class="primary-action"
        id="copyReferral"
        type="button"
      >

        ${icon("copy")}

        Copy Referral Link

      </button>


      <button
        class="secondary-action"
        id="shareReferral"
        type="button"
      >

        ${icon("share")}

        Share with Friends

      </button>

    </div>


    <!-- REFERRAL STATISTICS -->

    <div
      class="section-title"
    >

      <h2>
        ${icon("chart")}
        Referral Statistics
      </h2>

    </div>


    <div
      class="stats single-stat"
    >

      <div
        class="stat-card"
      >

        <span
          class="stat-icon"
        >
          ${icon("users")}
        </span>


        <div>

          <span>
            Friends Referred
          </span>


          <strong>
            0
          </strong>

        </div>

      </div>


      <div
        class="stat-card"
      >

        <span
          class="stat-icon"
        >
          ${icon("wallet")}
        </span>


        <div>

          <span>
            Referral Earnings
          </span>


          <strong>
            ৳0.00
          </strong>

        </div>

      </div>

    </div>

  `;

}


// ======================================================
// WALLET PAGE
// ======================================================

function walletPage() {

  const balance =
    Number(
      taskaUser?.balance ??
      0
    );


  return `

    ${pageHeader(
      "Wallet",
      "Manage your Taska balance"
    )}


    <div
      class="wallet-card"
    >

      <div
        class="wallet-label"
      >
        Available Balance
      </div>


      <div
        class="wallet-balance"
      >
        ${formatMoney(balance)}
      </div>


      <button
        class="primary-action"
        id="walletWithdraw"
        type="button"
      >

        ${icon("wallet")}

        Withdraw

      </button>

    </div>


    <div
      class="stats"
    >

      <div
        class="stat-card"
      >

        <span
          class="stat-icon"
        >
          ${icon("chart")}
        </span>


        <div>

          <span>
            Total Earned
          </span>


          <strong>
            ৳0.00
          </strong>

        </div>

      </div>


      <div
        class="stat-card"
      >

        <span
          class="stat-icon"
        >
          ${icon("wallet")}
        </span>


        <div>

          <span>
            Total Withdrawn
          </span>


          <strong>
            ৳0.00
          </strong>

        </div>

      </div>

    </div>


    <div
      class="section-title"
    >

      <h2>
        ${icon("receipt")}
        Transactions
      </h2>

    </div>


    <section
      class="transactions"
    >

      <div
        class="empty"
      >

        <span
          class="empty-icon"
        >
          ${icon("receipt")}
        </span>


        <strong>
          No transactions yet
        </strong>


        <span>
          Your earning history will appear here
        </span>

      </div>

    </section>

  `;

}


// ======================================================
// WALLET PAGE - CURRENT VERSION
// ======================================================

function walletPage() {

  const balance =
    Number(
      taskaUser?.balance ??
      0
    );


  return `

    ${pageHeader(
      "Wallet",
      "Manage your Taska balance"
    )}


    <div
      class="wallet-card"
    >

      <div
        class="wallet-label"
      >
        Available Balance
      </div>


      <div
        class="wallet-balance"
      >
        ${formatMoney(balance)}
      </div>


      <button
        class="primary-action"
        id="walletWithdraw"
        type="button"
      >

        ${icon("wallet")}

        Withdraw

      </button>

    </div>


    <!-- WALLET STATISTICS -->

    <div
      class="section-title"
    >

      <h2>
        ${icon("chart")}
        Your Statistics
      </h2>

    </div>


    <div
      class="stats"
    >

      <div
        class="stat-card"
      >

        <span
          class="stat-icon"
        >
          ${icon("chart")}
        </span>


        <div>

          <span>
            Total Earned
          </span>


          <strong>
            ৳0.00
          </strong>

        </div>

      </div>


      <div
        class="stat-card"
      >

        <span
          class="stat-icon"
        >
          ${icon("wallet")}
        </span>


        <div>

          <span>
            Total Withdrawn
          </span>


          <strong>
            ৳0.00
          </strong>

        </div>

      </div>

    </div>


    <div
      class="section-title"
    >

      <h2>
        ${icon("receipt")}
        Transactions
      </h2>

    </div>


    <section
      class="transactions"
    >

      <div
        class="empty"
      >

        <span
          class="empty-icon"
        >
          ${icon("receipt")}
        </span>


        <strong>
          No transactions yet
        </strong>


        <span>
          Your earning history will appear here
        </span>

      </div>

    </section>

  `;

}


// ======================================================
// PROFILE PAGE
// ======================================================

function profilePage() {

  const user =
    getCurrentUser();


  const name =
    [
      user?.first_name,
      user?.last_name
    ]

      .filter(Boolean)

      .join(" ")

    || "Taska User";


  const username =
    user?.username
      ? `@${user.username}`
      : "No username";


  const photo =
    getPhoto();


  const avatar =
    photo

      ? `

        <img
          src="${escapeHTML(photo)}"
          alt="Profile"
        >

      `

      : "T";


  return `

    ${pageHeader(
      "Profile",
      "Manage your Taska account"
    )}


    <div
      class="profile-card"
    >

      <div
        class="profile-avatar"
      >
        ${avatar}
      </div>


      <h2>
        ${escapeHTML(name)}
      </h2>


      <p>
        ${escapeHTML(username)}
      </p>

    </div>


    <div
      class="profile-menu"
    >

      <button
        class="profile-item"
        data-profile="support"
        type="button"
      >

        <span>
          ${icon("headphones")}
        </span>


        <div>

          <strong>
            Help & Support
          </strong>


          <small>
            Get help with Taska
          </small>

        </div>


        <b>
          ${icon("arrow")}
        </b>

      </button>


      <button
        class="profile-item"
        data-profile="settings"
        type="button"
      >

        <span>
          ${icon("settings")}
        </span>


        <div>

          <strong>
            Account Settings
          </strong>


          <small>
            Manage your preferences
          </small>

        </div>


        <b>
          ${icon("arrow")}
        </b>

      </button>


      <button
        class="profile-item"
        data-profile="terms"
        type="button"
      >

        <span>
          ${icon("file")}
        </span>


        <div>

          <strong>
            Terms & Conditions
          </strong>


          <small>
            Taska rules and policies
          </small>

        </div>


        <b>
          ${icon("arrow")}
        </b>

      </button>


      <button
        class="profile-item"
        data-profile="privacy"
        type="button"
      >

        <span>
          ${icon("shield")}
        </span>


        <div>

          <strong>
            Privacy Policy
          </strong>


          <small>
            Learn how we protect your data
          </small>

        </div>


        <b>
          ${icon("arrow")}
        </b>

      </button>


      <button
        class="profile-item"
        data-profile="about"
        type="button"
      >

        <span>
          ${icon("info")}
        </span>


        <div>

          <strong>
            About Taska
          </strong>


          <small>
            App information
          </small>

        </div>


        <b>
          ${icon("arrow")}
        </b>

      </button>

    </div>

  `;

}


// ======================================================
// LOAD PAGE
// ======================================================

function loadPage(
  page
) {

  if (!app) {

    return;

  }


  haptic(
    "light"
  );


  clearInterval(
    checkinTimer
  );


  checkinTimer =
    null;


  // ====================================================
  // HOME
  // ====================================================

  if (
    page === "Home"
  ) {

    app.innerHTML =
      initialHomeHTML;


    setupUserUI();


    if (taskaUser) {

      refreshTaskaBalance(
        taskaUser.balance
      );

    }


    setupHomeEvents();


    return;

  }


  // ====================================================
  // EARN
  // ====================================================

  if (
    page === "Earn"
  ) {

    app.innerHTML =
      earnPage();


    setupEarnEvents();


    return;

  }


  // ====================================================
  // CHECK-IN
  // ====================================================

  if (
    page === "Checkin"
  ) {

    app.innerHTML =
      dailyCheckinPage();


    setupDailyCheckinEvents();


    return;

  }


  // ====================================================
  // REFERRAL
  // ====================================================

  if (
    page === "Referral"
  ) {

    app.innerHTML =
      referralPage();


    setupReferralEvents();


    return;

  }


  // ====================================================
  // WALLET
  // ====================================================

  if (
    page === "Wallet"
  ) {

    app.innerHTML =
      walletPage();


    setupWalletEvents();


    return;

  }


  // ====================================================
  // PROFILE
  // ====================================================

  if (
    page === "Profile"
  ) {

    app.innerHTML =
      profilePage();


    setupProfileEvents();


    return;

  }

}


// ======================================================
// HOME EVENTS
// ======================================================

function setupHomeEvents() {

  document
    .querySelectorAll(
      ".quick-card"
    )
    .forEach(
      (card) => {

        card.addEventListener(
          "click",
          () => {

            const action =
              (
                card.dataset.action ||
                ""
              )
                .toLowerCase();


            const feature =
              (
                card.dataset.feature ||
                ""
              )
                .toLowerCase();


            if (
              action ===
              "checkin" ||

              feature.includes(
                "daily check"
              )
            ) {

              loadPage(
                "Checkin"
              );


              return;

            }


            showToast(
              `${
                card.dataset.feature ||
                "This feature"
              } will be available soon`
            );


            haptic(
              "light"
            );

          }
        );

      }
    );


  document
    .querySelectorAll(
      ".feature-banner"
    )
    .forEach(
      (banner) => {

        banner.addEventListener(
          "click",
          () => {

            showToast(
              "Special offers will be available soon"
            );

          }
        );

      }
    );


  const withdraw =
    document.getElementById(
      "withdrawBtn"
    );


  if (withdraw) {

    withdraw.addEventListener(
      "click",
      () => {

        showToast(
          "Withdrawal will be available soon"
        );

      }
    );

  }


  const notification =
    document.getElementById(
      "notificationBtn"
    );


  if (notification) {

    notification.addEventListener(
      "click",
      () => {

        showToast(
          "No new notifications"
        );

      }
    );

  }


  const stats =
    document.getElementById(
      "viewStats"
    );


  if (stats) {

    stats.addEventListener(
      "click",
      () => {

        showToast(
          "Detailed statistics will be available soon"
        );

      }
    );

  }


  const transactions =
    document.getElementById(
      "viewTransactions"
    );


  if (transactions) {

    transactions.addEventListener(
      "click",
      () => {

        showToast(
          "Transaction history will be available soon"
        );

      }
    );

  }


  const eye =
    document.querySelector(
      ".balance-eye"
    );


  if (eye) {

    eye.addEventListener(
      "click",
      () => {

        showToast(
          "Balance visibility control"
        );

      }
    );

  }

               // ======================================================
// DAILY CHECK-IN EVENTS
// ======================================================

function setupDailyCheckinEvents() {

  const button =
    document.getElementById(
      "dailyCheckinAction"
    );


  if (button) {

    button.addEventListener(
      "click",
      () => {

        claimDailyCheckin(
          button
        );

      }
    );

  }


  const back =
    document.getElementById(
      "backToEarn"
    );


  if (back) {

    back.addEventListener(
      "click",
      () => {

        loadPage(
          "Earn"
        );

      }
    );

  }


  /*
   * First render the current state,
   * then ask backend for the real state.
   */

  renderCheckinCalendar();


  loadCheckinStatus();


  startCheckinCountdown();

}


// ======================================================
// RENDER EARN TASKS
// ======================================================

function renderEarnTasks(
  tasks
) {

  const list =
    document.getElementById(
      "taskList"
    );


  if (!list) {

    return;

  }


  if (
    !Array.isArray(tasks) ||
    tasks.length === 0
  ) {

    list.innerHTML = `

      <div
        class="empty"
      >

        <span
          class="empty-icon"
        >
          ${icon("checklist")}
        </span>


        <strong>
          No tasks available
        </strong>


        <span>
          New earning tasks will appear here
        </span>

      </div>

    `;


    return;

  }


  list.innerHTML =
    tasks
      .map(
        (task) => {

          const taskId =
            Number(
              task.id
            );


          const completed =
            task.completed === true ||
            task.completed === 1 ||
            task.completed === "1" ||
            task.completed === "true";


          return `

            <div
              class="feature-card task-card"
              data-task-id="${taskId}"
            >

              <div
                class="feature-icon"
              >
                ${icon("checklist")}
              </div>


              <div
                class="task-info"
              >

                <strong>
                  ${escapeHTML(
                    task.title ||
                    "Task"
                  )}
                </strong>


                <span>
                  ${escapeHTML(
                    task.description ||
                    "Complete this task to earn a reward"
                  )}
                </span>


                <small>
                  Reward:
                  ${formatMoney(
                    task.reward
                  )}
                </small>

              </div>


              <button
                type="button"
                class="primary-action task-claim"
                data-task-id="${taskId}"
                ${
                  completed
                    ? "disabled"
                    : ""
                }
                data-completed="${
                  completed
                    ? "true"
                    : "false"
                }"
              >

                ${
                  completed
                    ? "Completed"
                    : "Claim"
                }

              </button>

            </div>

          `;

        }
      )
      .join("");

}


// ======================================================
// LOAD EARN TASKS
// ======================================================

async function loadEarnTasks() {

  const list =
    document.getElementById(
      "taskList"
    );


  if (!list) {

    return;

  }


  list.innerHTML = `

    <div
      class="empty"
    >

      <strong>
        Loading tasks...
      </strong>


      <span>
        Please wait
      </span>

    </div>

  `;


  try {

    console.log(
      "Taska: Loading tasks..."
    );


    const data =
      await taskaAPI(
        "/api/tasks"
      );


    console.log(
      "Taska: Tasks response:",
      data
    );


    earnTasks =
      Array.isArray(
        data.tasks
      )
        ? data.tasks
        : [];


    renderEarnTasks(
      earnTasks
    );


  } catch (error) {

    console.error(
      "Taska: Load tasks error:",
      error
    );


    list.innerHTML = `

      <div
        class="empty"
      >

        <strong>
          Unable to load tasks
        </strong>


        <span>
          ${escapeHTML(
            error?.message ||
            "Unknown error"
          )}
        </span>


        <button
          type="button"
          class="secondary-action"
          id="retryTasks"
        >
          Try Again
        </button>

      </div>

    `;


    const retry =
      document.getElementById(
        "retryTasks"
      );


    if (retry) {

      retry.addEventListener(
        "click",
        loadEarnTasks
      );

    }

  }

}


// ======================================================
// CLAIM TASK
// ======================================================

async function claimTask(
  taskId,
  button = null
) {

  const numericTaskId =
    Number(
      taskId
    );


  if (
    !Number.isFinite(
      numericTaskId
    )
  ) {

    showToast(
      "Invalid task"
    );


    return;

  }


  const task =
    earnTasks.find(
      (item) =>
        Number(item.id) ===
        numericTaskId
    );


  if (!task) {

    showToast(
      "Task not found. Please reload tasks."
    );


    return;

  }


  const completed =
    task.completed === true ||
    task.completed === 1 ||
    task.completed === "1" ||
    task.completed === "true";


  if (completed) {

    showToast(
      "This task is already completed"
    );


    return;

  }


  if (!button) {

    button =
      document.querySelector(
        `.task-claim[data-task-id="${numericTaskId}"]`
      );

  }


  if (
    button?.dataset.claiming ===
    "true"
  ) {

    return;

  }


  if (button) {

    button.dataset.claiming =
      "true";


    button.disabled =
      true;


    button.textContent =
      "Claiming...";

  }


  haptic(
    "light"
  );


  try {

    console.log(
      "Taska: Calling /api/tasks/complete",
      {
        task_id:
          numericTaskId
      }
    );


    const data =
      await taskaAPI(
        "/api/tasks/complete",
        {
          task_id:
            numericTaskId
        }
      );


    console.log(
      "Taska: Claim response:",
      data
    );


    task.completed =
      true;


    if (
      data.balance !==
      undefined &&
      data.balance !==
      null
    ) {

      refreshTaskaBalance(
        data.balance
      );

    }


    taskStartTimes.delete(
      numericTaskId
    );


    if (button) {

      button.dataset.claiming =
        "false";


      button.dataset.completed =
        "true";


      button.disabled =
        true;


      button.textContent =
        "Completed";

    }


    showToast(
      `Reward added: ${formatMoney(
        data.reward
      )}`
    );


    haptic(
      "medium"
    );


  } catch (error) {

    console.error(
      "Taska: Claim task error:",
      error
    );


    if (button) {

      button.dataset.claiming =
        "false";


      button.disabled =
        false;


      button.textContent =
        "Claim";

    }


    showToast(
      error?.message ||
      "Unable to claim task"
    );


    haptic(
      "light"
    );

  }

}


// ======================================================
// EARN EVENTS
// ======================================================

function setupEarnEvents() {

  const checkin =
    document.querySelector(
      '[data-action="checkin"]'
    );


  if (checkin) {

    checkin.addEventListener(
      "click",
      () => {

        loadPage(
          "Checkin"
        );

      }
    );

  }


  const ads =
    document.querySelector(
      '[data-action="ads"]'
    );


  if (ads) {

    ads.addEventListener(
      "click",
      () => {

        showToast(
          "Verified ads will be available soon"
        );


        haptic(
          "light"
        );

      }
    );

  }


  // ====================================================
  // TASK CLAIM
  //
  // IMPORTANT:
  // Tasks are loaded dynamically from backend.
  // Therefore we use EVENT DELEGATION on #taskList.
  // ====================================================

  const taskList =
    document.getElementById(
      "taskList"
    );


  if (taskList) {

    taskList.addEventListener(
      "click",
      (event) => {

        const button =
          event.target.closest(
            ".task-claim"
          );


        if (!button) {

          return;

        }


        event.preventDefault();


        event.stopPropagation();


        const taskId =
          Number(
            button.dataset.taskId
          );


        console.log(
          "Taska: CLAIM BUTTON CLICKED:",
          taskId
        );


        claimTask(
          taskId,
          button
        );

      }
    );

  }


  loadEarnTasks();

}


// ======================================================
// REFERRAL EVENTS
// ======================================================

function setupReferralEvents() {

  const telegramId =
    getTelegramId();


  const referralCode =
    telegramId ||
    "YOUR_ID";


  const referralLink =
    `https://t.me/TaskaEarn_bot?start=${encodeURIComponent(
      referralCode
    )}`;


  const copyButton =
    document.getElementById(
      "copyReferral"
    );


  if (copyButton) {

    copyButton.addEventListener(
      "click",
      async () => {

        try {

          if (
            navigator.clipboard
          ) {

            await navigator.clipboard.writeText(
              referralLink
            );


            showToast(
              "Referral link copied"
            );

          } else {

            showToast(
              "Copy is not available here"
            );

          }

        } catch (error) {

          console.error(
            "Taska: Copy referral error:",
            error
          );


          showToast(
            "Unable to copy the link"
          );

        }


        haptic(
          "light"
        );

      }
    );

  }


  const shareButton =
    document.getElementById(
      "shareReferral"
    );


  if (shareButton) {

    shareButton.addEventListener(
      "click",
      () => {

        const shareURL =
          `https://t.me/share/url?url=${encodeURIComponent(
            referralLink
          )}`;


        if (
          tg?.openTelegramLink
        ) {

          tg.openTelegramLink(
            shareURL
          );

        } else {

          window.open(
            shareURL,
            "_blank"
          );

        }


        haptic(
          "light"
        );

      }
    );

  }

}


// ======================================================
// WALLET EVENTS
// ======================================================

function setupWalletEvents() {

  const withdraw =
    document.getElementById(
      "walletWithdraw"
    );


  if (withdraw) {

    withdraw.addEventListener(
      "click",
      () => {

        showToast(
          "Withdrawal will be available soon"
        );


        haptic(
          "light"
        );

      }
    );

  }

}


// ======================================================
// PROFILE EVENTS
// ======================================================

function setupProfileEvents() {

  const messages = {

    support:
      "Support center coming soon",

    settings:
      "Account settings coming soon",

    terms:
      "Terms & Conditions coming soon",

    privacy:
      "Privacy Policy coming soon",

    about:
      "Taska information coming soon"

  };


  document
    .querySelectorAll(
      ".profile-item"
    )
    .forEach(
      (item) => {

        item.addEventListener(
          "click",
          () => {

            const type =
              item.dataset.profile;


            showToast(
              messages[type] ||
              "Coming soon"
            );


            haptic(
              "light"
            );

          }
        );

      }
    );

}


// ======================================================
// NAVIGATION
// ======================================================

function setupNavigation() {

  document
    .querySelectorAll(
      ".nav-btn"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            document
              .querySelectorAll(
                ".nav-btn"
              )
              .forEach(
                (btn) => {

                  btn.classList.remove(
                    "active"
                  );

                }
              );


            button.classList.add(
              "active"
            );


            const page =
              button.dataset.page;


            if (!page) {

              return;

            }


            loadPage(
              page
            );


            window.scrollTo({
              top: 0,
              behavior: "smooth"
            });

          }
        );

      }
    );

}


// ======================================================
// START APP
// ======================================================

setupNavigation();

setupHomeEvents();


// ======================================================
// AUTHENTICATE
// ======================================================

authenticateTaskaUser()
  .then(
    (authenticatedUser) => {

      if (
        !authenticatedUser
      ) {

        return;

      }


      setupUserUI();


      if (
        authenticatedUser.balance !==
        undefined
      ) {

        refreshTaskaBalance(
          authenticatedUser.balance
        );

      }


      console.log(
        "Taska: User account connected to database."
      );

    }
  )
  .catch(
    (error) => {

      console.error(
        "Taska: Authentication startup error:",
        error
      );

    }
  );


// ======================================================
// DEBUG
// ======================================================

console.log(
  "Taska frontend loaded successfully."
);

