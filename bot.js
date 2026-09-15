const https = require("https");

const BOT_TOKEN = process.env.BOT_TOKEN;

const WEB_APP_URL =
  "https://frelancershorif.github.io/taska-mini-app/";

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is missing!");
  process.exit(1);
}

function telegram(method, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: "api.telegram.org",
      path: `/bot${BOT_TOKEN}/${method}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", reject);

    req.write(postData);
    req.end();
  });
}


async function sendStartMessage(chatId, firstName = "there") {
  await telegram("sendMessage", {
    chat_id: chatId,

    text:
      `🎉 Welcome to Taska, ${firstName}!\n\n` +
      `💰 Complete tasks\n` +
      `🎬 Watch ads\n` +
      `👥 Refer friends\n` +
      `🎁 Earn rewards\n\n` +
      `👇 Tap below to open Taska`,

    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🚀 Open Taska",
            web_app: {
              url: WEB_APP_URL
            }
          }
        ]
      ]
    }
  });
}


async function processUpdate(update) {
  if (!update.message) return;

  const message = update.message;
  const chatId = message.chat.id;
  const text = message.text || "";

  if (text === "/start" || text.startsWith("/start ")) {
    const firstName =
      message.from?.first_name || "there";

    await sendStartMessage(chatId, firstName);
  }
}


let offset = 0;

async function startBot() {
  console.log("Taska bot is starting...");

  while (true) {
    try {
      const result = await telegram("getUpdates", {
        offset: offset,
        timeout: 30,
        allowed_updates: ["message"]
      });

      if (result.ok && Array.isArray(result.result)) {
        for (const update of result.result) {
          offset = update.update_id + 1;

          try {
            await processUpdate(update);
          } catch (error) {
            console.error("Update error:", error.message);
          }
        }
      }
    } catch (error) {
      console.error("Telegram connection error:", error.message);

      await new Promise((resolve) =>
        setTimeout(resolve, 5000)
      );
    }
  }
}

startBot();
