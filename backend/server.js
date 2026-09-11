import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import ratelimit from "express-rate-limit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, ".env");
const submissionsPath = path.join(__dirname, "submissions.json");

dotenv.config({ path: envPath });

const app = express();

const PORT = Number(process.env.PORT || 5000);

function loadTelegramConfig() {
  dotenv.config({ path: envPath, override: true });

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() || "";
  const chatUrl = process.env.TELEGRAM_CHAT_URL?.trim() || "";
  const configured = Boolean(
    token &&
    chatId &&
    !token.includes("YOUR_") &&
    !chatId.includes("YOUR_")
  );

  return { token, chatId, chatUrl, configured };
}

app.use(
  cors({
    origin : [
       "http://localhost:5173",
      "http://127.0.0.1:5173"
    ],
    methods:["GET" , "POST" , "OPTIONS"],
    allowedHeaders : ["content-type"]
  })
);  

app.use(
  express.json({
    limit:"20kb"
  })
);

const submitLimiter = ratelimit({
  windowMs: 60 * 1000,
  max : 10,
  standardHeaders : true,
  legacyHeaders : false
});


const processedSubmissions = new Map()
const DUPLICATE_WINDOW_MS = 10 *60 * 1000;

function cleanvalue(value) {
  if(value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}

function validateForm(body) {
const form = body && typeof body === "object" ? body : {};
const name = cleanvalue(form.name);
const email = cleanvalue(form.email);
const phone = cleanvalue(form.phone);
const company = cleanvalue(form.company);
const message = cleanvalue(form.message);



if(!name) {
  return{
    valid : false,
    message : "name is required."
  };
}

if(!email) {
  return{
    valid :false,
    message : "email is required ."
  };
}

if(!phone) {
  return{
    valid: false,
    message : " phone number is required."
  };
}

if(!message) {
  return{
    valid: false,
    message: "message is required."
  }
}

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return {
      valid: false,
      message: "Please enter a valid email address."
    };
  }


  if(name.length > 30) {
    return{
      valid: false,
      message : "name is too long."
    };
  }

  if(email.length > 50) {
    return{
      valid : false,
      message : "email address is to long"
    }
  }

  if(phone.length > 11){
    return{
      valid: false,
      message : " phone number is too long."
    };
  }

  if(company.length > 50) {
    return{
      valid: false,
      message : "company is too long."
    };
  }

  if(message.length > 400){
    return{
      valid : false,
      message : "message is too long."
    };
  }


  return{
    valid: true,
    data:{
      name,
      email,
      phone,
      company,
      message
    }
  };
}

function createTelegramMessage(data, submittedAt) {
  return[
    "New form submission",
    "",
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Company: ${data.company || "not provided"}`,
    "",
    "Message:",
    data.message,
    "",
    `Submitted: ${submittedAt}`
  ].join("\n")
}


function saveSubmission(data, submittedAt, telegramDelivered) {
  let submissions = [];

  try {
    const raw = fs.readFileSync(submissionsPath, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      submissions = parsed;
    }
  } catch {
    submissions = [];
  }

  submissions.push({
    ...data,
    submittedAt,
    telegramDelivered
  });

  fs.writeFileSync(
    submissionsPath,
    JSON.stringify(submissions, null, 2)
  );
}

function cleanupProcessedSubmissions() {
const now = Date.now();

for (const [key, timestamp] of processedSubmissions.entries()){
  if(now - timestamp > DUPLICATE_WINDOW_MS) {
    processedSubmissions.delete(key);
  }
}
}


// health check

app.get("/api/health", (req,res)=> {
  const telegram = loadTelegramConfig();

  res.status(200).json({
    success : true,
    message : "backend is running.",
    telegramConfigured: telegram.configured
  });
});


// telegram from submission 

app.post(
  "/api/telegram-submit",
  submitLimiter,
  async (req, res) => {
    try {
      console.log("Received form submission. ");

      const validation = validateForm(req.body);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message
        });
      }

      const data = validation.data;
      const telegram = loadTelegramConfig();
      const submittedAt = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "medium"
      });

      if (!telegram.configured) {
        saveSubmission(data, submittedAt, false);

        return res.status(200).json({
          success: true,
          storedLocally: true,
          message:
            "Form saved successfully on the backend. Telegram delivery is not configured yet."
        });
      }

      cleanupProcessedSubmissions();

      const fingerprint = crypto
        .createHash("sha256")
        .update(JSON.stringify(data))
        .digest("hex");

      if (processedSubmissions.has(fingerprint)) {
        return res.status(409).json({
          success: false,
          message: "This form was already submitted recently."
        });
      }

      let telegramDelivered = false;

      if (telegram.configured) {
        const telegramMessage = createTelegramMessage(
          data,
          submittedAt
        );

        const telegramUrl =
          `https://api.telegram.org/bot${telegram.token}/sendMessage`;

        console.log("Sending form data to Telegram...");

        const telegramResponse = await fetch(telegramUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: telegram.chatId,
            text: telegramMessage
          }),
          signal: AbortSignal.timeout(10_000)
        });

        const telegramResult = await telegramResponse
          .json()
          .catch(() => null);

        console.log(
          "Telegram response:",
          telegramResult
        );

        if (
          !telegramResponse.ok ||
          !telegramResult ||
          !telegramResult.ok
        ) {
          console.error(
            "Telegram API failed:",
            telegramResult
          );

          saveSubmission(data, submittedAt, false);

          return res.status(502).json({
            success: false,
            storedLocally: true,
            message:
              `Saved on the backend, but Telegram failed: ${
                telegramResult?.description || "delivery failed"
              }`
          });
        }

        telegramDelivered = true;
      }

      saveSubmission(data, submittedAt, telegramDelivered);

      processedSubmissions.set(
        fingerprint,
        Date.now()
      );

      return res.status(200).json({
        success: true,
        telegramDelivered,
        telegramUrl: telegram.chatUrl || null,
        message: "Form submitted successfully."
      });

    } catch (error) {
      console.error(
        "Submission error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to send the form to Telegram."
      });
    }
  }
);


// 404 

app.use((req,res)=> {
  res.status(404).json({
    success: false,
    message: "api endpoint not found "
  });
});


// start server 

app.listen(PORT,()=> {
  const telegram = loadTelegramConfig();

  console.log("");
  console.log("=======================");
  console.log("telegram form backend started");
  console.log("========================");
  console.log(`server: http://localhost:${PORT}`);
  console.log(
    `telegram token: ${
       telegram.configured ? "Configured" : "Missing or placeholder"
    }`
  );
  console.log(
    `telegram chat id: ${
       telegram.configured ? "Configured" : "Missing or placeholder"
    }`
  );
  if (!telegram.configured) {
    console.error(
      "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in backend/.env before accepting submissions."
    );
  }
  console.log("====================");
  console.log("");

});




