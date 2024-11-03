import http from "http"
export type httpRequestType = {
  headers: http.IncomingHttpHeaders
  body: string
  type: string
  key: number
  url: string | undefined
  method: string | undefined
  port: number
  currentPort: Array<number>
  workerId: number
}

export type postRequestType = {
  type: string
  from: string | undefined
  to: string | undefined
  message: string | undefined
}
export type threadRecieverType = Omit<postRequestType, "type">

type awaitedType = { success: boolean; data: Array<threadRecieverType> }
export type dataFromFileType = Awaited<Promise<awaitedType>>
