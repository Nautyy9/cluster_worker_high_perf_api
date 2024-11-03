"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustWorkerCount = adjustWorkerCount;
var os_1 = require("os");
var availCpus = os_1.default.cpus().length;
function adjustWorkerCount(cluster) {
    var requestCount = cpu_required();
    var workerCount = Object.keys(cluster.workers).length;
    var worker;
    if (requestCount > workerCount) {
        for (var i = 0; i < requestCount - workerCount; i++) {
            worker = cluster.fork();
        }
    }
    else if (workerCount > requestCount) {
        for (var i = 0; i < workerCount - requestCount; i++) {
            var worker_1 = cluster.workers[parseInt(Object.keys(cluster.workers)[i])];
            worker_1 === null || worker_1 === void 0 ? void 0 : worker_1.kill();
        }
    }
    return worker;
}
function cpu_required() {
    //! load cannot be greater than the number of CPU CORES , if it is greater that means the system is bust
    //* loadavg return array of 3 because it perform analytics on the 3 time interval [1min , 5min, 15min]
    //* we are checking every 1minute to scale up or scale down the number of CPU CORES using
    var load = os_1.default.loadavg()[0];
    // ^ creating min of 2 workers
    return Math.max(2, Math.min(availCpus, Math.ceil(load)));
}
// ^ observations
// As written, the maximum number of worker processes will be capped at numCPUs. This is a typical approach because:
//CPU-bound tasks: If your tasks are CPU-bound (i.e., they heavily utilize the CPU), having more worker
//processes than CPU cores can lead to inefficient context switching, which might degrade performance.as more workers
//would just compete for CPU time and could reduce overall performance due to increased context switching.
// I/O-bound tasks: If your tasks are I/O-bound ((meaning it spends a lot of time waiting on things like database queries,
// file I/O, or network requests), you might consider allowing more workers than CPU cores.
