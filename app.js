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
// GLOBAL STATE
// ======================================================

let earnTasks = [];

let taskaUser = null;

let claimInProgress = false;

let checkinCountdownTimer = null;


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
// AUTH INIT DATA
// ======================================================

function authInitData() {

  return tg?.initData || "";

}


// ======================================================
// CURRENT USER
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
// PROFILE PHOTO
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
// BALANCE UPDATE
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


  const balanceElements =
    document.querySelectorAll(
      "#balance, .balance-value, .wallet-balance, [data-balance]"
    );


  balanceElements.forEach(
    element => {

      element.textContent =
        formatMoney(
          numericBalance
        );

    }
  );


  console.log(
    "Taska: Balance updated:",
    numericBalance
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
    "Taska: .app element not found."
  );

}


const initialHomeHTML =
  app
    ? app.innerHTML
    : "";


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


    console.log(
      "Taska user authenticated:",
      taskaUser
    );


    setupUserUI();


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


      <!-- DAILY CHECK-IN -->

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
            Build your 7-day streak and earn rewards
          </span>

        </div>


        <b>

          ${icon("arrow")}

        </b>

      </button>


      <!-- WATCH ADS -->

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
// DAILY CHECK-IN CSS
// ======================================================

function injectCheckinStyles() {

  if (
    document.getElementById(
      "taskaCheckinStyles"
    )
  ) {

    return;

  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "taskaCheckinStyles";


  style.textContent = `

    /* =========================================
       TASKA DAILY CHECK-IN OVERLAY
    ========================================= */

    .taska-checkin-overlay {

      position: fixed;

      inset: 0;

      z-index: 99999;

      display: flex;

      align-items: flex-end;

      justify-content: center;

      padding: 10px;

      background:
        rgba(2, 8, 23, .74);

      backdrop-filter:
        blur(12px);

      -webkit-backdrop-filter:
        blur(12px);

    }


    /* =========================================
       SHEET
    ========================================= */

    .taska-checkin-sheet {

      width:
        min(560px, 100%);

      max-height:
        94vh;

      overflow-y:
        auto;

      padding:
        20px 16px 22px;

      border-radius:
        28px 28px 20px 20px;

      border:
        1px solid
        rgba(255,255,255,.10);

      background:
        linear-gradient(
          155deg,
          #101f34 0%,
          #07111f 100%
        );

      color:
        #ffffff;

      box-shadow:
        0 -10px 70px
        rgba(0,0,0,.42);

      animation:
        taskaCheckinOpen
        .25s
        ease;

    }


    @keyframes taskaCheckinOpen {

      from {

        opacity:
          0;

        transform:
          translateY(30px);

      }

      to {

        opacity:
          1;

        transform:
          translateY(0);

      }

    }


    /* =========================================
       HEADER
    ========================================= */

    .taska-checkin-top {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        12px;

      margin-bottom:
        17px;

    }


    .taska-checkin-title {

      display:
        flex;

      align-items:
        center;

      gap:
        12px;

    }


    .taska-checkin-title-icon {

      width:
        48px;

      height:
        48px;

      flex:
        0 0 48px;

      display:
        grid;

      place-items:
        center;

      border-radius:
        16px;

      background:
        linear-gradient(
          135deg,
          #1599ff,
          #625cff
        );

      box-shadow:
        0 10px 28px
        rgba(43,120,255,.22);

    }


    .taska-checkin-title-icon svg {

      width:
        25px;

      height:
        25px;

    }


    .taska-checkin-title h2 {

      margin:
        0;

      font-size:
        21px;

      line-height:
        1.15;

    }


    .taska-checkin-title p {

      margin:
        5px 0 0;

      color:
        #8d9db3;

      font-size:
        12px;

    }


    .taska-checkin-close {

      width:
        40px;

      height:
        40px;

      border:
        0;

      border-radius:
        14px;

      background:
        rgba(255,255,255,.07);

      color:
        #ffffff;

      font-size:
        25px;

      line-height:
        1;

      cursor:
        pointer;

    }


    /* =========================================
       STREAK CARD
    ========================================= */

    .taska-streak-card {

      position:
        relative;

      overflow:
        hidden;

      padding:
        17px;

      border-radius:
        22px;

      border:
        1px solid
        rgba(82,139,255,.20);

      background:
        radial-gradient(
          circle at 95% 5%,
          rgba(90,88,255,.38),
          transparent 38%
        ),
        linear-gradient(
          135deg,
          #142e5b,
          #111a37
        );

    }


    .taska-streak-row {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

    }


    .taska-streak-label {

      color:
        #92a6c4;

      font-size:
        11px;

      font-weight:
        800;

      letter-spacing:
        .08em;

      text-transform:
        uppercase;

    }


    .taska-streak-number {

      margin-top:
        3px;

      font-size:
        25px;

      font-weight:
        900;

    }


    .taska-streak-fire {

      font-size:
        34px;

    }


    .taska-progress {

      height:
        7px;

      margin-top:
        14px;

      overflow:
        hidden;

      border-radius:
        20px;

      background:
        rgba(255,255,255,.10);

    }


    .taska-progress > span {

      display:
        block;

      height:
        100%;

      border-radius:
        20px;

      background:
        linear-gradient(
          90deg,
          #22d7ff,
          #615dff
        );

      transition:
        width .35s ease;

    }


    .taska-progress-text {

      display:
        flex;

      justify-content:
        space-between;

      margin-top:
        7px;

      color:
        #8c9db5;

      font-size:
        10px;

    }


    /* =========================================
       DAYS
    ========================================= */

    .taska-days-title {

      margin:
        18px 2px 10px;

      color:
        #a5b4c8;

      font-size:
        12px;

      font-weight:
        800;

      letter-spacing:
        .05em;

    }


    .taska-days {

      display:
        grid;

      grid-template-columns:
        repeat(7, minmax(0,1fr));

      gap:
        6px;

    }


    .taska-day {

      min-width:
        0;

      padding:
        10px 3px;

      text-align:
        center;

      border-radius:
        15px;

      border:
        1px solid
        rgba(255,255,255,.07);

      background:
        rgba(255,255,255,.045);

      transition:
        .2s ease;

    }


    .taska-day-name {

      color:
        #7f90a8;

      font-size:
        8px;

      font-weight:
        900;

      letter-spacing:
        .04em;

    }


    .taska-day-number {

      margin:
        5px 0;

      font-size:
        15px;

      font-weight:
        900;

    }


    .taska-day-status {

      width:
        24px;

      height:
        24px;

      margin:
        auto;

      display:
        grid;

      place-items:
        center;

      border-radius:
        50%;

      background:
        rgba(255,255,255,.06);

      color:
        #7e8da4;

      font-size:
        11px;

      font-weight:
        900;

    }


    .taska-day.active {

      border-color:
        rgba(74,145,255,.70);

      background:
        linear-gradient(
          160deg,
          rgba(28,105,255,.25),
          rgba(78,68,255,.12)
        );

      box-shadow:
        0 8px 25px
        rgba(35,105,255,.14);

    }


    .taska-day.active
    .taska-day-status {

      background:
        linear-gradient(
          135deg,
          #1b9cff,
          #625bff
        );

      color:
        #ffffff;

    }


    .taska-day.completed {

      border-color:
        rgba(43,211,153,.35);

      background:
        rgba(34,197,148,.08);

    }


    .taska-day.completed
    .taska-day-status {

      background:
        #20c997;

      color:
        #06151b;

    }


    .taska-day.locked {

      opacity:
        .72;

    }


    /* =========================================
       TODAY CARD
    ========================================= */

    .taska-current {

      margin-top:
        15px;

      padding:
        18px;

      text-align:
        center;

      border-radius:
        22px;

      border:
        1px solid
        rgba(255,255,255,.08);

      background:
        rgba(255,255,255,.045);

    }


    .taska-current-badge {

      display:
        inline-flex;

      padding:
        5px 11px;

      border-radius:
        999px;

      background:
        rgba(49,139,255,.12);

      color:
        #6eb5ff;

      font-size:
        9px;

      font-weight:
        900;

      letter-spacing:
        .08em;

    }


    .taska-current h3 {

      margin:
        10px 0 2px;

      font-size:
        24px;

      font-weight:
        900;

    }


    .taska-current-reward {

      margin:
        3px 0 12px;

      font-size:
        30px;

      font-weight:
        900;

      background:
        linear-gradient(
          90deg,
          #ffffff,
          #8ec9ff
        );

      -webkit-background-clip:
        text;

      background-clip:
        text;

      color:
        transparent;

    }


    /* =========================================
       COUNTDOWN
    ========================================= */

    .taska-countdown {

      display:
        flex;

      justify-content:
        center;

      gap:
        6px;

      margin:
        9px 0 15px;

    }


    .taska-time-box {

      min-width:
        55px;

      padding:
        8px 5px;

      border-radius:
        12px;

      background:
        rgba(255,255,255,.06);

    }


    .taska-time-box strong {

      display:
        block;

      font-size:
        20px;

      line-height:
        1;

    }


    .taska-time-box span {

      display:
        block;

      margin-top:
        4px;

      color:
        #7f90a7;

      font-size:
        8px;

      text-transform:
        uppercase;

    }


    /* =========================================
       CLAIM BUTTON
    ========================================= */

    .taska-checkin-claim {

      width:
        100%;

      border:
        0;

      border-radius:
        15px;

      padding:
        14px;

      color:
        #ffffff;

      font-size:
        15px;

      font-weight:
        900;

      background:
        linear-gradient(
          135deg,
          #188cff,
          #6559ff
        );

      box-shadow:
        0 10px 25px
        rgba(40,110,255,.20);

      cursor:
        pointer;

      transition:
        .2s ease;

    }


    .taska-checkin-claim:active {

      transform:
        scale(.98);

    }


    .taska-checkin-claim:disabled {

      opacity:
        .58;

      cursor:
        not-allowed;

    }


    .taska-next {

      margin-top:
        11px;

      color:
        #8292a8;

      font-size:
        10px;

    }


    @media(max-width:380px) {

      .taska-days {

        gap:
          4px;

      }


      .taska-day {

        padding:
          8px 2px;

      }


      .taska-time-box {

        min-width:
          48px;

      }

    }

  `;


  document.head.appendChild(
    style
  );

}


// ======================================================
// DATE HELPERS
// ======================================================

function getLocalDateKey(
  date = new Date()
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


// ======================================================
// MIDNIGHT
// ======================================================

function getNextMidnight() {

  const next =
    new Date();


  next.setHours(
    24,
    0,
    0,
    0
  );


  return next;

}


// ======================================================
// COUNTDOWN FORMAT
// ======================================================

function formatCountdown(
  milliseconds
) {

  const totalSeconds =
    Math.max(
      0,
      Math.floor(
        milliseconds / 1000
      )
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


  return {

    hours:
      String(hours)
        .padStart(
          2,
          "0"
        ),

    minutes:
      String(minutes)
        .padStart(
          2,
          "0"
        ),

    seconds:
      String(seconds)
        .padStart(
          2,
          "0"
        )

  };

}


// ======================================================
// LOCAL CHECK-IN STATE
// ======================================================

function getCheckinLocalState() {

  try {

    return JSON.parse(
      localStorage.getItem(
        "taska_daily_checkin_state"
      ) || "{}"
    );

  } catch {

    return {};

  }

}


// ======================================================
// SAVE CHECK-IN STATE
// ======================================================

function saveCheckinLocalState(
  state
) {

  try {

    localStorage.setItem(
      "taska_daily_checkin_state",
      JSON.stringify(
        state
      )
    );

  } catch {}

}


// ======================================================
// CURRENT STREAK
// ======================================================

function getCheckinStreak() {

  const state =
    getCheckinLocalState();


  const today =
    getLocalDateKey();


  if (
    state.lastClaimDate ===
    today
  ) {

    return Math.min(
      7,
      Number(
        state.streak || 1
      )
    );

  }


  return Math.min(
    7,
    Number(
      state.streak || 0
    )
  );

}


// ======================================================
// MARK CHECK-IN COMPLETE
// ======================================================

function markLocalCheckinComplete() {

  const state =
    getCheckinLocalState();


  const today =
    getLocalDateKey();


  if (
    state.lastClaimDate ===
    today
  ) {

    return;

  }


  let streak =
    Number(
      state.streak || 0
    );


  if (
    state.lastClaimDate
  ) {

    const previous =
      new Date(
        `${state.lastClaimDate}T00:00:00`
      );


    const current =
      new Date(
        `${today}T00:00:00`
      );


    const difference =
      Math.round(
        (
          current -
          previous
        ) / 86400000
      );


    if (
      difference === 1
    ) {

      streak += 1;

    } else {

      streak = 1;

    }

  } else {

    streak = 1;

  }


  if (
    streak > 7
  ) {

    streak = 1;

  }


  saveCheckinLocalState({

    lastClaimDate:
      today,

    streak:
      streak

  });

}


// ======================================================
// BUILD 7 DAYS
// ======================================================

function buildSevenDays() {

  const today =
    new Date();


  today.setHours(
    0,
    0,
    0,
    0
  );


  const names = [

    "TODAY",
    "TOMORROW",
    "DAY 3",
    "DAY 4",
    "DAY 5",
    "DAY 6",
    "DAY 7"

  ];


  const days = [];


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
      today.getDate() + i
    );


    const weekday =
      date.toLocaleDateString(
        "en-US",
        {
          weekday:
            "short"
        }
      );


    days.push({

      date:
        date,

      key:
        getLocalDateKey(
          date
        ),

      weekday:
        weekday,

      label:
        names[i],

      dayNumber:
        i + 1,

      isToday:
        i === 0,

      isFuture:
        i > 0

    });

  }


  return days;

}


// ======================================================
// OPEN DAILY CHECK-IN
// ======================================================

function openDailyCheckin() {

  injectCheckinStyles();


  closeDailyCheckin();


  const overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "taskaCheckinOverlay";


  overlay.className =
    "taska-checkin-overlay";


  overlay.innerHTML = `

    <div
      class="taska-checkin-sheet"
      role="dialog"
      aria-modal="true"
    >


      <!-- HEADER -->

      <div
        class="taska-checkin-top"
      >

        <div
          class="taska-checkin-title"
        >

          <div
            class="taska-checkin-title-icon"
          >

            ${icon("calendar")}

          </div>


          <div>

            <h2>
              Daily Check-in
            </h2>

            <p>
              Build your 7-day reward streak
            </p>

          </div>

        </div>


        <button
          type="button"
          class="taska-checkin-close"
          id="taskaCheckinClose"
          aria-label="Close"
        >

          ×

        </button>

      </div>


      <!-- STREAK -->

      <div
        class="taska-streak-card"
      >

        <div
          class="taska-streak-row"
        >

          <div>

            <div
              class="taska-streak-label"
            >
              Current Streak
            </div>


            <div
              class="taska-streak-number"
            >

              <span
                id="taskaStreakNumber"
              >
                0
              </span>

              / 7 Days

            </div>

          </div>


          <div
            class="taska-streak-fire"
          >

            🔥

          </div>

        </div>


        <div
          class="taska-progress"
        >

          <span
            id="taskaStreakProgress"
            style="width:0%"
          ></span>

        </div>


        <div
          class="taska-progress-text"
        >

          <span>
            7-day cycle
          </span>


          <span
            id="taskaStreakText"
          >
            0 of 7 completed
          </span>

        </div>

      </div>


      <!-- CALENDAR TITLE -->

      <div
        class="taska-days-title"
      >

        YOUR 7 DAYS

      </div>


      <!-- DAYS -->

      <div
        class="taska-days"
        id="taskaCheckinDays"
      ></div>


      <!-- CURRENT DAY -->

      <div
        class="taska-current"
      >

        <div
          class="taska-current-badge"
          id="taskaCurrentBadge"
        >
          TODAY
        </div>


        <h3
          id="taskaCurrentTitle"
        >
          Day 1
        </h3>


        <div
          class="taska-current-reward"
          id="taskaCurrentReward"
        >
          ৳0.10
        </div>


        <!-- COUNTDOWN -->

        <div
          class="taska-countdown"
          id="taskaCountdown"
        >

          <div
            class="taska-time-box"
          >

            <strong
              id="taskaHours"
            >
              00
            </strong>

            <span>
              Hours
            </span>

          </div>


          <div
            class="taska-time-box"
          >

            <strong
              id="taskaMinutes"
            >
              00
            </strong>

            <span>
              Minutes
            </span>

          </div>


          <div
            class="taska-time-box"
          >

            <strong
              id="taskaSeconds"
            >
              00
            </strong>

            <span>
              Seconds
            </span>

          </div>

        </div>


        <!-- CLAIM -->

        <button
          type="button"
          class="taska-checkin-claim"
          id="taskaCheckinClaim"
        >

          Claim ৳0.10

        </button>


        <div
          class="taska-next"
          id="taskaNextText"
        >

          Claim today's reward to continue your streak.

        </div>

      </div>


    </div>

  `;


  document.body.appendChild(
    overlay
  );


  // CLOSE BUTTON

  const closeButton =
    document.getElementById(
      "taskaCheckinClose"
    );


  if (closeButton) {

    closeButton.addEventListener(
      "click",
      closeDailyCheckin
    );

  }


  // CLICK BACKGROUND TO CLOSE

  overlay.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        overlay
      ) {

        closeDailyCheckin();

      }

    }
  );


  // CLAIM BUTTON

  const claimButton =
    document.getElementById(
      "taskaCheckinClaim"
    );


  if (claimButton) {

    claimButton.addEventListener(
      "click",
      claimDailyCheckinFromCalendar
    );

  }


  // INITIAL RENDER

  renderDailyCheckinCalendar();


  updateDailyCheckinCountdown();


  // LIVE COUNTDOWN

  clearInterval(
    checkinCountdownTimer
  );


  checkinCountdownTimer =
    setInterval(
      () => {

        if (
          !document.getElementById(
            "taskaCheckinOverlay"
          )
        ) {

          clearInterval(
            checkinCountdownTimer
          );

          return;

        }


        updateDailyCheckinCountdown();

      },
      1000
    );


  haptic("light");

}


