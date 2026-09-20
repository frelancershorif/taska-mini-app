// ======================================================
// TASKA - FRONTEND APP
// Telegram Mini App + Taska Backend
// ======================================================


// ======================================================
// TELEGRAM
// ======================================================

const tg =
  window.Telegram?.WebApp || null;


// ======================================================
// BACKEND
// ======================================================

const API_URL =
  "https://taska-mini-app.onrender.com";


// ======================================================
// GLOBAL STATE
// ======================================================

let earnTasks = [];

let taskaUser = null;

let homeStats = {
  total_earned: 0,
  referrals: 0,
  tasks_completed: 0,
  total_withdrawn: 0,
  today_earned: 0
};


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
// CHECK-IN STATE
// ======================================================

let checkinClaimedDate = null;

let checkinTimer = null;

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
// API
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

  } catch {

    throw new Error(
      "Invalid server response"
    );

  }


  if (
    !response.ok ||
    !data.ok
  ) {

    const error =
      new Error(
        data?.error ||
        data?.message ||
        "Taska server error"
      );


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
    !Number.isFinite(number)
  ) {

    return "৳0.00";

  }


  return (
    "৳" +
    number.toFixed(2)
  );

}


// ======================================================
// BALANCE
// ======================================================

function refreshTaskaBalance(
  balance
) {

  if (!taskaUser) {
    return;
  }


  const number =
    Number(balance ?? 0);


  if (
    !Number.isFinite(number)
  ) {

    return;

  }


  taskaUser.balance =
    number;


  document
    .querySelectorAll(
      "#balance, .balance-value, .wallet-balance, [data-balance]"
    )
    .forEach(
      element => {

        element.textContent =
          formatMoney(number);

      }
    );


  console.log(
    "Taska: Balance updated:",
    number
  );

}


// ======================================================
// TELEGRAM START
// ======================================================

if (tg) {

  try {
    tg.ready();
  } catch {}

  try {
    tg.expand();
  } catch {}

}


// ======================================================
// THEME
// ======================================================

if (tg?.themeParams) {

  const root =
    document.documentElement;

  const theme =
    tg.themeParams;


  if (theme.bg_color) {

    root.style.setProperty(
      "--bg",
      theme.bg_color
    );

  }


  if (theme.text_color) {

    root.style.setProperty(
      "--text",
      theme.text_color
    );

  }


  if (theme.hint_color) {

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


  if (user?.username) {

    return (
      "@" +
      user.username
    );

  }


  return (
    [
      user?.first_name,
      user?.last_name
    ]
      .filter(Boolean)
      .join(" ")
    ||
    "Taska User"
  );

}


function getFirstName() {

  return (
    getCurrentUser()?.first_name ||
    "User"
  );

}


function getPhoto() {

  return (
    getCurrentUser()?.photo_url ||
    ""
  );

}


function getTelegramId() {

  const user =
    getCurrentUser();


  return (
    user?.id ||
    user?.telegram_id
      ? String(
          user.id ||
          user.telegram_id
        )
      : ""
  );

}


// ======================================================
// ESCAPE HTML
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

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");

}


// ======================================================
// APP
// ======================================================

const app =
  document.querySelector(".app");


const initialHomeHTML =
  app
    ? app.innerHTML
    : "";


// ======================================================
// ICON
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
// CLOCK
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

    tg?.HapticFeedback?.impactOccurred(
      type
    );

  } catch {}

}


// ======================================================
// TOAST
// ======================================================

