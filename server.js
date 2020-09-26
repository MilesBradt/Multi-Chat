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

        let emotes = context['emotes-raw']
        const slashRegex = '(?:[^\/\n]|\/\/)+'
        const rawEmoteArray = [...emotes.matchAll(slashRegex)]
        console.log("raw emote array: " + rawEmoteArray)
        const test = rawEmoteArray.toString()
        const testRegex = test.replace(",,")
        console.log("test " + testRegex)
        const test2 = testRegex.split(",")
        console.log(test2)

        rawEmoteArray.forEach(function(e) {
            console.log("each raw emote: " + e)
        })


            // console.log("emote location: " + emotes[i])
            // const emoteLocation = emotes[id].toString();
            // const splitEmoteLocation = emoteLocation.split(",")
            // for (let i = 0; i < splitEmoteLocation.length; i++) {
            //     let newSplit = splitEmoteLocation[i].split("-")
            //     chatInfo.emotes.push({
            //         "emoteId": id,
            //         "startIndex": parseInt(newSplit[0]),
            //         "endIndex": parseInt(newSplit[1])
            //     })
            // }

            // console.log("emotes?: " + JSON.stringify(splitEmoteLocation))
    

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

        // Order this correctly, 
        // example: "FrankerZ OhMyDog" = [{"type":"emote","id":"65","text":"FrankerZ"},{"type":"text","text":" "},{"type":"emote","id":"81103","text":"OhMyDog"}]
        if (context.emotes !== null) {
            console.log("message has emotes")

            let textArray = [];
            for (let i = 0; i < message.length; i++) {
                textArray.push(message[i])
            }

            console.log(textArray)
            console.log(JSON.stringify(chatInfo.emotes))

            const emoteInfo = chatInfo.emotes
            console.log("emote info: " + emoteInfo)

            const sortingArray = []

            for (const i in emoteInfo) {
                sortingArray.push(emoteInfo[i].startIndex)
            }

            sortingArray.sort(function (a, b) {
                return a - b
            })

            console.log("sorted " + sortingArray)

            // for (const i in emoteInfo) {
            //     console.log("last end " + lastEnd)
            //     let start = emoteInfo[i].startIndex
            //     let end = emoteInfo[i].endIndex

            //     if (i == 0) {
            //         let tempTextArray = [];
            //         for (j = 0; j < start; j++) {
            //             tempTextArray.push(textArray[j])
            //         }
            //         chatInfo.message.push({
            //             "type": "text",
            //             "text": tempTextArray.join('')
            //         })
            //     }

            //     if (i > 0) {
            //         let tempTextArray = [];
            //         for (j = lastEnd; j < start; j++) {
            //             tempTextArray.push(textArray[j])
            //         }
            //         console.log("temp arrary: " + tempTextArray.join(''))
            //         chatInfo.message.push({
            //             "type": "text",
            //             "text": tempTextArray.join('')
            //         })
            //     }

            //     let emoteArray = [];
            //     console.log(emoteInfo[i])
            //     for (j = start; j <= end; j++) {
            //         emoteArray.push(textArray[j])
            //     }
            //     console.log("emote array: " + emoteArray.join(''))
            //     chatInfo.message.push({
            //         "type": "emote",
            //         "id": emoteInfo[i].emoteId,
            //         "text": emoteArray.join('')
            //     })
            //     lastEnd = (end + 1)



            //}

            console.log("emotes work? " + JSON.stringify(chatInfo.message))

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




