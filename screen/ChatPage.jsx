import React, { useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components/native";
import SockJS from "sockjs-client";
import * as StompJs from "@stomp/stompjs";
import { FontAwesome5 } from "@expo/vector-icons";
import { FlatList, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { RoomsContext } from "../context/RoomsContextProvider";
import { AuthContext } from "../context/AuthContextProvider";
import ChatMessage from "../components/ChatMessage";

// chatData: {"master": false, "orderDate": "2022-11-11T00:11:20", "restaurantName": "좐", "roomId": 29, "title": "좌니방", "userCount": 2}
// userInfo: {"image": "http://k.kakaocdn.net/dn/dpk9l1/btqmGhA2lKL/Oz0wDuJn1YV2DIn92f6DVK/img_640x640.jpg", "nickName": "황철원2", "userId": 3}

Date.prototype.format = function (f) {
  if (!this.valueOf()) return " ";

  var weekName = [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ];
  var d = this;

  return f.replace(/(yyyy|yy|MM|dd|E|hh|mm|ss|a\/p|am\/pm)/gi, function ($1) {
    switch ($1) {
      case "yyyy":
        return d.getFullYear();
      case "yy":
        return (d.getFullYear() % 1000).zf(2);
      case "MM":
        return (d.getMonth() + 1).zf(2);
      case "dd":
        return d.getDate().zf(2);
      case "E":
        return weekName[d.getDay()];
      case "HH":
        return d.getHours().zf(2);
      case "hh":
        return ((h = d.getHours() % 12) ? h : 12).zf(2);
      case "mm":
        return d.getMinutes().zf(2);
      case "ss":
        return d.getSeconds().zf(2);
      case "a/p":
        return d.getHours() < 12 ? "오전" : "오후";
      case "am/pm":
        return d.getHours() < 12 ? "AM" : "PM";
      default:
        return $1;
    }
  });
};

String.prototype.string = function (len) {
  var s = "",
    i = 0;
  while (i++ < len) {
    s += this;
  }
  return s;
};

String.prototype.zf = function (len) {
  return "0".string(len - this.length) + this;
};

Number.prototype.zf = function (len) {
  return this.toString().zf(len);
};

const ChatContainer = styled.View`
  flex: 1;
  background-color: white;
`;

const ChatInfo = styled.View`
  margin: 5px;
  border: 1px solid #4c80fa;
  border-radius: 20px;
  padding: 10px 25px;
`;

const Text = styled.Text``;

const TextColorTomato = styled.Text`
  color: tomato;
  font-weight: 700;
`;

const KeyboardAvoidingView = styled.KeyboardAvoidingView`
  flex: 1;
`;

const ChatMessageList = styled.FlatList`
  flex: 1;
  padding: 10px 20px 0px 20px;
`;

const ChatPage = ({
  navigation: { setOptions, goBack },
  route: { params },
}) => {
  const { leaveRoom, deleteRoom } = useContext(RoomsContext);
  const {
    authState: { userInfo, userToken },
  } = useContext(AuthContext);
  const chatData = params.params;

  const client = useRef({});
  // TODO: chatMessages로 상태관리중인데, 비효율적이니 useQuery를 적용하자.
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState("");

  const formatDate = (original_date) => {
    const date = new Date(original_date);
    return date.format("a/p hh : mm");
  };

  const connect = async () => {
    client.current = new StompJs.Client({
      // brokerURL: "http://3.37.106.173/ws-stomp",
      webSocketFactory: () => new SockJS("http://3.37.106.173/ws-stomp"),
      connectHeaders: {
        Authorization: `Bearer ${userToken}`,
      },
      debug: function (str) {
        console.log(str);
      },
      reconnectDelay: 5000, //자동 재 연결
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        client.current.subscribe(`/sub/rooms/${chatData.roomId}`, (msg) => {
          var recv = JSON.parse(msg.body);
          setChatMessages((prevState) => [...prevState, recv]);
        });
      },
      onStompError: (frame) => {
        console.log("Broker reported error: " + frame.headers["message"]);
        console.log("Additional details: " + frame.body);
      },
    });

    client.current.activate();
  };

  const disconnect = () => {
    client.current.deactivate();
  };

  const sendMsg = () => {
    client.current.publish({
      destination: "/pub/messages",
      body: JSON.stringify({
        roomId: chatData.roomId,
        content: message,
        userId: userInfo.userId,
        nickName: userInfo.nickName,
      }),
      headers: { Authorization: userToken },
    });
    setMessage("");
  };

  const onChangeHandler = (msg) => {
    setMessage(msg);
  };

  const leaveRoomGoToChatListPage = async (roomId) => {
    await leaveRoom(roomId);
    goBack();
  };
  // TODO: 이거 두 개 함수 묶을 것!
  const deleteRoomGoToChatListPage = async (roomId) => {
    await deleteRoom(roomId);
    goBack();
  };

  useEffect(() => {
    // FIXME: 여기서는 왜 params.params로 데이터를 추출해야 하는지 파악해야 함
    if (chatData.master) {
      setOptions({
        title: params.params.title,
        headerRight: () => (
          <>
            <TouchableOpacity style={{ marginRight: 5 }}>
              <Feather name="edit" size={22} color="black" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => deleteRoomGoToChatListPage(params.params.roomId)}
            >
              <Feather name="log-out" size={22} color="black" />
            </TouchableOpacity>
          </>
        ),
      });
    } else {
      setOptions({
        title: params.params.title,
        headerRight: () => (
          <TouchableOpacity
            onPress={() => leaveRoomGoToChatListPage(params.params.roomId)}
          >
            <Feather name="log-out" size={24} color="black" />
          </TouchableOpacity>
        ),
      });
    }
  }, [
    chatData.master,
    params.params,
    deleteRoomGoToChatListPage,
    leaveRoomGoToChatListPage,
  ]);

  useEffect(() => {
    connect();

    return () => disconnect();
  }, []);

  return (
    <>
      <ChatContainer>
        <ChatInfo>
          <Text>방 제목: {chatData.title}</Text>
          <Text>상 호 명: {chatData.restaurantName}</Text>
          <TextColorTomato>
            주 문 시 간: {formatDate(chatData.orderDate)}
          </TextColorTomato>
        </ChatInfo>

        <KeyboardAvoidingView behavior={"padding"} keyboardVerticalOffset={55}>
          {/* chatMessages: [{"content": "Aaa", "createdAt": "2022-11-21T11:24:29", "nickName": "황철원", "roomId": 32, "userId": 3}] */}
          <ChatMessageList
            data={chatMessages}
            keyExtractor={(item, index) => index}
            renderItem={({ item }) => (
              <ChatMessage item={item} formatDate={formatDate} />
            )}
          />
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#f9f9f9",
            }}
          >
            <TextInput
              onChangeText={onChangeHandler}
              value={message}
              style={{
                flex: 0.9,
                marginTop: 5,
                marginLeft: 8,
                padding: 8,
                borderColor: "grey",
                backgroundColor: "white",
                borderWidth: 0.5,
                borderRadius: 10,
                marginBottom: 40,
              }}
            />
            <TouchableOpacity
              onPress={sendMsg}
              style={{
                flex: 0.1,
                justifyContent: "flex-start",
                alignItems: "center",
                paddingTop: 9,
              }}
            >
              <FontAwesome5 name="arrow-circle-up" size={24} color="#4c80fa" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ChatContainer>
    </>
  );
};

export default ChatPage;