function showToast(
  message
) {

  const toast =
    document.getElementById("toast");


  if (!toast) {

    console.log(
      "Taska:",
      message
    );

    return;

  }


  toast.textContent =
    String(message);


  toast.classList.add("show");


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
// AUTHENTICATE
// ======================================================

async function authenticateTaskaUser() {

  if (!tg?.initData) {

    console.warn(
      "Taska: Telegram initData unavailable."
    );

    return null;

  }


  try {

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


    const data =
      await response.json();


    if (
      !response.ok ||
      !data.ok
    ) {

      showToast(
        data?.error ||
        "Unable to connect to Taska server"
      );


      return null;

    }


    taskaUser =
      data.user;


    setupUserUI();


    refreshTaskaBalance(
      taskaUser.balance
    );


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
// DATE HELPERS
// ======================================================

function dateKey(
  date
) {

  return (
    `${date.getFullYear()}-` +
    `${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-` +
    `${String(
      date.getDate()
    ).padStart(2, "0")}`
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
  ).format(date);

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
  ).format(date);

}


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
// HOME STATISTICS
// ======================================================

function renderHomeStats(
  stats
) {

  homeStats = {

    total_earned:
      Number(
        stats?.total_earned || 0
      ),

    referrals:
      Number(
        stats?.referrals || 0
      ),

    tasks_completed:
      Number(
        stats?.tasks_completed || 0
      ),

    total_withdrawn:
      Number(
        stats?.total_withdrawn || 0
      ),

    today_earned:
      Number(
        stats?.today_earned || 0
      )

  };


  const totalEarned =
    document.getElementById(
      "statTotalEarnings"
    );


  const referrals =
    document.getElementById(
      "statReferrals"
    );


  const tasks =
    document.getElementById(
      "statTasksCompleted"
    );


  const withdrawn =
    document.getElementById(
      "statTotalWithdrawn"
    );


  const today =
    document.getElementById(
      "todayEarnings"
    );


  if (totalEarned) {

    totalEarned.textContent =
      formatMoney(
        homeStats.total_earned
      );

  }


  if (referrals) {

    referrals.textContent =
      String(
        homeStats.referrals
      );

  }


  if (tasks) {

    tasks.textContent =
      String(
        homeStats.tasks_completed
      );

  }


  if (withdrawn) {

    withdrawn.textContent =
      formatMoney(
        homeStats.total_withdrawn
      );

  }


  if (today) {

    today.textContent =
      formatMoney(
        homeStats.today_earned
      );

  }

}


// ======================================================
// LOAD HOME STATISTICS
// ======================================================

async function loadHomeStats() {

  try {

    console.log(
      "Taska: Loading real statistics..."
    );


    const data =
      await taskaAPI(
        "/api/stats"
      );


    console.log(
      "Taska: Statistics response:",
      data
    );


    renderHomeStats(
      data.stats
    );


  } catch (error) {

    console.error(
      "Taska: Statistics error:",
      error
    );

  }

}


// ======================================================
// CHECK-IN REWARD
// ======================================================

function rewardForStreak(
  streak
) {

  const safe =
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
      safe
    ).toFixed(2)
  );

}


function nextStreakFrom(
  streak
) {

  const current =
    Number(streak || 0);


  if (current <= 0) {
    return 1;
  }


  if (current >= 7) {
    return 1;
  }


  return current + 1;

}


// ======================================================
// COUNTDOWN
// ======================================================

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
      (totalSeconds % 3600) / 60
    );


  const seconds =
    totalSeconds % 60;


  return (
    String(hours).padStart(2, "0") +
    "h " +
    String(minutes).padStart(2, "0") +
    "m " +
    String(seconds).padStart(2, "0") +
    "s"
  );

}


// ======================================================
// CHECK-IN STATUS
// ======================================================

