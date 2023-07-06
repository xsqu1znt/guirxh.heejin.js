const mongoJobType = {
    findByIdAndUpdate: Symbol("findByIdAndUpdate")
};

class MongoQueueManager {
    constructor(mongooseModel) {
        this.model = mongooseModel;

        // Job queues
        this.jobs = { findByIdAndUpdate: {} };
        this.jobs_ongoing = { findByIdAndUpdate: {} };
        this.job_canWork = { findByIdAndUpdate: {} };

        // Events
        this.events = {
            on: {
                findByIdAndUpdate: { resolve: {}, queueCleared: {} }
            }
        };
    }

    async doNextJobInQueue(jobQueue) {
        if (!jobQueue.length || !this.job_canWork[jobQueue.jobType]) return;

        // Get the job from the current queue while removing it from the array
        let _job = jobQueue.shift(); if (!_job) return;

        // Set this JobQueue to ongoing
        this.jobs_ongoing[_job.jobType][jobQueue.jobID] = true;

        // Do the job
        switch (_job.jobType) {
            case mongoJobType.findByIdAndUpdate:
                _job.resolve(await this.model.findByIdAndUpdate(_job.userID, _job.query));

                // Emit the onResolve event
                this.events.on.findByIdAndUpdate.resolve.forEach(exe => exe(true));
                break;
        }

        // Recursively call this function until the JobQueue array is empty
        if (jobQueue.length) return await this.doNextJobInQueue(jobQueue);

        // CLEANUP: Delete the empty JobQueue array to clear up memory
        return delete this.jobs[_job.jobType][_job.jobID];
    }

    async startJob(jobID, jobType, jobQueue) {
        this.job_canWork[jobType][jobID] = true;

        // Iterate through the JobQueue until it's empty
        await this.doNextJobInQueue(jobQueue);

        // Emit the onQueueCleared event
        this.events.on.findByIdAndUpdate.queueCleared.forEach(exe => exe(true));

        // CLEANUP
        delete this.jobs[jobType][jobID];
        delete this.jobs_ongoing[jobType][jobID];
    }

    async findByIdAndUpdate(userID, query) {
        return await new Promise(resolve => {
            // Define the job's ID for the JobQueue array
            let jobID = userID;

            // Define the job's type for the appropriate JobQueue
            let jobType = mongoJobType.findByIdAndUpdate;

            // Add a new array to the job queue if it doesn't already exist
            this.jobs.findByIdAndUpdate[jobID] ||= [];

            // Push a new job to the findByIdAndUpdate queue
            this.jobs.findByIdAndUpdate[jobID].push({
                jobID, jobType,
                userID, query, resolve
            });

            if (!this.jobs_ongoing.findByIdAndUpdate[id]) this.startJob(jobID, jobType, this.jobs.findByIdAndUpdate[jobID]);
        });
    }

    async startJob_DEPRECATED(jobID) {
        let doNextJob = async () => {
            console.clear();
            console.log("queue:", this.jobs);
            console.log("ongoing:", this.jobs_ongoing);
            console.log("canWork:", this.queue_canWork);

            if (!this.jobs[jobID].length || !this.queue_canWork[jobID]) return;

            this.jobs_ongoing[jobID] = true;

            let job = this.jobs[jobID].shift(); if (!job) return;

            job.resolve(await this.model.findByIdAndUpdate(job.id, job.query, { new: true }));

            if (this.jobs[jobID].length) return await doNextJob();

            delete this.jobs[jobID];
        };

        this.queue_canWork[jobID] = true;

        await doNextJob();

        this.job_ongoing_events[jobID].forEach(resolve => resolve(true));

        // Cleanup
        delete this.job_ongoing_events[jobID];
        delete this.jobs_ongoing[jobID];
    }

    stop_DEPRECATED(jobID) {
        delete this.queue_canWork[jobID];
    }

    async awaitOngoing_DEPRECATED(jobID) {
        return new Promise(resolve => {
            this.job_ongoing_events[jobID] ||= [];

            this.job_ongoing_events[jobID].push(resolve);
        });
    }

    clear_DEPRECATED() {
        this.jobs = {};
    }
}

module.exports = MongoQueueManager;