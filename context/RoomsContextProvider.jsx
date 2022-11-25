import React, { useContext, useReducer } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContextProvider";

const defaultRoomsState = [];

const roomsReducer = (prevState, action) => {
  switch (action.type) {
    case "CREATE":
      return [action.value, ...prevState];
    case "READ":
      return [...action.value];
    case "FILTER":
      return [action.value];
    case "MYROOMS":
      return [...action.value];
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};

const defaultChatMsgState = [];

const chatMsgReducer = (prevState, action) => {
  switch (action.type) {
    case "INIT":
      return [];
    case "GET":
      return [...action.value];
    case "ADD":
      return [action.value, ...prevState];
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};

const RoomsContext = React.createContext({});

const RoomsContextProvider = ({ children }) => {
  const [roomsState, dispatchRooms] = useReducer(
    roomsReducer,
    defaultRoomsState
  );

  const [chatMsgState, dispatchChatMsg] = useReducer(
    chatMsgReducer,
    defaultChatMsgState
  );

  const { authState } = useContext(AuthContext);

  //📍 채팅방 생성
  const addRoom = async (data) => {
    axios
      .post("http://3.37.106.173/api/rooms", data, {
        headers: { Authorization: `Bearer ${authState.userToken}` },
      })
      .catch((e) => console.log("addRoomErr: ", e.message));
  };

  //📍 채팅방 조회
  const getRooms = async () => {
    axios
      .get("http://3.37.106.173/api/rooms", {
        headers: { Authorization: `Bearer ${authState.userToken}` },
      })
      .then((response) => {
        // FIXME: READ로 가져오면 이전에 있던 state가 처음에 렌더링되니, 새로운 type을 생성하자.
        dispatchRooms({ type: "READ", value: response.data });
      })
      .catch((e) => console.log("getRoomErr: ", e.message));
  };

  //📍 채팅방 카테고리 별 조회
  const filterRooms = async (categoryId) => {
    if (categoryId === 0) getRooms();
    else {
      axios
        .get(`http://3.37.106.173/api/rooms?categoryId=${categoryId}`, {
          headers: { Authorization: `Bearer ${authState.userToken}` },
        })
        .then((response) => {
          dispatchRooms({ type: "READ", value: response.data });
        })
        .catch((e) => console.log("filterRoomErr: ", e.message));
    }
  };

  //📍 참가한 채팅방들 조회
  const getMyRooms = async () => {
    axios
      .get("http://3.37.106.173/api/users/rooms", {
        headers: { Authorization: `Bearer ${authState.userToken}` },
      })
      .then((response) =>
        dispatchRooms({ type: "MYROOMS", value: response.data })
      )
      .catch((e) => console.log("getMyChatRoomErr: ", e.message));
  };

  //📍 채팅방 참가
  const enterRoom = async (roomId) => {
    axios
      .post(
        `http://3.37.106.173/api/rooms/${roomId}/users`,
        {},
        {
          headers: { Authorization: `Bearer ${authState.userToken}` },
        }
      )
      .catch((e) => console.log("enterRoomErr: ", e.message));
  };

  //📍 채팅방 수정
  const updateRoom = async () => {
    // 1. Axios PUT
    dispatchRooms({ type: CREATE });
  };

  //📍 채팅방 삭제
  const deleteRoom = async (roomId) => {
    axios
      .delete(`http://3.37.106.173/api/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${authState.userToken}` },
      })
      .catch((e) => console.log("deleteRoomErr: ", e.message));
    // 📍 TODO: dispatch 값 없는 애들 설정해줘야 댐
    // client 쪽에서도 바뀐 것이 적용되도록 dispatch를 적용해야 함
    // dispatchRooms({ type: CREATE });
  };

  //📍 채팅방 나가기
  const leaveRoom = async (roomId) => {
    axios
      .delete(`http://3.37.106.173/api/rooms/${roomId}/users`, {
        headers: { Authorization: `Bearer ${authState.userToken}` },
      })
      .catch((e) => console.log("LeaveRoomERr: ", e.message));
  };

  //📍 채팅 메시지 가져오기
  const getChatMessage = async (roomId, size) => {
    const presentTime = new Date();
    const formatDate = new Date(+presentTime + 3240 * 10000)
      .toISOString()
      .replace(/\..*/, "");

    await axios
      .get(
        `http://3.37.106.173:8081/api/rooms/${roomId}/messages?lastMessageDate=${formatDate}&size=${size}`,
        {
          headers: { Authorization: `Bearer ${authState.userToken}` },
        }
      )
      .then((response) =>
        dispatchChatMsg({ type: "GET", value: response.data.reverse() })
      )
      .catch((e) => console.log("getChatMsgErr: ", e.message));
  };

  return (
    <RoomsContext.Provider
      value={{
        roomsState,
        addRoom,
        getRooms,
        filterRooms,
        getMyRooms,
        enterRoom,
        updateRoom,
        deleteRoom,
        leaveRoom,
        chatMsgState,
        getChatMessage,
      }}
    >
      {children}
    </RoomsContext.Provider>
  );
};

export { RoomsContext, RoomsContextProvider };
