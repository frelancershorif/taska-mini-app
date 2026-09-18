// ======================================================
// TASKA - FRONTEND APP
// Telegram Mini App + Taska Backend
// ======================================================


// ======================================================
// TELEGRAM INITIALIZATION
// ======================================================

const tg =
  window.Telegram?.WebApp || null;


// ======================================================
// TASKA BACKEND
// ======================================================

const API_URL =
  "https://taska-mini-app.onrender.com";


// ======================================================
// EARN PAGE STATE
// ======================================================

let earnTasks = [];


// Prevent duplicate claim requests
const claimingTasks =
  new Set();


// ======================================================
// TELEGRAM AUTH INIT DATA
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
      "Taska API error:",
      {
        path,
        status: response.status,
        data
      }
    );


    throw new Error(
      data.error ||
      data.message ||
      `Taska server error (${response.status})`
    );

  }


  return data;

}


// ======================================================
// TELEGRAM STARTUP
// ======================================================

if (tg) {

  try {

    tg.ready();

  } catch {}


  try {

    tg.expand();

  } catch {}


  try {

    if (
      tg.enableClosingConfirmation
    ) {

      tg.enableClosingConfirmation();

    }

  } catch {}

}


// ======================================================
// TELEGRAM THEME
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
// TELEGRAM USER
// ======================================================

const telegramUser =
  tg?.initDataUnsafe?.user ||
  null;


// ======================================================
// TASKA AUTHENTICATED USER
// ======================================================

let taskaUser = null;


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


// ======================================================
// DISPLAY NAME
// ======================================================

function getDisplayName() {

  const currentUser =
    getCurrentUser();


  if (!currentUser) {

    return "Taska User";

  }


  if (
    currentUser.username
  ) {

    return (
      "@" +
      currentUser.username
    );

  }


  return (

    [
      currentUser.first_name,
      currentUser.last_name
    ]

      .filter(Boolean)

      .join(" ")

    || "Taska User"

  );

}


// ======================================================
// FIRST NAME
// ======================================================

function getFirstName() {

  const currentUser =
    getCurrentUser();


  if (!currentUser) {

    return "User";

  }


  return (
    currentUser.first_name ||
    "User"
  );

}


// ======================================================
// PHOTO
// ======================================================

function getPhoto() {

  const currentUser =
    getCurrentUser();


  return (
    currentUser?.photo_url ||
    ""
  );

}


// ======================================================
// TELEGRAM USER ID
// ======================================================

function getTelegramId() {

  const currentUser =
    getCurrentUser();


  if (
    !currentUser?.id &&
    !currentUser?.telegram_id
  ) {

    return "";

  }


  return String(
    currentUser.id ||
    currentUser.telegram_id
  );

}


// ======================================================
// HTML ESCAPE
// ======================================================

