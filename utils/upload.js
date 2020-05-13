const DEFAULT_CONFIG = {
    /** 
     * 整体进度
     */
    onProgress: () => { },
    /**
     * 切片大小，默认10M
     */
    chunkSize: 1024 * 1024 * 10
};

class BigFileUpload {
	constructor(file, config = DEFAULT_CONFIG) {
        this.file = file;
        
        this.config = config;

		// reader
		this.reader = new FileReader();
		/**
		 *  文件切片总数
		 */
        this.fileSliceCount = 0;

        this.fileSliceIndex = 0;

        this.fileSliceUploadedCount = 0;
        
        this.fileName = file.name;

        this.size = file.size;
        
		this.init();
    }
    
    init() {
        const {chunkSize} = this.config;
        this.fileSliceCount = Math.ceil(this.size / chunkSize);
        while (this.fileSliceIndex < this.fileSliceCount) {
            
        }
    }

	/**
	 * 停止上传
	 */
	stop() {}

	/**
	 * 继续上传
	 */
	start() {}

	/**
	 * 生成文件切片md5
	 */
	getFileMD5(target) {
        const hash = new SparkMD5.ArrayBuffer();
        
	}

	/**
	 * 生成上传的formdata
	 */
	genUploadFormData(index, md5, binary) {
		const fm = new FormData();
	}
}
