const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const port = process.env.PORT || 3000;

// app.use("/", express.static("Static"));

// const cors = require("cors");
// app.use(
//   cors({
//     origin: "*",
//   })
// );

var list_rooms = [];
const _send_one = 1;
const _send_mutiple = 2;
const _send_all = 3;
const _send_control = 4;

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

io.on("connection", (socket) => {
  console.log("Co nguoi ket noi:" + socket.id);

  socket.on("moSildeR", function (msg) {
    const combinedMsg = msg;
    io.emit("moSildeR", combinedMsg);
    //console.log('multicast: ' + combinedMsg);
  });
  socket.on("SendZone", function (msg) {
    const combinedMsg = msg;
    io.emit("SendZone", combinedMsg);
    //console.log('multicast: ' + combinedMsg);
  });
  /*
    Login socket 
    + Input : name 
    + Output: 
        --> define-result : Kết quả đăng nhâp khi  thành công
        --> ControlResponse : Trả về danh sách client login 
        
    + Description: Đăng nhập vào socket . Kết quả trả về hàm define-result
  */
  socket.on("define", async (dataInput) => {
    try {
      var data = dataParse(dataInput);
      console.log("dataInput: " + dataInput);
      console.log("App: " + data.name);
      if (!data) return;

      await socket.join(data.name, () => {
        let rooms = Object.keys(socket.rooms);
        if (list_rooms.indexOf(data.name) < 0) {
          list_rooms.push(rooms[1]);
        }
      });
      console.log(
        { status: true, message: "Define success!" },
        "define-result"
      );

      io.to(socket.id).emit("define-result", {
        status: true,
        message: "Define success!",
      });

      io.emit("ControlResponse", {
        list_device: list_rooms,
      });

      console.log({ list_device: list_rooms }, "ControlResponse");
    } catch (err) {
      console.log("Erro --> define " + err);
      Logger_Error_Send_Frontend(err, "Erro --> define");
    }
  });

  /*
    Controll
    + Input: name == controll
    + Output: 
        --> ControlResponse : Trả về  dánh sách client đang kết nối.
    + Description: Xác định thiết bị điều khiển cùng lúc chỉ có 1 thiết bị điều khiển . ( dùng nhận kết quả gửi về)
  */
  socket.on("Control", async (dataInput) => {
    try {
      var data = dataParse(dataInput);
      // logger_logInfo(dataInput, 'Control');
      // console.log(dataInput,'ControlInput');
      if (!data) return;

      await socket.join("controls");
      // console.log({list_device: list_rooms},'ControlResponse');
      io.to(socket.id).emit("ControlResponse", {
        list_device: list_rooms,
      });
    } catch (err) {
      console.log(err, "Erro --> Control");
    }
  });

  /*
    SendData
    + Input : name(thiết bị cần gửi tới ), data  (dữ liệu gửi đi) , event (tên sự kiện gửi ), to_type ( loại gửi)
        --> to_type:  ==1   send one people
        --> to_type:  ==2   send mutiple [array list name]
        --> to_type:  == 3  send all
    + Output: 
    + Description: Các app gửi dữ liệu qua lại.
  */
  socket.on("SendData", async (dataInput) => {
    try {
      var data = dataParse(dataInput);
      // logger_logInfo(data, 'SendData');
      if (!data) return;
      switch (data.to_type) {
        case _send_one: {
          io.to(data.to[0]).emit(data.event, data.data);
          break;
        }
        case _send_mutiple: {
          for (var i = 0; i < data.to.length; i++) {
            io.to(data.to[i]).emit(data.event, data.data);
          }
          break;
        }
        case _send_control: {
          io.to("controls").emit(data.event, data.data);

          break;
        }
        default: {
          // _send_all

          io.emit(data.event, data.data);
          break;
        }
      }
      // Debug log
      console.log(
        { to: data.to, event: data.event, data: data.data },
        "SendDataOutput"
      );
    } catch (err) {
      console.log("Erro --> SendData" + err);
      console.log(err, "Erro --> SendData");
    }
  });

  /*
    SendDataResponse
    + Input : name, data  
    + Output: 
    + Description: Phản hồi kết quả sau khi nhận đc data
  */

  socket.on("SendDataResponse", async (dataInput) => {
    try {
      var data = dataParse(dataInput);
      console.log(dataInput, "SendDataResponseInput");
      if (!data) return;
      io.sockets.in("controls").emit("SendDataResponse", {
        to: data.to,
        event: data.event,
        data: data.data,
      });
      console.log(
        { to: data.to, event: data.event, data: data.data },
        "SendDataResponseOutput"
      );
    } catch (err) {
      console.log(err, "Erro --> SendDataResponse");
    }
  });

  /*
    Erro
    + Input : name, data  
    + Output: 
    + Description: Phản hồi kết quả sau khi nhận đc data
  */

  socket.on("Error", (dataInput) => {
    try {
      var data = dataParse(dataInput);
      console.log(dataInput, "ErrorInput");
      if (!data) return;
      io.emit("Error", {
        status_code: 400,
        name: data.name,
        message: data.message,
        data: data.data,
      });
      console.log(
        {
          status_code: 400,
          name: data.name,
          message: data.message,
          data: data.data,
        },
        "ErrorInputOutPut"
      );
    } catch (err) {
      console.log(err, "Erro --> Error");
    }
  });

  socket.on("disconnect", () => {
    console.log("Co nguoi thoat ket noi " + socket.id);
    list_rooms.forEach((item, index) => {
      var room = io.sockets.adapter.rooms[item];
      if (!room) {
        list_rooms.splice(index, 1);
      }
    });

    io.emit("ControlResponse", {
      list_device: list_rooms,
    });
  });
});

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
