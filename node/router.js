const multiparty = require("multiparty");
const path = require("path");
const {
	download,
	handleUpload,
	$STATIC,
	mergeFileChunk,
	fileChunkSave,
	handleMarkdown,
} = require("./utils/index");

const METHODS = ["get", "post", "delete", "head", "put", "options", "patch"];

function Router() {
	this.registeredRequest = {};
	METHODS.forEach((v) => (this.registeredRequest[v] = {}));
	this.route = (req, res) => {
		const { method, url } = req;
		const { path: p } = parseUrl(url);
		const fns = this.registeredRequest[method.toLowerCase()];
		const fn = findHandle(fns, p);
		if (typeof fn === "function") {
			fn(req, res);
		} else {
			res.statusCode = 404;
			res.end("Not Found");
			console.warn(`request ${req.url} is not handled`);
		}
	};
}

METHODS.forEach((v) => {
	Router.prototype[v] = function (url, handle, exact = true) {
		if (this.registeredRequest[v].hasOwnProperty(url)) {
			console.warn(`request ${url} is already registered!`);
		}
		handle.exact = exact;
		this.registeredRequest[v][url] = handle;
	};
});

function parseUrl(url) {
	const res = {
		path: "",
		query: {},
	};
	const index = url.indexOf("?");
	if (index === -1) {
		res.path = url;
	} else {
		res.path = url.slice(0, index);
		let params = url.slice(index + 1);
		if (params.length) {
			const matchs = params.match(/([^=&]+)=([^&]*)/gi);
			if (matchs.length) {
				matchs.forEach((v) => {
					const equalIndex = v.indexOf("=");
					res.query[v.slice(0, equalIndex)] = v.slice(equalIndex + 1);
				});
			}
		}
	}
	return res;
}

function findHandle(fns, p) {
	const pathList = Object.keys(fns);
	for (let i = 0; i < pathList.length; i++) {
		const _path = pathList[i];
		if (fns[_path].exact) {
			if (_path === p) {
				return fns[_path];
			}
			continue;
		}
		if (p.startsWith(_path)) {
			return fns[_path];
		}
	}
}

const router = new Router();

router.options(
	"/",
	function (req, res) {
		res.setHeader("Access-Control-Max-Age", 60000);
		res.statusCode = 200;
		res.end();
	},
	false
);

router.get("/", function (req, res) {
	res.end("<h1>Server</h1>");
});

router.get("/article", async function (req, res) {
	try {
		const data = await handleMarkdown();
		res.setHeader("Content-Type", "text/html");
		res.end(data);
	} catch (e) {
		console.log(e);
		res.end();
	}
});

router.get("/csv", function (req, res) {
	const file_path = path.join($STATIC, "test.csv");
	download(file_path, res);
});

router.get("/xlsx", function (req, res) {
	const file_path = path.join($STATIC, "test.xlsx");
	download(file_path, res);
});

router.get("/pdf", function (req, res) {
	const file_path = path.join($STATIC, "test.pdf");
	download(file_path, res);
});

router.get("/docx", function (req, res) {
	const file_path = path.join($STATIC, "test.docx");
	download(file_path, res);
});

router.get("/png", function (req, res) {
	const file_path = path.join($STATIC, "test.png");
	download(file_path, res);
});

router.get("/sketch", function (req, res) {
	const file_path = path.join($STATIC, "test.sketch");
	download(file_path, res);
});

router.post("/upload", function (req, res) {
	res.setHeader('Content-Type', 'application/json;charset=utf-8');
	const mp = new multiparty.Form();
	mp.parse(req, (err, field, files) => {
		if (err) {
			res.end(JSON.stringify({
				code: 200,
				msg: '文件解析错误',
				data: ''
			}));
			return;
		}
		fileChunkSave(field, files, res);
	});
});

router.post("/upload-merge", function (req, res) {
	res.setHeader('Content-Type', 'application/json;charset=utf-8');
	let data = "";
	// 接收的是buffer，可以通过Buffer.concat([buffer1, buffer2,...], totalLength)进行合并
	req.on("data", (chunk) => {
		data += chunk.toString();
	});
	req.on("end", (err) => {
		if (err) {
			res.statusCode = 500;
			res.end("");
			return;
		}
		data = JSON.parse(data);
		mergeFileChunk(data, res);
	});
});

router.post("/upload-single", function (req, res) {
	let body = [];
	req.on("data", (chunk) => {
		body = body.concat(chunk);
	});
	req.on("end", (err) => {
		if (err) {
			res.end("No");
			return;
		}
		const { query } = parseUrl(req.url);

		handleUpload(body[0], query.filename).
			then((data) => {
				if (data) {
					res.end(data);
				} else {
					res.end("no");
				}
			}).
			catch((error) => {
				res.end("no");
			});
	});
});

router.post("/upload-extra", function (req, res) {
	res.end("111");
});

module.exports = router;
