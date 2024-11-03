"use strict";
//$ process is the basic unit of execution in nodejs . Each instance of Nodejs runtime is process
//$ worker process send messages to the master process with process.send()
//$ and recieve messages form the master process with process.on()
Object.defineProperty(exports, "__esModule", { value: true });
exports.processManager = processManager;
//$ master process send messages to worker process with worker.send()
//$ master process receive messages from worker process with cluster.on()
var index_1 = require("./index");
var first_api_1 = require("./router/first_api");
var http_1 = require("http");
var process_1 = require("process");
// import EventEmitter from "events"
// const resEmitter = new EventEmitter()
function processManager() {
    var requestCount = 0;
    // let isSended
    index_1.app.use("/", first_api_1.router);
    process_1.default.on("message", function (msg) {
        var method = msg.method, url = msg.url, headers = msg.headers, body = msg.body;
        var options = { method: method, headers: headers };
        requestCount++;
        var req = http_1.default.request("http://localhost:".concat(process_1.default.env.PORT).concat(url), options, function (res) {
            var body = "";
            res.on("data", function (chunk) {
                body += chunk;
            });
            res.on("end", function () {
                if (process_1.default.send)
                    // isSended =
                    process_1.default.send({
                        requestCount: requestCount,
                        type: "http_response",
                        statusCode: res.statusCode || 500,
                        headers: res.headers || {},
                        body: body || "",
                    });
            });
        });
        req.on("error", function (err) {
            console.error("Request error:", err.message);
            if (process_1.default.send) {
                // isSended =
                process_1.default.send({
                    requestCount: requestCount,
                    type: "http_response",
                    statusCode: 500,
                    headers: { "Content-Type": "text/plain" },
                    body: "Request failed: ".concat(err.message),
                });
            }
        });
        // console.log(isSended)
        // if (isSended) {
        //   resEmitter.emit("http_responded")
        // }
        if (body) {
            req.write(body);
        }
        req.end();
    });
    // Middleware to count requests
    index_1.app.use(function (req, res, next) {
        requestCount++;
        if (process_1.default.send)
            process_1.default.send({ type: "no_of_requests", requestCount: requestCount });
        next();
    });
    // const server = app.listen(port, () => {
    //   console.log(
    //     `Worker PID ${process.pid} listening on http://localhost:${port}`
    //   )
    // })
    var server = index_1.app.listen(0, function () {
        var address = server.address();
        if (typeof address === "string") {
            console.log("Worker PID ".concat(process_1.default.pid, " started on port http://localhost:").concat(address, " where typeof is string"));
        }
        else if (address && address.port) {
            process_1.default.env.PORT = address.port.toString();
            console.log("Worker PID ".concat(process_1.default.pid, " started on port http://localhost:").concat(address.port, " where typeof is object"));
        }
    });
    process_1.default.on("message", function (message) {
        if (message.type === "shutdown") {
            console.log("Worker PID ".concat(process_1.default.pid, " is shutting down gracefully"));
            server.close(function () {
                console.log("worker with PID ".concat(process_1.default.pid, " has shut down"));
                process_1.default.exit(0);
            });
        }
    });
    //$ go to taskManager enter the worker id and end the task to see this run
    process_1.default.on("SIGTERM", function () {
        console.log("worker with PID ".concat(process_1.default.pid, " is shutting down gracefully"));
        server.close(function () {
            console.log("worker with PID ".concat(process_1.default.pid, " has shut down"));
            process_1.default.exit(0);
        });
    });
    process_1.default.on("SIGUSR1", function () {
        console.log("Worker ".concat(process_1.default.pid, " received SIGUSR1"));
        server.close(function () {
            console.log("worker with PID ".concat(process_1.default.pid, " has shut down"));
        });
    });
}
