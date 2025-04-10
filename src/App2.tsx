import { useEffect, useRef, useState } from "react"
import { useWebSocket } from "./hooks/useWebSocket";
import {v4 as uuid} from 'uuid'

interface Message{
    id:string;
    content:string;
}

function App2() {

    const [msgs, setMsgs] = useState<Message[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    // useWebSocket() hook 사용해서 웹소켓 연결하기
    const {sendMessage, connected} = useWebSocket("ws://192.168.0.107:9000/ws", {
        onOpen:()=>{
            console.log("연결됨!");
        },
        onMessage:(event)=>{
            setMsgs((prevState)=>[...prevState, {id:uuid(), content:event.data}]);
        },
        onClose:()=>{
            console.log("연결 종료");
        }
    });

    const handleSend = ()=>{
        //입력한 메세지 읽어와서
        const msg = inputRef.current!.value;
        const obj={
            path:"/chat/send",
            data:{
                text:msg
            }
        };
        //object 를 json 문자열로 변환해서 전송하기
        sendMessage(JSON.stringify(obj));
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
            <h2>WebSocket {connected ? "✅ 연결됨" : "❌ 끊김"}</h2>
            <input type="text" ref={inputRef}/>
            <button onClick={handleSend}>전송</button>
            <div style={divStyle} ref={divRef}>
                {msgs.map(item=>
                <div key={item.id}>
                    <div style={bubbleStyle}>{item.content}</div>
                </div>
                )}
            </div>
        </div>
    )
}

export default App2
