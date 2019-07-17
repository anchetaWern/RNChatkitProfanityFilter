# RNChatkitProfanityFilter
A sample React Native chat app that implements profanity monitoring with WebPurify.

Full tutorial is available at: [https://pusher.com/tutorials/profanity-moderation-react-native-chat](https://pusher.com/tutorials/profanity-moderation-react-native-chat).

## Prerequisites

-   React Native development environment
-   [Node.js](https://nodejs.org/en/)
-   [Yarn](https://yarnpkg.com/en/)
-   [Chatkit app instance](https://pusher.com/chatkit)
-   [ngrok account](https://ngrok.com/)
-   [WebPurify account](https://www.webpurify.com/) - optional if you want to use the free solution [PurgoMalum](http://www.purgomalum.com/)

## Getting Started

1. Clone the repo:

```
git clone https://github.com/anchetaWern/RNChatkitProfanityFilter.git
cd RNChatkitProfanityFilter
```

2. Install the dependencies:

```
yarn
react-native eject
react-native link react-native-gesture-handler
react-native link react-native-config
```

3. Update `android/app/build.gradle` file to include React Native Config:

```
apply from: project(':react-native-config').projectDir.getPath() + "/dotenv.gradle" // 2nd line
```

4. Update the `.env` and `server/.env` file with your credentials (you can add the `CHATKIT_WEBHOOK_SECRET` later once you've set up the Webhooks on your Chatkit app instance):

```
// .env
CHATKIT_INSTANCE_LOCATOR_ID="YOUR CHATKIT INSTANCE LOCATOR ID"
CHATKIT_SECRET_KEY="YOUR CHATKIT SECRET KEY"
CHATKIT_TOKEN_PROVIDER_ENDPOINT="YOUR CHATKIT TOKEN PROVIDER ENDPOINT"
WEB_PURIFY_API_KEY="YOUR WEB PURIFY API KEY"
```

```
// server/.env
CHATKIT_INSTANCE_LOCATOR_ID="YOUR CHATKIT INSTANCE LOCATOR ID"
CHATKIT_SECRET_KEY="YOUR CHATKIT SECRET KEY"
CHATKIT_WEBHOOK_SECRET="YOUR WEBHOOK SECRET KEY"
```

5. Run the server:

```
node server/index.js
~/ngrok http 5000
```

6. Update `src/screens/Chat.js` file with your ngrok HTTPS URL:

```
const CHAT_SERVER = "YOUR NGROK HTTPS URL";
```

7. Setup the webhook on your Chatkit app instance.

8. Run the app:

```
react-native run-android
react-native run-ios
```

## Built With

-   [React Native](http://facebook.github.io/react-native/)
-   [Chatkit](https://pusher.com/chatkit)
-   [WebPurify](https://www.webpurify.com/)
