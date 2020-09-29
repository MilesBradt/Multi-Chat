const express = require('express');
const tmi = require('tmi.js');
const app = express();
const fetch = require('node-fetch');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const e = require('express');
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
            emotes: [],
            badges: []
        }

        let emoteToken = getTwitchEmotes(context, chatInfo, message);

        if (context['badge-info'] === null) {

            sendMessageToClient(context, chatInfo, message, emoteToken, ws)
        } else {
            getTwitchBadges(context, chatInfo).catch(() => { console.log("error on message: " + context) })
                .then(() => {
                    sendMessageToClient(context, chatInfo, message, emoteToken, ws)
                })
        }

    })
    ws.on('message', (message) => {
        //log the received message and send it back to the client
        console.log('received: %s', message);
        channelsSent = ['firedragon']
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
    // console.log(context)
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

function callAPI(url, context) {
    return fetch(url, {
        method: 'GET'
    })
        .then(response => response.json())
        .then(data => {
            return data
        })
        .catch(err => {
            return console.error(err)
        })
}

async function getTwitchBadges(context, chatInfo) {
    let badgeTypes = Object.getOwnPropertyNames(context.badges)
    let badgeValues = Object.values(context.badges)

    let globalUrl = "https://badges.twitch.tv/v1/badges/global/display"
    let globalAPI = await callAPI(globalUrl, context)

    const globalBadges = Object.getOwnPropertyNames(globalAPI.badge_sets)

    await sortTwitchBadges(badgeTypes, globalBadges, globalAPI, badgeValues, context, chatInfo)

}

async function sortTwitchBadges(badgeTypes, globalBadges, globalAPI, badgeValues, context, chatInfo) {
    let url = "https://badges.twitch.tv/v1/badges/channels/" + context["room-id"] + "/display"
    let badgeToken = [];

    for (let i = 0; i < badgeTypes.length; i++) {
        if (badgeTypes[i] === "subscriber") {
            badgeToken.push({
                "global": false,
                "type": badgeTypes[i],
                "id": badgeValues[i],
                "url": null
            })
        }
        else if (globalBadges.includes(badgeTypes[i])) {
            badgeToken.push({
                "global": true,
                "type": badgeTypes[i],
                "id": badgeValues[i],
                "url": null
            })
        } else {
            badgeToken.push({
                "global": false,
                "type": badgeTypes[i],
                "id": badgeValues[i],
                "url": null
            })
        }
    }

    if (context['badge-info'] !== null) {
        for (i in badgeToken) {
            if (badgeToken[i].global === true) {
                badgeToken[i].url = globalAPI.badge_sets[badgeToken[i].type].versions[badgeToken[i].id].image_url_1x
                chatInfo.badges.push(badgeToken[i])
            }
            else if (badgeToken[i].global === false) {
                let api = await callAPI(url, context)
                badgeToken[i].url = api.badge_sets[badgeToken[i].type].versions[badgeToken[i].id].image_url_1x
                chatInfo.badges.push(badgeToken[i])
            }
        }
    }
}

async function getFFZGlobalEmotes() {
    const url = 'https://api.frankerfacez.com/v1/set/global'
    let ffzAPI = await callAPI(url)
    // console.log(ffzAPI.sets['3'])
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
        let messageToken = [];
        for (let i = 0; i < message.length; i++) {
            textArray.push(message[i])
        }
        
        let startTextArray = [];
        for (j = 0; j < emoteToken[0].startIndex; j++) {
            startTextArray.push(textArray[j])
        }
        chatInfo.message.push({
            "type": "text",
            "text": startTextArray.join('')
        })

        let nextIndexArray = [];

        for (let i = 1; i < emoteToken.length; i++) {
            nextIndexArray.push(emoteToken[i].startIndex)
        }

        for (const i in emoteToken) {

            let typeEmoteArray = [];

            for (j = emoteToken[i].startIndex; j <= emoteToken[i].endIndex; j++) {
                typeEmoteArray.push(textArray[j])
            }
            chatInfo.message.push({
                "type": "emote",
                "id": emoteToken[i].emoteId,
                "text": typeEmoteArray.join('')
            })

            if (nextIndexArray.length !== 0) {
                let typeTextArray = [];
                for (j = (emoteToken[i].endIndex + 1); j < nextIndexArray[i]; j++) {
                    typeTextArray.push(textArray[j])
                }
                chatInfo.message.push({
                    "type": "text",
                    "text": typeTextArray.join('')
                })
            } else if (nextIndexArray.length == 0) {
                let typeTextArray = [];
                for (j = (emoteToken[i].endIndex + 1); j < textArray.length; j++) {
                    typeTextArray.push(textArray[j])
                }
                chatInfo.message.push({
                    "type": "text",
                    "text": typeTextArray.join('')
                })
            }
        }
        console.log(context)
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






