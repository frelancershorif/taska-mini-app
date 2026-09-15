"use strict";

/*
 * TASKA TELEGRAM MINI APP
 *
 * FRONTEND MVP ONLY
 *
 * IMPORTANT:
 * - Telegram user data shown here is for UI only.
 * - initDataUnsafe MUST NOT be trusted for authentication.
 * - Balance, rewards, referrals and withdrawals MUST be
 *   handled by a secure backend later.
 */

const tg = window.Telegram?.WebApp || null;


/* =========================================
   TELEGRAM INITIALIZATION
========================================= */

function initializeTelegram() {

  if (!tg) {
    console.log("Taska is running outside Telegram.");
    return;
  }

  try {

    tg.ready();

    tg.expand();

    applyTelegramTheme();

  } catch (error) {

    console.error(
      "Telegram initialization failed:",
      error
    );

  }
}


/* =========================================
   TELEGRAM THEME
========================================= */

function applyTelegramTheme() {

  if (!tg?.themeParams) {
    return;
  }

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

  if (theme.button_color) {

    root.style.setProperty(
      "--accent",
      theme.button_color
    );

  }

}


/* =========================================
   TELEGRAM USER
========================================= */

function getTelegramUser() {

  return tg?.initDataUnsafe?.user || null;

}


function displayTelegramUser() {

  const user =
    getTelegramUser();

  const usernameElement =
    document.getElementById("username");

  const avatarElement =
    document.getElementById("avatar");

  if (!usernameElement || !avatarElement) {
    return;
  }


  /* Outside Telegram */

  if (!user) {

    usernameElement.textContent =
      "Taska User";

    avatarElement.textContent =
      "T";

    return;

  }


  const firstName =
    user.first_name || "User";

  const displayName =
    user.username
      ? "@" + user.username
      : firstName;


  usernameElement.textContent =
    displayName;


  /* Profile photo */

  if (user.photo_url) {

    const image =
      document.createElement("img");

    image.src =
      user.photo_url;

    image.alt =
      "Profile";

    image.loading =
      "lazy";

    avatarElement.replaceChildren(
      image
    );

  } else {

    avatarElement.textContent =
      firstName
        .charAt(0)
        .toUpperCase();

  }

}


/* =========================================
   TOAST
========================================= */

let toastTimer = null;


function showToast(message) {

  const toast =
    document.getElementById("toast");

  if (!toast) {
    return;
  }

  toast.textContent =
    String(message);

  toast.classList.add("show");


  if (toastTimer) {
    clearTimeout(toastTimer);
  }


  toastTimer =
    setTimeout(() => {

      toast.classList.remove(
        "show"
      );

    }, 1800);

}


/* =========================================
   HAPTIC FEEDBACK
========================================= */

function haptic() {

  try {

    if (
      tg &&
      tg.HapticFeedback
    ) {

      tg.HapticFeedback
        .impactOccurred("light");

    }

  } catch (error) {

    // Haptic feedback is optional.

  }

}


/* =========================================
   NAVIGATION
========================================= */

function setupNavigation() {

  const buttons =
    document.querySelectorAll(
      ".nav-btn"
    );


  buttons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const page =
          button.dataset.page;

        if (!page) {
          return;
        }


        haptic();


        buttons.forEach(
          item => {

            item.classList.remove(
              "active"
            );

          }
        );


        button.classList.add(
          "active"
        );


        if (page === "Home") {

          showToast(
            "Home"
          );

          return;

        }


        showToast(
          page + " is coming soon"
        );

      }
    );

  });

}


/* =========================================
   EARNING CARDS
========================================= */

function setupEarnCards() {

  const cards =
    document.querySelectorAll(
      ".earn-card"
    );


  cards.forEach(card => {

    card.addEventListener(
      "click",
      () => {

        const feature =
          card.dataset.feature ||
          "This feature";

        haptic();

        showToast(
          feature +
          " is coming soon"
        );

      }
    );

  });

}


/* =========================================
   WITHDRAW BUTTON
========================================= */

function setupWithdraw() {

  const button =
    document.getElementById(
      "withdrawBtn"
    );

  if (!button) {
    return;
  }


  button.addEventListener(
    "click",
    () => {

      haptic();

      showToast(
        "Withdrawal will be available soon"
      );

    }
  );

}


/* =========================================
   NOTIFICATION
========================================= */

function setupNotifications() {

  const button =
    document.getElementById(
      "notificationBtn"
    );

  if (!button) {
    return;
  }


  button.addEventListener(
    "click",
    () => {

      haptic();

      showToast(
        "No new notifications"
      );

    }
  );

}


/* =========================================
   DISABLE REAL EARNING ACTIONS
========================================= */

function protectFrontendOnlyState() {

  /*
   * This MVP intentionally has no
   * client-side balance modification.
   *
   * DO NOT add:
   *
   * balance += reward
   *
   * here.
   *
   * Later:
   *
   * Telegram
   *      ↓
   * Backend
   *      ↓
   * Verify initData
   *      ↓
   * Verify task/ad
   *      ↓
   * Transaction ledger
   *      ↓
   * Wallet
   */

}


/* =========================================
   APP START
========================================= */

function startTaska() {

  initializeTelegram();

  displayTelegramUser();

  setupNavigation();

  setupEarnCards();

  setupWithdraw();

  setupNotifications();

  protectFrontendOnlyState();

  console.log(
    "Taska Mini App initialized."
  );

}


/* =========================================
   START
========================================= */

startTaska();
