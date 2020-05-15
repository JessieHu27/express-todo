/* eslint-disable no-unmodified-loop-condition */
const DEFAULT_CONFIG = {
	/**
	 * 整体进度
	 */
	onProgress: (load, total) => {},
	/**
	 * 成功
	 */
	onSuccess: () => {},
	/**
	 * 失败
	 */
	onError: () => {},
	/**
	 * 切片大小，默认1M
	 */
	chunkSize: 1024 * 1024 * 10,
	/**
	 * 并发请求
	 * */
	concurrencySize: 6,

	/**
	 * 失败自动重试
	 */
	retryTime: 3,
};

const UPLOAD_STATUS = {
	INIT: "INIT",
	STARTED: "STARTED",
	STOP: "STOP",
	DONE: "DONE",
};

class BigFileUpload {
	constructor(file, config = DEFAULT_CONFIG) {
		console.log(`uploading ${file.name}`);
		this.file = file;

		this.config = Object.assign({}, DEFAULT_CONFIG, config);

		this.reader = new FileReader();

        this.fileName = file.name;
        
        this.ext = getFileExt(this.fileName);

		this.uploadedSize = 0;

		this.size = file.size;

		this.hash = null;

		this.requestList = [];

		/**
		 *  文件切片总数
		 */
		this.fileSliceCount = Math.ceil(this.size / this.config.chunkSize);

		/**
		 * 已上传的切片总数
		 */
		this.fileSliceUploadedCount = 0;

		/**
		 * 当前上传状态
		 */
		this.status = UPLOAD_STATUS.INIT;

		/**
		 * 正在传输的请求，用于取消操作
		 *
		 */
		this.uploadingSliceList = [];

		/**
		 * 上传失败的切片列表，用于失败自动重试
		 */
		this.failedSliceList = [];

		this.init();
	}

	async init() {
		console.log(`initial...`);
		await this.getFileMD5();
		this.genFileSliceRequest();
	}

	/**
	 * 暂停上传
	 */
	stop() {
		console.log(`stoping upload...`);
		this.status = UPLOAD_STATUS.STOP;
		this.uploadingSliceList.forEach((item) => {
			item.inst.xhr.abort();
			// 重新添加到任务队列
			this.initRequest(
				item.index,
				Blob.prototype.slice.call(this.file, item.start, item.end),
				item.start,
				item.end
			);
		});
		this.uploadingSliceList.length = 0;
	}

	/**
	 * 取消上传
	 */
	cancel() {
		console.log(`upload canceling...`);
	}

	/**
	 * 开始上传
	 */
	start() {
		let threshold = this.config.concurrencySize,
			uploading = 0;
		return new Promise((resolve, reject) => {
			this.status = UPLOAD_STATUS.STARTED;
			const next = async () => {
				// 暂停
				if (this.status === UPLOAD_STATUS.STOP) {
					resolve();
					return;
				}
				const { length } = this.requestList;
				// 已全部上传完
				if (!length && !uploading) {
					this.status = UPLOAD_STATUS.DONE;
					await this.mergeChunk();
					resolve();
					return;
				}
				while (this.requestList.length && threshold) {
					const item = this.requestList.shift();
					threshold--;
					uploading++;
					// 添加到正在发送列表
					this.uploadingSliceList.push(item);
					item.request().
						then(() => {
							threshold++;
							uploading--;
							console.log(`chunk upload success`);
							// 从正在发送列表移除
							this.removeUploadingItem(item);
							next();
						}).
						catch((err) => {
							threshold++;
							uploading--;
							console.log(
								`chunk upload error,${
									item.retry ? item.retry + " retry" : ""
								} ${err}`
							);
							this.handleUploadFail(item);
							next();
						});
				}
			};
			try {
				next();
			} catch (e) {
				reject(e);
			}
		});
	}

	async restart() {
		this.status = UPLOAD_STATUS.STARTED;
		// hash 没有生成完成
		if (!this.hash) {
			await this.getFileMD5();
			this.genFileSliceRequest();
		}
		// 切片没有上传完
		await this.start();
	}

