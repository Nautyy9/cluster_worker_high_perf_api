import { RateLimiterMemory } from "rate-limiter-flexible";
const rateLimiterWorker = new RateLimiterMemory({
    points: 5,
    duration: 60,
    blockDuration: 30,
});
const rateLimiterMaster = new RateLimiterMemory({
    points: 3,
    duration: 60,
    blockDuration: 30,
});
export { rateLimiterWorker, rateLimiterMaster };
