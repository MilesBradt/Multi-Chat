const express = require('express');
const tmi = require('tmi.js');
const app = express();
const fetch = require('node-fetch');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const e = require('express');
const { channel } = require('tmi.js/lib/utils');
const server = http.createServer(app);
const defaultColors = ['#ff0000', '#0000ff', '#008000', '#b22222', '#ff7f50', '#ff7f50', '#ff4500', '#2e8b57', '#daa520', '#d2691e', '#5f9ea0', '#1e90ff', '#ff69b4', '#8a2be2', '#00ff7f']



app.use(express.static('public'))

// viewed at http://localhost:8080
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

server.listen(8080, () => console.log('Listening on port: 8080'));
console.log("HTML hosted at http://localhost:8080");

const wss = new WebSocket.Server({ server: server });

wss.on('connection', (ws) => {
    let getGlobalTwitchBadges = getTwitchBadges()
    let ffzGlobalEmotes = getFFZGlobalEmotes();

    let channels = [];
    let usersWithoutColor = [];
    let colorlessArray = [];

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

    client.on("clearchat", (channel) => {
        console.log(channel)
    })
    client.on("ban", (channel, username, reason, userstate) => {
        console.log(userstate)
    });

    client.on("timeout", (channel, username, reason, duration, userstate) => {
        console.log(userstate)
    });

    client.on("subscription", (channel, username, method, message, userstate) => {
        console.log(userstate)
    });

    client.on("resub", (channel, username, months, message, userstate, methods) => {
        console.log(userstate)
        let cumulativeMonths = ~~userstate["msg-param-cumulative-months"];
    });

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
            emotes: [],
            badges: [],
            ffz: false
        }

        if (context.color === null) {
            setColorForColorlessUsers(context, chatInfo, usersWithoutColor, colorlessArray)
        }

        let emoteToken = getTwitchEmotes(context, chatInfo, message);

        if (context.badges === null) {
            sendMessageToClient(context, chatInfo, message, emoteToken, ws)
        } else {
            getGlobalTwitchBadges.then((globalBadges) => {
                let getChannelBadges = getTwitchChannelBadges(context)
                getChannelBadges.then((channelBadges) => {
                    sortTwitchBadges(context, chatInfo, globalBadges, channelBadges)
                    ffzGlobalEmotes.then((ffzEmotes) => {
                        emoteToken = createFFZEmoteToken(ffzEmotes, message, chatInfo)
                        let ffzRoomEmotes = getFFZRoomEmotes(context)
                        ffzRoomEmotes.then((roomEmotes) => {
                            emoteToken = createFFZEmoteToken(roomEmotes, message, chatInfo)
                            sendMessageToClient(context, chatInfo, message, emoteToken, ws)
                        })
                    })
                })
            })
        }
    })

    ws.on('message', (message) => {
        //log the received message and send it back to the client
        console.log('received: %s', message);
        channelsSent = ['snowman', 'jcog', 'pangaeapanga']
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
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
    console.log(`* Bot connected to ${addr}:${port}`);
}

function setColorForColorlessUsers(context, chatInfo, usersWithoutColor, colorlessArray) {
    if (colorlessArray.includes(context['user-id']) === false) {
        let randomNumber = Math.floor(Math.random() * 14)
        let newColor = defaultColors[randomNumber]
        colorlessArray.push(context['user-id'])
        let userId = context['user-id']
        usersWithoutColor.push({
            "id": userId,
            "color": newColor
        })
        chatInfo.color = newColor
    } else {
        let index = colorlessArray.indexOf(context['user-id'])
        chatInfo.color = usersWithoutColor[index].color
    }
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
                "endIndex": parseInt(startandEnd[1]),
                "type": "twitch"
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

async function sortTwitchBadges(context, chatInfo, globalAPI, channelAPI) {
    const channelBadges = Object.getOwnPropertyNames(channelAPI.badge_sets)
    const globalBadges = Object.getOwnPropertyNames(globalAPI.badge_sets)

    let badgeTypes = Object.getOwnPropertyNames(context.badges)
    let badgeValues = Object.values(context.badges)
    let badgeToken = [];

    for (let i = 0; i < badgeTypes.length; i++) {
        if (channelBadges.includes(badgeTypes[i])) {
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
        }
    }
    for (i in badgeToken) {
        if (badgeToken[i].global === true) {
            badgeToken[i].url = globalAPI.badge_sets[badgeToken[i].type].versions[badgeToken[i].id].image_url_1x
            chatInfo.badges.push(badgeToken[i])
        }
        else if (badgeToken[i].global === false) {
            if (badgeToken[i].type === "bits") {
                let lowestBitValue = Object.getOwnPropertyNames(channelAPI.badge_sets.bits.versions);
                if (badgeToken[i].id < lowestBitValue) {
                    badgeToken[i].url = globalAPI.badge_sets[badgeToken[i].type].versions[badgeToken[i].id].image_url_1x
                    chatInfo.badges.push(badgeToken[i])
                } else {
                    badgeToken[i].url = channelAPI.badge_sets[badgeToken[i].type].versions[badgeToken[i].id].image_url_1x
                    chatInfo.badges.push(badgeToken[i])
                }
            } else {
                badgeToken[i].url = channelAPI.badge_sets[badgeToken[i].type].versions[badgeToken[i].id].image_url_1x
                chatInfo.badges.push(badgeToken[i])
            }
        }
    }

}

async function getTwitchBadges(context) {
    let globalUrl = "https://badges.twitch.tv/v1/badges/global/display"
    let globalAPI = await callAPI(globalUrl, context)

    return globalAPI
}

async function getTwitchChannelBadges(context) {
    let url = "https://badges.twitch.tv/v1/badges/channels/" + context["room-id"] + "/display"
    let channelAPI = await callAPI(url)

    return channelAPI
}

async function getFFZGlobalEmotes() {
    const url = 'https://api.frankerfacez.com/v1/set/global'
    let ffzAPI = await callAPI(url)
    let ffzGlobalEmotes = [];
    for (i in ffzAPI.sets) {
        ffzGlobalEmotes.push({
            "title": ffzAPI.sets[i].title,
            "id": ffzAPI.sets[i].id,
            "emotes": ffzAPI.sets[i].emoticons
        })
    }
    return ffzGlobalEmotes
}

async function getFFZRoomEmotes(context) {
    const url = "https://api.frankerfacez.com/v1/room/id/" + context['room-id']
    let ffzAPI = await callAPI(url)
    let ffzEmotes = [];
    for (i in ffzAPI.sets) {
        ffzEmotes.push({
            "title": ffzAPI.sets[i].title,
            "id": ffzAPI.sets[i].id,
            "emotes": ffzAPI.sets[i].emoticons
        })
    }
    return ffzEmotes
}

function createFFZEmoteToken(ffzEmotes, message, chatInfo) {
    let messageArray = message.split(' ');
    let ffzEmoteList = []
    let startingIndex;
    let endingIndex;

    for (i in ffzEmotes) {
        ffzEmoteList.push(ffzEmotes[i].emotes)
    }

    // This sucks, fix it later...
    for (i in messageArray) {
        for (j in ffzEmoteList) {
            for (k in ffzEmoteList[j]) {
                if (messageArray[i] === ffzEmoteList[j][k].name) {
                    chatInfo.ffz = true
                    startingIndex = message.indexOf(ffzEmoteList[j][k].name, endingIndex)
                    endingIndex = startingIndex + ffzEmoteList[j][k].name.length
                    chatInfo.emotes.push({
                        // [ffzEmoteList[j][k].id]: [startingIndex + "-" + endingIndex]
                        "emoteId": ffzEmoteList[j][k].id.toString(),
                        "startIndex": startingIndex ,
                        "endIndex": endingIndex,
                        "type": "ffz",
                        "url": ffzEmoteList[j][k].urls[1]
                    })
                }
            }
        }
    }
    const sortedByIndex = chatInfo.emotes.sort(dynamicSort("startIndex"))
    return sortedByIndex
}

function createMessageTokenForEmotes(chatInfo, message, emoteToken) {
    let tokenLength = emoteToken.length
    let textArray = [];

    for (let i = 0; i < message.length; i++) {
        textArray.push(message[i])
    }

    let firstStart = emoteToken[0].startIndex
    let lastEnd = emoteToken[tokenLength - 1].endIndex
    let nextIndexArray = [];

    for (let i = 1; i < emoteToken.length; i++) {
        nextIndexArray.push(emoteToken[i].startIndex)
    }

    if (firstStart !== 0) {
        let startTextArray = [];
        for (j = 0; j < firstStart; j++) {
            startTextArray.push(textArray[j])
        }
        chatInfo.message.push({
            "type": "text",
            "text": startTextArray.join('')
        })
    }

    for (const i in emoteToken) {
        let typeEmoteArray = [];
        for (j = emoteToken[i].startIndex; j <= emoteToken[i].endIndex; j++) {
            typeEmoteArray.push(textArray[j])
        }
        chatInfo.message.push({
            "type": "emote",
            "id": emoteToken[i].emoteId,
            "text": typeEmoteArray.join(''),
            "from": emoteToken[i].type,
            "url": emoteToken[i].url
        })

        let betweenTextArray = [];
        for (j = (emoteToken[i].endIndex + 1); j < nextIndexArray[i]; j++) {
            betweenTextArray.push(textArray[j])
        }
        if (betweenTextArray.length > 0) {
            chatInfo.message.push({
                "type": "text",
                "text": betweenTextArray.join('')
            })
        }
    }

    let endTextArray = [];
    for (j = lastEnd + 1; j <= textArray.length; j++) {
        endTextArray.push(textArray[j])
    }
    if (endTextArray[0]) {
        chatInfo.message.push({
            "type": "text",
            "text": endTextArray.join('')
        })
    }
    return chatInfo
}

function sendMessageToClient(context, chatInfo, message, emoteToken, ws) {
    if (context.emotes === null && chatInfo.ffz !== true) {
        chatInfo.message.push({
            "type": "text",
            "text": message
        })
        ws.send(JSON.stringify(chatInfo))
    }

    else {
        let newToken = createMessageTokenForEmotes(chatInfo, message, emoteToken)
        ws.send(JSON.stringify(newToken))
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