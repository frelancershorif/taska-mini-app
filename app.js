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
// Server remains the source of truth.
// ======================================================

let earnTasks = [];


// Stores the time when a task was started.
const taskStartTimes =
  new Map();


// Minimum time before a task can be claimed.
const TASK_MINIMUM_WAIT =
  3000;


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

              initData:
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

    throw new Error(
      data.error ||
      data.message ||
      "Taska server error"
    );

  }


  return data;

}


// ======================================================
// REFRESH BALANCE
// ======================================================

function refreshTaskaBalance(
  balance
) {

  if (!taskaUser) {

    console.warn(
      "Taska: Cannot update balance because taskaUser is null."
    );

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
      "Taska: Invalid balance:",
      balance
    );

    return;

  }


  // ----------------------------------------------------
  // Update local authenticated user
  // ----------------------------------------------------

  taskaUser.balance =
    numericBalance;


  // ----------------------------------------------------
  // Update every visible balance element
  // ----------------------------------------------------

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


  // ----------------------------------------------------
  // Also update common data-balance elements
  // ----------------------------------------------------

  const dataBalanceElements =
    document.querySelectorAll(
      "[data-balance]"
    );


  dataBalanceElements.forEach(
    (element) => {

      element.textContent =
        formatMoney(
          numericBalance
        );

    }
  );


  console.log(
    "Taska: UI balance updated:",
    numericBalance
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


  try {

    if (
      typeof tg.enableClosingConfirmation ===
      "function"
    ) {

      tg.enableClosingConfirmation();

    }

  } catch (error) {

    console.warn(
      "Taska: Closing confirmation unavailable:",
      error
    );

  }

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

let taskaUser =
  null;


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
// DOM
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


// ======================================================
// STORE ORIGINAL HOME HTML
// ======================================================

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
      "Taska: Telegram initData not available."
    );

    return null;

  }


  try {

    console.log(
      "Taska: Authenticating Telegram user..."
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


    console.log(
      "Taska user authenticated:",
      taskaUser
    );


    setupUserUI();


    // --------------------------------------------------
    // IMPORTANT
    // Always use server/database balance.
    // --------------------------------------------------

    if (
      taskaUser &&
      taskaUser.balance !== undefined
    ) {

      refreshTaskaBalance(
        taskaUser.balance
      );

    }


    return taskaUser;


  } catch (error) {

    console.error(
      "Taska backend connection error:",
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


    return;

  }


  // ====================================================
  // EARN
  // ====================================================

  if (page === "Earn") {

    app.innerHTML =
      earnPage();


    setupEarnEvents();


    return;

  }


  // ====================================================
  // REFERRAL
  // ====================================================

  if (page === "Referral") {

    app.innerHTML =
      referralPage();


    setupReferralEvents();


    return;

  }


  // ====================================================
  // WALLET
  // ====================================================

  if (page === "Wallet") {

    app.innerHTML =
      walletPage();


    setupWalletEvents();


    return;

  }


  // ====================================================
  // PROFILE
  // ====================================================

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


            // ------------------------------------------
            // DAILY CHECK-IN
            // ------------------------------------------

            if (
              action === "checkin" ||
              feature.includes(
                "daily check"
              )
            ) {

              claimDailyCheckin(
                card
              );

              return;

            }


            showToast(
              `${
                card.dataset.feature ||
                "This feature"
              } will be available soon`
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
            Number(
              task.id
            );


          const reward =
            formatMoney(
              task.reward
            );


          // ------------------------------------------------
          // IMPORTANT:
          // Handle boolean / number / string
          // ------------------------------------------------

          const completed =
            task.completed === true ||
            task.completed === 1 ||
            task.completed === "1" ||
            task.completed === "true";


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
                ${
                  completed
                    ? "disabled"
                    : ""
                }
                ${
                  completed
                    ? 'data-completed="true"'
                    : 'data-completed="false"'
                }
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


  // ----------------------------------------------------
  // Validate task ID
  // ----------------------------------------------------

  if (
    !Number.isFinite(
      numericTaskId
    )
  ) {

    console.error(
      "Taska: Invalid task ID:",
      taskId
    );


    showToast(
      "Invalid task"
    );


    return;

  }


  console.log(
    "Taska: claimTask() called:",
    numericTaskId
  );


  // ----------------------------------------------------
  // Find task
  // ----------------------------------------------------

  const task =
    earnTasks.find(
      (item) =>
        Number(item.id) ===
        numericTaskId
    );


  if (!task) {

    console.error(
      "Taska: Task not found:",
      numericTaskId,
      earnTasks
    );


    showToast(
      "Task not found. Please reload tasks."
    );


    return;

  }


  // ----------------------------------------------------
  // Check completed
  // ----------------------------------------------------

  const alreadyCompleted =
    task.completed === true ||
    task.completed === 1 ||
    task.completed === "1" ||
    task.completed === "true";


  if (
    alreadyCompleted
  ) {

    showToast(
      "This task is already completed"
    );


    return;

  }


  // ----------------------------------------------------
  // Find button if necessary
  // ----------------------------------------------------

  if (!button) {

    button =
      document.querySelector(
        `.task-claim[data-task-id="${numericTaskId}"]`
      );

  }


  // ====================================================
  // FIRST CLICK
  // ====================================================

  const startedAt =
    taskStartTimes.get(
      numericTaskId
    );


  if (!startedAt) {

    console.log(
      "Taska: Starting task:",
      numericTaskId
    );


    // Save start time BEFORE opening URL.
    taskStartTimes.set(
      numericTaskId,
      Date.now()
    );


    // --------------------------------------------------
    // Open target URL
    // --------------------------------------------------

    if (
      task.target_url
    ) {

      try {

        const targetURL =
          String(
            task.target_url
          );


        if (
          targetURL.startsWith(
            "https://t.me/"
          ) &&
          tg?.openTelegramLink
        ) {

          tg.openTelegramLink(
            targetURL
          );

        } else {

          window.open(
            targetURL,
            "_blank"
          );

        }

      } catch (error) {

        console.error(
          "Taska: Unable to open task URL:",
          error
        );

      }

    }


    // --------------------------------------------------
    // First click message
    // --------------------------------------------------

    showToast(
      "Complete the task, then tap Claim again"
    );


    haptic("light");


    return;

  }


  // ====================================================
  // WAIT CHECK
  // ====================================================

  const elapsed =
    Date.now() -
    startedAt;


  if (
    elapsed <
    TASK_MINIMUM_WAIT
  ) {

    const remaining =
      Math.ceil(
        (
          TASK_MINIMUM_WAIT -
          elapsed
        ) / 1000
      );


    showToast(
      `Please wait ${remaining} more second${
        remaining > 1
          ? "s"
          : ""
      }`
    );


    haptic("light");


    return;

  }


  // ====================================================
  // PREVENT DOUBLE CLAIM
  // ====================================================

  if (button) {

    if (
      button.dataset.claiming ===
      "true"
    ) {

      console.log(
        "Taska: Claim already in progress."
      );


      return;

    }


    button.dataset.claiming =
      "true";


    button.disabled =
      true;


    button.textContent =
      "Claiming...";

  }


  // ====================================================
  // CALL BACKEND
  // ====================================================

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


    // --------------------------------------------------
    // Mark task completed locally
    // --------------------------------------------------

    task.completed =
      true;


    // --------------------------------------------------
    // IMPORTANT:
    // Backend/database balance is source of truth.
    // --------------------------------------------------

    if (
      data.balance !== undefined &&
      data.balance !== null
    ) {

      refreshTaskaBalance(
        data.balance
      );

    }


    // --------------------------------------------------
    // Remove task timer
    // --------------------------------------------------

    taskStartTimes.delete(
      numericTaskId
    );


    // --------------------------------------------------
    // Success
    // --------------------------------------------------

    showToast(
      `Reward added: ${formatMoney(
        data.reward
      )}`
    );


    haptic("medium");


    // --------------------------------------------------
    // Re-render
    // --------------------------------------------------

    renderEarnTasks(
      earnTasks
    );


  } catch (error) {

    console.error(
      "Taska: Claim task error:",
      error
    );


    // --------------------------------------------------
    // Restore button
    // --------------------------------------------------

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


    haptic("light");

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


  // ----------------------------------------------------
  // Prevent multiple clicks
  // ----------------------------------------------------

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

  }


  try {

    console.log(
      "Taska: Claiming daily check-in..."
    );


    const data =
      await taskaAPI(
        "/api/checkin"
      );


    console.log(
      "Taska: Check-in response:",
      data
    );


    // --------------------------------------------------
    // Update balance
    // --------------------------------------------------

    if (
      data.balance !== undefined &&
      data.balance !== null
    ) {

      refreshTaskaBalance(
        data.balance
      );

    }


    // --------------------------------------------------
    // Success
    // --------------------------------------------------

    showToast(
      `Daily reward added: ${formatMoney(
        data.reward
      )}`
    );


    haptic("medium");


  } catch (error) {

    console.error(
      "Taska: Daily check-in error:",
      error
    );


    showToast(
      error?.message ||
      "Unable to claim daily reward"
    );


    haptic("light");


  } finally {

    if (button) {

      button.dataset.claiming =
        "false";


      button.disabled =
        false;

    }

  }

}


// ======================================================
// EARN EVENTS
// ======================================================

function setupEarnEvents() {


  // ====================================================
  // DAILY CHECK-IN
  // ====================================================

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


  // ====================================================
  // WATCH ADS
  // ====================================================

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


  // ====================================================
  // IMPORTANT:
  // TASK CLAIM EVENT DELEGATION
  // ====================================================
  //
  // DO NOT use:
  //
  // querySelectorAll(".task-claim")
  //
  // because task buttons are created later by
  // loadEarnTasks().
  //
  // Instead, listen on #taskList.
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


  // ====================================================
  // LOAD TASKS
  // ====================================================

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


  // ----------------------------------------------------
  // COPY
  // ----------------------------------------------------

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

        } catch (error) {

          console.error(
            "Taska: Copy referral error:",
            error
          );


          showToast(
            "Unable to copy the link"
          );

        }


        haptic("light");

      }
    );

  }


  // ----------------------------------------------------
  // SHARE
  // ----------------------------------------------------

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


        haptic("light");

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

            // ------------------------------------------
            // Remove active
            // ------------------------------------------

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


            // ------------------------------------------
            // Add active
            // ------------------------------------------

            button.classList.add(
              "active"
            );


            // ------------------------------------------
            // Get page
            // ------------------------------------------

            const page =
              button.dataset.page;


            if (!page) {

              return;

            }


            // ------------------------------------------
            // Load page
            // ------------------------------------------

            loadPage(
              page
            );


            // ------------------------------------------
            // Scroll top
            // ------------------------------------------

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


      // ------------------------------------------------
      // Latest database balance
      // ------------------------------------------------

      if (
        authenticatedUser.balance !==
        undefined
      ) {

        refreshTaskaBalance(
          authenticatedUser.balance
        );

      }


      console.log(
        "Taska: User account is connected to database."
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
// DEBUG HELPER
// ======================================================

console.log(
  "Taska frontend loaded successfully."
);
