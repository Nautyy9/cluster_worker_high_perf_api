import cluster from "cluster";
import os from "os";
import process from "process";
import { processManager } from "./signalProcess.js";
const numCPUs = os.cpus().length;
import { adjustWorkerCount } from "./utils/scale_worker_process.js";
import http from "http";
const hostname = "localhost";
const port = 8080;
function createCluster() {
    // ! loadavg gives the array of 0's upon which the max laod can fall rn
    console.log(`Master process PID: ${process.pid}, CPU cores: ${numCPUs}`, os.loadavg()[0]);
    let current_working_worker_id = 0;
    let attempts = 0;
    const workerPorts = {};
    //! creating cluster with fork.
    //^ to see if its working just comment below line , and the 2 worker will be spawned after 2 seconds.
    const workerIds = adjustWorkerCount(cluster, workerPorts);
    // $ worker.on listens for individual wroker process req to master process , while cluster.on -> listens to every
    setInterval(() => adjustWorkerCount(cluster, workerPorts), 10000);
    //$ cluster.workers -> cycles through avail worker processes ,sending each
    let currentPort = [];
    async function wait(interval) {
        return new Promise((resolve) => setTimeout(resolve, interval));
    }
    const server = http.createServer((req, res) => {
        const workers = Object.values(cluster.workers);
        const availableWorkers = workers.filter((worker) => workerPorts[worker.id]);
        if (availableWorkers.length === 0) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            return res.end("No available workers");
        }
        const workerCount = Object.keys(cluster.workers);
        let worker = cluster.workers[workerCount[current_working_worker_id]];
        // console.log(worker?.process.pid)
        // console.log(current_working_worker_id)
        // //! the cluster.workers is an object that stores the workers created by cluster.fork()
        while (!worker && attempts < workerCount.length) {
            // * ensures that the worker id are in range
            current_working_worker_id =
                (current_working_worker_id + 1) % workerCount.length;
            worker = cluster.workers[workerCount[current_working_worker_id]];
            attempts++;
            //* obsidian file to read the docs
        }
        //^ Find a valid, non-busy worker
        if (!worker) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            return res.end("Server Error");
        }
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        if (req.url === "/shutdown") {
            let workerId = worker.id;
            worker.process.kill("SIGTERM");
            res.writeHead(200, { "Content-Type": "text/plain" });
            return res.end(`Current Worker with id:  ${workerId} has been shutting down gracefully`);
        }
        // console.log(req.url?.slice(1))
        // console.log(worker.process.pid, worker, worker.process, currentPort)
        req.on("end", () => {
            worker.send({
                type: req.method === "POST" ? req.url?.slice(1) : "http_request",
                method: req.method,
                url: req.url,
                headers: req.headers,
                port: workerPorts[worker.id],
                workerId: worker.id,
                body: body,
            });
        });
        const requestTimeout = setTimeout(() => {
            res.writeHead(500, { "Content-Type": "text/plain" });
            worker.removeListener("message", finished);
            return res.end("Worker timed out");
        }, 8000);
        const finished = (message) => {
            console.log("inside worker", message, worker.id);
            clearTimeout(requestTimeout);
            if (message.type === "worker_comm") {
                let targetWorkerId = workerIds.filter((val) => {
                    if (parseInt(val) !== message.workerId) {
                        return parseInt(val);
                    }
                });
                const targetWorker = cluster.workers[targetWorkerId[0]];
                const targetWorkerPID = targetWorker.process.pid;
                const workerPID = worker?.process.pid;
                // console.log(message)
                if (targetWorker) {
                    worker.send({
                        type: "insider_worker_comm",
                        from: worker.process.pid,
                        message: message.body.data,
                        to: targetWorker.process.pid,
                    });
                    let data = `This is worker intercommunication api . Your message: ${message.body.data} with total number of request handled ${message.requestCount} by the current worker ${workerPID} which is running on port ${workerPorts[message.workerId]}. \n Your message has been delivered to worker with id ${targetWorkerPID} port listening on ${workerPorts[targetWorker.id]}.\n Please hit the url http://localhost:${workerPorts[targetWorker.id]}/${message.type} `;
                    res.writeHead(200, { "Content-Type": "text/plain" });
                    return res.end(data);
                }
                else {
                    res.writeHead(400, { "Content-Type": "text/plain" });
                    return res.end("Worker not available");
                }
            }
            else if (message.type === "http_request") {
                if (!message || typeof message.statusCode !== "number") {
                    res.writeHead(500, { "Content-Type": "text/plain" });
                    return res.end("Server Not Responding");
                }
                // console.log(
                //   "inside yet ??????????????????????????",
                //   workerPorts[message.workerId]
                // )
                res.writeHead(200, { "content-type": "text/plain" });
                const data = `The request was successfully handled by worker with id ${message.body.pid} with message ${message.body.data} listening on http://localhost:${workerPorts[message.workerId]} . Total request handled by this worker are ${message.requestCount}`;
                return res.end(data);
            }
            else if (message.type === "no_of_requests") {
                console.log(`Worker PID ${message.workerId} handled a total of ${message.requestCount} requests`);
                res.writeHead(200, { "Content-Type": "text/plain" });
                // current_working_worker_id =
                // (current_working_worker_id + 1) % workerCount.length
                // worker?.removeListener("to_once", message)
                return res.end(`Worker PID ${message.workerId} handled a total of ${message.requestCount} requests`);
            }
        };
        worker.once("message", finished);
        // worker.once("message", (message) => {
        //   console.log(`Listener removed for worker ${worker.id}`)
        //   worker.removeListener("message", finished)
        // })
        current_working_worker_id =
            (current_working_worker_id + 1) % workerCount.length;
    });
    //* This is similar to cluster.on('message', callback) but is used on individual worker objects.
    // console.log(worker)
    if (server)
        server.listen(port, hostname, () => {
            console.log(`Load balancing started on http://${hostname}:${port}`);
        });
    // ! Shutting down gracefully listens for every worker process
    // setInterval(() => {
    //   console.log(Object.keys(cluster.workers!))
    // }, 1000)
    cluster.on("message", (worker, message) => {
        // console.log(message, "inside master", workerIds)
        // if (message.type === "worker_comm") {
        //   console.log(worker.id, workerIds, "master")
        // }
        if (message.type === "PORT") {
            workerPorts[worker.id] = message.port;
            // console.log(workerPorts)
            // console.log(`Worker ${worker.id} is listening on port ${message.port}`)
        }
    });
    //! creating exit logic on cluster close
    cluster.on("exit", (worker, code, signal) => {
        console.log(`Worker PID ${worker.process.pid} died (code: ${code}, signal: ${signal})`, "in cluster", code);
        delete workerPorts[worker.id];
        // ! i was writing the below logic to create a new worker , but i have the checker (adjustworkerCount) every 10 seconds ,  which should respawn me new workers automatically after 10 second ,
        // ^ i  have removed that condition  and instead used this but i found this is redundant because when close the worker , the worker count will go down and a new worker will be spawned
        // let deletedPort = workerPorts[worker.id]
        // setTimeout(() => {
        //   spawnWorker(cluster, deletedPort)
        // }, 5000)
    });
}
if (cluster.isPrimary) {
    createCluster();
}
else {
    processManager();
}
