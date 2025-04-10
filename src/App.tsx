import { useEffect, useRef, useState } from "react"
import {v4 as uuid} from 'uuid'

interface Message{
  id:string;
  content:string;
}

function App() {

  const socketRef = useRef<WebSocket|null>(null);

  const [msgs, setMsgs] = useState<Message[]>([]);
  useEffect(()=>{
    //컴포넌트가 활성화되는 시점에 웹소켓 접속하기기
    const socket = new WebSocket("ws://192.168.0.107:9000/ws");
    //생성된 WebSocket 의 참조값을 socketRef 에 저장해두기
    socketRef.current = socket;
    socket.onopen =() =>{
      socket.send("hi spring boot!");
    };
    //서버에서 메세지가 도착하면 실행할 함수 등록
    socket.onmessage = (event)=>{
      //콘솔창에 서버가 보낸 메세지 출력
      console.log(event.data);
      /*
        useEffect() 함수 안에서 상태값을 사용하면서 상태값을 변경할 때는
        setState((prevState)=>{
          prevState 값을 이용해서 새로운 상태값을 만들어서 리턴해주면 된다.
        }) 형식으로 변경해야 한다
      */
      setMsgs(prevState=>[...prevState, {id:uuid(), content:event.data}]);
    };
  },[]);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleSend = ()=>{
    //입력한 메세지 읽어와서
    const msg = inputRef.current!.value;
    //전송하기
    socketRef.current?.send(msg);
    //입력창 초기화
    inputRef.current!.value="";
  }
  const divStyle={
    height:"300px",
    width:"500px",
    backgroundColor:"#cecece",
    padding:"10px",
    overflowY:"auto",
    scrollBehavior:"smooth"
  };
  const divRef = useRef<HTMLDivElement>(null);
  //자동스크롤
  useEffect(()=>{
    divRef.current!.scrollTop = divRef.current!.scrollHeight;
  },[msgs]);

  const bubbleStyle: React.CSSProperties = {
    backgroundColor: "#fff",
    borderRadius: "10px",
    padding: "8px 12px",
    marginBottom: "8px",
    display: "inline-block",
    maxWidth: "80%",
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)"
  };

  return (
    <div>
      <h1>WebSocket 테스트</h1>
      <input type="text" ref={inputRef}/>
      <button onClick={handleSend}>전송</button>
      <div style={divStyle} ref={divRef}>
        {msgs.map(item=>
          <div>
            <div style={bubbleStyle}>{item.content}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
