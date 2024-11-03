import path from "path"
import { Worker } from "worker_threads"
import { fileURLToPath } from "url"
import { postRequestType, threadRecieverType } from "../../type.js"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const workerFile = path.join(__dirname, "./fileWorker.js")

function runWorkerTask(task: { type: string; data?: any }) {
  return new Promise<any>((resolve, reject) => {
    const worker = new Worker(workerFile)
    worker.postMessage(task)
    worker.on("message", (result) => {
      if (result.success) {
        resolve(result)
      } else {
        reject(result.error)
      }
    })
    worker.on("error", (error) => {
      reject(error.message)
    })
  })
}

export async function saveData(
  data_of_post: Array<threadRecieverType> | Set<threadRecieverType>
) {
  try {
    const dataArray = Array.from(data_of_post)
    await runWorkerTask({ type: "write", data: dataArray })
    console.log("Data successfully written to file: " + dataArray)
  } catch (error) {
    console.log("error while saving data ---saveData", error)
  }
}

export async function loadData() {
  try {
    const data = await runWorkerTask({ type: "read" })
    console.log("read data successfully", data)
    return data
  } catch (error) {
    console.log("error while loading data ---loadData", error)
    return false
  }
}
