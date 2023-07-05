class QueueManager {
    constructor(mongooseModel) {
        this.model = mongooseModel;

        this.queue = {};
        this.queue_ongoing = {};
        this.queue_canWork = {};
    }

    async startJob(jobID) {
        let doNextJob = async () => {
            console.clear();
            console.log("queue:", this.queue);
            console.log("ongoing:", this.queue_ongoing);
            console.log("canWork:", this.queue_canWork);

            if (!this.queue[jobID].length || !this.queue_canWork[jobID]) return;

            this.queue_ongoing[jobID] = true;

            let job = this.queue[jobID].shift(); if (!job) return;

            job.resolve(await this.model.findByIdAndUpdate(job.id, job.query, { new: true }));

            if (this.queue[jobID].length) return await doNextJob();

            delete this.queue_ongoing[jobID];
            delete this.queue[jobID];
        };

        this.queue_canWork[jobID] = true;

        return await doNextJob();
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