//$ process is the basic unit of execution in nodejs . Each instance of Nodejs runtime is process
//$ worker process send messages to the master process with process.send()
//$ and recieve messages form the master process with process.on()
//$ master process send messages to worker process with worker.send()
//$ master process receive messages from worker process with cluster.on()
import { app } from "./index.js";
import { router as api_1 } from "./router/first_api.js";
import process from "process";
// import EventEmitter from "events"
import { createHttpRequest } from "./utils/request.js";
// import { IncomingMessage, Server, ServerResponse } from "http"
// export const customEmitter = new EventEmitter()
export function processManager() {
    let requestCount = 0;
    process.on("message", (msg) => {
        if (msg.type === "spawn_worker") {
            const { port } = msg;
            const server = app.listen(port, () => {
                const address = server.address();
                if (typeof address === "string") {
                    console.log(`Worker PID ${process.pid} started on port http://localhost:${port} where typeof is string`);
                }
                else if (address && address.port) {
                    console.log(`Worker PID ${process.pid} started on port http://localhost:${port} where typeof is object`);
                    if (process.send) {
                        process.send({ type: "PORT", port });
                    }
                }
            });
            process.on("SIGTERM", (msg) => {
                console.log(`worker with PID ${process.pid} is shutting down gracefully`);
                server.close(() => {
                    console.log(`worker with PID ${process.pid} has shut down`);
                    process.exit(port);
                });
            });
            process.on("SIGUSR1", () => {
                console.log(`Worker ${process.pid} received SIGUSR1`);
                server.close(() => {
                    console.log(`worker with PID ${process.pid} has shut down`);
                });
            });
        }
        else {
            if (msg.type !== "insider_worker_comm")
                setTimeout(() => {
                    createHttpRequest(msg, requestCount);
                }, 200);
        }
    });
    app.use("/", api_1);
    app.use((req, res, next) => {
        requestCount++;
        if (process.send)
            process.send({ type: "no_of_requests", requestCount });
        next();
    });
    // const server = app.listen(port, () => {
    //   console.log(
    //     `Worker PID ${process.pid} listening on http://localhost:${port}`
    //   )
    // })
    // process.on("message", (message: any) => {
    //   if (message.type === "shutdown") {
    //     console.log(`Worker PID ${process.pid} is shutting down gracefully`)
    //     server.close(() => {
    //       console.log(`worker with PID ${process.pid} has shut down`)
    //       process.exit(0)
    //     })
    //   } else {
    //     console.log(
    //       "not shut down listening inside signalProcess.ts , inside process.on which is checking for type == shutdown"
    //     )
    //   }
    // })
    //$ go to taskManager enter the worker id and end the task to see this run
}
