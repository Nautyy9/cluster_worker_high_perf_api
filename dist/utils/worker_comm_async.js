"use strict";
// import { EventEmitter } from "events"
// import { Response } from "express"
// import process from "process"
// import { customEmitter } from "../signalProcess.js"
// //! since process .on is an asynchronous function hence we need to wrap it in a callback so that when the data is available we can send the response
// const worker_comm_event = new EventEmitter()
// function getRandomId() {
//   return Math.random().toString(36).substring(2, 9)
// }
// export async function withEventEmitter(res: Response, data: string) {
//   try {
//     const requestId = getRandomId()
//     if (process.send) {
//       process.send({
//         type: "worker_comm",
//         data,
//         // requestId,
//       })
//     }
//     worker_comm_event.once(requestId, (msg: any) => {
//       // ! handle error if worker didn't respond
//       if (msg === "error") {
//         console.log("faileddddddddddd.", msg)
//         return res.status(500).send("error occurred")
//       } else {
//         const sendedBy = msg.from
//         const sendedTo = msg.to
//         const data = msg.message
//         // console.log("succedddddddddddd", msg)
//         return res
//           .status(200)
//           .send(
//             `Recieved by ${sendedBy}, Sended to ${sendedTo} with message: ${data}`
//           )
//       }
//     })
//     process.on("message", (msg: any) => {
//       console.log("yoo", msg)
//       if (msg.type === "insider_worker_comm") {
//         if (msg && msg.from && msg.to) worker_comm_event.emit(requestId, msg)
//       }
//     })
//     setTimeout(() => worker_comm_event.emit(requestId, "error"), 2000)
//   } catch (err) {
//     console.log(err + "error")
//   }
// }
// function cb_helper(cb: (msg: any) => void): void {
//   process.on("message", (msg) => {
//     console.log("inside cb_helper ")
//     cb(msg)
//   })
// }
// export function with_callback(res: Response) {
//   cb_helper((msg: any) => {
//     const sendedBy = msg.from
//     const sendedTo = msg.to
//     const data = msg.data
//     return res
//       .status(200)
//       .send(
//         `Recieved by ${sendedBy}, Sended to ${sendedTo} with message: ${data}`
//       )
//   })
// }
