const express = require('express');
const tmi = require('tmi.js');
const app = express();
const config = require('./modules/config.js');
const auth = config.Authorization;
const clientID = config.CLIENT_ID;
const fetch = require('node-fetch');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const e = require('express');
const {
    channel
} = require('tmi.js/lib/utils');
const server = http.createServer(app);
const defaultColors = ['#ff0000', '#0000ff', '#008000', '#b22222', '#ff7f50', '#ff7f50', '#ff4500', '#2e8b57', '#daa520', '#d2691e', '#5f9ea0', '#1e90ff', '#ff69b4', '#8a2be2', '#00ff7f']

app.use(express.static('public'))

// viewed at http://localhost:8080
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

let test = ""
let channelTest = ['snowman', 'summerheroes']

for (i in channelTest) {
    test += "/" + channelTest[i]
}

app.get(test, function (req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
})

server.listen(8080, () => console.log('Listening on port: 8080'));
console.log("HTML hosted at http://localhost:8080");

const wss = new WebSocket.Server({
    server: server
});

wss.on('connection', (ws) => {
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

        let token = {
            event: "ban",
            duration: userstate['ban-duration'],
            user: userstate['target-user-id'],
            room: userstate['room-id']
        }

        ws.send(JSON.stringify(token))
    });

    client.on("timeout", (channel, username, reason, duration, userstate) => {

        let token = {
            event: "timeout",
            duration: userstate['ban-duration'],
            user: userstate['target-user-id'],
            room: userstate['room-id']
        }

        ws.send(JSON.stringify(token))
    });
    // Messages need unique ids before this will work properly
    client.on("messagedeleted", (channel, username, deletedMessage, userstate) => {

        let token = {
            event: "delete",
            'message-id': userstate['target-msg-id'],
            user: userstate.login,
        }

        ws.send(JSON.stringify(token))
    });

    client.on("notice", (channel, msgid, message) => {
        console.log(msgid)
    });

    client.on("subgift", (channel, username, streakMonths, recipient, methods, userstate) => {
        console.log(username)
        console.log(streakMonths)
        console.log(recipient)
        console.log(methods)
        console.log(userstate)
        let senderCount = ~~userstate["msg-param-sender-count"];
    });

    client.on("submysterygift", (channel, username, numbOfSubs, methods, userstate) => {
        console.log(username)
        console.log(numbOfSubs)
        console.log(methods)
        console.log(userstate)
        let senderCount = ~~userstate["msg-param-sender-count"];
    });

    client.on("subscription", (channel, username, method, message, userstate) => {
        let systemMessage = userstate['system-msg']
        let splitSystem = systemMessage.split(' ')
        splitSystem.shift()
        let subMessage = splitSystem.join(' ')

        const display = userstate.login
        let displayName = userstate['display-name']

        sendSubEventToClient(subMessage, message, channel, displayName, display, userstate, ws, "sub", method, usersWithoutColor, colorlessArray)
    });

    client.on("resub", (channel, username, months, message, userstate, methods) => {
        let systemMessage = userstate['system-msg']
        let splitSystem = systemMessage.split(' ')
        splitSystem.shift()
        let subMessage = splitSystem.join(' ')

        const display = userstate.login
        let displayName = userstate['display-name']

        sendSubEventToClient(subMessage, message, channel, displayName, display, userstate, ws, "resub", methods, usersWithoutColor, colorlessArray)
        let cumulativeMonths = ~~userstate["msg-param-cumulative-months"];
    });

    client.on("cheer", (channel, userstate, message) => {
        const cleanChannel = channel.slice(1)
        // I know these are backwards, I'll fix it later
        const username = userstate['display-name']
        const display = userstate.username

        sendCheerEventToClient(message, cleanChannel, username, display, userstate, ws, usersWithoutColor, colorlessArray)
    });

    client.on('message', (target, context, msg, self) => {
        const message = msg.trim();
        const channel = target.slice(1)
        // I know these are backwards, I'll fix it later
        const username = context['display-name']
        const display = context.username

        sendMessageEventToClient(message, channel, username, display, context, ws, usersWithoutColor, colorlessArray)
    })

    ws.on('message', (message) => {
        //log the received message and send it back to the client
        console.log('received: %s', message);
        channelsSent = ['snowman', 'xQcOW', 'shroud']
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
                "type": "twitch",
                "url": "https://static-cdn.jtvnw.net/emoticons/v1/" + id + "/1.0"
            })
        })
    }
    const sortedByIndex = chatInfo.emotes.sort(dynamicSort("startIndex"))
    return sortedByIndex
}

