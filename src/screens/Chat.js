import React, { Component } from 'react';
import { ActivityIndicator, View, Alert } from 'react-native';
import { GiftedChat } from 'react-native-gifted-chat';
import { ChatManager, TokenProvider } from '@pusher/chatkit-client';
import Config from 'react-native-config';
import axios from 'axios';

const CHATKIT_INSTANCE_LOCATOR_ID = Config.CHATKIT_INSTANCE_LOCATOR_ID;
const CHATKIT_SECRET_KEY = Config.CHATKIT_SECRET_KEY;
const CHATKIT_TOKEN_PROVIDER_ENDPOINT = Config.CHATKIT_TOKEN_PROVIDER_ENDPOINT;
const WEB_PURIFY_API_KEY = Config.WEB_PURIFY_API_KEY;

class Chat extends Component {

  state = {
    messages: [],
    show_load_earlier: false
  };


  static navigationOptions = ({ navigation }) => {
    const { params } = navigation.state;
    return {
      headerTitle: params.room_name
    };
  };
  //

  constructor(props) {
    super(props);
    const { navigation } = this.props;

    this.user_id = navigation.getParam("user_id").toString();
    this.room_id = navigation.getParam("room_id");
  }


  componentWillUnMount() {
    this.currentUser.disconnect();
  }


  async componentDidMount() {
    try {
      const chatManager = new ChatManager({
        instanceLocator: CHATKIT_INSTANCE_LOCATOR_ID,
        userId: this.user_id,
        tokenProvider: new TokenProvider({ url: CHATKIT_TOKEN_PROVIDER_ENDPOINT })
      });

      let currentUser = await chatManager.connect({
        onRemovedFromRoom: this.onRemovedFromRoom
      });
      this.currentUser = currentUser;

      await this.currentUser.subscribeToRoomMultipart({
        roomId: this.room_id,
        hooks: {
          onMessage: this.onReceive
        },
        messageLimit: 10
      });

      await this.setState({
        room_users: this.currentUser.users
      });

    } catch (chat_mgr_err) {
      console.log("error with chat manager: ", chat_mgr_err);
    }
  }


  onReceive = (data) => {
    const { message } = this.getMessage(data);
    this.setState((previousState) => ({
      messages: GiftedChat.append(previousState.messages, message)
    }));

    if (this.state.messages.length > 1) {
      this.setState({
        show_load_earlier: true
      });
    }
  }


  onRemovedFromRoom = (room) => {
    this.currentUser.disconnect();
    Alert.alert("Kicked out", "You've been kicked out of the room because of bad behavior.")
    this.props.navigation.navigate("Login");
  }


  getMessage = ({ id, sender, parts, createdAt }) => {
    const text = parts.find(part => part.partType === 'inline').payload.content;

    const msg_data = {
      _id: id,
      text: text,
      createdAt: new Date(createdAt),
      user: {
        _id: sender.id.toString(),
        name: sender.name,
        avatar: sender.avatarURL
      }
    };

    return {
      message: msg_data
    };
  }


  render() {
    const { messages, show_load_earlier, is_loading } = this.state;
    return (
      <View style={{flex: 1}}>
        {
          is_loading &&
          <ActivityIndicator size="small" color="#0000ff" />
        }
        <GiftedChat
          messages={messages}
          onSend={messages => this.onSend(messages)}
          showUserAvatar={true}
          user={{
            _id: this.user_id
          }}
          loadEarlier={show_load_earlier}
          onLoadEarlier={this.loadEarlierMessages}
        />
      </View>
    );
  }
  //

  loadEarlierMessages = async () => {
    this.setState({
      is_loading: true
    });

    const earliest_message_id = Math.min(
      ...this.state.messages.map(m => parseInt(m._id))
    );

    try {
      let messages = await this.currentUser.fetchMultipartMessages({
        roomId: this.room_id,
        initialId: earliest_message_id,
        direction: "older",
        limit: 10
      });

      if (!messages.length) {
        this.setState({
          show_load_earlier: false
        });
      }

      let earlier_messages = [];
      messages.forEach((msg) => {
        let { message } = this.getMessage(msg);
        earlier_messages.push(message);
      });

      await this.setState(previousState => ({
        messages: previousState.messages.concat(earlier_messages.reverse())
      }));
    } catch (err) {
      console.log("error occured while trying to load older messages", err);
    }

    await this.setState({
      is_loading: false
    });
  }
  //

  onSend = async ([message]) => {
    try {
      const response = await axios.get(
        "http://api1.webpurify.com/services/rest/",
        {
          params: {
            method: 'webpurify.live.replace',
            api_key: WEB_PURIFY_API_KEY,
            format: 'json',
            replacesymbol: '*',
            text: message.text,
            lang: 'es'
          }
        }
      );

      const filtered_text = response.data.rsp.text;

      if (filtered_text.includes('***')) {
        Alert.alert("Profanity detected", "You'll only get 2 warnings. After that, you will be banned from using the service.");
      }

      const message_parts = [
        { type: "text/plain", content: filtered_text }
      ];

      await this.currentUser.sendMultipartMessage({
        roomId: this.room_id,
        parts: message_parts
      });

    } catch (send_msg_err) {
      console.log("error sending message: ", send_msg_err);
    }
  }

}

export default Chat;