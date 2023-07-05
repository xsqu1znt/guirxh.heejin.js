class QueueManager {
    constructor(mongooseModel) {
        this.model = mongooseModel;

        this.queue = new Map();
        this.ongoing = false;
        this.canWork = true;
    }

    async start() {
        this.canWork = true;

        let doNextJob = async (queue) => {
            if (!this.queue.length || !this.canWork) return;

            this.ongoing = true;

            let job = queue.shift(); if (job) {
                job.resolve(await this.model.findByIdAndUpdate(job.id, job.query, { new: true }));
            }

            if (queue.length) return await doNextJob();

            this.ongoing = false;
        };

        await Promise.all(this.queue.values().map(queue => doNextJob(queue)));

        this.queue.clear();
    }

    stop() {
        this.canWork = false;
    }

    async push(id, query) {
        return await new Promise(resolve => {
            let jobQueue = this.queue.get(id) || [];

            jobQueue.push({ id, query, resolve });

            this.queue.set(id, jobQueue);

            if (!this.ongoing) start();
        });
    }

    clear() {
        this.queue = [];
    }
}

module.exports = QueueManager;