async function loadCheckinStatus() {

  try {

    const data =
      await taskaAPI(
        "/api/checkin/status"
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


    checkinClaimedDate =
      checkinStatus.today_claimed
        ? dateKey(startOfToday())
        : null;


    renderCheckinCalendar();


    return checkinStatus;

  } catch (error) {

    console.error(
      "Taska: Check-in status error:",
      error
    );


    renderCheckinCalendar();


    return null;

  }

}


// ======================================================
// CHECK-IN CALENDAR
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
    dateKey(today);


  const claimed =
    checkinStatus.today_claimed ||
    checkinClaimedDate ===
      todayKey;


  let startingStreak =
    claimed
      ? Number(
          checkinStatus.today_streak || 1
        )
      : Number(
          checkinStatus.next_streak || 1
        );


  if (
    startingStreak < 1 ||
    startingStreak > 7
  ) {

    startingStreak = 1;

  }


  const days = [];


  for (
    let i = 0;
    i < 7;
    i++
  ) {

    const date =
      new Date(today);


    date.setDate(
      today.getDate() + i
    );


    const isToday =
      i === 0;


    const completed =
      isToday && claimed;


    const state =
      completed
        ? "completed"
        : isToday
          ? "today"
          : "locked";


    let streak =
      startingStreak + i;


    while (streak > 7) {
      streak -= 7;
    }


    const reward =
      rewardForStreak(streak);


    days.push(`

      <div
        class="
          checkin-day
          checkin-day-${state}
        "
      >

        <span class="checkin-day-name">
          ${
            isToday
              ? "Today"
              : escapeHTML(
                  formatShortDay(date)
                )
          }
        </span>


        <strong class="checkin-day-number">
          ${date.getDate()}
        </strong>


        <span class="checkin-day-month">
          ${escapeHTML(
            formatMonthDay(date)
          )}
        </span>


        <span
          class="
            checkin-day-status
            ${
              completed
                ? "checkin-status-completed"
                : isToday
                  ? "checkin-status-live"
                  : "checkin-status-locked"
            }
          "
        >

          ${
            completed

              ? `
                <svg
                  class="checkin-status-icon"
                  viewBox="0 0 24 24"
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


        <span class="checkin-day-reward">
          +${formatMoney(reward)}
        </span>

      </div>

    `);

  }


  grid.innerHTML =
    days.join("");


  const progressFill =
    document.querySelector(
      ".checkin-progress-fill"
    );


  const progressValue =
    claimed
      ? Number(
          checkinStatus.today_streak || 1
        )
      : Math.max(
          0,
          Number(
            checkinStatus.next_streak || 1
          ) - 1
        );


  if (progressFill) {

    progressFill.style.width =
      `${Math.min(
        100,
        (progressValue / 7) * 100
      )}%`;

  }


  const progressLabel =
    document.querySelector(
      ".checkin-progress-label strong"
    );


  if (progressLabel) {

    progressLabel.textContent =
      `${progressValue} / 7 days`;

  }


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
            checkinStatus.next_reward || 0.10
          )} now.`;

  }


  if (countdown) {

    countdown.textContent =
      getCountdownText();

  }

}


// ======================================================
// CHECK-IN PAGE
// ======================================================

function dailyCheckinPage() {

  return `

    ${pageHeader(
      "Daily Check-in",
      "Come back every day and collect your reward"
    )}


    <section class="daily-checkin-card">


      <div class="daily-checkin-head">

        <div class="daily-checkin-icon">
          ${icon("calendar")}
        </div>


        <div class="daily-checkin-head-text">

          <span class="daily-checkin-label">
            7 DAY REWARD
          </span>

          <h2>
            Daily Check-in
          </h2>

          <p>
            Claim
            <strong>৳0.10</strong>
            or more every day.
          </p>

        </div>

      </div>


      <div class="checkin-progress-wrap">

        <div class="checkin-progress-label">

          <span>
            Weekly streak
          </span>

          <strong>
            0 / 7 days
          </strong>

        </div>


        <div class="checkin-progress-track">

          <span
            class="checkin-progress-fill"
          ></span>

        </div>

      </div>


      <div
        id="checkinDays"
        class="checkin-days"
      ></div>


      <div class="checkin-live-panel">

        <div class="checkin-live-icon">
          ${clockIcon()}
        </div>


        <div class="checkin-live-content">

          <span>
            Next check-in
          </span>

          <strong id="dailyCheckinCountdown">
            00h 00m 00s
          </strong>

        </div>


        <span class="checkin-live-badge">
          LIVE
        </span>

      </div>


      <div
        class="daily-checkin-status"
        id="dailyCheckinStatus"
      >
        Today's reward is LIVE. Claim it now.
      </div>


      <button
        type="button"
        class="primary-action daily-checkin-action"
        id="dailyCheckinAction"
        data-claimed="false"
      >
        Claim ৳0.10
      </button>


      <button
        type="button"
        class="secondary-action daily-checkin-back"
        id="backToEarn"
      >

        ${icon("arrow")}

        Back to Earn

      </button>


    </section>

  `;

}


// ======================================================
// CLAIM DAILY CHECK-IN
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


  try {

    const data =
      await taskaAPI(
        "/api/checkin"
      );


    if (
      data.balance !==
      undefined
    ) {

      refreshTaskaBalance(
        data.balance
      );

    }


    checkinClaimedDate =
      dateKey(startOfToday());


    checkinStatus.today_claimed =
      true;


    checkinStatus.today_reward =
      Number(
        data.reward ?? 0.10
      );


    checkinStatus.today_streak =
      Number(
        data.streak ?? 1
      );


    checkinStatus.next_streak =
      Number(
        data.next_streak ??
        nextStreakFrom(data.streak)
      );


    checkinStatus.next_reward =
      Number(
        data.next_reward ??
        rewardForStreak(
          checkinStatus.next_streak
        )
      );


    button.dataset.claiming =
      "false";


    button.dataset.claimed =
      "true";


    button.disabled =
      true;


    button.textContent =
      "✓ Completed";


    renderCheckinCalendar();


    showToast(
      `Daily reward added: ${formatMoney(
        data.reward ?? 0.10
      )}`
    );


    loadHomeStats();


    haptic("medium");

  } catch (error) {

    console.error(
      "Taska: Daily check-in error:",
      error
    );


    if (
      error.status === 409 ||
      error?.data?.today_claimed === true
    ) {

      checkinClaimedDate =
        dateKey(startOfToday());


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


    <div class="feature-list">

      <button
        class="feature-card"
        data-action="checkin"
        type="button"
      >

        <div class="feature-icon">
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

        <div class="feature-icon">
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


    <div class="section-title">

      <h2>
        ${icon("checklist")}
        Available Tasks
      </h2>

    </div>


    <section
      id="taskList"
      class="feature-list"
    >

      <div class="empty">

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
// RENDER TASKS
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

      <div class="empty">

        <span class="empty-icon">
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
    tasks.map(
      task => {

        const taskId =
          Number(task.id);


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

            <div class="feature-icon">
              ${icon("checklist")}
            </div>


            <div class="task-info">

              <strong>
                ${escapeHTML(
                  task.title || "Task"
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
                ${formatMoney(task.reward)}
              </small>

            </div>


            <button
              type="button"
              class="primary-action task-claim"
              data-task-id="${taskId}"
              data-completed="${
                completed
                  ? "true"
                  : "false"
              }"
              ${
                completed
                  ? "disabled"
                  : ""
              }
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
    ).join("");

}


// ======================================================
// LOAD TASKS
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

    <div class="empty">

      <strong>
        Loading tasks...
      </strong>

      <span>
        Please wait
      </span>

    </div>

  `;


  try {

    const data =
      await taskaAPI(
        "/api/tasks"
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

      <div class="empty">

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


    document
      .getElementById(
        "retryTasks"
      )
      ?.addEventListener(
        "click",
        loadEarnTasks
      );

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
    Number(taskId);


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
      item =>
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


    task.completed =
      true;


    if (
      data.balance !==
      undefined
    ) {

      refreshTaskaBalance(
        data.balance
      );

    }


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


    taskStartTimes.delete(
      numericTaskId
    );


    showToast(
      `Reward added: ${formatMoney(
        data.reward
      )}`
    );


    loadHomeStats();


    haptic("medium");

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

      }
    );

  }


  const taskList =
    document.getElementById(
      "taskList"
    );


  if (taskList) {

    taskList.addEventListener(
      "click",
      event => {

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
// DAILY EVENTS
// ======================================================

function setupDailyCheckinEvents() {

  const button =
    document.getElementById(
      "dailyCheckinAction"
    );


  button?.addEventListener(
    "click",
    () => {

      claimDailyCheckin(
        button
      );

    }
  );


  const back =
    document.getElementById(
      "backToEarn"
    );


  back?.addEventListener(
    "click",
    () => {

      loadPage(
        "Earn"
      );

    }
  );


  renderCheckinCalendar();

  loadCheckinStatus();

  startCheckinCountdown();

}


// ======================================================
// COUNTDOWN
// ======================================================

function startCheckinCountdown() {

  clearInterval(
    checkinTimer
  );


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


        if (
          getNextMidnight() -
          Date.now() <=
          1000
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


    <div class="referral-card">

      <div class="referral-icon">
        ${icon("users")}
      </div>


      <h2>
        Refer & Earn
      </h2>


      <p>
        Share your referral link with friends.
        Qualified referrals can earn rewards.
      </p>


      <div class="referral-box">
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

  `;

}


// ======================================================
// WALLET
// ======================================================

function walletPage() {

  const balance =
    Number(
      taskaUser?.balance ?? 0
    );


  return `

    ${pageHeader(
      "Wallet",
      "Manage your Taska balance"
    )}


    <div class="wallet-card">

      <div class="wallet-label">
        Available Balance
      </div>


      <div class="wallet-balance">
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

  `;

}


// ======================================================
// PROFILE
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
    ||
    "Taska User";


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


    <div class="profile-card">

      <div class="profile-avatar">
        ${avatar}
      </div>


      <h2>
        ${escapeHTML(name)}
      </h2>


      <p>
        ${escapeHTML(username)}
      </p>

    </div>


    <div class="profile-menu">

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


  haptic("light");


  clearInterval(
    checkinTimer
  );


  checkinTimer =
    null;


  if (page === "Home") {

    app.innerHTML =
      initialHomeHTML;


    setupUserUI();


    if (taskaUser) {

      refreshTaskaBalance(
        taskaUser.balance
      );

    }


    setupHomeEvents();

    loadHomeStats();

    return;

  }


  if (page === "Earn") {

    app.innerHTML =
      earnPage();


    setupEarnEvents();

    return;

  }


  if (page === "Checkin") {

    app.innerHTML =
      dailyCheckinPage();


    setupDailyCheckinEvents();

    return;

  }


  if (page === "Referral") {

    app.innerHTML =
      referralPage();


    setupReferralEvents();

    return;

  }


  if (page === "Wallet") {

    app.innerHTML =
      walletPage();


    setupWalletEvents();

    return;

  }


  if (page === "Profile") {

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
    .querySelectorAll(".quick-card")
    .forEach(
      card => {

        card.addEventListener(
          "click",
          () => {

            const feature =
              (
                card.dataset.feature ||
                ""
              ).toLowerCase();


            if (
              feature.includes(
                "daily check"
              )
            ) {

              loadPage(
                "Checkin"
              );

              return;

            }


            if (
              feature === "tasks"
            ) {

              loadPage(
                "Earn"
              );

              return;

            }


            if (
              feature === "referral"
            ) {

              loadPage(
                "Referral"
              );

              return;

            }


            showToast(
              `${
                card.dataset.feature ||
                "This feature"
              } will be available soon`
            );

          }
        );

      }
    );


  document
    .querySelectorAll(".feature-banner")
    .forEach(
      banner => {

        banner.addEventListener(
          "click",
          () => {

            loadPage(
              "Earn"
            );

          }
        );

      }
    );


  document
    .getElementById(
      "withdrawBtn"
    )
    ?.addEventListener(
      "click",
      () => {

        showToast(
          "Withdrawal will be available soon"
        );

      }
    );


  document
    .getElementById(
      "notificationBtn"
    )
    ?.addEventListener(
      "click",
      () => {

        showToast(
          "No new notifications"
        );

      }
    );


  document
    .getElementById(
      "viewStats"
    )
    ?.addEventListener(
      "click",
      () => {

        showToast(
          "Detailed statistics will be available soon"
        );

      }
    );


  document
    .getElementById(
      "viewTransactions"
    )
    ?.addEventListener(
      "click",
      () => {

        showToast(
          "Transaction history will be available soon"
        );

      }
    );


  document
    .querySelector(
      ".balance-eye"
    )
    ?.addEventListener(
      "click",
      () => {

        showToast(
          "Balance visibility control"
        );

      }
    );

}


// ======================================================
// REFERRAL EVENTS
// ======================================================

function setupReferralEvents() {

  const telegramId =
    getTelegramId();


  const referralLink =
    `https://t.me/TaskaEarn_bot?start=${encodeURIComponent(
      telegramId || "YOUR_ID"
    )}`;


  document
    .getElementById(
      "copyReferral"
    )
    ?.addEventListener(
      "click",
      async () => {

        try {

          await navigator.clipboard.writeText(
            referralLink
          );


          showToast(
            "Referral link copied"
          );

        } catch {

          showToast(
            "Unable to copy the link"
          );

        }

      }
    );


  document
    .getElementById(
      "shareReferral"
    )
    ?.addEventListener(
      "click",
      () => {

        const url =
          `https://t.me/share/url?url=${encodeURIComponent(
            referralLink
          )}`;


        if (tg?.openTelegramLink) {

          tg.openTelegramLink(url);

        } else {

          window.open(
            url,
            "_blank"
          );

        }

      }
    );

}


// ======================================================
// WALLET EVENTS
// ======================================================

function setupWalletEvents() {

  document
    .getElementById(
      "walletWithdraw"
    )
    ?.addEventListener(
      "click",
      () => {

        showToast(
          "Withdrawal will be available soon"
        );

      }
    );

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
      item => {

        item.addEventListener(
          "click",
          () => {

            showToast(
              messages[
                item.dataset.profile
              ] ||
              "Coming soon"
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
      button => {

        button.addEventListener(
          "click",
          () => {

            document
              .querySelectorAll(
                ".nav-btn"
              )
              .forEach(
                btn =>
                  btn.classList.remove(
                    "active"
                  )
              );


            button.classList.add(
              "active"
            );


            const page =
              button.dataset.page;


            if (!page) {
              return;
            }


            loadPage(page);


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
// START
// ======================================================

setupUserUI();

setupNavigation();

setupHomeEvents();

loadHomeStats();


authenticateTaskaUser()
  .then(
    user => {

      if (!user) {
        return;
      }


      setupUserUI();


      refreshTaskaBalance(
        user.balance
      );


      loadHomeStats();

    }
  )
  .catch(
    error => {

      console.error(
        "Taska startup error:",
        error
      );

    }
  );


console.log(
  "Taska frontend loaded successfully."
);
