"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cluster_1 = require("cluster");
var os_1 = require("os");
var process_1 = require("process");
var signalProcess_1 = require("./signalProcess");
var numCPUs = os_1.default.cpus().length;
var scale_worker_process_1 = require("./utils/scale_worker_process");
var http_1 = require("http");
var hostname = "localhost";
var port = 8080;
function createCluster() {
    // ! loadavg gives the array of 0's upon which the max laod can fall rn
    console.log("Master process PID: ".concat(process_1.default.pid, ", CPU cores: ").concat(numCPUs), os_1.default.loadavg()[0]);
    var currentWorker = 0;
    var attempts = 0;
    //! creating cluster with fork.
    // $ worker.on listens for individual wroker process req to master process , while cluster.on -> listens to every
    var worker = (0, scale_worker_process_1.adjustWorkerCount)(cluster_1.default);
    //$ cluster.workers -> cycles through avail worker processes ,sending each
    var server = http_1.default.createServer(function (req, res) {
        // obsidian file to read the docs
        //! the cluster.workers is an object that stores the workers created by cluster.fork()
        var workerIds = Object.keys(cluster_1.default.workers);
        var worker = cluster_1.default.workers[workerIds[currentWorker]];
        //^ Find a valid, non-busy worker
        while (!worker && attempts < workerIds.length) {
            // * ensures that the worker id are in range
            currentWorker = (currentWorker + 1) % workerIds.length;
            worker = cluster_1.default.workers[workerIds[currentWorker]];
            attempts++;
        }
        if (!worker) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            return res.end("Server Error");
        }
        var body = "";
        req.on("data", function (chunk) {
            body += chunk;
        });
        req.on("end", function () {
            worker.send({
                type: "http_request",
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: body,
            });
        });
        //# Timeout after 5 seconds
        var workerTimeout = setTimeout(function () {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Worker timed out");
        }, 5000);
        worker.once("message", function (message) {
            clearTimeout(workerTimeout);
            if (message.type === "http_response") {
                // console.log("worker once ", message)
                // console.log(
                //   `Worker PID ${worker.process.pid} handled a total of ${message.requestCount} requests`
                // )
                if (!message || typeof message.statusCode !== "number") {
                    res.writeHead(500, { "Content-Type": "text/plain" });
                    return res.end("Server Not Responding");
                }
                res.writeHead(message.statusCode, message.headers);
                return res.end(message.body);
            }
            else {
                if (message.type === "no_of_requests") {
                    console.log("Worker PID ".concat(worker.process.pid, " handled a total of ").concat(message.requestCount, " requests"));
                    res.writeHead(200, { "Content-Type": "text/plain" });
                    return res.end("Worker PID ".concat(worker.process.pid, " handled a total of ").concat(message.requestCount, " requests"));
                }
                if (message.targetWorkerId) {
                    var targetWorker = cluster_1.default.workers[message.targetWorkerId];
                    console.log("target worker ".concat(targetWorker === null || targetWorker === void 0 ? void 0 : targetWorker.process.pid, " , from worker ").concat(worker.process.pid));
                    if (targetWorker) {
                        worker.send({
                            from: worker.process.pid,
                            message: message.data,
                            to: targetWorker.process.pid,
                            requestId: message.requestId,
                        });
                        targetWorker.send({
                            from: worker.process.pid,
                            message: message.data,
                            to: targetWorker.process.pid,
                        });
                    }
                }
                // message.workerID = worker.process.pid
                // worker.emit("custom_event", message)
                // return null
            }
        });
        // worker.on("message", (message: any) => {
        //   // if (message.type === "no_of_requests") {
        //   //   console.log(
        //   //     `Worker PID ${worker.process.pid} handled a total of ${message.requestCount} requests`
        //   //   )
        //   // }
        //   // console.log("worker on ", message)
        //   if (message.targetWorkerId) {
        //     const targetWorker = cluster.workers![message.targetWorkerId]
        //     console.log(
        //       `target worker ${targetWorker?.process.pid} , from worker ${worker.process.pid}`
        //     )
        //     if (targetWorker) {
        //       worker.send({
        //         from: worker.process.pid,
        //         message: message.data,
        //         to: targetWorker!.process.pid,
        //         requestId: message.requestId,
        //       })
        //       targetWorker.send({
        //         from: worker.process.pid,
        //         message: message.data,
        //         to: targetWorker.process.pid,
        //       })
        //     }
        //   }
        // })
        currentWorker = (currentWorker + 1) % workerIds.length;
    });
    //* This is similar to cluster.on('message', callback) but is used on individual worker objects.
    server.listen(port, hostname, function () {
        console.log("Load balancing started on http://".concat(hostname, ":").concat(port));
    });
    // ! Shutting down gracefully listens for every worker process
    cluster_1.default.on("message", function (worker, message) {
        if (message.type === "shutdown") {
            console.log("Worker PID ".concat(worker.process.pid, " is shutting down gracefully"));
            worker.send({ type: "shutdown" });
        }
    });
    //! creating exit logic on cluster close
    cluster_1.default.on("exit", function (worker, code, signal) {
        console.log("Worker PID ".concat(worker.process.pid, " died (code: ").concat(code, ", signal: ").concat(signal, ")"));
        // Optionally fork a new worker to replace the exited one
        cluster_1.default.fork();
    });
}
if (cluster_1.default.isPrimary) {
    createCluster();
}
else {
    (0, signalProcess_1.processManager)();
}
