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
// STATE
// ======================================================

let earnTasks = [];

let taskaUser = null;


// Prevent double claim
let claimInProgress = false;


// ======================================================
// AUTH
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
      "Taska API JSON error:",
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
// BALANCE
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

    return;

  }


  taskaUser.balance =
    numericBalance;


  document
    .querySelectorAll(
      "#balance, .balance-value, .wallet-balance, [data-balance]"
    )
    .forEach(
      element => {

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
// TELEGRAM START
// ======================================================

if (tg) {

  try {

    tg.ready();

  } catch (error) {

    console.warn(
      "Telegram ready error:",
      error
    );

  }


  try {

    tg.expand();

  } catch (error) {

    console.warn(
      "Telegram expand error:",
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
      "Closing confirmation unavailable:",
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


  if (user.username) {

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
// DOM
// ======================================================

const app =
  document.querySelector(
    ".app"
  );


if (!app) {

  console.error(
    "Taska: .app not found"
  );

}


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
      "Haptic unavailable:",
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
      "Taska:",
      message
    );

    return;

  }


  toast.textContent =
    String(message);


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
      "Taska: Telegram initData missing"
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
      "Taska authenticated:",
      taskaUser
    );


    setupUserUI();


    if (
      taskaUser.balance !==
      undefined
    ) {

      refreshTaskaBalance(
        taskaUser.balance
      );

    }


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
      card => {

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


  document
    .querySelectorAll(
      ".feature-banner"
    )
    .forEach(
      banner => {

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
    tasks
      .map(
        task => {

          const taskId =
            Number(
              task.id
            );


          const reward =
            formatMoney(
              task.reward
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

                  Reward:
                  ${reward}

                </small>

              </div>


              <button
                type="button"
                class="primary-action task-claim"
                data-task-id="${taskId}"
                data-claiming="false"
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

    console.log(
      "Taska: Loading tasks..."
    );


    const data =
      await taskaAPI(
        "/api/tasks"
      );


    console.log(
      "Taska tasks:",
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
      "Taska load tasks error:",
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
// FAST CLAIM
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
  // Validate
  // ----------------------------------------------------

  if (
    !Number.isFinite(
      numericTaskId
    )
  ) {

    console.error(
      "Taska invalid task ID:",
      taskId
    );


    showToast(
      "Invalid task"
    );


    return;

  }


  // ----------------------------------------------------
  // Find task
  // ----------------------------------------------------

  const task =
    earnTasks.find(
      item =>
        Number(item.id) ===
        numericTaskId
    );


  if (!task) {

    console.error(
      "Taska task not found:",
      numericTaskId
    );


    showToast(
      "Task not found. Please reload."
    );


    return;

  }


  // ----------------------------------------------------
  // Already completed
  // ----------------------------------------------------

  const completed =
    task.completed === true ||
    task.completed === 1 ||
    task.completed === "1" ||
    task.completed === "true";


  if (
    completed
  ) {

    return;

  }


  // ----------------------------------------------------
  // Prevent double click
  // ----------------------------------------------------

  if (
    claimInProgress ||
    button?.dataset.claiming ===
    "true"
  ) {

    return;

  }


  claimInProgress =
    true;


  // ----------------------------------------------------
  // Find button
  // ----------------------------------------------------

  if (!button) {

    button =
      document.querySelector(
        `.task-claim[data-task-id="${numericTaskId}"]`
      );

  }


  // ====================================================
  // CLAIMING UI IMMEDIATELY
  // ====================================================

  if (button) {

    button.dataset.claiming =
      "true";

    button.disabled =
      true;

    button.textContent =
      "Claiming...";

  }


  haptic("light");


  console.log(
    "Taska: Claim started:",
    numericTaskId
  );


  // ====================================================
  // SHORT 2.5 SECOND PROCESSING
  // ====================================================

  await new Promise(
    resolve =>
      setTimeout(
        resolve,
        2500
      )
  );


  // ====================================================
  // SEND CLAIM TO BACKEND
  // ====================================================

  try {

    console.log(
      "Taska: Sending task completion:",
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
      "Taska: Completion response:",
      data
    );


    // ==================================================
    // UPDATE LOCAL TASK
    // ==================================================

    task.completed =
      true;


    // ==================================================
    // UPDATE BALANCE
    // ==================================================

    if (
      data.balance !== undefined &&
      data.balance !== null
    ) {

      refreshTaskaBalance(
        data.balance
      );

    }


    // ==================================================
    // COMPLETED BUTTON
    // ==================================================

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


    // ==================================================
    // SUCCESS TOAST
    // ==================================================

    showToast(
      `Reward added: ${formatMoney(
        data.reward
      )}`
    );


    haptic("medium");


    // ==================================================
    // RENDER AGAIN
    // ==================================================

    renderEarnTasks(
      earnTasks
    );


    // ==================================================
    // OPEN TASK AFTER SUCCESS
    // ==================================================

    if (
      task.target_url
    ) {

      const targetURL =
        String(
          task.target_url
        );


      setTimeout(
        () => {

          try {

            if (
              targetURL.startsWith(
                "https://t.me/"
              ) &&
              tg?.openTelegramLink
            ) {

              tg.openTelegramLink(
                targetURL
              );

            } else if (
              tg?.openLink
            ) {

              tg.openLink(
                targetURL
              );

            } else {

              window.open(
                targetURL,
                "_blank"
              );

            }

          } catch (error) {

            console.warn(
              "Taska unable to open task:",
              error
            );

          }

        },
        300
      );

    }


  } catch (error) {

    // ==================================================
    // ERROR
    // ==================================================

    console.error(
      "Taska claim error:",
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
      "Unable to claim reward"
    );


    haptic("light");

  } finally {

    claimInProgress =
      false;

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
      "Taska check-in response:",
      data
    );


    if (
      data.balance !== undefined &&
      data.balance !== null
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
      "Taska check-in error:",
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
  // TASK CLAIM
  // ----------------------------------------------------

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


        if (
          button.disabled
        ) {

          return;

        }


        if (
          button.dataset.claiming ===
          "true"
        ) {

          return;

        }


        const taskId =
          Number(
            button.dataset.taskId
          );


        console.log(
          "Taska: CLAIM CLICK:",
          taskId
        );


        claimTask(
          taskId,
          button
        );

      }
    );

  }


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

        } catch (error) {

          console.error(
            "Copy error:",
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
      item => {

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
      button => {

        button.addEventListener(
          "click",
          () => {

            document
              .querySelectorAll(
                ".nav-btn"
              )
              .forEach(
                btn => {

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
// START
// ======================================================

setupNavigation();

setupHomeEvents();


// ======================================================
// AUTHENTICATION
// ======================================================

authenticateTaskaUser()
  .then(
    authenticatedUser => {

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
        "Taska: Database connected successfully."
      );

    }
  )
  .catch(
    error => {

      console.error(
        "Taska startup authentication error:",
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

console.log(
  "Taska Fast Claim System: READY"
);
