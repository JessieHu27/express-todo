const fs = require('fs');
const path = require('path');
const stream = require('stream');
const marked = require("marked");
const hljs = require("highlight.js");


// static path
exports.$STATIC = path.join(__dirname, '../static');

// cors setting
exports.cors = function(res) {
    res.setHeader('Access-Control-Allow-Origin', ['*']);
    res.setHeader('Access-Control-Allow-Method', ['GET',
        'POST',
        'OPTIONS']);
    res.setHeader('Access-Control-Allow-Headers', ['*']);
};

// download file by application/octet-stream
exports.download = function(file, res) {
    const stat = fs.statSync(file);
    console.log(stat);
    if (!fs.existsSync(file) || !stat.isFile()) {
        res.end();
        return;
    }
    const { name, ext } = path.parse(file);
    res.setHeader('Content-Type', 'application/octet-stream;charset=utf-8');
    res.setHeader('Content-Length', stat.size);
    res.setHeader(
        'Content-Disipisition',
        `attachment;filename=${decodeURI(name)}${ext};`
    );
    const reader = fs.createReadStream(file);
    reader.on('end', () => res.end());
    reader.pipe(res);
};

// handle upload file data
exports.handleUpload = function(buffer, filename) {
    const dest = path.join(__dirname, '../static', decodeURI(filename));
    const writer = fs.createWriteStream(dest);
    const bufferStream = new stream.PassThrough();
    return new Promise((resolve, reject) => {
        bufferStream.end(buffer);
        bufferStream.on('end', (err) => {
            if (err) {
                reject(err);
            }
            resolve(path.join(__dirname, '../static', filename));
        });
        bufferStream.pipe(writer);
    });
};

/**
 * parse MD file and hilight the code block
 */
exports.handleMarkdown = function(params) {
	const ARTICLE_PATH = path.join(__dirname, '../static/note.md')
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
					highlight: function(code, language) {
						return hljs.highlight('javascript', code).value;
					},
				});
				resolve(marked(str));
			} catch (e) {
				reject(e);
			}
		});
	});
};

