const tg = window.Telegram?.WebApp || null;


// ========================================
// TELEGRAM INITIALIZATION
// ========================================

if (tg) {

  tg.ready();
  tg.expand();

  try {

    if (tg.enableClosingConfirmation) {
      tg.enableClosingConfirmation();
    }

  } catch {}

}


// ========================================
// TELEGRAM THEME
// ========================================

if (tg?.themeParams) {

  const root = document.documentElement;
  const theme = tg.themeParams;

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


// ========================================
// TELEGRAM USER
// ========================================

const user =
  tg?.initDataUnsafe?.user || null;


function getDisplayName() {

  if (!user) {
    return "Taska User";
  }

  if (user.username) {
    return "@" + user.username;
  }

  return (
    [user.first_name, user.last_name]
      .filter(Boolean)
      .join(" ")
    || "Taska User"
  );

}


function getFirstName() {

  if (!user) {
    return "User";
  }

  return user.first_name || "User";

}


function getPhoto() {

  return user?.photo_url || "";

}


// ========================================
// DOM
// ========================================

const app =
  document.querySelector(".app");


// IMPORTANT:
// Store the original Home HTML before
// any navigation happens.

const initialHomeHTML =
  app.innerHTML;


// ========================================
// HELPERS
// ========================================

function icon(name) {

  return `
    <svg aria-hidden="true">
      <use href="#icon-${name}"></use>
    </svg>
  `;

}


function haptic(type = "light") {

  try {

    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(type);
    }

  } catch {}

}


function showToast(message) {

  const toast =
    document.getElementById("toast");

  if (!toast) return;

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(
    showToast.timer
  );

  showToast.timer =
    setTimeout(() => {

      toast.classList.remove("show");

    }, 2300);

}


// ========================================
// USER UI
// ========================================

function setupUserUI() {

  const username =
    document.getElementById("username");

  const avatar =
    document.getElementById("avatar");


  // USERNAME

  if (username) {

    username.textContent =
      getDisplayName();

  }


  // PROFILE PHOTO

  const photo =
    getPhoto();

  if (avatar && photo) {

    avatar.style.backgroundImage =
      `url("${photo}")`;

    avatar.style.backgroundSize =
      "cover";

    avatar.style.backgroundPosition =
      "center";

    avatar.style.backgroundRepeat =
      "no-repeat";

    avatar.textContent = "";

  }

}


// ========================================
// INITIAL USER UI
// ========================================

setupUserUI();


// ========================================
// PAGE HEADER
// ========================================

function pageHeader(
  title,
  subtitle
) {

  return `
    <div class="page-header">

      <h1>${title}</h1>

      <p>${subtitle}</p>

    </div>
  `;

}


// ========================================
// EARN PAGE
// ========================================

function earnPage() {

  return `

    ${pageHeader(
      "Earn Rewards",
      "Complete activities and earn rewards"
    )}

    <div class="feature-list">


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
            Watch available ads and earn rewards
          </span>

        </div>

        <b>
          ${icon("arrow")}
        </b>

      </button>


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
            Come every day and claim your reward
          </span>

        </div>

        <b>
          ${icon("arrow")}
        </b>

      </button>


      <button
        class="feature-card"
        data-action="tasks"
        type="button"
      >

        <div class="feature-icon">
          ${icon("checklist")}
        </div>

        <div>

          <strong>
            Complete Tasks
          </strong>

          <span>
            Complete available tasks and earn
          </span>

        </div>

        <b>
          ${icon("arrow")}
        </b>

      </button>


      <button
        class="feature-card"
        data-action="bonus"
        type="button"
      >

        <div class="feature-icon">
          ${icon("gift")}
        </div>

        <div>

          <strong>
            Special Offers
          </strong>

          <span>
            Discover available bonus opportunities
          </span>

        </div>

        <b>
          ${icon("arrow")}
        </b>

      </button>


    </div>

  `;

}


// ========================================
// REFERRAL PAGE
// ========================================

