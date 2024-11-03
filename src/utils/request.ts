import http from "http"
import { httpRequestType } from "../../type.js"
type hellowRequestType = {
  options: {
    method: string | undefined
    headers: http.IncomingHttpHeaders
  }
  headers: http.IncomingHttpHeaders
  hostname: string
  requestCount: number
  workerId: number
  method: string | undefined
  type: string
  body: string
}

export function createHttpRequest(msg: httpRequestType, requestCount: number) {
  const { method, url, headers, body, type, key, port, workerId } = msg
  const options = { method, headers }

  requestCount++

  const hostname = `http://localhost:${port}${url}`
  // console.log(msg.type, "inside request")
  http_request({
    options,
    headers,
    hostname,
    requestCount,
    workerId,
    method,
    type,
    body,
  })
}

function http_request(content: hellowRequestType) {
  const {
    body,
    headers,
    hostname,
    method,
    options,
    type,
    requestCount,
    workerId,
  } = content
  // console.log(content)
  const req = http.request(hostname, options, (res) => {
    // res.pipe
    // console.log(res)
    let body: { data: string; pid: number }
    res.on("data", (chunk) => {
      // if (type === "shutdown") {
      //   body = JSON.parse(chunk.toString().slice(6))
      // } else {
      body = JSON.parse(chunk.toString())
      // }
      // console.log(chunk)
    })
    res.on("end", (yo: any) => {
      // console.log("inside res", body)
      // console.log(res.headers)
      if (process.send) {
        process.send({
          requestCount,
          type,
          statusCode: res.statusCode || 500,
          headers: res.headers || {},
          body: body || "",
          workerId,
        })
      } else {
        console.log("process.send not available")
      }
    })
  })
  req.on("error", (err) => {
    console.error("Request error:", err.message)
    if (process.send) {
      //^ return a boolean which can be used to check if the process is send to the master process
      process.send({
        requestCount,
        type: type,
        statusCode: 500,
        headers: { "Content-Type": "text/plain" },
        body: `Request failed: ${err.message}`,
        workerId,
      })
    }
  })
  if (body) {
    req.write(body)
  }

  req.end()
}
