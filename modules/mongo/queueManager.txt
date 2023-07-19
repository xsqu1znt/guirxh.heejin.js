const mongoJobType = {
    findByIdAndUpdate: "findByIdAndUpdate"
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

    /// Job management
    async doNextJobInQueue(jobQueue) {
        if (!jobQueue.length) return;

        // Get the job from the current queue while removing it from the array
        let _job = jobQueue.shift(); if (!_job || !this.job_canWork[_job.jobType][_job.jobID]) return;

        // Set this JobQueue to ongoing
        this.jobs_ongoing[_job.jobType][jobQueue.jobID] = true;

        // Do the job
        switch (_job.jobType) {
            case mongoJobType.findByIdAndUpdate:
                _job.resolve(await this.model.findByIdAndUpdate(_job.userID, _job.query));

                // Emit the onResolve event
                _job.events.on.resolve?.forEach(exe => exe(true));
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
        let on_queueCleared = this.events.on[jobType].queueCleared[jobID];
        if (Array.isArray(on_queueCleared)) on_queueCleared.forEach(exe => exe(true));

        // CLEANUP
        delete this.jobs[jobType][jobID];
        delete this.jobs_ongoing[jobType][jobID];
    }

    /// Queue management
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
                jobID, jobType, events: { on: { resolve: null } },
                userID, query, resolve
            });

            if (!this.jobs_ongoing.findByIdAndUpdate[jobID]) this.startJob(jobID, jobType, this.jobs.findByIdAndUpdate[jobID]);
        });
    }

    /// Await events
    async on_findByIdAndUpdate_queueCleared(userID) {
        return new Promise(resolve => {
            if (this.jobs_ongoing.findByIdAndUpdate[userID]) {
                this.events.on.findByIdAndUpdate.queueCleared[userID] ||= [];
                this.events.on.findByIdAndUpdate.queueCleared[userID].push(resolve);
            } else resolve(true);
        });
    }
}

module.exports = MongoQueueManager;