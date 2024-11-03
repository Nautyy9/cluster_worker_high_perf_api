import { parentPort } from "worker_threads";
import path from "path";
// import { promisify } from "util"
import fs from "fs";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFilePath = path.join(__dirname, "data.json");
console.log(dataFilePath, "dfp");
parentPort?.on("message", (msg) => {
    if (msg.type === "write") {
        const dataArray = msg.data;
        // console.log("data to write", dataArray)
        try {
            fs.writeFile(dataFilePath, JSON.stringify(dataArray), "utf-8", (err) => {
                if (err) {
                    console.log(err, "errorrrrrrrrrrrrrrrrrrrrrrr");
                }
                else {
                    console.log("Data successfully written to file");
                }
            });
        }
        catch (err) {
            console.log(err, "write errorrrrrrrrrrrrrrrrrrrrrrr");
        }
    }
    else if (msg.type === "read") {
        fs.readFile(dataFilePath, "utf-8", (err, fileData) => {
            if (err) {
                console.log("error in read", err);
                parentPort?.postMessage({ success: false, error: err.message });
            }
            else {
                try {
                    const parsedData = JSON.parse(fileData);
                    console.log("parsedData, inside read", parsedData);
                    parentPort?.postMessage({ success: true, data: parsedData });
                }
                catch (parseError) {
                    console.log("parseError", parseError);
                    parentPort?.postMessage({ success: false, error: parseError });
                }
            }
        });
    }
});