function callAPI(url) {
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
        } else if (globalBadges.includes(badgeTypes[i])) {
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
        } else if (badgeToken[i].global === false) {
            if (badgeToken[i].type === "bits") {
                let lowestBitValue = Object.getOwnPropertyNames(channelAPI.badge_sets.bits.versions);
                if (badgeToken[i].id <= lowestBitValue) {
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
        ffzGlobalEmotes.push(ffzAPI.sets[i].emoticons)
    }
    return ffzGlobalEmotes
}

async function getFFZRoomEmotes(channel) {
    const url = "https://api.frankerfacez.com/v1/room/" + channel
    let ffzAPI = await callAPI(url)
    let ffzEmotes = [];
    for (i in ffzAPI.sets) {
        ffzEmotes.push(ffzAPI.sets[i].emoticons)
    }
    return ffzEmotes
}

async function getBTTVGlobalEmotes() {
    const url = 'https://api.betterttv.net/3/cached/emotes/global'
    let bttvAPI = await callAPI(url)
    let bttvEmotes = [];
    for (i in bttvAPI) {
        bttvEmotes.push(bttvAPI[i])
    }
    return bttvEmotes
}

async function getBTTVRoomEmotes(context) {
    const url = 'https://api.betterttv.net/3/cached/users/twitch/' + context['room-id']
    let bttvAPI = await callAPI(url)
    let bttvEmotes = [];
    for (i in bttvAPI.channelEmotes) {
        bttvEmotes.push(bttvAPI.channelEmotes[i])
    }
    for (i in bttvAPI.sharedEmotes) {
        bttvEmotes.push(bttvAPI.sharedEmotes[i])
    }
    return bttvEmotes
}

function getCheers(cheers, message, chatInfo) {
    let cheerToken = []

    for (i in cheers.actions) {
        let lowerMessage = message.toLowerCase()
        let lowerPrefix = cheers.actions[i].prefix.toLowerCase()
        console.log(lowerMessage)
        console.log(lowerPrefix)
        let index = lowerMessage.lastIndexOf(lowerPrefix)
        console.log("index: " + index)
        while (index != -1) {
            let name = lowerPrefix
            endingIndex = index + lowerPrefix.length
            let lastCharacter = lowerMessage[index - 1]
            let nextCharacter = lowerMessage[endingIndex]
            console.log(nextCharacter)
            if (isStartingCheer(lastCharacter) && isEndingCheer(nextCharacter)) {

                const regex = new RegExp(`(?<=${name})\\d+`, 'g')
                let numbers = lowerMessage.match(regex)

                cheerToken.push({
                    "prefix": name,
                    "tiers": cheers.actions[i].tiers,
                    "amount": numbers,
                    'startIndex': index,
                    'endIndex': endingIndex - 1
                })

            } else {
                console.log("not a cheer")
            }
            index = (index > 0 ? lowerMessage.lastIndexOf(lowerPrefix, index - 1) : -1)
        }
    }

    const sortedByIndex = cheerToken.sort(dynamicSort("startIndex"))
    console.log(sortedByIndex)

    for (i in sortedByIndex) {
        console.log(sortedByIndex[i].amount[i])
        test = parseInt(sortedByIndex[i].amount[i])
        console.log(test)
        let cheer = whichCheer(parseInt(sortedByIndex[i].amount[i]))
        console.log("cheer: " + cheer)
        sortedByIndex[i].tiers.forEach(tier => {

            if (cheer === tier.min_bits) {
                chatInfo.cheer = true
                chatInfo.emotes.push({
                    "emoteId": sortedByIndex[i].prefix,
                    "startIndex": sortedByIndex[i].startIndex,
                    "endIndex": sortedByIndex[i].endIndex + sortedByIndex[i].amount[i].length,
                    "type": "cheer",
                    "url": tier.images.dark.animated['1'],
                    "amount": sortedByIndex[i].amount[i],
                    "color": tier.color,
                    "event": "cheer"
                })
            }
        })
    }
}

function whichCheer(amount) {
    if (amount < 100) {
        return 1
    } else if (amount < 1000) {
        return 100
    } else if (amount < 5000) {
        return 1000
    } else if (amount < 10000) {
        return 5000
    } else {
        return 10000
    }
}

function createFFZEmoteToken(ffzEmotes, message, chatInfo) {
    let emotes = ffzEmotes.flat()

    // "emotes[j].urls" should include all emote sizes later
    for (j in emotes) {
        let index = message.lastIndexOf(emotes[j].name)
        while (index != -1) {
            endingIndex = index + emotes[j].name.length
            let nextCharacter = message[endingIndex]
            let lastCharacter = message[index - 1]

            if (isEmoteEnding(nextCharacter) && isEmoteEnding(lastCharacter)) {
                chatInfo.ffz = true
                chatInfo.emotes.push({
                    "emoteId": emotes[j].id,
                    "startIndex": index,
                    "endIndex": endingIndex - 1,
                    "type": "ffz",
                    "url": emotes[j].urls[1]
                })
            }
            index = (index > 0 ? message.lastIndexOf(emotes[j].name, index - 1) : -1)
        }
    }

    const sortedByIndex = chatInfo.emotes.sort(dynamicSort("startIndex"))
    return sortedByIndex
}

function createBTTVEmoteToken(bttvEmotes, message, chatInfo) {
    let emotes = bttvEmotes
    for (j in emotes) {
        let index = message.lastIndexOf(emotes[j].code)
        while (index != -1) {
            endingIndex = index + emotes[j].code.length
            let nextCharacter = message[endingIndex]
            let lastCharacter = message[index - 1]

            if (isEmoteEnding(nextCharacter) && isEmoteEnding(lastCharacter)) {
                chatInfo.bttv = true
                chatInfo.emotes.push({
                    "emoteId": emotes[j].id,
                    "startIndex": index,
                    "endIndex": endingIndex - 1,
                    "type": "bttv",
                    "url": "https://cdn.betterttv.net/emote/" + emotes[j].id + "/1x"
                })
            }
            index = (index > 0 ? message.lastIndexOf(emotes[j].code, index - 1) : -1)
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
            "url": emoteToken[i].url,
            "amount": emoteToken[i].amount,
            "color": emoteToken[i].color,
            "event": emoteToken[i].event
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
    if (context.emotes === null && chatInfo.ffz !== true && chatInfo.bttv !== true && chatInfo.cheer !== true) {
        chatInfo.message.push({
            "type": "text",
            "text": message
        })
        ws.send(JSON.stringify(chatInfo))
    } else {
        let newToken = createMessageTokenForEmotes(chatInfo, message, emoteToken)
        ws.send(JSON.stringify(newToken))
    }
}

function isEmoteEnding(character) {
    return (character === undefined || character === " " || character === "." || character === "," || character === "!") ? true : false
}

function isStartingCheer(character) {
    return (character === undefined || character === " " || character === "!") ? true : false
}

function isEndingCheer(character) {
    return (character === "1" || character === "2" || character === "3" || character === "4" || character === "5" || character === "6" || character === "7" || character === "8" || character === "9") ? true : false
}

function callCheerAPI(url) {
    return fetch(url, {
            method: 'GET',
            headers: {
                'Client-ID': clientID,
                'Authorization': auth
            },
        })
        .then(response => response.json())
        .then(data => {
            // console.log('Success:', data);
            return data
        })
}

function sendMessageEventToClient(message, channel, username, display, context, ws, usersWithoutColor, colorlessArray) {
    const chatInfo = {
        event: "message",
        channel: channel,
        username: username,
        display: display,
        message: [],
        color: context.color,
        id: context['user-id'],
        'message-id': context.id,
        special: context['msg-id'],
        emotes: [],
        badges: [],
        cheer: false,
        ffz: false,
        bttv: false
    }

    if (context.color === null) {
        setColorForColorlessUsers(context, chatInfo, usersWithoutColor, colorlessArray)
    }

    let emoteToken = getTwitchEmotes(context, chatInfo, message);

    if (context.badges === null) {
        (async () => {
            let ffzEmotes = await getFFZGlobalEmotes()
            emoteToken = createFFZEmoteToken(ffzEmotes, message, chatInfo)
            let ffzRoomEmotes = await getFFZRoomEmotes(channel)
            emoteToken = createFFZEmoteToken(ffzRoomEmotes, message, chatInfo)

            let bttvEmotes = await getBTTVGlobalEmotes()
            emoteToken = createBTTVEmoteToken(bttvEmotes, message, chatInfo)
            let bttvRoomEmotes = await getBTTVRoomEmotes(context)
            emoteToken = createBTTVEmoteToken(bttvRoomEmotes, message, chatInfo)

            sendMessageToClient(context, chatInfo, message, emoteToken, ws)
        })();
    } else {
        (async () => {
            let globalBadges = await getTwitchBadges()
            let channelBadges = await getTwitchChannelBadges(context)
            sortTwitchBadges(context, chatInfo, globalBadges, channelBadges)

            let ffzEmotes = await getFFZGlobalEmotes()
            emoteToken = createFFZEmoteToken(ffzEmotes, message, chatInfo)
            let ffzRoomEmotes = await getFFZRoomEmotes(channel)
            emoteToken = createFFZEmoteToken(ffzRoomEmotes, message, chatInfo)

            let bttvEmotes = await getBTTVGlobalEmotes()
            emoteToken = createBTTVEmoteToken(bttvEmotes, message, chatInfo)
            let bttvRoomEmotes = await getBTTVRoomEmotes(context)
            emoteToken = createBTTVEmoteToken(bttvRoomEmotes, message, chatInfo)

            console.log(emoteToken)

            sendMessageToClient(context, chatInfo, message, emoteToken, ws)
        })();
    }
}

function sendSubEventToClient(subMessage, message, channel, displayName, display, userstate, ws, event, methods, usersWithoutColor, colorlessArray) {
    const chatInfo = {
        event: event,
        prime: methods.prime,
        channel: channel.slice(1),
        username: displayName,
        display: display,
        message: [],
        system: subMessage,
        color: userstate.color,
        id: userstate['user-id'],
        'message-id': userstate.id,
        emotes: [],
        badges: [],
        cheers: [],
        ffz: false,
        bttv: false
    }

    if (userstate.color === null) {
        setColorForColorlessUsers(userstate, chatInfo, usersWithoutColor, colorlessArray)
    }

    let emoteToken = getTwitchEmotes(userstate, chatInfo, message);

    if (userstate.badges === null) {
        (async () => {
            if (message !== null) {
                let ffzEmotes = await getFFZGlobalEmotes()
                emoteToken = createFFZEmoteToken(ffzEmotes, message, chatInfo)
                let ffzRoomEmotes = await getFFZRoomEmotes(channel)
                emoteToken = createFFZEmoteToken(ffzRoomEmotes, message, chatInfo)

                let bttvEmotes = await getBTTVGlobalEmotes()
                emoteToken = createBTTVEmoteToken(bttvEmotes, message, chatInfo)
                let bttvRoomEmotes = await getBTTVRoomEmotes(userstate)
                emoteToken = createBTTVEmoteToken(bttvRoomEmotes, message, chatInfo)

                sendMessageToClient(userstate, chatInfo, message, emoteToken, ws)
            } else {
                sendMessageToClient(userstate, chatInfo, message, emoteToken, ws)
            }
        })();
    } else {
        (async () => {
            if (message !== null) {
                let globalBadges = await getTwitchBadges()
                let channelBadges = await getTwitchChannelBadges(userstate)
                sortTwitchBadges(userstate, chatInfo, globalBadges, channelBadges)

                let ffzEmotes = await getFFZGlobalEmotes()
                emoteToken = createFFZEmoteToken(ffzEmotes, message, chatInfo)
                let ffzRoomEmotes = await getFFZRoomEmotes(channel)
                emoteToken = createFFZEmoteToken(ffzRoomEmotes, message, chatInfo)

                let bttvEmotes = await getBTTVGlobalEmotes()
                emoteToken = createBTTVEmoteToken(bttvEmotes, message, chatInfo)
                let bttvRoomEmotes = await getBTTVRoomEmotes(userstate)
                emoteToken = createBTTVEmoteToken(bttvRoomEmotes, message, chatInfo)

                sendMessageToClient(userstate, chatInfo, message, emoteToken, ws)
            } else {
                sendMessageToClient(userstate, chatInfo, message, emoteToken, ws)
            }
        })();
    }
}

function sendCheerEventToClient(message, cleanChannel, username, display, userstate, ws, usersWithoutColor, colorlessArray) {
    const chatInfo = {
        event: "message",
        channel: cleanChannel,
        username: username,
        display: display,
        message: [],
        color: userstate.color,
        id: userstate['user-id'],
        'message-id': userstate.id,
        special: userstate['msg-id'],
        emotes: [],
        badges: [],
        cheer: false,
        ffz: false,
        bttv: false
    }

    if (userstate.color === null) {
        setColorForColorlessUsers(userstate, chatInfo, usersWithoutColor, colorlessArray)
    }

    let emoteToken = getTwitchEmotes(userstate, chatInfo, message);

    if (userstate.badges === null) {
        (async () => {
            let url = "https://api.twitch.tv/v5/bits/actions/?channel_id=" + userstate['room-id']
            let cheers = await callCheerAPI(url)
            emoteToken = getCheers(cheers, message, chatInfo)

            let ffzEmotes = await getFFZGlobalEmotes()
            emoteToken = createFFZEmoteToken(ffzEmotes, message, chatInfo)
            let ffzRoomEmotes = await getFFZRoomEmotes(channel)
            emoteToken = createFFZEmoteToken(ffzRoomEmotes, message, chatInfo)

            let bttvEmotes = await getBTTVGlobalEmotes()
            emoteToken = createBTTVEmoteToken(bttvEmotes, message, chatInfo)
            let bttvRoomEmotes = await getBTTVRoomEmotes(userstate)
            emoteToken = createBTTVEmoteToken(bttvRoomEmotes, message, chatInfo)

            sendMessageToClient(userstate, chatInfo, message, emoteToken, ws)
        })();
    } else {
        (async () => {
            let url = "https://api.twitch.tv/v5/bits/actions/?channel_id=" + userstate['room-id']
            let cheers = await callCheerAPI(url)
            emoteToken = getCheers(cheers, message, chatInfo)

            let globalBadges = await getTwitchBadges()
            let channelBadges = await getTwitchChannelBadges(userstate)
            sortTwitchBadges(userstate, chatInfo, globalBadges, channelBadges)

            let ffzEmotes = await getFFZGlobalEmotes()
            emoteToken = createFFZEmoteToken(ffzEmotes, message, chatInfo)
            let ffzRoomEmotes = await getFFZRoomEmotes(channel)
            emoteToken = createFFZEmoteToken(ffzRoomEmotes, message, chatInfo)

            let bttvEmotes = await getBTTVGlobalEmotes()
            emoteToken = createBTTVEmoteToken(bttvEmotes, message, chatInfo)
            let bttvRoomEmotes = await getBTTVRoomEmotes(userstate)
            emoteToken = createBTTVEmoteToken(bttvRoomEmotes, message, chatInfo)

            sendMessageToClient(userstate, chatInfo, message, emoteToken, ws)
        })();
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