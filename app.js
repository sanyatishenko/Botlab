var restify = require('restify');

var builder = require('botbuilder');

var i18n = require('i18n');

var parser = require('./parse-inquire');



const inMemoryStorage = new builder.MemoryBotStorage();



// i18n configuration

i18n.configure({

    defaultLocale: process.env.DEFAULT_LOCALE ? process.env.DEFAULT_LOCALE : 'en',

    directory: __dirname + '/locales'

});



// Setup Restify Server

var server = restify.createServer();

server.listen(process.env.port || process.env.PORT || 3982, function () {

   console.log('%s listening to %s', server.name, server.url); 

});



// Create chat connector for communicating with the Bot Framework Service

var connector = new builder.ChatConnector({

    appId: process.env.MicrosoftAppId,

    appPassword: process.env.MicrosoftAppPassword

});



// Listen for messages from users 

server.post('/api/messages', connector.listen());



// Simple conversation flow organized with waterfall

var bot = new builder.UniversalBot(connector, [

    function (session) {

        session.userData.profile = parser.ParseInquire(session.message.text);

        if (session.userData.profile.greeting) {

            session.send(i18n.__("greeting"));

        }

        session.beginDialog('requestProfile', session.userData.profile);

    },

    function (session, results) {

        session.userData.profile = results.response;

        if (session.userData.profile.location) {

            session.send("Menu for: " + session.userData.profile.location);

        }

        else {

            session.send("Unknown location");

        }

        session.userData.profile = {}; // answer given, forget request details 

        session.endDialog();

    }

]).set('storage', inMemoryStorage);



bot.dialog('requestProfile', [

    function (session, args, next) {

        session.dialogData.profile = args || {}; // set the profile or create the object

        let retryText = i18n.__('promptLocationRetry');

        if (!session.dialogData.profile.location) {

            builder.Prompts.choice(session,

                i18n.__('promptLocation'),

                "restaurant|bar",

                {listStyle: 4, retryPrompt: retryText}); // list style: auto

        }

        else {

            next(); // skip if we already have this info

        }

    },

    function (session, results) {

        if (results.response) {

            // save location if we asked for it.

            session.dialogData.profile.location = results.response.entity;

        }

        session.endDialogWithResult({ response: session.dialogData.profile });

    }

])

.endConversationAction(

    "endRequest", i18n.__("stopped"),

    {

        matches: /^cancel$|^goodbye$|^stop$/i

        //confirmPrompt: i18n.__('confirmCancel')

    }

);