// ======================================================
// CLOSE DAILY CHECK-IN
// ======================================================

function closeDailyCheckin() {

  const overlay =
    document.getElementById(
      "taskaCheckinOverlay"
    );


  if (overlay) {

    overlay.remove();

  }


  if (
    checkinCountdownTimer
  ) {

    clearInterval(
      checkinCountdownTimer
    );


    checkinCountdownTimer =
      null;

  }

}


// ======================================================
// RENDER DAILY CALENDAR
// ======================================================

function renderDailyCheckinCalendar() {

  const daysElement =
    document.getElementById(
      "taskaCheckinDays"
    );


  if (!daysElement) {

    return;

  }


  const days =
    buildSevenDays();


  const state =
    getCheckinLocalState();


  const todayKey =
    getLocalDateKey();


  const completedToday =
    state.lastClaimDate ===
    todayKey;


  const streak =
    getCheckinStreak();


  // STREAK NUMBER

  const streakNumber =
    document.getElementById(
      "taskaStreakNumber"
    );


  if (streakNumber) {

    streakNumber.textContent =
      String(
        streak
      );

  }


  // PROGRESS

  const progress =
    document.getElementById(
      "taskaStreakProgress"
    );


  if (progress) {

    progress.style.width =
      `${Math.min(
        100,
        (streak / 7) * 100
      )}%`;

  }


  // STREAK TEXT

  const streakText =
    document.getElementById(
      "taskaStreakText"
    );


  if (streakText) {

    streakText.textContent =
      `${streak} of 7 completed`;

  }


  // DAYS

  daysElement.innerHTML =
    days
      .map(
        day => {

          let className =
            "taska-day";


          let status =
            "🔒";


          // TODAY

          if (
            day.isToday
          ) {

            if (
              completedToday
            ) {

              className +=
                " completed";

              status =
                "✓";

            } else {

              className +=
                " active";

              status =
                "✓";

            }

          }


          // FUTURE

          else {

            className +=
              " locked";

            status =
              "🔒";

          }


          return `

            <div
              class="${className}"
            >

              <div
                class="taska-day-name"
              >

                ${
                  day.isToday
                    ? "TODAY"
                    : day.weekday
                }

              </div>


              <div
                class="taska-day-number"
              >

                ${day.date.getDate()}

              </div>


              <div
                class="taska-day-status"
              >

                ${status}

              </div>

            </div>

          `;

        }
      )
      .join("");


  // CURRENT CARD

  const badge =
    document.getElementById(
      "taskaCurrentBadge"
    );


  const title =
    document.getElementById(
      "taskaCurrentTitle"
    );


  const reward =
    document.getElementById(
      "taskaCurrentReward"
    );


  const claim =
    document.getElementById(
      "taskaCheckinClaim"
    );


  const next =
    document.getElementById(
      "taskaNextText"
    );


  if (title) {

    title.textContent =
      "Day 1";

  }


  if (reward) {

    reward.textContent =
      "৳0.10";

  }


  if (
    completedToday
  ) {

    if (badge) {

      badge.textContent =
        "COMPLETED";

    }


    if (claim) {

      claim.disabled =
        true;

      claim.dataset.claiming =
        "false";

      claim.textContent =
        "✓ Completed Today";

    }


    if (next) {

      next.textContent =
        "Great job! Your next reward will be available at midnight.";

    }

  } else {

    if (badge) {

      badge.textContent =
        "TODAY";

    }


    if (claim) {

      claim.disabled =
        false;

      claim.dataset.claiming =
        "false";

      claim.textContent =
        "Claim ৳0.10";

    }


    if (next) {

      next.textContent =
        "Claim today's reward to continue your streak.";

    }

  }

}


