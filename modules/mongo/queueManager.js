class QueueManager {
    constructor(mongooseModel) {
        this.model = mongooseModel;

        this.queue = {};
        this.queue_ongoing = {};
        this.queue_canWork = {};
    }

    async startJob(jobID) {
        let doNextJob = async () => {
            if (!this.queue[jobID].length || !this.canWork) return;

            this.queue_ongoing[jobID] = true;

            let job = this.queue[jobID].shift(); if (!job) return;

            job.resolve(await this.model.findByIdAndUpdate(job.id, job.query, { new: true }));

            if (this.queue[jobID].length) return await doNextJob(jobID);

            delete this.queue_ongoing[jobID];
            delete this.queue[jobID];
        };

        this.canWork[jobID] = true;

        await Promise.all(Object.keys(this.queue).map(queueID => doNextJob(queueID)));
    }

    stop(jobID) {
        this.queue_canWork = [];
    }

    async push(id, query) {
        return await new Promise(resolve => {
            this.queue[id] ||= [];

            this.queue[id].push({ id, query, resolve });

            if (!this.queue_ongoing[id]) this.startJob(id);
        });
    }

    clear() {
        this.queue = {};
    }
}

module.exports = QueueManager;