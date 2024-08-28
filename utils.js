function generateJobId() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `job_${timestamp}_${random}`;
}

module.exports = generateJobId;
