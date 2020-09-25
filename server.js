const express = require('express');
const tmi = require('tmi.js');
const config = require('./config');
const http = require('http');
const WebSocket = require('ws');


const app = express();
const path = require('path');

app.use(express.static('public'))

// viewed at http://localhost:8080
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.listen(8080);

console.log("HTML hosted at http://localhost:8080");

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    //connection is up, let's add a simple simple event
    ws.on('message', (message) => {
        //log the received message and send it back to the client
        console.log('received: %s', message);
        ws.send(`Hello, you sent -> ${message}`);
    });
    //send immediatly a feedback to the incoming connection    
    ws.send('Hi there, I am a WebSocket server');
});
//start our server
server.listen(process.env.PORT || 8999, () => {
    console.log(`Websocket server started on port ${server.address().port}`);
});

const password = config.O_AUTH;
const channels = config.channels;

// Define configuration options
const opts = {
    identity: {
        username: "Snowbottos",
        password: password
    },
    channels: channels
};

// Create a client with Twitch options
const client = new tmi.client(opts);

// Register Twitch event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

// Called every time a message comes in
function onMessageHandler(target, context, msg, self) {
    // Ignore messages from the bot
    if (self) {
        return;
    }

    // Remove whitespace from chat message
    const message = msg.trim();
    const cleanTarget = target.slice(1)
    const userName = context.username
    const chatInfo = {
        chatname: cleanTarget,
        username: userName,
        message: message
    }

    // How tf do I get this to DOM?
    console.log(chatInfo)


}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
    console.log(`* Bot connected to ${addr}:${port}`);
}




