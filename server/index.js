const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const Chatkit = require("@pusher/chatkit-server");
const crypto = require("crypto");

require("dotenv").config();
const app = express();

const CHATKIT_INSTANCE_LOCATOR_ID = process.env.CHATKIT_INSTANCE_LOCATOR_ID;;
const CHATKIT_SECRET_KEY = process.env.CHATKIT_SECRET_KEY;
const CHATKIT_WEBHOOK_SECRET = process.env.CHATKIT_WEBHOOK_SECRET;

const chatkit = new Chatkit.default({
  instanceLocator: CHATKIT_INSTANCE_LOCATOR_ID,
  key: CHATKIT_SECRET_KEY
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.use(
  bodyParser.text({
    type: (req) => {
      const user_agent = req.headers['user-agent'];
      if (user_agent === 'pusher-webhooks') {
        return true;
      }
      return false;
    },
  })
);

app.use(
  bodyParser.json({
    type: (req) => {
      const user_agent = req.headers['user-agent'];
      if (user_agent !== 'pusher-webhooks') {
        return true;
      }
      return false;
    }
  })
);

const getUser = async(user_id) => {
  try {
    const user = await chatkit.getUser({
      id: user_id,
    });
    return user;
  } catch (err) {
    console.log("error getting user: ", err);
  }
}

const updateUser = async(user_id, profanity_count) => {
  try {
    const user = await chatkit.updateUser({
      id: user_id,
      customData: {
        profanity_count
      }
    });
    return user;
  } catch (err) {
    console.log("error getting user: ", err);
  }
}

const removeUserFromRoom = async(room_id, user_id) => {
  try {
    await chatkit.removeUsersFromRoom({
      roomId: room_id,
      userIds: [user_id]
    });
  } catch (err) {
    console.log("error removing user from room: ", err);
  }
}

const verifyRequest = (req) => {
  const signature = crypto
    .createHmac("sha1", CHATKIT_WEBHOOK_SECRET)
    .update(req.body)
    .digest("hex")

  return signature === req.get("webhook-signature")
}

app.post("/user", async (req, res) => {
  const { username } = req.body;
  try {
    const users = await chatkit.getUsers();
    const user = users.find((usr) => usr.name == username);
    res.send({ user });
  } catch (get_user_err) {
    console.log("error getting user: ", get_user_err);
  }
});

app.post("/rooms", async (req, res) => {
  const { user_id } = req.body;
  try {
    const rooms = await chatkit.getUserRooms({
      userId: user_id
    });
    rooms.map((item) => {
      item.joined = true;
      return item;
    });

    const joinable_rooms = await chatkit.getUserJoinableRooms({
      userId: user_id
    });
    joinable_rooms.map((item) => {
      item.joined = false;
      return item;
    });

    const all_rooms = rooms.concat(joinable_rooms);

    res.send({ rooms: all_rooms });
  } catch (get_rooms_err) {
    console.log("error getting rooms: ", get_rooms_err);
  }
});

app.post("/user/join", async (req, res) => {
  const { room_id, user_id } = req.body;
  try {
    const user = await getUser(user_id);
    if (user.custom_data && user.custom_data.profanity_count >= 3) {
      res.status(403).send('Cannot perform action');
    } else {
      await chatkit.addUsersToRoom({
        roomId: room_id,
        userIds: [user_id]
      });

      res.send('ok');
    }
  } catch (user_permissions_err) {
    console.log("error getting user permissions: ", user_permissions_err);
  }
});

app.get("/unban", async (req, res) => {
  const { user_id } = req.query;
  await updateUser(user_id, 0);
  res.send('ok');
});

app.post('/webhook', async (req, res) => {

  try {
    if (verifyRequest(req)) {
      const { payload } = JSON.parse(req.body);

      const sender_id = payload.messages[0].user_id;
      const room_id = payload.messages[0].room_id;

      const sender = await getUser(sender_id);
      const message = payload.messages[0].parts[0].content;

      let profanity_count = (sender.custom_data) ? sender.custom_data.profanity_count : 0;
      if (message.includes('***')) {
        profanity_count += 1;
        await updateUser(sender_id, profanity_count);
      }

      if (profanity_count >= 3) {
        await removeUserFromRoom(room_id, sender_id);
      }
    }
  } catch (err) {
    console.log('webhook error: ', err);
  }

  res.send('ok');
});

const PORT = 5000;
app.listen(PORT, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`Running on ports ${PORT}`);
  }
});