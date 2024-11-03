import { Cluster } from "cluster"

// export function create_worker(cluster: Cluster, workerIds: Array<string>) {
//   for (let i = 0; i < workerIds.length; i++) {
//     spawnWorker(cluster, i)
//   }
// }
export function spawnWorker(cluster: Cluster, port: number) {
  // const workerCount = Object.keys(cluster.workers!)[i]
  // const currentWorker = cluster.workers![workerCount]

  const worker = cluster
    .fork()
    .on("listening", (msg) => console.log("dssdfasdfasdf", msg))
  // console.log("here ??", port)
  if (worker.send)
    setTimeout(() => {
      worker.send({
        type: "spawn_worker",
        port: 8081 + port,
      })
    }, 200)

  // if (port) {
  //   currentWorker?.send({
  //     type: "spawn_worker",
  //     port,
  //     // workerCount,
  //   })
  // } else {
  //   currentWorker?.send({
  //     type: "spawn_worker",
  //     port: 8081 + i,
  //     // workerCount,
  //   })
  // }
}
