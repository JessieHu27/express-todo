/**
 * JSONP 测试
 * @param {string} result
 */
function jsonpCallback(result) {
	alert(`
        jsonpCallback is called;
    `);
	console.log(result);
}

function jsonp() {
	const script = document.createElement("script");
	script.src = src + "?callback=jsonpCallback";
	document.querySelector("head").appendChild(script);
}

const SERVER = "http://localhost:3000/";

/**
 * a 标签下载
 * @param {String|Blob} blob 
 * @param {String} ext 
 */
function a_download(blob, ext) {
	if (typeof blob !== "string" && !(blob instanceof Blob)) {
		throw Error("blob is not string or Blob instance");
	}
	if (typeof blob === "string") {
		blob = new Blob([blob]);
	}
	const a = document.createElement("a");
	a.download = `test.${ext}`;
	a.href = URL.createObjectURL(blob);
	a.style.display = "none";
	document.body.appendChild(a);
	a.click();
	URL.revokeObjectURL(a.href);
	document.body.removeChild(a);
}

/**
 * ajax
 * @param {String} method 
 * @param {String} url 
 * @param {any} data 
 * @param {Object} config 
 */
function ajax(method, url, data = null, config = {}) {
	return new Promise((resolve, reject) => {
		try {
			const xhr = new XMLHttpRequest();
			const {
				timeout = 1000,
				headers = {},
				withCredentials = false,
				upload = false,
				progress = handleProgress,
				responseType = "text/html",
			} = config;
			xhr.responseType = responseType;
			xhr.timeout = timeout;
			xhr.withCredentials = withCredentials;

			upload
				? (xhr.upload.onprogress = progress)
				: (xhr.onprogress = progress);
			xhr.open(method, url, true);
			Object.keys(headers).forEach((v) =>
				xhr.setRequestHeader(v, headers[v])
			);
			xhr.onreadystatechange = (e) => {
				if (xhr.readyState === XMLHttpRequest.DONE) {
					if (
						(xhr.status >= 200 && xhr.status < 300) ||
						xhr.status === 304
					) {
						resolve(xhr.response);
					}
				}
			};
			xhr.onerror = (e) => reject({ e, xhr, type: "ERROR" });
			xhr.ontimeout = (e) => reject({ e, xhr, type: "TIMEOUT" });
			xhr.send(data);
		} catch (e) {
			reject(e);
		}
	});
}

ajax.XhrInstance = function () {
	this.xhr = null;
};

/**
 * fetch 
 * @param {String} ext 
 */
function fetch_(ext) {
	fetch(SERVER + ext).
		then((res) => res.blob()).
		then((blob) => a_download(blob, ext));
}

function handleProgress(e) {
	const { total, loaded } = e;
	console.log(loaded, total, ((loaded * 100) / total).toFixed(0) + "%");
}

/**
 * input onchange 事件回调
 * @param {Event.target} target 
 */
function ajaxFormdataUpload(target) {
	const { files } = target;
	const { length } = files;
	if (!length) return;
	const form = new FormData();
	[...files].forEach((file, index) => {
		form.append(`${index}`, file);
	});
	// start upload
	ajax("POST", `${SERVER}upload`, form, {
		upload: true,
		headers: {},
	}).then((res) => console.log(res));
}


function fetchFormdataUpload() {
	fetch(`${SERVER}upload`, {
		method: "POST",
		body: form,
		headers: {},
		mode: "cors",
		credentials: "omit",
		referrer: "no-referer",
		cache: "default",
	});
	return;
}

/**
 * fetch 二进制上传
 * @param {Event.target} target 
 */
function fetchBinaryUpload(target) {
	const { files } = target;
	const { length } = files;
	if (!length) return;
	const file = files[0];
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsArrayBuffer(file);
		reader.onload = (e) => {
			const { result } = reader;
			fetch(`${SERVER}upload-single?filename=${file.name}`, {
				method: "POST",
				body: result,
				headers: {
					"Content-Type": file.type,
					"Content-Length": file.size,
				},
				mode: "cors",
				// credentials:'include'
			}).
				then((res) => {
					resolve();
					console.log(res);
				}).
				catch((err) => reject(err));
		};
	});
}

