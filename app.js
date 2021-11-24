import express, { json } from "express";
import cors from "cors";
import { Client } from "whatsapp-web.js";
import fs from "fs";

// EXPRESS APP
const app = express();

// MIDDLEWARES
app.use(express.json());
app.use(cors());

// CONSTANTS
const PORT = process.env.PORT || 2000;
let isAuth = false;

const client = new Client({
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--unhandled-rejections=strict"
    ]
  }
});

client.on("qr", (qr) => {
  try {
    fs.writeFile("recentqr.txt", qr, (err) => {
      if (err) console.log(err);
      console.log("new qr generated");
    });
  } catch (error) {
    console.log(error);
  }
});

client.on("authenticated", (session) => {
  console.log("authenticated");
  isAuth = true;
});

client.on("ready", () => {
  console.log("client is ready");
});

client.on("auth_failure", () => {
  console.log("AUTH Failed !");
});

client.initialize();

// HOME ROUTE
app.get("/", (req, res) => {
  res.status(200).send({ message: "Server is up and running!" });
});

app.get("/getqr", (req, res) => {
  if (isAuth) {
    res.status(200).send(`<h1>Already authenticated</h1>`);
  } else {
    try {
      fs.readFile("qrcode.js", (err, qrjs) => {
        fs.readFile("recentqr.txt", (err, data) => {
          if (err) console.log(err);
          res.status(200).send(`<html>
              <body>
              <script>${qrjs}</script>
              <div id="qrcode"></div>
              <script type="text/javascript">
                  new QRCode(document.getElementById("qrcode"), "${data}");
              </script>
              </body>
          </html>`);
        });
      });
    } catch (error) {
      console.log(error);
    }
  }
});

app.get("/get_code", (req, res) => {
  if (isAuth) {
    res.status(200).json({ success: false, message: "Already authenticated" });
  } else {
    try {
      fs.readFile("recentqr.txt", (err, data) => {
        if (err) console.log(err);
        res.status(200).json({ success: true, qr: data.toString() });
      });
    } catch (error) {
      console.log(error);
    }
  }
});

app.get("/logout", (req, res) => {
  if (isAuth) {
    client.logout();
    isAuth = false;
    res.status(200).json({ success: true, message: "Logged out" });
  } else {
    res.status(200).send({ message: "Already logged out" });
  }
});

app.get("/status", (req, res) => {
  if (isAuth) {
    res.status(200).json({ success: true, message: "authenticated" });
  } else {
    res.status(401).json({ success: false, message: "disconnected" });
  }
});

app.get("/send_message", async (req, res) => {
  const { number, message } = req.query;

  if (!number) {
    return res.status(400).send({ message: "number is required" });
  }
  if (!message) {
    return res.status(400).send({ message: "message is required" });
  }

  const sanitized_number = number.toString().replace(/[- )(]/g, ""); // remove unnecessary chars from the number
  const final_number = `91${sanitized_number.substring(
    sanitized_number.length - 10
  )}`; // add 91 before the number here 91 is country code of India

  const number_details = await client.getNumberId(final_number); // get mobile number details
  if (number_details) {
    const sendMessageData = await client.sendMessage(
      number_details._serialized,
      message
    );
    res
      .status(200)
      .send({ success: true, message: "message sent", info: sendMessageData });
  } else {
    res
      .status(400)
      .send({ success: false, message: "Mobile number is not registered" });
  }
});

// SPINNING THE SERVER
app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`);
});
