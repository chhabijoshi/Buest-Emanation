const QRCode = require("qrcode");

const url = "http://192.168.50.57:8000"; 

QRCode.toFile("demoQR.png", url, function (err) {
    if (err) throw err;
    console.log("QR Code generated");
});