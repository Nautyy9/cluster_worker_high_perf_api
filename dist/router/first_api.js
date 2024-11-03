import express from "express";
const router = express.Router();
import process from "process";
import { loadData, saveData } from "../thread/threadMain.js";
import { rateLimiterWorker } from "../utils/rateLimiter.js";
import { RateLimiterRes } from "rate-limiter-flexible";
router.get("/entry", (req, res) => {
    return res.status(200).json({ data: `Hellow there!`, pid: process.pid });
});
router.get("/api_1", (req, res) => {
    return res.status(200).json({ data: `Hellow from api_1!`, pid: process.pid });
});
router.get("/shutdown", (req, res) => {
    try {
        const host = req.headers.host?.slice(-4);
        // res.setHeader("Content-Type", "text/event-stream")
        // res.setHeader("Cache-Control", "no-cache")
        // res.setHeader("Connection", "keep-alive")
        // res.status(200)
        const data = {
            data: `Shutting down! worker with id ${process.pid} creating a new worker....`,
            pid: process.pid,
        };
        res.status(200).json(data);
        // res.write(`data: ${JSON.stringify(data)}\n\n`)
        // process.on("message", (msg: any) => {
        //   if (msg.type === "spawn_worker") {
        //     console.log("inside api , ", msg)
        //     res.end({
        //       data: `Worker restarted successfully`,
        //       pid: process.pid,
        //     })
        //   }
        // })
        if (host !== "8080") {
            process.emit("SIGTERM");
        }
    }
    catch (e) {
        res.status(500).json({ data: "ERROR IN SERVER", pid: process.pid });
    }
    // if (process.send) process.send({ type: "shutdown" })
});
router.post("/worker_comm", async (req, res) => {
    try {
        // console.log(req.body)
        const host = req.headers.host?.slice(-4);
        await rateLimiterWorker.consume(req.ip);
        // console.log(host)
        if (host === "8080") {
            if (!req.body.data) {
                res
                    .status(404)
                    .json({ host: 8080, error: "Please send data", pid: process.pid });
            }
            else {
                res
                    .status(200)
                    .json({ host: 8080, data: req.body.data, pid: process.pid });
                process.on("message", async (msg) => {
                    // Adjust this based on the actual structure of msg
                    if (msg.type === "insider_worker_comm") {
                        console.log(msg, "inside the proces");
                        const data = await loadData();
                        // console.log(data, "datataaaaaaaaaaaa")
                        if (data) {
                            if (data.success) {
                                data.data.push({
                                    from: msg.from,
                                    to: msg.to,
                                    message: msg.message,
                                });
                                saveData(data.data);
                            }
                            else {
                                throw new Error("Failed to save data to file");
                            }
                        }
                        else {
                            // console.log("inside the else case")
                            saveData(new Set([{ from: msg.from, to: msg.to, message: msg.message }]));
                        }
                    }
                });
                // process.nextTick(() => {
                //   data_of_post.forEach((val) => {
                //   })
                // })
            }
        }
        else {
            const data = await loadData();
            const arr = [...data.data.values()];
            // console.log(arr[arr.length - 1])
            res.status(200).json({
                data: { currentWorkerID: process.pid, data: arr[arr.length - 1] },
            });
        }
        // ! to get data from  the process.on and send to the client we need to make this a callback or Promise or use EventEmitter
        // # is at different file
    }
    catch (error) {
        if (error instanceof RateLimiterRes) {
            return res
                .status(429)
                .json({ error: "TO MANY REQUEST TRY AGAIN AFTER 60 SECONDS" + error });
        }
        else {
            res.status(500).json({ data: "ERROR IN SERVER", pid: process.pid });
        }
    }
});
router.use((req, res) => {
    res.status(404).json({
        data: "Sorry, the page you are looking for does not exist.",
        pid: process.pid,
    });
});
export { router };
