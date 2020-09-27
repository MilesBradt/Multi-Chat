const express = require('express');
const tmi = require('tmi.js');
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
console.log("HTML hosted at http://localhost:8080");

const wss = new WebSocket.Server({ server: server });

wss.on('connection', (ws) => {
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
        let emoteToken = getTwitchEmotes(context, chatInfo, message);
        sendMessageToClient(context, chatInfo, message, emoteToken, ws)
    })
    ws.on('message', (message) => {
        //log the received message and send it back to the client
        console.log('received: %s', message);
        channelsSent = ['snowman']
        channelsSent.forEach(function (e) {
            channels.push(e)
        })
        console.log(opts.channels)
        ws.send(`Hello, you sent -> ${message}`);
    });
    //send immediatly a feedback to the incoming connection    
    ws.send('Hi there, I am a WebSocket server');
});

// Called every time a message comes in
function onMessageHandler(target, context, msg, self) {
    if (self) {
        return;
    }
    console.log(context)
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
    console.log(`* Bot connected to ${addr}:${port}`);
}

function getTwitchEmotes(context, chatInfo) {
    let emotes, id;
    emotes = context.emotes

    for (id in emotes) {
        const emoteLocation = emotes[id].toString();
        const splitEmoteLocation = emoteLocation.split(",")
        splitEmoteLocation.forEach(function (e) {
            const startandEnd = e.split("-")
            chatInfo.emotes.push({
                "emoteId": id,
                "startIndex": parseInt(startandEnd[0]),
                "endIndex": parseInt(startandEnd[1])
            })
        })
    }
    const sortedByIndex = chatInfo.emotes.sort(dynamicSort("startIndex"))
    return sortedByIndex
}

function sendMessageToClient(context, chatInfo, message, emoteToken, ws) {
    if (context.emotes === null) {
        chatInfo.message.push({
            "type": "text",
            "text": message
        })
        ws.send(JSON.stringify(chatInfo))
    }

    if (context.emotes !== null) {
        let textArray = [];
        for (let i = 0; i < message.length; i++) {
            textArray.push(message[i])
        }
        for (const i in emoteToken) {
            let start = emoteToken[i].startIndex
            let end = emoteToken[i].endIndex
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

                chatInfo.message.push({
                    "type": "text",
                    "text": tempTextArray.join('')
                })
            }
            let emoteArray = [];
            for (j = start; j <= end; j++) {
                emoteArray.push(textArray[j])
            }
            chatInfo.message.push({
                "type": "emote",
                "id": emoteToken[i].emoteId,
                "text": emoteArray.join('')
            })
            lastEnd = (end + 1)
        }
        ws.send(JSON.stringify(chatInfo))
    }
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






