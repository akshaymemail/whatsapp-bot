const express = require("express");
const cors = require("cors");
const { Client, MessageMedia } = require("whatsapp-web.js");
const fs = require("fs");
const { mediadownloader, getFinalNumber } = require("./helpers/helpers");
const vuri = require("valid-url");
const { Axios } = require("./configs/axios");
const { default: axios } = require("axios");

// EXPRESS APP
const app = express();

// MIDDLEWARES
app.use(express.json({ limit: "50mb" }));
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

client.on("message", (message) => {
  // Downloading media
  console.log("message", message);
  if (message.hasMedia) {
    message.downloadMedia().then((media) => {
      console.log(media);
      if (media) {
        // incomming message is a type of media
      }
    });
  } else {
    // imcomming message is a type of text
  }
});

client.on("auth_failure", () => {
  console.log("AUTH Failed !");
});

client
  .initialize()
  .then(() => {
    console.log("Client Initialized");
  })
  .catch((err) => {
    console.log("where was an error", err);
  });

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

  const final_number = getFinalNumber(number);
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

// send image
app.post("/send_image", async (req, res) => {
  var base64regex =
    /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

  const { phone, image, caption } = req.body;

  if (phone == undefined || image == undefined) {
    res.send({
      status: "error",
      message: "please enter valid phone and base64/url of image"
    });
  } else {
    const final_number = getFinalNumber(phone);

    const number_details = await client.getNumberId(final_number); // get mobile number details

    if (number_details) {
      if (base64regex.test(image)) {
        let media = new MessageMedia("image/png", image);
        client
          .sendMessage(`${phone}@c.us`, media, { caption: caption || "" })
          .then((response) => {
            if (response.id.fromMe) {
              res.send({
                status: "success",
                message: `MediaMessage successfully sent to ${phone}`
              });
            }
          });
      } else if (vuri.isWebUri(image)) {
        if (!fs.existsSync("./temp")) {
          await fs.mkdirSync("./temp");
        }

        var path = "./temp/" + image.split("/").slice(-1)[0];
        mediadownloader(image, path, () => {
          let media = MessageMedia.fromFilePath(path);

          client
            .sendMessage(`${phone}@c.us`, media, { caption: caption || "" })
            .then((response) => {
              if (response.id.fromMe) {
                res.send({
                  status: "success",
                  message: `MediaMessage successfully sent to ${phone}`
                });
                fs.unlinkSync(path);
              }
            })
            .catch((err) => {
              console.log(err);
              res.status(400).json({
                success: false,
                message:
                  "There was an error while sending message, please contact your service admin."
              });
            });
        });
      } else {
        res.send({
          status: "error",
          message: "Invalid URL/Base64 Encoded Media"
        });
      }
    } else {
      res.send({
        status: "error",
        message: "Mobile number is not registered"
      });
    }
  }
});

// send pdf

app.post("/send_pdf/", async (req, res) => {
  var base64regex =
    /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

  const { phone, pdf } = req.body;

  if (phone == undefined || pdf == undefined) {
    res.send({
      status: "error",
      message: "please enter valid phone and base64/url of pdf"
    });
  } else {
    const final_number = getFinalNumber(phone);
    const number_details = await client.getNumberId(final_number); // get mobile number details

    if (number_details) {
      if (base64regex.test(pdf)) {
        let media = new MessageMedia("application/pdf", pdf);
        client.sendMessage(`${phone}@c.us`, media).then((response) => {
          if (response.id.fromMe) {
            res.send({
              status: "success",
              message: `MediaMessage successfully sent to ${phone}`
            });
          }
        });
      } else if (vuri.isWebUri(pdf)) {
        if (!fs.existsSync("./temp")) {
          await fs.mkdirSync("./temp");
        }

        var path = "./temp/" + pdf.split("/").slice(-1)[0];
        mediadownloader(pdf, path, () => {
          let media = MessageMedia.fromFilePath(path);
          client.sendMessage(`${phone}@c.us`, media).then((response) => {
            if (response.id.fromMe) {
              res.send({
                status: "success",
                message: `MediaMessage successfully sent to ${phone}`
              });
              fs.unlinkSync(path);
            }
          });
        });
      } else {
        res.send({
          status: "error",
          message: "Invalid URL/Base64 Encoded Media"
        });
      }
    } else {
      res.send({
        status: "error",
        message: "Mobile number is not registered"
      });
    }
  }
});

app.get("/get_contacts", (req, res) => {
  client
    .getContacts()
    .then((contacts) => {
      res.status(200).json({ success: true, contacts });
    })
    .catch((err) => {
      res.status(400).json({ success: false, message: err });
    });
});

// SPINNING THE SERVER
app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`);
});