	/**
	 * 生成文件切片md5
	 */
	getFileMD5() {
		return new Promise((resolve, reject) => {
			console.log(`start generate file hash...`);
			const { chunkSize } = this.config;
			try {
				const spark = new SparkMD5.ArrayBuffer();
				let chunkFinishedCount = 0;
				const next = () => {
					const start = chunkSize * chunkFinishedCount;
					const end =
						start + chunkSize > this.size
							? this.size
							: start + chunkSize;
					this.reader.readAsArrayBuffer(
						Blob.prototype.slice.call(this.file, start, end)
					);
				};
				this.reader.onload = (e) => {
					if (this.status === UPLOAD_STATUS.STOP) {
						resolve();
						return;
					}
					console.log(
						`generate file slice hash ${chunkFinishedCount}, total: ${this.fileSliceCount}`
					);
					spark.append(e.target.result);
					chunkFinishedCount++;
					if (chunkFinishedCount < this.fileSliceCount) {
						next();
					} else {
						console.log(`generate file hash completely`);
						this.hash = spark.end();
						resolve();
					}
				};
				next();
			} catch (e) {
				reject(e);
			}
		});
	}

	genFileSliceRequest() {
		console.log("initialize request list...");
		const { chunkSize } = this.config;
		let fileSliceIndex = 0,
			start = 0,
			end = 0;
		while (fileSliceIndex < this.fileSliceCount) {
			end = start + chunkSize > this.size ? this.size : start + chunkSize;
			this.initRequest(
				fileSliceIndex,
				Blob.prototype.slice.call(
					this.file,
					start,
					end,
					this.file.type
				),
				start,
				end
			);
			fileSliceIndex++;
			start = end;
		}
	}

	/**
	 * 生成请求函数
	 */
	initRequest(index, chunk, start, end) {
		const fm = new FormData();
		fm.append("index", index);
		fm.append("total", this.fileSliceCount);
		fm.append("hash", this.hash);
		fm.append("ext", this.ext);
		fm.append("chunk", chunk);
		const inst = new ajax.XhrInstance();
		const request = () => {
			return ajax("POST", `${SERVER}upload`, fm, {
				timeout: 30 * 1000,
				xhrInstance: inst,
			}).then(() => {
				this.uploadedSize += chunk.size;
				this.config.onProgress(this.uploadedSize, this.size);
			});
		};
		this.requestList.push({
			request,
			index,
			start,
			end,
			inst,
			retry: 0,
		});
	}

	/**
	 * 移除一个发送完成的请求
	 */
	removeUploadingItem(item) {
		const { index } = item;
		let done = false;
		for (let i = 0; i < this.uploadingSliceList.length; i++) {
			if (this.uploadingSliceList[i].index === index) {
				done = true;
				this.uploadingSliceList.splice(i, 1);
				break;
			}
		}
		if (!done) {
			throw Error(`request ${item} remove uploading failed`);
		}
	}

	/**
	 * 处理切片上传失败
	 */
	handleUploadFail(item) {
		this.removeUploadingItem(item);
		const { retry } = item;
		if (retry < this.config.retryTime) {
			item.retry++;
			this.requestList.push(item);
		}
		/**
		 * 保留在失败列表
		 */
	}

	/**
	 * 上传完成，进行合并
	 */
	mergeChunk() {
		return ajax(
			"POST",
			`${SERVER}upload-merge`,
			JSON.stringify({
                hash: this.hash,
                ext: this.ext,
				total: this.fileSliceCount,
			}),
			{
				// 合并处理超时时间
                timeout: 2 * 60 * 1000,
                headers: {
                    'Content-Type': 'application/json'
                }
			}
		);
	}
}


function getFileExt(name) {
    const index = name.lastIndexOf('.');
    if (index > -1) {
        return name.slice(index);
    }
    return '';
}