function escapeHTML(value) {

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
// FORMAT MONEY
// ======================================================

function formatMoney(amount) {

  const number =
    Number(
      amount || 0
    );


  return (
    "৳" +
    number.toFixed(2)
  );

}


// ======================================================
// DOM
// ======================================================

const app =
  document.querySelector(
    ".app"
  );


if (!app) {

  console.error(
    "Taska: .app element not found"
  );

}


// ======================================================
// STORE ORIGINAL HOME HTML
// ======================================================

const initialHomeHTML =
  app?.innerHTML || "";


// ======================================================
// ICON HELPER
// ======================================================

function icon(name) {

  return `
    <svg aria-hidden="true">
      <use href="#icon-${name}"></use>
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
      tg?.HapticFeedback
    ) {

      tg.HapticFeedback
        .impactOccurred(
          type
        );

    }

  } catch {}

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
    message;


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
// REFRESH BALANCE
// ======================================================

function refreshTaskaBalance(
  balance
) {

  if (!taskaUser) {

    return;

  }


  const numericBalance =
    Number(
      balance ?? 0
    );


  if (
    !Number.isFinite(
      numericBalance
    )
  ) {

    console.error(
      "Invalid balance:",
      balance
    );

    return;

  }


  taskaUser.balance =
    numericBalance;


  const balanceElements =
    document.querySelectorAll(
      "#balance, .balance-value, .wallet-balance"
    );


  balanceElements.forEach(
    (element) => {

      element.textContent =
        formatMoney(
          numericBalance
        );

    }
  );


  console.log(
    "Taska balance updated:",
    numericBalance
  );

}


// ======================================================
// AUTHENTICATE USER
// ======================================================

async function authenticateTaskaUser() {

  if (!tg?.initData) {

    console.error(
      "Taska: Telegram initData not available."
    );

    showToast(
      "Telegram authentication unavailable"
    );

    return null;

  }


  try {

    console.log(
      "Taska: Authenticating Telegram user..."
    );


    const data =
      await taskaAPI(
        "/api/me"
      );


    if (
      !data.user
    ) {

      throw new Error(
        "User data was not returned by server"
      );

    }


    taskaUser =
      data.user;


    console.log(
      "Taska user authenticated:",
      taskaUser
    );


    setupUserUI();


    refreshTaskaBalance(
      taskaUser.balance
    );


    return taskaUser;


  } catch (error) {

    console.error(
      "Taska authentication error:",
      error
    );


    showToast(
      error.message
    );


    return null;

  }

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
// REFERRAL PAGE
// ======================================================

function referralPage() {

  const telegramId =
    getTelegramId();


  const referralCode =
    telegramId ||
    "YOUR_ID";


  const referralLink =
    `https://t.me/TaskaEarn_bot?start=${encodeURIComponent(
      referralCode
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

        ${escapeHTML(
          referralLink
        )}

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


    <div class="stats single-stat">

      <div class="stat-card">

        <span class="stat-icon">
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


      <div class="stat-card">

        <span class="stat-icon">
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


    <div class="stats">

      <div class="stat-card">

        <span class="stat-icon">
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


      <div class="stat-card">

        <span class="stat-icon">
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


    <div class="section-title">

      <h2>
        ${icon("receipt")}
        Transactions
      </h2>

    </div>


    <section class="transactions">

      <div class="empty">

        <span class="empty-icon">
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

  const currentUser =
    getCurrentUser();


  const name =
    currentUser?.first_name

      ? [
          currentUser.first_name,
          currentUser.last_name
        ]

          .filter(Boolean)

          .join(" ")

      : "Taska User";


  const username =
    currentUser?.username

      ? "@" +
        currentUser.username

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
// TASK START STORAGE
// ======================================================

function getTaskStorageKey(
  taskId
) {

  const telegramId =
    getTelegramId() ||
    "unknown";


  return (
    `taska_task_started_${telegramId}_${Number(taskId)}`
  );

}


// ======================================================
// SAVE TASK START TIME
// ======================================================

function saveTaskStartTime(
  taskId,
  timestamp
) {

  try {

    localStorage.setItem(
      getTaskStorageKey(taskId),
      String(timestamp)
    );

  } catch (error) {

    console.warn(
      "Taska: Could not save task start time",
      error
    );

  }

}


// ======================================================
// GET TASK START TIME
// ======================================================

function getTaskStartTime(
  taskId
) {

  try {

    const value =
      localStorage.getItem(
        getTaskStorageKey(taskId)
      );


    if (!value) {

      return null;

    }


    const timestamp =
      Number(value);


    if (
      !Number.isFinite(timestamp)
    ) {

      return null;

    }


    return timestamp;

  } catch {

    return null;

  }

}


// ======================================================
// CLEAR TASK START TIME
// ======================================================

function clearTaskStartTime(
  taskId
) {

  try {

    localStorage.removeItem(
      getTaskStorageKey(taskId)
    );

  } catch {}

}


// ======================================================
// OPEN TASK URL
// ======================================================

function openTaskURL(
  url
) {

  if (!url) {

    return false;

  }


  try {

    if (
      url.startsWith(
        "https://t.me/"
      ) &&
      tg?.openTelegramLink
    ) {

      tg.openTelegramLink(
        url
      );

      return true;

    }


    const opened =
      window.open(
        url,
        "_blank"
      );


    return !!opened;

  } catch (error) {

    console.error(
      "Taska: Could not open task URL:",
      error
    );


    return false;

  }

}


// ======================================================
// TASK BUTTON STATE
// ======================================================

function setTaskButton(
  taskId,
  text,
  disabled = false
) {

  const buttons =
    document.querySelectorAll(
      `.task-claim[data-task-id="${Number(taskId)}"]`
    );


  buttons.forEach(
    (button) => {

      button.disabled =
        disabled;

      button.textContent =
        text;

    }
  );

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


  if (!tasks.length) {

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
    tasks
      .map(
        (task) => {

          const taskId =
            Number(task.id);


          const reward =
            formatMoney(
              task.reward
            );


          const completed =
            task.completed === true;


          return `

            <div
              class="feature-card task-card"
              data-task-id="${taskId}"
              style="cursor:default;"
            >

              <div class="feature-icon">
                ${icon("checklist")}
              </div>


              <div
                style="
                  flex:1;
                  min-width:0;
                "
              >

                <strong>
                  ${escapeHTML(
                    task.title
                  )}
                </strong>


                <span>
                  ${escapeHTML(
                    task.description ||
                    "Complete this task to earn a reward"
                  )}
                </span>


                <small
                  style="
                    display:block;
                    margin-top:6px;
                    font-weight:700;
                    opacity:.9;
                  "
                >
                  Reward: ${reward}
                </small>

              </div>


              <button
                type="button"
                class="primary-action task-claim"
                data-task-id="${taskId}"
                ${completed ? "disabled" : ""}
                style="
                  width:auto;
                  min-width:82px;
                  padding:10px 12px;
                  margin-left:8px;
                  white-space:nowrap;
                "
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


    console.log(
      "Taska tasks loaded:",
      earnTasks
    );


  } catch (error) {

    console.error(
      "Taska: Failed to load tasks:",
      error
    );


    list.innerHTML = `

      <div class="empty">

        <strong>
          Unable to load tasks
        </strong>

        <span>
          ${escapeHTML(
            error.message
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
  taskId
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
      (item) =>
        Number(item.id) ===
        numericTaskId
    );


  if (!task) {

    showToast(
      "Task not found"
    );

    console.error(
      "Taska: Task not found:",
      numericTaskId,
      earnTasks
    );

    return;

  }


  // ----------------------------------------------------
  // ALREADY COMPLETED
  // ----------------------------------------------------

  if (
    task.completed === true
  ) {

    showToast(
      "This task is already completed"
    );

    return;

  }


  // ----------------------------------------------------
  // PREVENT DOUBLE REQUEST
  // ----------------------------------------------------

  if (
    claimingTasks.has(
      numericTaskId
    )
  ) {

    return;

  }


  // ----------------------------------------------------
  // GET PERSISTENT START TIME
  // ----------------------------------------------------

  let startedAt =
    getTaskStartTime(
      numericTaskId
    );


  // ----------------------------------------------------
  // FIRST CLICK
  // ----------------------------------------------------

  if (!startedAt) {

    const now =
      Date.now();


    saveTaskStartTime(
      numericTaskId,
      now
    );


    startedAt =
      now;


    // Open task destination

    if (
      task.target_url
    ) {

      const opened =
        openTaskURL(
          task.target_url
        );


      if (opened) {

        showToast(
          "Task opened. Complete it, then return and tap Claim."
        );

      } else {

        showToast(
          "Task link could not be opened"
        );

      }

    } else {

      showToast(
        "Complete the task, then return and tap Claim"
      );

    }


    setTaskButton(
      numericTaskId,
      "Claim",
      false
    );


    haptic("light");


    return;

  }


  // ----------------------------------------------------
  // MINIMUM WAIT
  // ----------------------------------------------------

  const minimumWait =
    3000;


  const elapsed =
    Date.now() -
    startedAt;


  if (
    elapsed <
    minimumWait
  ) {

    const remaining =
      Math.ceil(
        (
          minimumWait -
          elapsed
        ) / 1000
      );


    showToast(
      `Please wait ${remaining} more second${remaining > 1 ? "s" : ""}`
    );


    return;

  }


  // ----------------------------------------------------
  // CLAIMING
  // ----------------------------------------------------

  claimingTasks.add(
    numericTaskId
  );


  setTaskButton(
    numericTaskId,
    "Claiming...",
    true
  );


  haptic("light");


  try {

    console.log(
      "Taska: Claiming task:",
      numericTaskId
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
      "Taska: Task complete response:",
      data
    );


    // --------------------------------------------------
    // UPDATE TASK STATE
    // --------------------------------------------------

    task.completed =
      true;


    // --------------------------------------------------
    // UPDATE BALANCE FROM SERVER
    // --------------------------------------------------

    if (
      data.balance !==
      undefined
    ) {

      refreshTaskaBalance(
        data.balance
      );

    }


    // --------------------------------------------------
    // CLEAR PERSISTENT START TIME
    // --------------------------------------------------

    clearTaskStartTime(
      numericTaskId
    );


    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------

    showToast(
      `Reward added: ${formatMoney(
        data.reward
      )}`
    );


    haptic("medium");


    // --------------------------------------------------
    // RE-RENDER TASKS
    // --------------------------------------------------

    renderEarnTasks(
      earnTasks
    );


  } catch (error) {

    console.error(
      "Taska: Claim failed:",
      error
    );


    setTaskButton(
      numericTaskId,
      "Claim",
      false
    );


    showToast(
      error.message
    );


  } finally {

    claimingTasks.delete(
      numericTaskId
    );

  }

}


// ======================================================
// DAILY CHECK-IN
// ======================================================

async function claimDailyCheckin(
  sourceButton = null
) {

  const button =
    sourceButton ||
    document.querySelector(
      '[data-action="checkin"]'
    );


  if (button) {

    button.disabled =
      true;

  }


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


    showToast(
      `Daily reward added: ${formatMoney(
        data.reward
      )}`
    );


    haptic("medium");


  } catch (error) {

    console.error(
      "Taska: Daily check-in failed:",
      error
    );


    showToast(
      error.message
    );


  } finally {

    if (button) {

      button.disabled =
        false;

    }

  }

}


// ======================================================
// LOAD PAGE
// ======================================================

function loadPage(
  page
) {

  haptic("light");


  if (!app) {

    return;

  }


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


    setupUserUI();


    if (taskaUser) {

      refreshTaskaBalance(
        taskaUser.balance
      );

    }


    setupEarnEvents();


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

  // ----------------------------------------------------
  // QUICK CARDS
  // ----------------------------------------------------

  document
    .querySelectorAll(
      ".quick-card"
    )
    .forEach(
      (card) => {

        card.addEventListener(
          "click",
          () => {

            const feature =
              card.dataset.feature ||
              card.dataset.action ||
              "";


            if (
              feature
                .toLowerCase()
                .includes(
                  "daily check"
                )
            ) {

              claimDailyCheckin(
                card
              );

              return;

            }


            showToast(
              `${feature || "This feature"} will be available soon`
            );


            haptic("light");

          }
        );

      }
    );


  // ----------------------------------------------------
  // FEATURE BANNERS
  // ----------------------------------------------------

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


            haptic("light");

          }
        );

      }
    );


  // ----------------------------------------------------
  // WITHDRAW
  // ----------------------------------------------------

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


        haptic("light");

      }
    );

  }


  // ----------------------------------------------------
  // NOTIFICATION
  // ----------------------------------------------------

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


        haptic("light");

      }
    );

  }


  // ----------------------------------------------------
  // STATS
  // ----------------------------------------------------

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


        haptic("light");

      }
    );

  }


  // ----------------------------------------------------
  // TRANSACTIONS
  // ----------------------------------------------------

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


        haptic("light");

      }
    );

  }


  // ----------------------------------------------------
  // BALANCE EYE
  // ----------------------------------------------------

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


        haptic("light");

      }
    );

  }

}


