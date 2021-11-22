import express from "express";
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
const client = new Client();
client.initialize();

client.on("qr", (qr) => {
  fs.writeFileSync("recentqr.txt", qr, (err) => {
    if (err) console.log(err);
    console.log("new qr generated");
  });
});

client.on("authenticated", (session) => {
  fs.writeFileSync("session.json", JSON.stringify(session), (err) => {
    if (err) console.log(err);
    console.log("authenticated");
    console.log("session saved");
  });
});

// HOME ROUTE
app.get("/", (req, res) => {
  res.status(200).send({ message: "Server is up and running!" });
});

app.get("/getqr", (req, res) => {
  fs.readFile("session.json", (err, session) => {
    if (err) console.log(err);
    console.log(session);
    if (session) {
      res.status(200).send(`<h1>Already authenticated</h1>`);
    } else {
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
    }
  });
});

app.get("/logout", (req, res) => {
  try {
    fs.unlinkSync("session.json");
  } catch (ENOENT) {
    res.status(200).send({ message: "there is no active session" });
  }
  res.status(200).send({ message: "Logged out" });
});

// SPINNING THE SERVER
app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`);
});
