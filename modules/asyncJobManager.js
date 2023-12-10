const jt = require("./jsTools");

class Job {
	constructor(arr = []) {
		this.work = jt.isArray(arr);
	}

	add(...work) {
		this.work.push(...work);
	}

	async await() {
		return await Promise.all(this.work);
	}
}

module.exports = { Job };