// ======================================================
// EARN EVENTS
// ======================================================

function setupEarnEvents() {

  // ----------------------------------------------------
  // DAILY CHECK-IN
  // ----------------------------------------------------

  const checkin =
    document.querySelector(
      '[data-action="checkin"]'
    );


  if (checkin) {

    checkin.addEventListener(
      "click",
      () => {

        claimDailyCheckin(
          checkin
        );

      }
    );

  }


  // ----------------------------------------------------
  // ADS
  // ----------------------------------------------------

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


        haptic("light");

      }
    );

  }


  // ----------------------------------------------------
  // TASK CLAIM BUTTONS
  // ----------------------------------------------------

  document
    .querySelectorAll(
      ".task-claim"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          (event) => {

            event.preventDefault();

            event.stopPropagation();


            const taskId =
              Number(
                button.dataset.taskId
              );


            claimTask(
              taskId
            );

          }
        );

      }
    );


  // ----------------------------------------------------
  // LOAD TASKS
  // ----------------------------------------------------

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
            navigator.clipboard &&
            window.isSecureContext
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

        } catch {

          showToast(
            "Unable to copy the link"
          );

        }


        haptic("light");

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


        haptic("light");

      }
    );

  }

}


// ======================================================
// PROFILE EVENTS
// ======================================================

