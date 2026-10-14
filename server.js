require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DEVICE_TOKEN = process.env.DEVICE_TOKEN;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

const trashData = {
  device_id: "TRASH-001",
  sensor_detected: false,
  lid_status: "Tertutup",
  last_activity: null,
  last_seen: null
};

function deviceIsOnline() {
  return Boolean(trashData.last_seen) &&
    Date.now() - new Date(trashData.last_seen).getTime() < 30000;
}

app.get("/", (_req, res) => {
  res.render("index");
});

app.get("/api/trash", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    success: true,
    data: { ...trashData, device_online: deviceIsOnline() }
  });
});

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Smart Trash Monitoring berjalan" });
});

app.post("/api/trash", (req, res) => {
  if (!DEVICE_TOKEN) {
    return res.status(503).json({
      success: false,
      message: "DEVICE_TOKEN belum dikonfigurasi di environment server."
    });
  }

  if (req.get("x-device-token") !== DEVICE_TOKEN) {
    return res.status(401).json({
      success: false,
      message: "Token perangkat tidak valid."
    });
  }

  const { device_id, sensor_detected, lid_status } = req.body || {};

  if (typeof sensor_detected !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "sensor_detected harus true atau false."
    });
  }

  if (!["Terbuka", "Tertutup"].includes(lid_status)) {
    return res.status(400).json({
      success: false,
      message: "lid_status harus Terbuka atau Tertutup."
    });
  }

  const now = new Date().toISOString();
  trashData.device_id =
    typeof device_id === "string" && device_id.trim()
      ? device_id.trim().slice(0, 50)
      : "TRASH-001";
  trashData.sensor_detected = sensor_detected;
  trashData.lid_status = lid_status;
  trashData.last_seen = now;

  if (sensor_detected) {
    trashData.last_activity = now;
  }

  res.json({
    success: true,
    message: "Data berhasil diterima",
    data: { ...trashData, device_online: true }
  });
});

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ success: false, message: "API tidak ditemukan." });
  }
  res.status(404).send("Halaman tidak ditemukan.");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("======================================");
  console.log("       SMART TRASH MONITORING");
  console.log("======================================");
  console.log(`Dashboard lokal: http://localhost:${PORT}`);
  console.log(`Port server: ${PORT}`);
  if (!DEVICE_TOKEN) {
    console.warn("PERINGATAN: DEVICE_TOKEN belum diatur; API POST belum dapat menerima data.");
  }
});