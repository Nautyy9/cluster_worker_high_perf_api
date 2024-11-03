"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
var express_1 = require("express");
var router = express_1.default.Router();
exports.router = router;
var process_1 = require("process");
var worker_comm_async_js_1 = require("../utils/worker_comm_async.js");
router.get("/", function (req, res) {
    console.log("yo im in here");
    return res.status(200).send("Hellow there!");
});
router.get("/api_1", function (req, res) {
    console.log("inside the router 1");
    return res.status(200).send("YO");
});
router.get("/shutdown", function (req, res) {
    res.send("Shutting down!");
    if (process_1.default.send)
        process_1.default.send({ type: "shutdown" });
});
router.post("/worker_comm", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var data, targetWorkerId;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("yes in here");
                data = req.body.data;
                targetWorkerId = 1;
                data = data + " Send by " + process_1.default.pid;
                // console.log(process.pid)
                // ! to get data from  the process.on and send to the client we need to make this a callback or Promise or use EventEmitter
                // # is at different file
                return [4 /*yield*/, (0, worker_comm_async_js_1.withEventEmitter)(res, data, targetWorkerId)
                    // with_callback(res)
                ];
            case 1:
                // console.log(process.pid)
                // ! to get data from  the process.on and send to the client we need to make this a callback or Promise or use EventEmitter
                // # is at different file
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
