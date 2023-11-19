// Path alias for project
require("module-alias/register");

// App arguments configs
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
// const argv = yargs(hideBin(process.argv)).argv;



// Express config
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Run app
const server = app.listen(5503, "0.0.0.0", () => {
  console.log(`Listening at 0.0.0.0:5503}`);
});

function dataParse(data) {
  if (typeof data == "object") {
    return data;
  }
  try {
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}

// socket io

const io = require("socket.io", {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e8,
  pingTimeout: 60000,
})(server);

io.on("connection", function (socket) {
  console.log("A socket user connected!", socket.id);
  io.emit("DefineUser", socket.id);

  socket.on("disconnect", function () {
    console.log("A socket user disconnected!", socket.id);
  });
  socket.conn.on("upgrade", () => {
    const upgradedTransport = socket.conn.transport.name; // in most cases, "websocket"
  });

  socket.on("message", function (data) {
    console.log("message", data);
    io.emit(data["message"], data["data"]);
  });

  socket.on("forward", function (data) {
    console.log("forward", data);
    io.emit("forward", data);
  });

  socket.on("SendData", async (dataInput) => {
    try {
      var data = dataParse(dataInput);
      if (!data) return;

      // _send_all

      io.emit(data.event, data.data);
      console.log(
        { to: "all", event: data.event, data: data.data },
        "SendDataOutput"
      );
    } catch (err) {
      console.log("Erro --> SendData" + err);
    }
  });
});
