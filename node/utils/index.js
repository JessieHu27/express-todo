const fs = require("fs-extra");
const path = require("path");
const stream = require("stream");
const marked = require("marked");
const hljs = require("highlight.js");

const $STATIC = path.join(__dirname, "../static");
const $TEMP = path.join(__dirname, "../temp");

// static path
exports.$STATIC = $STATIC;
// temp path
exports.$TEMP = $TEMP;

// cors setting
exports.cors = function (res) {
	res.setHeader("Access-Control-Allow-Origin", ["*"]);
	res.setHeader("Access-Control-Allow-Method", ["GET", "POST", "OPTIONS"]);
	res.setHeader("Access-Control-Allow-Headers", ["*"]);
};

// download file by application/octet-stream
exports.download = function (file, res) {
	const stat = fs.statSync(file);
	if (!fs.existsSync(file) || !stat.isFile()) {
		res.end();
		return;
	}
	const { name, ext } = path.parse(file);
	res.setHeader("Content-Type", "application/octet-stream;charset=utf-8");
	res.setHeader("Content-Length", stat.size);
	res.setHeader(
		"Content-Disipisition",
		`attachment;filename=${decodeURI(name)}${ext};`
	);
	const reader = fs.createReadStream(file);
	reader.on("end", () => res.end());
	reader.pipe(res);
};

// handle upload file data
exports.handleUpload = function (buffer, filename) {
	const dest = path.join(__dirname, "../static", decodeURI(filename));
	const writer = fs.createWriteStream(dest);
	const bufferStream = new stream.PassThrough();
	return new Promise((resolve, reject) => {
		bufferStream.end(buffer);
		bufferStream.on("end", (err) => {
			if (err) {
				reject(err);
			}
			resolve(path.join(__dirname, "../static", filename));
		});
		bufferStream.pipe(writer);
	});
};

/**
 * parse MD file and hilight the code block
 */
exports.handleMarkdown = function (params) {
	const ARTICLE_PATH = path.join(__dirname, "../static/note.md");
	const reader = fs.createReadStream(ARTICLE_PATH, { encoding: "utf-8" });
	return new Promise((resolve, reject) => {
		let str = "";
		reader.on("data", (chunk) => {
			str += chunk;
		});
		reader.on("end", (err, data) => {
			if (err) {
				reject(err);
				return;
			}
			try {
				marked.setOptions({
					highlight: function (code, language) {
						return hljs.highlight("javascript", code).value;
					},
				});
				resolve(marked(str));
			} catch (e) {
				reject(e);
			}
		});
	});
};

exports.mergeFileChunk = async function (data, res) {
	const { hash, total, ext, chunkSize } = data;
	const dir = path.join($TEMP, hash);
	if (!fs.existsSync(dir)) {
		res.end(
			JSON.stringify({
				code: 200,
				msg: "当前路径不存在",
				data: "",
			})
		);
		return;
	}
	const fileList = fs.readdirSync(dir);
	if (fileList.length !== total) {
		res.end(
			JSON.stringify({
				code: 200,
				msg: `合并错误，文件切片长度不符合要求`,
				data: {
					total,
					exist: fileList.length,
				},
			})
		);
		return;
	}
	const isALlFile = () =>
		fileList.every((v) => fs.statSync(path.join(dir, v)).isFile());
	const isValidChunkList = () => {
		for (let i = 0; i < total; i++) {
			if (fileList.indexOf(`${i}`) === -1) {
				return false;
			}
		}
		return true;
	};
	if (!isALlFile() || !isValidChunkList()) {
		res.end(
			JSON.stringify({
				code: 200,
				msg: `合并错误，文件切片不符合要求`,
				data: "",
			})
		);
		return;
	}
	const target = path.join($STATIC, 'upload', `${hash}${ext}`);
	/** 创建可写流 */
	const writer = fs.createWriteStream(target);

	const mergeRecursive = (list, writable) => {
		const readable = fs.createReadStream(list.shift());
		return new Promise((resolve, reject) => {
			readable.on("end", (err) => {
				if (err) {
					reject(err);
					return;
				}
				resolve();
			});
			// 读取完成后不自动关闭
			readable.pipe(writable, { end: false });
		}).
			then(() => {
				if (list.length) {
					return mergeRecursive(list, writable);
				}
			}).
			catch((err) => {
				console.log(err);
				// 关闭可写流，避免内存泄漏
				writable.end();
			});
	};

	// 为文件切片按照文件名排序(对应切片顺序)
	const list = fileList.sort((a, b) => a - b).map((v) => path.join(dir, v));
	mergeRecursive(list, writer).
		then(() => {
			fs.unlinkSync(dir);
			res.end(
				JSON.stringify({
					code: 200,
					msg: "success",
					data: {
						path: $STATIC + hash + ext,
					},
				})
			);
		}).
		catch((err) => {
			console.log(err);
			res.end(
				JSON.stringify({
					code: 200,
					msg: "合并错误",
					data: "",
				})
			);
		});
};

exports.fileChunkSave = function (field, files, res) {
	const { index, total, hash } = field;
	const { chunk } = files;
	const target = path.resolve($TEMP, hash[0]);
	/** 创建文件夹 */
	if (!fs.existsSync(target)) {
		fs.mkdirSync(target);
	}
	fs.copyFileSync(chunk[0].path, path.join(target, index[0]));
	res.end("chunk saved");
};
