import { Cluster } from "cluster"
import os from "os"
import { spawnWorker } from "./respawnWorker.js"
const availCpus = os.cpus().length

export function adjustWorkerCount(
  cluster: Cluster,
  workerPorts?: { [key: string]: number },
  increaseCount?: number
) {
  // console.log(workerPorts)
  const workerCount = Object.keys(cluster.workers!).length
  let requestCount = cpu_required()

  // console.log(requestCount, workerCount)
  // fetchDataWithInterval(worker, async_cpu_required, 30000, stopSpawingWorker).then(
  //   (msg) => (requestCount = msg)
  // )
  // console.log(workerCount, workerPorts)
  if (workerPorts && Object.keys(workerPorts).length === 1) {
    Object.values(workerPorts).forEach((port) => {
      // console.log(port)
      if (port === 8081) {
        spawnWorker(cluster, 1)
      } else if (port === 8082) {
        spawnWorker(cluster, 0)
      }
    })
  } else {
    if (requestCount > workerCount) {
      for (let i = 0; i < requestCount - workerCount; i++) {
        76555
        spawnWorker(cluster, workerCount + i)
      }
    } else if (workerCount > requestCount) {
      // for (let i = 0; i < workerCount - requestCount; i++) {
      //   const worker =
      //     cluster.workers![Object.keys(cluster.workers!)[i]]
      //   worker?.kill()
      // }
      const worker_to_remove = Object.values(cluster.workers!).slice(
        requestCount
      )
      worker_to_remove.forEach((worker) => worker?.kill())
    }
  }
  if (increaseCount) {
    for (let i = 0; i < increaseCount; i++) {
      spawnWorker(cluster, workerCount + i)
    }
  }
  return Object.keys(cluster.workers!)
}

function cpu_required() {
  //! load cannot be greater than the number of CPU CORES , if it is greater that means the system is bust
  //* loadavg return array of 3 because it perform analytics on the 3 time interval [1min , 5min, 15min]
  //* we are checking every 1minute to scale up or scale down the number of CPU CORES using

  const load = os.loadavg()[0]

  // ^ creating min of 2 workers, this logic is for spawing the maximum of 8 wokers(since no of CPU's are 8) more than 8 are genereally not recommended and not required in most cases
  return Math.max(2, Math.min(availCpus, Math.ceil(load)))
}

// async function fetchDataWithInterval(
//   worker: any,
//   task: () => Promise<number>,
//   interval: number,
//   stopCondition: (arg: number) => boolean
// ) {
//   while (true) {
//     const requestCount = await task()

//     if (stopCondition(requestCount)) {
//       console.log("request count exceeded cpu available worker limit")
//       worker?.kill()
//     }
//     const resolved = await new Promise((resolve) =>
//       setTimeout(resolve, interval)
//     )
//     if (resolved) {
//       return requestCount
//     }
//   }
// }
// const stopSpawingWorker = (count: number) => count > availCpus
// async function async_cpu_required() :Promise<number> {
//     return new Promise((resolve) => {

//     const load = os.loadavg()[0]
//     resolve(Math.max(2, Math.min(availCpus, Math.ceil(load))))
//     })
// }

// ^ observations
// As written, the maximum number of worker processes will be capped at numCPUs. This is a typical approach because:

//CPU-bound tasks: If your tasks are CPU-bound (i.e., they heavily utilize the CPU), having more worker
//processes than CPU cores can lead to inefficient context switching, which might degrade performance.as more workers
//would just compete for CPU time and could reduce overall performance due to increased context switching.

// I/O-bound tasks: If your tasks are I/O-bound ((meaning it spends a lot of time waiting on things like database queries,
// file I/O, or network requests), you might consider allowing more workers than CPU cores.
