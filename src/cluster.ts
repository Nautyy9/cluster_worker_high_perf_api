import cluster from "cluster"
import os from "os"
import process from "process"
import { processManager } from "./signalProcess.js"
const numCPUs = os.cpus().length
import { adjustWorkerCount } from "./utils/scale_worker_process.js"
import http, { IncomingMessage, ServerResponse } from "http"
import { rateLimiterMaster } from "./utils/rateLimiter.js"
import { RateLimiterRes } from "rate-limiter-flexible"
const hostname = "localhost"
const port = 8080

const workerPorts: { [key: string]: number } = {}
let currentPort: Array<number> = []

function createCluster() {
  // ! loadavg gives the array of 0's upon which the max laod can fall rn
  console.log(
    `Master process PID: ${process.pid}, CPU cores: ${numCPUs}`,
    os.loadavg()[0]
  )
  // let current_working_worker_id = 0
  // let attempts = 0
  //! creating cluster with fork.
  //^ to see if its working just comment below line , and the 2 worker will be spawned after 2 seconds.
  const workerIds = adjustWorkerCount(cluster, workerPorts)
  // $ worker.on listens for individual wroker process req to master process , while cluster.on -> listens to every
  setInterval(() => adjustWorkerCount(cluster, workerPorts), 10000)
  //$ cluster.workers -> cycles through avail worker processes ,sending each

  const server = http.createServer((req, res) => {
    rateLimiterMaster
      .consume(req.socket.remoteAddress!)
      .then(() => {
        masterProcessServer(req, res, workerIds)
      })
      .catch((err) => {
        if (err instanceof RateLimiterRes) {
          res.writeHead(429, { "Content-Type": "text/plain" })
          return res.end("TO MANY REQUEST TRY AGAIN AFTER 60 SECONDS" + err)
        } else {
          res.writeHead(500, { "Content-Type": "text/plain" })
          res.end("ERROR IN SERVER")
        }
      })
  })

  //* This is similar to cluster.on('message', callback) but is used on individual worker objects.
  // console.log(worker)
  if (server)
    server.listen(port, hostname, () => {
      console.log(`Load balancing started on http://${hostname}:${port}`)
    })
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
      workerPorts[worker.id] = message.port
      // console.log(workerPorts)
      // console.log(`Worker ${worker.id} is listening on port ${message.port}`)
    }
  })

  //! creating exit logic on cluster close
  cluster.on("exit", (worker, code, signal) => {
    console.log(
      `Worker PID ${worker.process.pid} died (code: ${code}, signal: ${signal}) in cluster`
    )
    delete workerPorts[worker.id]
    // ! i was writing the below logic to create a new worker , but i have the checker (adjustworkerCount) every 10 seconds ,  which should respawn me new workers automatically after 10 second ,
    // ^ i  have removed that condition  and instead used this but i found this is redundant because when close the worker , the worker count will go down and a new worker will be spawned
    // let deletedPort = workerPorts[worker.id]
    // setTimeout(() => {
    //   spawnWorker(cluster, deletedPort)
    // }, 5000)
  })
}

if (cluster.isPrimary) {
  createCluster()
} else {
  processManager()
}

async function wait(interval: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, interval))
}

