const express = require('express');
const tmi = require('tmi.js');
const config = require('./config');
const app = express();
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const server = http.createServer(app);

app.use(express.static('public'))

// viewed at http://localhost:8080
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

server.listen(8080, () => console.log('Listening on port: 8080'));
// console.log("HTML hosted at http://localhost:8080");

const wss = new WebSocket.Server({ server: server });

wss.on('connection', (ws) => {
    //connection is up, let's add a simple simple event
    const channels = [];

    // Define configuration options
    const opts = {
        connection: {
            secure: true,
            reconnect: true
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

    client.on('message', (target, context, msg, self) => {
        const message = msg.trim();
        const channel = target.slice(1)
        const username = context['display-name']

        const chatInfo = {
            channel: channel,
            username: username,
            message: [],
            color: context.color,
            id: context['user-id'],
            emotes: []
        }

        let emotes, id;

        emotes = context.emotes
        for (id in emotes) {
            console.log("emote id: " + id)
            console.log("emote location: " + emotes[id])
            const emoteLocation = emotes[id].toString();
            const splitEmoteLocation = emoteLocation.split("-")
            console.log(splitEmoteLocation)
            chatInfo.emotes.push({
                "emoteId": id,
                "starIndex": parseInt(splitEmoteLocation[0]),
                "endIndex": parseInt(splitEmoteLocation[1])
            })
            console.log(JSON.stringify(chatInfo.emotes))
        }

        chatInfo.message.push({
            "type": "text",
            "text": message
        })

        console.log("message token: " + JSON.stringify(chatInfo.message))

        if (chatInfo.emotes === null) {
            console.log("no emotes")
            console.log("Passing to client: " + JSON.stringify(chatInfo))
            ws.send(JSON.stringify(chatInfo))
        }

        if (chatInfo.emotes !== null) {
            console.log("message has emotes")
            let textArray;
            let text, x;
            text = chatInfo.message
            for (x in text) {
                console.log(text[x].text)
                textArray = Array.from(text[x].text)
            }
            console.log(textArray)
        }


    })
    ws.on('message', (message) => {
        //log the received message and send it back to the client
        console.log('received: %s', message);
        opts.channels.push(message)
        console.log(opts.channels)
        ws.send(`Hello, you sent -> ${message}`);
    });
    //send immediatly a feedback to the incoming connection    
    ws.send('Hi there, I am a WebSocket server');
});



// Called every time a message comes in
function onMessageHandler(target, context, msg, self) {
    // Ignore messages from the bot
    if (self) {
        return;
    }

    // Remove whitespace from chat message
    const message = msg.trim();
    const cleanTarget = target.slice(1)
    const userName = context['display-name']
    const chatInfo = {
        channel: cleanTarget,
        username: userName,
        message: message
    }

    console.log(context)
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
    console.log(`* Bot connected to ${addr}:${port}`);
}




