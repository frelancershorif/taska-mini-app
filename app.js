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

const taskStartTimes =
  new Map();


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

  const response =
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
              authInitData()
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

    throw new Error(
      data.error ||
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

  if (!taskaUser) return;


  const numericBalance =
    Number(
      balance || 0
    );


  taskaUser.balance =
    numericBalance;


  // Update every balance element
  // currently visible in the app.

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

}


// ======================================================
// TELEGRAM STARTUP
// ======================================================

if (tg) {

  tg.ready();

  tg.expand();

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


// Store original Home HTML
const initialHomeHTML =
  app.innerHTML;


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


  if (!toast) return;


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
// AUTHENTICATE USER
// ======================================================

async function authenticateTaskaUser() {

  if (!tg?.initData) {

    console.log(
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


    const data =
      await response.json();


    if (
      !response.ok ||
      !data.ok
    ) {

      console.error(
        "Taska authentication failed:",
        data
      );

      showToast(
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


    // IMPORTANT:
    // Apply the database/server balance
    // to the currently visible Home page.

    refreshTaskaBalance(
      taskaUser.balance
    );


    return taskaUser;


  } catch (error) {

    console.error(
      "Taska backend connection error:",
      error
    );


    showToast(
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
      taskaUser?.balance ||
      0
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

function loadPage(page) {

  haptic("light");


  // ====================================================
  // HOME
  // ====================================================

  if (page === "Home") {

    app.innerHTML =
      initialHomeHTML;


    // Restore user information.

    setupUserUI();


    // Restore latest server balance.

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


    // Apply current balance if available.

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

            const feature =
              card.dataset.feature ||
              card.dataset.action ||
              "";


            // ------------------------------------------
            // DAILY CHECK-IN
            // ------------------------------------------

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


            // ------------------------------------------
            // OTHER FEATURES
            // ------------------------------------------

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
// EARN TASKS
// ======================================================

function renderEarnTasks(
  tasks
) {

  const list =
    document.getElementById(
      "taskList"
    );


  if (!list) return;


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

          const reward =
            formatMoney(
              task.reward
            );


          const completed =
            task.completed;


          return `

            <div
              class="feature-card task-card"
              data-task-id="${Number(task.id)}"
              style="cursor:default;"
            >

              <div class="feature-icon">
                ${icon("checklist")}
              </div>


              <div
                style="flex:1;min-width:0;"
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
                data-task-id="${Number(task.id)}"
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


  if (!list) return;


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

  const task =
    earnTasks.find(
      (item) =>
        Number(item.id) ===
        Number(taskId)
    );


  if (!task) return;


  if (task.completed) {

    showToast(
      "This task is already completed"
    );

    return;

  }


  const startedAt =
    taskStartTimes.get(
      Number(taskId)
    );


  const minimumWait =
    3000;


  if (!startedAt) {

    if (task.target_url) {

      if (
        task.target_url
          .startsWith(
            "https://t.me/"
          ) &&
        tg?.openTelegramLink
      ) {

        tg.openTelegramLink(
          task.target_url
        );

      } else {

        window.open(
          task.target_url,
          "_blank"
        );

      }

    }


    taskStartTimes.set(
      Number(taskId),
      Date.now()
    );


    showToast(
      "Complete the task, then return here to claim"
    );


    haptic("light");


    return;

  }


  if (
    Date.now() -
      startedAt <
    minimumWait
  ) {

    showToast(
      "Please wait a moment before claiming"
    );

    return;

  }


  const button =
    document.querySelector(
      `.task-claim[data-task-id="${Number(taskId)}"]`
    );


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Claiming...";

  }


  try {

    const data =
      await taskaAPI(
        "/api/tasks/complete",
        {
          task_id:
            Number(taskId)
        }
      );


    task.completed =
      true;


    refreshTaskaBalance(
      data.balance
    );


    showToast(
      `Reward added: ${formatMoney(
        data.reward
      )}`
    );


    haptic("medium");


    renderEarnTasks(
      earnTasks
    );


  } catch (error) {

    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Claim";

    }


    showToast(
      error.message
    );

  }

}


// ======================================================
// DAILY CHECK-IN
// ======================================================

async function claimDailyCheckin(
  sourceButton = null
) {

  // Find the currently clicked button/card.

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

    // ----------------------------------------------
    // Call backend
    // ----------------------------------------------

    const data =
      await taskaAPI(
        "/api/checkin"
      );


    // ----------------------------------------------
    // Update local/server balance
    // ----------------------------------------------

    refreshTaskaBalance(
      data.balance
    );


    // ----------------------------------------------
    // Success message
    // ----------------------------------------------

    showToast(
      `Daily reward added: ${formatMoney(
        data.reward
      )}`
    );


    haptic("medium");


  } catch (error) {

    // ----------------------------------------------
    // Already claimed / other server error
    // ----------------------------------------------

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

            event.stopPropagation();


            claimTask(
              Number(
                button.dataset.taskId
              )
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

        } catch {

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


      // Make sure the latest database
      // balance is visible on the current page.

      refreshTaskaBalance(
        authenticatedUser.balance
      );


      console.log(
        "Taska: User account is connected to database."
      );

    }
  );
