import { useEffect, useRef, useState } from "react"
import { useWebSocket } from "./hooks/useWebSocket";
import {v4 as uuid} from 'uuid'
import { Button, Form, InputGroup, ListGroup } from "react-bootstrap";
import axios from "axios";

interface Message{
    id:string;
    content:string;
    sender?:string; // 이 메세지를 누가 보냈는지 정보도 Message 객체에 담기 위해
    isImage?:boolean;//이 메세지가 이미지인지 여부부
}

function App3() {

    const [msgs, setMsgs] = useState<Message[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    //대화방에 입장한 userName 도 상태값으로 관리하기
    const [userName, setuserName] = useState<string>();
    //userName 을 useRef 를 이용해서 관리하기
    const userNameRef = useRef<string|null>(null);
    //대화방 참여자 목록도 상태값으로 관리
    const [userList, setUserList] = useState<string[]>([]);

    // useWebSocket() hook 사용해서 웹소켓 연결하기
    const {sendMessage, connected} = useWebSocket("ws://192.168.0.107:9000/ws", {
        onOpen:()=>{
            console.log("연결됨!");
        },
        onMessage:(event)=>{
            //응답된 json 문자열을 실제 object 로 변경한다
            const received = JSON.parse(event.data);
            if(received.type === "enter"){
                setIsEnter(true);
                setMsgs(prevState=>{
                    const msg = received.payload.userName + "님이 입장했습니다"
                    return [...prevState, {id:uuid(), content:msg}];
                });
                //사용자 목록을 update 합니다
                setUserList(received.payload.userList);
            }else if(received.type === "leave"){
                const msg = received.payload.userName + "님이 퇴장했습니다";
                setMsgs(prevState=>[...prevState, {id:uuid(), content:msg}]);
                //leave 된 userName 을 userList 에서 제거한다
                setUserList(prevState=> prevState.filter(item=> item !== received.payload.userName));
            }else if(received.type ==="public"){
                setMsgs(prevState=>{
                    //출력할 메세지를 구성한다
                    const msg = received.payload.text;
                    return [...prevState, {id:uuid(), content:msg, sender:received.payload.userName}];
                })
            }else if(received.type=="whisper"){
                //여기가 실행되는 경우는 귓말을 보낸 사람과, 받는 사람이다
                const msg = received.payload.userName === userNameRef.current ?
                    `${received.payload.text} => [귓말] ${received.payload.toUserName}`
                :
                    `[귓말] => ${received.payload.text}`
                ;
                setMsgs(prevState=>[...prevState, {id:uuid(), content:msg, sender:received.payload.userName}]);
            }else if(received.type === "image"){
                setMsgs(prevState=>[...prevState, {
                    id:uuid(),
                    content:`/upload/${received.payload.saveFileName}`,
                    isImage: true,
                    sender: received.payload.userName
                }]);
            }
        },
        onClose:()=>{
            console.log("연결 종료");
        }
    });
    //메세지 보내는 함수수
    const handleSend = ()=>{
        //입력한 메세지 읽어와서
        const msg = inputRef.current!.value;
        //서버에 전송할 정보를 담고 있는 object
        let obj=null;
        if(selectedUser){
            obj={
                path:"/chat/whisper",
                data:{
                    userName,
                    text:msg,
                    toUserName:selectedUser
                }
            };
        }else{
            obj={
                path:"/chat/public",
                data:{
                    userName,
                    text:msg
                }
            }   
        };

        //object 를 json 문자열로 변환해서 전송하기
        sendMessage(JSON.stringify(obj));
        //입력창 초기화
        inputRef.current!.value="";
    }
    const divStyle={
        height:"300px",
        backgroundColor:"#cecece",
        padding:"10px",
        overflowY:"auto",
        scrollBehavior:"smooth"
    };
    const divRef = useRef<HTMLDivElement>(null);
    //자동스크롤
    useEffect(()=>{
        if(divRef.current){
            divRef.current.scrollTop = divRef.current!.scrollHeight;
        }
    },[msgs]);

    const bubbleStyleBase: React.CSSProperties = {
        borderRadius: "20px",
        padding: "10px 16px",
        marginBottom: "8px",
        maxWidth: "70%",
        wordBreak: "break-word",
        fontSize: "0.95rem",
        lineHeight: "1.4",
      };
      //내가 보낸 메세지 스타일일
      const myBubbleStyle: React.CSSProperties = {
        ...bubbleStyleBase,
        backgroundColor: "#DCF8C6", // 연한 연두색 (WhatsApp 스타일)
        alignSelf: "flex-end",
        color: "#000",
      };
      //남이 보낸 메세지 스타일
      const otherBubbleStyle: React.CSSProperties = {
        ...bubbleStyleBase,
        backgroundColor: "#fff",
        border: "1px solid #ccc",
        alignSelf: "flex-start",
        color: "#000",
      };

    //대화방에 입장했는지 여부부
    const [isEnter, setIsEnter] = useState<boolean>(false);

    const inputUserRef = useRef<HTMLInputElement>(null);
    const handleEnter = ()=>{
        const obj={
            path:"/chat/enter",
            data:{
                userName : inputUserRef.current?.value
            }
        };
        sendMessage(JSON.stringify(obj));
        //userName을 상태값에 넣어준기
        setuserName(obj.data.userName);
        //userName 을 userNameRef 에도 넣어주기
        userNameRef.current = inputUserRef.current!.value;
    }

    //메세지를 보낸 사람을 출력할 스타일
    const senderStyle: React.CSSProperties = {
        fontSize:"0.75rem",
        fontWeight:"bold",
        marginBottom:"2px",
        color:"#555"
    };
    //입장, 퇴장 메세지 스타일
    const infoStyle: React.CSSProperties={
        textAlign:"center",
        margin:"5px 0",
        fontStyle:"italic",
        color:"#888"
    }
    //귓말 보내기 위해 선택된 userName 을 상태값으로 관ㅇ리
    const [selectedUser, setSelectedUser] = useState<string|null>(null);
    //input type="file" 의 참조값
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleImageClick = () =>{
        //input type 요소를 강제 클릭해서 이미지를 선택할 수 있도록 한다,
        fileInputRef.current?.click();
    };
    //이미지 파일을 선택했을 때실행되는 함수
    const handleFileChange = async(e:React.ChangeEvent<HTMLInputElement>) =>{
        //선택된 파일 객체
        const file = e.target.files?.[0];
        fileUpload(file);
    }

    //매개변수에 전달된 파일 객체를 업로드 하는 함수
    const fileUpload = async(file:File | undefined | null)=>{
        if(!file)return;
        //FormData
        const formData = new FormData();
        formData.append("image", file);
        //axios 를 이용해서 multipart/form-data 요청해서 이미지 업로드
        try{
            const response = await axios.post("/api/image", formData,{
                headers:{"Content-Type":"multipart/form-data"}
            });
            console.log(response.data);
            // response.data 는 {saveFileName:"xxx.png"} 형식으로 받을 예정
            //웹소켓을 이용해서 서버에 업로드된 파일 정보를 전송한다.
            const obj ={
                path:"/chat/image",
                data:{
                    userName,
                    saveFileName:response.data.saveFileName
                }
            }
            sendMessage(JSON.stringify(obj));
        }catch(err){
            console.log("업로드 실패"+err);
        }
    }

    //input 요소에 "paste" 이벤트 처리하는 함수
    const handlePaste = (e:React.ClipboardEvent<HTMLInputElement>)=>{
        //붙여넣기한 item 목록 얻어내기
        const items = e.clipboardData.items;
        //반복문 돌면서
        for(let i=0; i<items.length;i++){
            const item = items[i];
            if(item.kind==="file" && item.type.startsWith("image/")){
                //실제 파일 객체로 얻어낸다
                const file=item.getAsFile();
                fileUpload(file);
            }
        }
    };

    return (
        <div className="container">
            <h1>WebSocket 테스트</h1>
            <h2>WebSocket {connected ? "✅ 연결됨" : "❌ 끊김"} {userName}</h2>
            {isEnter ? 
                <div className="row">
                    <div className="col-8">
                         <div style={divStyle} ref={divRef}>
                            {msgs.map(item=>(
                                item.sender ?
                                    <div key={item.id} style={{
                                        display:"flex",
                                        flexDirection:"column",
                                        alignItems:item.sender === userName ? "flex-end" : "flex-start",
                                        marginBottom:"10px"
                                    }}>
                                        {item.sender !== userName && <div style={senderStyle}>{item.sender}</div>}
                                        <div style={item.sender !== userName ? otherBubbleStyle : myBubbleStyle }>
                                            {
                                                item.isImage ?
                                                <img src={item.content}
                                                style={{maxWidth:"200px", borderRadius:"10px"}}
                                                alt="업로드된 이미지"/>
                                            :
                                                item.content
                                            }
                                        </div>
                                    </div>
                               :
                                    <div key={item.id} style={infoStyle}>
                                        {item.content}
                                    </div>
                            ))}
                        </div>
                        <InputGroup className="mb-3">
                            <Form.Control
                                placeholder={selectedUser ? selectedUser+"님에게 귓말 보내기...":"대화 입력..."}
                                ref={inputRef}
                                onKeyDown={(e)=>{
                                    if(e.key === "Enter")handleSend();
                                }}
                                onPaste={handlePaste}
                            />
                            <Button variant="outline-secondary" onClick={handleSend}>전송</Button>
                            <Button variant="outline-secondary" onClick={handleImageClick}>이미지</Button> 
                        </InputGroup>
                        {/* input 요소에 change event 발생 */}
                        <input type="file" 
                            accept="image/*" 
                            style={{display:"none"}} 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                    </div>
                    <div className="col-4">
                        <h3>참여자 목록</h3>
                        <ListGroup as="ul">
                            {userList.map(item => 
                                <ListGroup.Item as="li"
                                    key={uuid()} action variant="primary"
                                    style={{cursor:"pointer"}}
                                    active={item === selectedUser}
                                    onClick={()=>{setSelectedUser(item === selectedUser ? null : item)}}>
                                    {item}
                                </ListGroup.Item>
                            )}
                        </ListGroup>
                    </div>
                </div>
            :
                <div>
                    <input ref={inputUserRef} type="text" placeholder="userName 입력..." />
                    <button onClick={handleEnter}>입장</button>
                    
                </div>
            }
        </div>
    )
}

export default App3