function referralPage() {

  const referralCode =
    user?.id
      ? String(user.id)
      : "YOUR_ID";


  const referralLink =
    `https://t.me/TaskaEarn_bot?start=${referralCode}`;


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

        ${referralLink}

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


// ========================================
// WALLET PAGE
// ========================================

function walletPage() {

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
        ৳0.00
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


// ========================================
// PROFILE PAGE
// ========================================

function profilePage() {

  const name =
    user?.first_name
      ? [
          user.first_name,
          user.last_name
        ]
        .filter(Boolean)
        .join(" ")
      : "Taska User";


  const username =
    user?.username
      ? "@" + user.username
      : "No username";


  const photo =
    getPhoto();


  const avatar =
    photo
      ? `
        <img
          src="${photo}"
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
        ${name}
      </h2>


      <p>
        ${username}
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


// ========================================
// LOAD PAGE
// ========================================

function loadPage(page) {

  haptic("light");


  // ======================================
  // HOME
  // ======================================

  if (page === "Home") {

    // Restore original Home HTML
    app.innerHTML =
      initialHomeHTML;


    // IMPORTANT FIX:
    // Home HTML was recreated above,
    // so Telegram user data must be
    // applied again.

    setupUserUI();


    // Reconnect Home buttons

    setupHomeEvents();


    return;

  }


  // ======================================
  // EARN
  // ======================================

  if (page === "Earn") {

    app.innerHTML =
      earnPage();

    setupEarnEvents();

    return;

  }


  // ======================================
  // REFERRAL
  // ======================================

  if (page === "Referral") {

    app.innerHTML =
      referralPage();

    setupReferralEvents();

    return;

  }


  // ======================================
  // WALLET
  // ======================================

  if (page === "Wallet") {

    app.innerHTML =
      walletPage();

    setupWalletEvents();

    return;

  }


  // ======================================
  // PROFILE
  // ======================================

  if (page === "Profile") {

    app.innerHTML =
      profilePage();

    setupProfileEvents();

    return;

  }

}


// ========================================
// HOME EVENTS
// ========================================

function setupHomeEvents() {


  document
    .querySelectorAll(".quick-card")
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          const feature =
            card.dataset.feature ||
            "This feature";


          showToast(
            `${feature} will be available soon`
          );


          haptic("light");

        }
      );

    });


  document
    .querySelectorAll(".feature-banner")
    .forEach(banner => {

      banner.addEventListener(
        "click",
        () => {

          showToast(
            "Special offers will be available soon"
          );


          haptic("light");

        }
      );

    });


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

}


// ========================================
// EARN EVENTS
// ========================================

function setupEarnEvents() {

  document
    .querySelectorAll(".feature-card")
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          const action =
            card.dataset.action;


          const messages = {

            ads:
              "Ads will be available soon",

            checkin:
              "Daily Check-in will be available soon",

            tasks:
              "Tasks will be available soon",

            bonus:
              "Special offers will be available soon"

          };


          showToast(
            messages[action] ||
            "This feature will be available soon"
          );


          haptic("light");

        }
      );

    });

}


// ========================================
// REFERRAL EVENTS
// ========================================

function setupReferralEvents() {

  const referralCode =
    user?.id
      ? String(user.id)
      : "YOUR_ID";


  const referralLink =
    `https://t.me/TaskaEarn_bot?start=${referralCode}`;


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


        if (tg?.openTelegramLink) {

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


// ========================================
// WALLET EVENTS
// ========================================

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


// ========================================
// PROFILE EVENTS
// ========================================

function setupProfileEvents() {

  document
    .querySelectorAll(".profile-item")
    .forEach(item => {

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

    });

}


// ========================================
// NAVIGATION
// ========================================

function setupNavigation() {

  document
    .querySelectorAll(".nav-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {


          // Remove active state

          document
            .querySelectorAll(".nav-btn")
            .forEach(btn => {

              btn.classList.remove(
                "active"
              );

            });


          // Set active state

          button.classList.add(
            "active"
          );


          // Get page

          const page =
            button.dataset.page;


          // Load page

          loadPage(page);


          // Scroll to top

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });

        }
      );

    });

}


// ========================================
// START APP
// ========================================

setupNavigation();

setupHomeEvents();