// ======================================================
// UPDATE COUNTDOWN
// ======================================================

function updateDailyCheckinCountdown() {

  const countdown =
    formatCountdown(
      getNextMidnight() -
      new Date()
    );


  const hours =
    document.getElementById(
      "taskaHours"
    );


  const minutes =
    document.getElementById(
      "taskaMinutes"
    );


  const seconds =
    document.getElementById(
      "taskaSeconds"
    );


  if (hours) {

    hours.textContent =
      countdown.hours;

  }


  if (minutes) {

    minutes.textContent =
      countdown.minutes;

  }


  if (seconds) {

    seconds.textContent =
      countdown.seconds;

  }


  // Check if day changed

  const state =
    getCheckinLocalState();


  const completedToday =
    state.lastClaimDate ===
    getLocalDateKey();


  if (
    !completedToday
  ) {

    return;

  }


  const claim =
    document.getElementById(
      "taskaCheckinClaim"
    );


  if (claim) {

    claim.disabled =
      true;

    claim.textContent =
      "✓ Completed Today";

  }

}


// ======================================================
// DAILY CHECK-IN CLAIM
// ======================================================

async function claimDailyCheckinFromCalendar() {

  const button =
    document.getElementById(
      "taskaCheckinClaim"
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
    button.disabled
  ) {

    return;

  }


  button.dataset.claiming =
    "true";


  button.disabled =
    true;


  button.textContent =
    "Claiming...";


  haptic("light");


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


    // UPDATE BALANCE

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


    // SAVE LOCAL VISUAL STATE

    markLocalCheckinComplete();


    // UPDATE UI

    renderDailyCheckinCalendar();


    // SUCCESS

    showToast(
      `Daily reward added: ${formatMoney(
        data.reward ??
        0.10
      )}`
    );


    haptic("medium");


  } catch (error) {

    console.error(
      "Taska: Daily Check-in error:",
      error
    );


    button.dataset.claiming =
      "false";


    button.disabled =
      false;


    button.textContent =
      "Claim ৳0.10";


    showToast(
      error?.message ||
      "Unable to claim daily reward"
    );


    haptic("light");

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
              style="
                cursor:default;
              "
            >

              <div
                class="feature-icon"
              >

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
// ONE-CLICK FAST TASK CLAIM
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
      item =>
        Number(item.id) ===
        numericTaskId
    );


  if (!task) {

    showToast(
      "Task not found. Please reload."
    );

    return;

  }


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


  if (
    claimInProgress ||
    button?.dataset.claiming ===
    "true"
  ) {

    return;

  }


  claimInProgress =
    true;


  if (!button) {

    button =
      document.querySelector(
        `.task-claim[data-task-id="${numericTaskId}"]`
      );

  }


  if (button) {

    button.dataset.claiming =
      "true";


    button.disabled =
      true;


    button.textContent =
      "Claiming...";

  }


  haptic("light");


  try {

    // --------------------------------------------------
    // ONLY 2.5 SECOND PROCESSING
    // --------------------------------------------------

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          2500
        )
    );


    // --------------------------------------------------
    // BACKEND
    // --------------------------------------------------

    const data =
      await taskaAPI(
        "/api/tasks/complete",
        {
          task_id:
            numericTaskId
        }
      );


    // --------------------------------------------------
    // COMPLETED
    // --------------------------------------------------

    task.completed =
      true;


    // --------------------------------------------------
    // BALANCE
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
    // SUCCESS
    // --------------------------------------------------

    showToast(
      `Reward added: ${formatMoney(
        data.reward
      )}`
    );


    haptic("medium");


    // --------------------------------------------------
    // RENDER
    // --------------------------------------------------

    renderEarnTasks(
      earnTasks
    );


    // --------------------------------------------------
    // OPEN TARGET
    // --------------------------------------------------

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
              "Taska: Unable to open task URL:",
              error
            );

          }

        },
        300
      );

    }


  } catch (error) {

    console.error(
      "Taska: Claim error:",
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
      event => {

        event.preventDefault();

        openDailyCheckin();

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
  // TASK CLAIM EVENT DELEGATION
  // ====================================================

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
      taskaUser?.balance ??
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

        ${formatMoney(
          balance
        )}

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

        ${escapeHTML(
          name
        )}

      </h2>


      <p>

        ${escapeHTML(
          username
        )}

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

  closeDailyCheckin();


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


  // QUICK CARDS

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
              action ===
                "checkin" ||
              feature.includes(
                "daily check"
              )
            ) {

              openDailyCheckin();

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


  // FEATURE BANNERS

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


  // WITHDRAW

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


  // NOTIFICATION

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


  // STATS

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


  // TRANSACTIONS

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


  // BALANCE EYE

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


  // COPY

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
            "Taska: Copy error:",
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


  // SHARE

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

            // REMOVE ACTIVE

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


            // ADD ACTIVE

            button.classList.add(
              "active"
            );


            // PAGE

            const page =
              button.dataset.page;


            if (!page) {

              return;

            }


            loadPage(
              page
            );


            // TOP

            window.scrollTo({

              top:
                0,

              behavior:
                "smooth"

            });

          }
        );

      }
    );

}


