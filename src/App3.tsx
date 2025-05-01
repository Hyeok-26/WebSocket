import { useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid';
import { useWebSocket } from './hooks/useWebSocket';
import { Button, Form, InputGroup, ListGroup, Modal } from 'react-bootstrap';
import axios from 'axios';

interface Message{
  id:string;
  content:string;
  sender?:string; //이 메세지를 누가 보냈는지 정보도 Message 객체에 담기 위해 
  isImage?:boolean; //이 메세지가 이미지인지 여부 
  timestamp?:string; //메세지 도착 시간
}



function App3() {
  //기존에 저장된 대화내용 복원하기
  const savedMsgs = localStorage.savedMsgs ? JSON.parse(localStorage.savedMsgs) : [] ;

  const [msgs, setMsgs] = useState<Message[]>(savedMsgs);
  const inputRef=useRef<HTMLInputElement>(null);
  //대화방에 입장한 userName 도 상태값으로 관리하기
  const [userName, setUserName]=useState<string>();
  // userName 을 useRef() 를 이용해서 관리하기
  const userNameRef = useRef<string|null>(null);
  //대화방 참여자 목록도 상태값으로 관리
  const [userList, setUserList]=useState<string[]>([]);

  //메세지 도착 시간을 리턴하는 함수
  const getTimeStamp = ()=>{
    const date = new Date();
    const hour = date.getHours();
    const minute = date.getMinutes();
    return `${hour}시 ${minute}분`;
  }

  // useWebSocket() hook 사용해서 웹소켓 연결하기 
  const {sendMessage, connected} = useWebSocket("ws://192.168.0.107:9000/ws", {
    onOpen:()=>{
      console.log("연결됨!");
    },
    onMessage:(event)=>{
      //응답된 json 문자열을 실제 object로 변경한다.
      const received = JSON.parse(event.data);
      if(received.type === "enter"){
        setIsEnter(true);
        setMsgs(prevState=>{
          const msg = received.payload.userName+" 님이 입장했습니다.";
          return [...prevState, {id:uuid(), content:msg}]
        });
        //사용자 목록을 update 한다.
        setUserList(received.payload.userList);
      }else if(received.type == "leave"){
        const msg = received.payload.userName+" 님이 퇴장했습니다.";
        setMsgs(prevState => [...prevState, {id:uuid(), content:msg}]);
        //leave 된 userName 을 userList 에서 제거한다
        setUserList(prevState => prevState.filter(item => item !== received.payload.userName))
      }else if(received.type ==="public"){
        setMsgs(prevState=>{
          //출력할 메세지를 구성한다.
          const msg=received.payload.text;
          return [...prevState, {id:uuid(), content:msg, sender:received.payload.userName, timestamp:getTimeStamp()}];
        });
      }else if(received.type === "whisper"){
        //여기가 실행되는 경우는 귓말을 보낸 사람과, 받는 사람이다.
        const msg = received.payload.userName === userNameRef.current ? 
          `${received.payload.text} => [귓말] ${received.payload.toUserName}`
        :
          `[귓말] => ${received.payload.text}`
        ;
        setMsgs(prevState=>[...prevState, {id:uuid(), content:msg, sender:received.payload.userName, timestamp:getTimeStamp()}]);
      }else if(received.type === "image"){
        setMsgs(prevState => [...prevState, {
          id:uuid(),
          content: `/upload/${received.payload.saveFileName}`,
          isImage: true,
          sender: received.payload.userName,
          timestamp:getTimeStamp()
        }]);
      }
    },
    onClose:()=>{
      console.log("연결끊김!");
    }
  });
  
  //메세지 보내는 함수 
  const handleSend=()=>{
    //입력한 메세지 읽어와서
    const msg=inputRef.current?.value;
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
    }
    //object를 json문자열로 변환해서 전송하기
    sendMessage(JSON.stringify(obj));
    //입력창 초기화
    inputRef.current!.value="";
  }
  const divStyle={
    height:"500px",
    backgroundColor:"#cecece",
    padding:"10px",
    overflowY:"auto",
    scrollBehavior:"smooth"
  };
  const divRef=useRef<HTMLDivElement>(null);
  //자동 스크롤
  useEffect(()=>{
      if(divRef.current){
       divRef.current!.scrollTop = divRef.current!.scrollHeight;
      }
      //msgs 가 변경되면 변경된 전체 내용을 localStorage 에 저장하기
      localStorage.savedMsgs = JSON.stringify(msgs);

  }, [msgs]);

  const bubbleStyleBase: React.CSSProperties = {
    borderRadius: "20px",
    padding: "10px 16px",
    marginBottom: "8px",
    maxWidth: "70%",
    wordBreak: "break-word",
    fontSize: "0.95rem",
    lineHeight: "1.4",
    position:"relative"
  };
  //기본 timeStampStyle 
  const timeStampStyle:React.CSSProperties = {
    position:"absolute",
    width:"100px",
    bottom:"0px",
    fontSize:"0.6rem",
    fontWeight:"bold",
    color:"#555",
    padding:"0px 5px"
  };

  //내가 보낸 메세지 timeStampStyle
  const myTimeStampStyle:React.CSSProperties = {
    ...timeStampStyle,
    left:"-100px",
    textAlign:"right"
  }
  //남이 보낸 메세지 timeStampStyle
  const otherTimeStampStyle:React.CSSProperties = {
    ...timeStampStyle,
    right:"-100px"
  }


  //내가 보낸 메세지 스타일 
  const myBubbleStyle: React.CSSProperties = {
    ...bubbleStyleBase,
    backgroundColor: "#DCF8C6", // 연한 연두색 (WhatsApp 스타일)
    alignSelf: "flex-end",
    color: "#000",
  };
  //다른 사람이 보낸 메세지 스타일 
  const otherBubbleStyle: React.CSSProperties = {
    ...bubbleStyleBase,
    backgroundColor: "#fff",
    border: "1px solid #ccc",
    alignSelf: "flex-start",
    color: "#000",
  };

  //대화방에 입장했는지 여부
  const [isEnter, setIsEnter] = useState<boolean>(false);

  const inputUserRef = useRef<HTMLInputElement>(null);
  
  const handleEnter = ()=>{
    
    setMsgs(savedMsgs);
    const obj={
        path:"/chat/enter", 
        data:{
          userName:inputUserRef.current?.value 
        }
    };
    sendMessage(JSON.stringify(obj));
    //userName 을 상태값에 넣어주기
    setUserName(obj.data.userName);
    //userName 을 userNameRef 에도 넣어주기
    userNameRef.current = inputUserRef.current!.value ;
  }
  //메세지를 보낸 사람을 출력할 스타일
  const senderStyle={
    fontSize:"0.75rem",
    fontWeight:"bold",
    marginBottom:"2px",
    color:"#555"
  };
  //입장, 퇴장 메세지 스타일
  const infoStyle={
    textAlign:"center",
    margin:"5px 0",
    fontStyle:"italic",
    color: "#888"
  }
  // 귓말 보내기 위해 선택된 userName 을 상태값으로 관리
  const [selectedUser, setSelectedUser] = useState<string|null>(null);
  // input type="file" 의 참조값
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImageClick = ()=>{
    // input type="file" 요소를 강제 클릭해서 이미지를 선택할수 있도록 한다. 
    fileInputRef.current?.click();
  };
  //이미지 파일을 선택했을때 실행되는 함수 
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>)=>{
    //선택된 파일 객체
    const file = e.target.files?.[0];
    fileUpload(file);
  }
  //매개변수에 전달된 파일 객체를 업로드 하는 함수 
  const fileUpload = async (file:File|undefined|null)=>{
    if(!file)return;
    //FormData 
    const formData = new FormData();
    formData.append("image", file);
    //axios 를 이용해서 multipart/form-data 요청해서 이미지 업로드
    try{
      const response = await axios.post("/api/image", formData, {
        headers:{"Content-Type":"multipart/form-data"}
      });
      console.log(response.data);
      
      // response.data 는 {saveFileName:"xxx.png"}
      // 웹소켓을 이용해서 서버에 업로드된 파일 정보를 전송한다.
      const obj={
        path:"/chat/image",
        data:{
          userName,
          saveFileName:response.data.saveFileName
        }
      }
      sendMessage(JSON.stringify(obj));
     
    }catch(err){
      console.log("업로드 실패!", err);
    }
  }

  // input 요소에 "paste" 이벤트 처리하는 함수
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>)=>{
    //붙여 넣기한 item 목록 얻어내기
    const items = e.clipboardData.items;
    //반복문 돌면서
    for(let i=0; i<items.length; i++){
      const item=items[i];
      if(item.kind === "file" && item.type.startsWith("image/")){
        //실제 파일객체로 얻어낸다.
        const file=item.getAsFile();
        fileUpload(file);
      }
    }
  };
  //모달에 출력할 이미지 url  "/upload/xxx.png"
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  //확대, 축소 비율
  const [scale, setScale] = useState(1);
  //마우스 휠 이벤트를 처리할 함수 
  const handleWheel = (e: React.WheelEvent<HTMLImageElement>) => {
    e.preventDefault();
    // y 축 변화량 즉, 휠을 위 아래로 돌린 거리 
    const delta = e.deltaY;
    // deltaY 값을 이용해서 확대, 축소 배율에 반영하기 
    setScale(prev => {
      // 0 보다 크면  확대, 작으면 축소 
      let newScale = delta > 0 ? prev + 0.1 : prev - 0.1;
      //최소값은 0.5, 최대값은 3
      if(newScale >= 3){
        newScale=3;
      }else if(newScale <= 0.5){
        newScale=0.5;
      }
      return newScale;
    });
  };

  // 컴포넌트 활성화 되는 시점또는 모달에 출력할 이미지가 변경되었을때 배율을 1로 초기화 하기 
  useEffect(() => {
    if (modalImageUrl) setScale(1);
  }, [modalImageUrl]);

  return (
    <div className='container'>
      <h1>WebSocket 테스트3</h1>
      <h2>WebSocket {connected ? "✅ 연결됨" : "❌ 끊김"} {userName}</h2>
         { isEnter ?
            <div className='row'>
                <div className="col-8">
                  <div style={divStyle} ref={divRef}>
                    {msgs.map(item => (
                        item.sender ?
                          <div key={item.id} style={{
                            display:"flex",
                            flexDirection:"column",
                            alignItems: item.sender === userName ? "flex-end" : "flex-start",
                            marginBottom: "10px"
                          }}>
                            { item.sender !== userName && <div style={senderStyle}>{item.sender}</div>}
                            <div style={item.sender !== userName ? otherBubbleStyle : myBubbleStyle}>
                            { 
                              item.isImage ? 
                              <img src={item.content}
                                style={{maxWidth:"200px", borderRadius:"10px", cursor:"pointer"}}
                                alt="업로드된 이미지"
                                onClick={()=>setModalImageUrl(item.content)}/> 
                              : 
                              item.content
                            }
                              <div style={item.sender !== userName ? otherTimeStampStyle : myTimeStampStyle}>{item.timestamp}</div>
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
                      placeholder={selectedUser ? selectedUser+" 님에게 귓말 보내기..." : "대화 입력..."} 
                      ref={inputRef}
                      onKeyDown={(e)=>{
                        //Enter 키를 눌렀을때 handleSend() 함수 호출하기 
                        if(e.key === "Enter")handleSend();
                      }}
                      onPaste={handlePaste}
                    />
                    <Button variant='outline-success' onClick={handleImageClick}>이미지</Button>
                    <Button variant="outline-secondary" onClick={handleSend}>Send</Button>
                  </InputGroup>
                  <input type="file" 
                    accept='image/*' 
                    ref={fileInputRef} 
                    style={{display:"none"}}
                    onChange={handleFileChange}/>
                </div>
                <div className='col-4'>
                  <h3>참여자 목록</h3>
                  <ListGroup as="ul">
                    {userList.map(item => 
                      <ListGroup.Item as="li"
                        key={uuid()}
                        action
                        style={{cursor:"pointer"}}
                        active={item === selectedUser}
                        onClick={()=>setSelectedUser(item === selectedUser ? null : item)}>
                        {item}
                      </ListGroup.Item>
                    )}
                  </ListGroup>
                </div> 
            </div>
            :
            <>
               <input ref={inputUserRef} type="text" placeholder='UserName 입력...' />
               <button onClick={handleEnter}>입장</button>
            </>
         }
        <Modal
          show={modalImageUrl !== null}
          onHide={() => setModalImageUrl(null)}
          centered
          size="lg"
          keyboard // ESC로도 닫기 가능
        >
          <Modal.Header closeButton style={{ backgroundColor: "#222", borderBottom: "1px solid #444" }}>
            <Modal.Title style={{ color: "#fff" }}>원본 이미지</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: 0, backgroundColor: "#000"}}>
            {modalImageUrl && (
              <img
                src={modalImageUrl}
                alt="확대 이미지"
                onWheel={handleWheel}
                style={{
                  maxWidth: '100%',
                  margin: '0 auto',
                  height: 'auto',
                  display: 'block',
                  transform: `scale(${scale})`, 
                  transformOrigin: 'center',
                  transition: 'transform 0.2s ease-in-out',
                  borderRadius: "0 0 10px 10px",
                  boxShadow: "0 0 10px rgba(0,0,0,0.5)"
                }}
              />
            )}
          </Modal.Body>
        </Modal>         
    </div>
  )
}

export default App3