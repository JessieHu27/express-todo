const fs = require("fs");
const path = require("path");
const http = require("http");
const router = require("./router");
const { cors } = require("./utils/");
const PORT = 3000;
const app = http.createServer(handleRequest);

app.listen(PORT, "localhost");

process.on('uncaughtException', function (err) {
	console.log('Caught exception: ' + err);
  });

console.log("====================================");
console.log(`app listening on ${PORT}`);
console.log("====================================");

function handleRequest(req, res) {
	cors(res);
	console.log(`${req.method} ${req.url}`);
	router.route(req, res);
}

