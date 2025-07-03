const Fastify = require("fastify");
const WebSocket = require("ws");

const fastify = Fastify({ logger: false });
const PORT = process.env.PORT || 3000;

let b52LatestDice = null;
let b52CurrentSession = null;
let b52CurrentMD5 = null;
let b52WS = null;
let b52IntervalCmd = null;
const b52ReconnectInterval = 5000;

function sendB52Cmd1005() {
  if (b52WS && b52WS.readyState === WebSocket.OPEN) {
    const payload = [6, "MiniGame", "taixiuKCBPlugin", { cmd: 2000 }];
    b52WS.send(JSON.stringify(payload));
  }
}

function connectB52WebSocket() {
  b52WS = new WebSocket("wss://minybordergs.weskb5gams.net/websocket");

  b52WS.on("open", () => {
    const authPayload = [
      1,
      "MiniGame",
      "",
      "",
      {
        agentId: "1",
        accessToken: "13-399d58192f4e318dd0d708781586c649",
        reconnect: false,
      },
    ];
    b52WS.send(JSON.stringify(authPayload));
    clearInterval(b52IntervalCmd);
    b52IntervalCmd = setInterval(sendB52Cmd1005, 5000);
  });

  b52WS.on("message", (data) => {
    try {
      const json = JSON.parse(data);
      if (Array.isArray(json) && json[1]?.htr) {
        const htr = json[1].htr;
        const latest = htr[htr.length - 1];
        if (
          latest &&
          typeof latest.d1 === "number" &&
          typeof latest.d2 === "number" &&
          typeof latest.d3 === "number" &&
          latest.sid
        ) {
          b52LatestDice = {
            d1: latest.d1,
            d2: latest.d2,
            d3: latest.d3,
          };
          b52CurrentSession = latest.sid;
          if (json[1].md5) {
            b52CurrentMD5 = json[1].md5;
          }
        }
      }
    } catch (e) {
      console.error("Lỗi JSON:", e);
    }
  });

  b52WS.on("close", () => {
    clearInterval(b52IntervalCmd);
    setTimeout(connectB52WebSocket, b52ReconnectInterval);
  });

  b52WS.on("error", () => {
    if (b52WS.readyState !== WebSocket.CLOSED) {
      b52WS.close();
    }
  });
}

connectB52WebSocket();

fastify.get("/", async (req, reply) => {
  return {
    message: "✅ Server B52 đang chạy!",
    hướng_dẫn: "Truy cập /api/b52md5/mrtinhios để xem kết quả tài xỉu.",
    tác_giả: "@mrtinhios",
  };
});

fastify.get("/api/b52md5/mrtinhios", async (req, reply) => {
  if (!b52LatestDice || !b52CurrentSession) {
    return {
      phien: null,
      xuc_xac_1: null,
      xuc_xac_2: null,
      xuc_xac_3: null,
      tong: null,
      ket_qua: null,
      md5: null,
      id: "@mrtinhios | MD5 B52",
    };
  }

  const { d1, d2, d3 } = b52LatestDice;
  const tong = d1 + d2 + d3;
  const ket_qua = tong <= 10 ? "XỈU" : "TÀI";

  return {
    phien: b52CurrentSession,
    xuc_xac_1: d1,
    xuc_xac_2: d2,
    xuc_xac_3: d3,
    tong,
    ket_qua,
    md5: b52CurrentMD5 || null,
    id: "@mrtinhios | MD5 B52",
  };
});

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log("Server đang chạy tại PORT " + PORT);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();