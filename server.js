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
        let lastEnd;

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
            console.log("emote?: " + emoteLocation)
            const splitEmoteLocation = emoteLocation.split(",")
            splitEmoteLocation.forEach(function (e) {
                console.log(e)
                const startandEnd = e.split("-")
                chatInfo.emotes.push({
                    "emoteId": id,
                    "startIndex": parseInt(startandEnd[0]),
                    "endIndex": parseInt(startandEnd[1])
                })
            })

            console.log(JSON.stringify(chatInfo.emotes))
        }

        // Thank you, Ege Özcan: https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
        function dynamicSort(property) {
            var sortOrder = 1;
            if (property[0] === "-") {
                sortOrder = -1;
                property = property.substr(1);
            }
            return function (a, b) {
                var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
                return result * sortOrder;
            }
        }

        const sortedByIndex = chatInfo.emotes.sort(dynamicSort("startIndex"))

        console.log("message token: " + JSON.stringify(chatInfo.message))

        if (context.emotes === null) {
            console.log("no emotes")
            chatInfo.message.push({
                "type": "text",
                "text": message
            })
            console.log("Passing to client: " + JSON.stringify(chatInfo))
            ws.send(JSON.stringify(chatInfo))
        }

        if (context.emotes !== null) {
            console.log("message has emotes")

            let textArray = [];
            for (let i = 0; i < message.length; i++) {
                textArray.push(message[i])
            }

            console.log(textArray)
            console.log(JSON.stringify(chatInfo.emotes))

            const emoteInfo = sortedByIndex
            console.log("emote info: " + emoteInfo)

            for (const i in emoteInfo) {
                console.log("last end " + lastEnd)
                let start = emoteInfo[i].startIndex
                let end = emoteInfo[i].endIndex

                if (i == 0) {
                    let tempTextArray = [];
                    for (j = 0; j < start; j++) {
                        tempTextArray.push(textArray[j])
                    }
                    chatInfo.message.push({
                        "type": "text",
                        "text": tempTextArray.join('')
                    })
                }

                if (i > 0) {
                    let tempTextArray = [];
                    for (j = lastEnd; j < start; j++) {
                        tempTextArray.push(textArray[j])
                    }
                    console.log("temp arrary: " + tempTextArray.join(''))
                    chatInfo.message.push({
                        "type": "text",
                        "text": tempTextArray.join('')
                    })
                }

                let emoteArray = [];
                console.log(emoteInfo[i])
                for (j = start; j <= end; j++) {
                    emoteArray.push(textArray[j])
                }
                console.log("emote array: " + emoteArray.join(''))
                chatInfo.message.push({
                    "type": "emote",
                    "id": emoteInfo[i].emoteId,
                    "text": emoteArray.join('')
                })
                lastEnd = (end + 1)

            }

            console.log("emotes work? " + JSON.stringify(chatInfo.message))
            ws.send(JSON.stringify(chatInfo))

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




