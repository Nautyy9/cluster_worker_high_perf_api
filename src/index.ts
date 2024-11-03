import express from "express"
import cors from "cors"
const app = express()
import helmet from "helmet"
import morgan from "morgan"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use(helmet())
app.use(
  cors({
    origin: "*",
  })
)

morgan.token("host", (req, res) => {
  return req.headers.host
})
//! only logs error with host  name added as custom value with morgan.token()
app.use(
  morgan(
    ":remote-addr - :remote-user [:date[clf]] ':method :host :url HTTP/:http-version' :status :res[content-length] ':referrer' ':user-agent'",
    {
      stream: fs.createWriteStream(path.join(__dirname, "access.log"), {
        flags: "a",
      }),
      skip: function (req, res) {
        return res.statusCode < 400
      },
    }
  )
)
app.use(
  morgan(":method :host: url :status :res[content-length] - :response-time ms")
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// console.log(__dirname, __filename)

// Initialize an empty set or load data from file

// Load data from file

// Save data to file

export { app }
