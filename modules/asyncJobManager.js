const _jsT = require("./jsTools/_jsT");

class Job {
	constructor(arr = []) {
		this.work = _jsT.isArray(arr);
	}

	add(...work) {
		this.work.push(...work);
	}

	async await() {
		return await Promise.all(this.work);
	}
}

module.exports = { Job };