// ======================================================
// PERSIST TELEGRAM USER
// ======================================================

(function persistTelegramUser() {

  const telegramUserData =
    window.Telegram
      ?.WebApp
      ?.initDataUnsafe
      ?.user ||
    null;


  if (
    !telegramUserData
  ) {

    return;

  }


  function applyTelegramUser() {

    const usernameElements =
      document.querySelectorAll(
        "#username, .username"
      );


    usernameElements.forEach(
      element => {

        const displayName =
          telegramUserData.username

            ? "@" +
              telegramUserData.username

            : [

                telegramUserData.first_name,

                telegramUserData.last_name

              ]

                .filter(Boolean)

                .join(" ");


        if (displayName) {

          element.textContent =
            displayName;

        }

      }
    );


    const avatarElements =
      document.querySelectorAll(
        "#avatar, .avatar"
      );


    avatarElements.forEach(
      avatar => {

        if (
          !telegramUserData.photo_url
        ) {

          return;

        }


        if (
          avatar.tagName ===
          "IMG"
        ) {

          avatar.src =
            telegramUserData.photo_url;


          avatar.alt =
            "Profile";

        } else {

          avatar.style.backgroundImage =
            `url("${telegramUserData.photo_url}")`;


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
    );

  }


  applyTelegramUser();


  const observer =
    new MutationObserver(
      () => {

        applyTelegramUser();

      }
    );


  observer.observe(
    document.body,
    {
      childList:
        true,

      subtree:
        true
    }
  );


  document.addEventListener(
    "click",
    event => {

      const navButton =
        event.target.closest(
          ".nav-btn"
        );


      if (!navButton) {

        return;

      }


      setTimeout(
        applyTelegramUser,
        50
      );

    }
  );

})();


// ======================================================
// START APP
// ======================================================

setupUserUI();

setupNavigation();

setupHomeEvents();


// ======================================================
// AUTHENTICATION START
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
        "Taska: User account connected to database."
      );

    }
  )
  .catch(
    error => {

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


console.log(
  "Taska: One-click Task Claim READY."
);


console.log(
  "Taska: 7-Day Daily Check-in UI READY."
);