function setupProfileEvents() {

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


            showToast(
              messages[type] ||
              "Coming soon"
            );


            haptic("light");

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


            loadPage(
              page
            );


            window.scrollTo({
              top: 0,
              behavior:
                "smooth"
            });

          }
        );

      }
    );

}


// ======================================================
// START APP
// ======================================================

if (app) {

  setupNavigation();

  setupHomeEvents();

}


// ======================================================
// AUTHENTICATE WITH BACKEND
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


      refreshTaskaBalance(
        authenticatedUser.balance
      );


      console.log(
        "Taska: User account is connected to database."
      );

    }
  );


// ======================================================
// HANDLE TELEGRAM WEBAPP RETURN
// ======================================================
//
// When Telegram brings the Mini App back into view,
// reload tasks from the server so the UI reflects the
// latest completion state.
// ======================================================

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState ===
      "visible"
    ) {

      const taskList =
        document.getElementById(
          "taskList"
        );


      if (taskList) {

        loadEarnTasks();

      }

    }

  }
);


// ======================================================
// HANDLE BFCACHE / PAGE RETURN
// ======================================================

window.addEventListener(
  "pageshow",
  () => {

    const taskList =
      document.getElementById(
        "taskList"
      );


    if (taskList) {

      loadEarnTasks();

    }

  }
);