async function masterProcessServer(
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage> & { req: IncomingMessage },
  workerIds: string[]
) {
  const workers = Object.values(cluster.workers!)
  const availableWorkers = workers.filter((worker) => workerPorts[worker!.id])

  if (availableWorkers.length === 0) {
    res.writeHead(500, { "Content-Type": "text/plain" })
    return res.end("No available workers")
  }
  // const workerCount = Object.keys(cluster.workers!)
  // //! the cluster.workers is an object that stores the workers created by cluster.fork()
  //^ Find a valid, non-busy worker
  // if (!worker) {
  //   res.writeHead(500, { "Content-Type": "text/plain" })
  //   return res.end("Server Error")
  // }

  let body = ""
  req.on("data", (chunk) => {
    body += chunk
  })

  // console.log(req.url?.slice(1))

  // console.log(worker.process.pid, worker, worker.process, currentPort)
  req.on("end", () => {
    const workerPromise = availableWorkers.map((worker) => {
      return new Promise((resolve, reject) => {
        if (worker) {
          const timeout = setTimeout(() => {
            reject(new Error(`Worker ${worker!.id} timed out`))
          }, 2000)
          //
          worker?.once("message", (message: { [arg: string]: any }) => {
            clearTimeout(timeout)
            console.log("inside once", message.type)
            if (message.type === "worker_comm") {
              let targetWorkerId = workerIds.filter((val) => {
                if (parseInt(val) !== message.workerId) {
                  return parseInt(val)
                }
              })

              const targetWorker = cluster.workers![targetWorkerId[0]]
              message.targetWorkerPID = targetWorker?.process.pid
              message.workerPID = worker?.process.pid
              message.worker = worker
              message.targetWorker = targetWorker
              wait(100).then(() => {
                if (targetWorker) {
                  resolve(message)
                }
              })
            } else {
              message.workerPID = worker?.process.pid
              message.worker = worker
              resolve(message)
            }
          })
          worker!.send({
            type: req.url?.slice(1),
            method: req.method,
            url: req.url,
            headers: req.headers,
            port: workerPorts[worker!.id],
            workerId: worker!.id,
            body: body,
          })
        } else {
          res.writeHead(500, { "Content-Type": "text/plain" })
          res.end("ERROR IN SERVER")
        }
      })
    })

    Promise.race(workerPromise)
      .then((message: any) => {
        console.log("inside http", message.type)
        if (message.type === "entry" || message.type === "api_1") {
          if (!message || typeof message.statusCode !== "number") {
            res.writeHead(500, { "Content-Type": "text/plain" })
            return res.end("Server Not Responding")
          }
          // console.log(
          //   "inside yet ??????????????????????????",
          //   workerPorts[message.workerId]
          // )
          const data = `The request was successfully handled by worker with id ${
            message.body.pid
          } with message ${message.body.data} listening on http://localhost:${
            workerPorts[message.workerId]
          } . Total request handled by this worker are ${message.requestCount}`
          return res.end(data)
        } else if (message.type === "worker_comm") {
          // console.log("finall", message.body)
          if (message.body.data) {
            let data = `This is worker intercommunication api . Your message: ${
              message.body.data
            } with total number of request handled ${
              message.requestCount
            } by the current worker ${
              message.workerPID
            } which is running on port ${
              workerPorts[message.workerId]
            }. \n Your message has been delivered to worker with id ${
              message.targetWorkerPID
            } port listening on ${
              workerPorts[message.targetWorker.id]
            }.\n Please hit the url http://localhost:${
              workerPorts[message.targetWorker.id]
            }/${message.type}   `
            // console.log(message)
            if (message.targetWorker) {
              // message.targetWorker.send({
              //   type: "insider_worker_comm",
              //   from: message.targetWorker.process.pid,
              //   message: message.body.data,
              //   to: message.workerPID,
              // })
              message.worker!.send({
                type: "insider_worker_comm",
                from: message.worker!.process.pid,
                message: message.body.data,
                to: message.targetWorker.process.pid,
              })
              res.writeHead(200, { "content-type": "text/plain" })
              return res.end(data)
            }
          }
          if (message.body.error) {
            res.writeHead(200, { "content-type": "text/plain" })
            return res.end(message.body.error)
          } else {
            console.log("couldn't send message")
            res.writeHead(200, { "content-type": "text/plain" })
            return res.end("couldn't send message")
          }
        } else if (message.type === "no_of_requests") {
          console.log(
            `Worker PID ${message.workerId} handled a total of ${message.requestCount} requests`
          )
          res.writeHead(200, { "Content-Type": "text/plain" })
          return res.end(
            `Worker PID ${message.workerId} handled a total of ${message.requestCount} requests`
          )
        } else if (message.type === "shutdown") {
          console.log(
            `Server with id ${message.body.pid} is shutting down gracefully`
          )
          // res.writeHead(200, message.headers)
          res.writeHead(200, { "Content-Type": "text/plain" })
          message.worker.process.kill("SIGTERM")
          return res.end(
            "Server is shutting down and will respawn automatically in 10sec"
          )
        } else {
          // console.log("inside the else")
          res.writeHead(404, { "Content-Type": "text/plain" })
          return res.end(message.body.data)
        }
      })
      .catch((err) => {
        if (!res.writableEnded) {
          res.writeHead(500, { "Content-Type": "text/plain" })
          return res.end(`Error: ${err.message}`)
        }
      })
      .finally(() => {
        availableWorkers.forEach((worker) => {
          worker?.removeAllListeners("message")
        })
      })
  })

  const requestTimeout = setTimeout(() => {
    res.writeHead(500, { "Content-Type": "text/plain" })
    return res.end("Worker timed out")
  }, 8000)
  res.on("finish", () => {
    clearTimeout(requestTimeout)
  })
  // worker.on("message", (message) => {
  //   clearTimeout(requestTimeout)
  //   console.log("inside the onn ", message)

  //   // if (message.type === "worker_comm" && worker) {
  //   //   console.log("got in target  ", message)

  //   //   let targetWorkerId = workerIds.filter((val) => {
  //   //     if (parseInt(val) !== worker!.id) {
  //   //       return parseInt(val)
  //   //     }
  //   //   })

  //   //   const targetWorker = cluster.workers![targetWorkerId[0]]
  //   //   message.targetWorkerId = targetWorker!.process.pid
  //   //   message.workerId = worker.process.pid

  //   //   worker.emit(`to_once_${id}`)
  //   // }
  //   // if (message.type === "http_request") {
  //   //   worker.emit(`to_once_${id}`, message)
  //   // }
  // })
  // current_working_worker_id =
  // (current_working_worker_id + 1) % workerCount.length
}
