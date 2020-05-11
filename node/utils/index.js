const fs = require('fs');
const path = require('path');
const stream = require('stream');

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
