🟩 res.send inside the api routes of the express won't send the response to the client directly , it instead send that .send("msg") {msg} as body to the http.request which sends to the master process which in turn sends it to the worker process port to handle the request which then sends to the client with req.end(msg.body) {or custom body}
🟩 process.emit() unlike other emits(worker.emit(), eventEmitter.emit()) which  emits to all other listeners with .on() it instead emit message like SIGTERM and SIGUSR1 to communicate with only the build in process(made by os) 

📓 i am receiving the PORT type inside the cluster.on() because while master process do communicate with worker process , but it doesn't create it's server therefore the message send by proces.send inside app.listen() for individual worker process can't be listened inside the master process server . reson give below  
  ⏩ each individual server will send the message to the cluster not to each other , like within app.listen for individual worker i was sending a message with process.send() and want to recieve it inside the http.create server which create master process server with worker.on()
  ⏩ but i forgot that every worker sends message to the master process , but not to its server , so even if i had written the worker.on() outside the create.server it would have been recieved by this PORT message which is also the reason we are creating the worker process outside it with adjustWorkerCount(cluster)

📓 nodemon always look for changes , hence on every post request the data.json changes which restart the server , hence in package.json i --ignored the file data.json 
  🟥 i was running node --watch , which is causing my post request to return error  in worker.once --> 🔴[watch:require]  --> therefore i  💚[removed --watch and added nodemon] which is usefull for production level like app 🟤[alternative --> node-dev --checkout this library] 

📓 process.exit() || process.kill() || worker.process.kill()
  ➡️ process.exit() takes a code which is 0(🟢safely exit), 1(🟡exit with warnings) and 2(🔴exit with errors)
  ➡️ process.kill(process.pid, "SIGTERM") like exit but kill the one with the process.pid i.e, we can send any process.pid to kill while exit() just kill the current one
  ➡️ worker.process.exit() is not available through worker
  ➡️ worker.process.kill() takes 1 arguement just like process.emit() which is SIGTERM | SIGUSR1 etc..

❤️‍🔥In Node.js clustering, it is indeed the worker processes, not the master process, that handle the incoming requests. The master process acts as a coordinator to distribute the incoming requests to the worker processes, but it doesn't directly handle the requests itself.
  ⏬Master Process Role 👇
    ➡️The master process listens on the specified port (e.g., 8080) but doesn't handle any requests itself.
    ➡️Its main job is to create worker processes and manage them (e.g., spawning, monitoring, or restarting workers if they crash).
    ➡️When an incoming connection is made on port 8080, the master process distributes it to one of the worker processes.
  ⏬Worker Process Role 👇
    ➡️The worker processes are the ones that handle the actual requests.
    ➡️They receive the connection from the master process, process the request, and send back the response.
    ➡️Each worker process runs its own instance of the server, and they can be listening on the same port or different ports, depending on your configuration.
  ⏬Request Distribution (Round Robin):👇
    ➡️In the default Node.js clustering setup, the master process uses a round-robin algorithm to distribute incoming requests to worker processes.
    ➡️The master process shares the server port (e.g., 8080) between the workers, and when a request comes in, it delegates the request to a worker.
    ➡️The master ensures that requests are distributed evenly (or as evenly as possible) across all available workers.
  ⏬How Requests Flow:👇
    ➡️When you hit port 8080, the master process receives the request.
    ➡️The master process then passes the request to one of the worker processes using the round-robin distribution method (or another method depending on the OS, e.g., some Linux distributions use a different mechanism to distribute connections).
    ➡️The worker process (on ports 8081, 8082, etc., depending on your setup) processes the request and sends the response back to the client.

📓 im working with 2 worker right now so im sending message from the targetWorker to the current worker , by mention the current worker port in the message
  ➡️ but in case of multiple workers what i should do is not to send the {to} parameter because all i need is that which worker send the current message while all the recieving server should say that i got this message from the mentioned worker and the message should be sent by current worker.
  ➡️ but the problem is that this message sending from worker.send() is inside the worker.once which may send the message for individual worker by is recieved a single message on process.on() insid the post api route .
  ➡️ and solution is nothing. because all the worker will read the same file data.json and its one message which is , that this message is send by the metioned worker . that's it

🎆 The worker shutdown logic is kinda a crampy because , what i was originally trying to do is to shutdown the the current active worker whose id get's in shutdown route 
  ➡️but i haven't made a shutdown logic but the shutdown was working fine because inside the api route of shutdown i was calling the SIGTERM for every port(8080, 8081, 8082) which is killing all the individual worker since the active port is 8080 which is running both of them hence  both got shutdown at same time with server.close inside signal.close()
  ➡️then i noticed that sometimes the the worker aren't recreated and then i noticed i didn't implemented the logic to handle the /shutdown route ,now i did where i am just closing the 1 worker and respawning it in 10se