import React from 'react';
import '../../App.css';
import './Home.css';
import { useState, useRef, useEffect } from "react";
import styled from 'styled-components';
import {MdVideoCall} from 'react-icons/md';
import {PiSpeakerSlashFill} from 'react-icons/pi';
import {PiSpeakerHighFill} from 'react-icons/pi';
import {PiVideoCameraSlashFill} from 'react-icons/pi';
import {PiVideoCameraFill} from 'react-icons/pi';
import {IoIosCall} from 'react-icons/io';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer, toast } from 'react-toastify';


let socket = null;

let peers_map = {};
let local_stream = new MediaStream();

function Home () {
    // const [constraints, setConstraints] = useState({});
    const my_vid = useRef(null);
    const peer_vid = useRef(null);
    const username = useRef(null);
    const room = useRef(null);
    const [isLocalStreamSet, setIsLocalStreamSet] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [noVideo, setNoVideo] = useState(false);
    const [isRoomCreated, setIsRoomCreated] = useState(false);
    const [ws_connected, setWs_connected] = useState(false);
    const [called, setCalled] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [sendICE, setSendICE] = useState([false, "", ""]);
    const [peerId, setPeerID] = useState("");
    const [roomName, setRoomName] = useState("");
    const [createRoomClass, setCreateRoomClass] = useState("create-room");
    const [callContainerClass, setCallContainerClass] = useState("call-container");
    

    // var callColor = called===true ? "#51f184":"#f15151";
    const rtc_configuration = {iceServers: [{urls: "stun:stun.services.mozilla.com"},
                                            {urls: "stun:stun.l.google.com:19302"}]};

    const updateVideoDimensions = (stream) => {
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        const { width, height } = settings;
      
        if (my_vid.current) {
            my_vid.current.style.width = `${width}px`;
            my_vid.current.style.height = `${height}px`;
            peer_vid.current.style.width = `${width}px`;
            peer_vid.current.style.height = `${height}px`;
        }
    };

    const muteCall = ()=> {
        setIsMuted(!isMuted);
        console.log("AudioTrack", local_stream.getAudioTracks()[0].enabled);
        local_stream.getAudioTracks()[0].enabled = !local_stream.getAudioTracks()[0].enabled;
    };
    
    const noVideoClicked =  ()=> {
        setNoVideo(!noVideo);
        local_stream.getVideoTracks()[0].enabled = !local_stream.getVideoTracks()[0].enabled;
    };


    useEffect(() => {
        if(sendICE[0]===true){
            var peer_username = sendICE[1];
            var receiver_channel_name = sendICE[2];
            var ices = peers_map[peer_username][2];
            ices.forEach((candidate)=>{
                send_signal(peerId, 'icecandidate', {
                    'ice': candidate["ice"],
                    'receiver_channel_name': receiver_channel_name
                });
                console.log('Sending ICE candidate:', candidate.ice);
            });
        }

    }, [sendICE]);


    useEffect(() => {
        if(ws_connected===false && callEnded===false){
            if(peerId!=="" && peerId.length>2 && roomName!=="" && roomName.length>2){
                const base_url = process.env.REACT_APP_WEBOSCKET_URL;
                var url = `${base_url}/${roomName}/${peerId}/`;
                console.log(url);
                socket = new WebSocket(url);
    
                // Connection opened
                socket.addEventListener('open', () => {
                    console.log('WebSocket connection established');
                    send_signal(peerId, "new-peer", {});
                    setWs_connected(true);
                    setCalled(true);
                    toast.success('lost connection, Connecting Again', {
                        position: toast.POSITION.TOP_CENTER,
                        autoClose: 4000
                    });
                });
    
                // Listen for messages
                socket.addEventListener('message', event => {
                    console.log('Received message:', event.data);
                    var message = JSON.parse(event.data)["message"];
                    var action = message["action"];
                    var peer_username = message["peer"];
                    var receiver_channel_name = message["message"]["receiver_channel_name"];
    
                    if(action==="new-peer") {
    
                        toast.success(peer_username + ' is joining', {
                            position: toast.POSITION.TOP_CENTER,
                            autoClose: 4000
                        });
                        create_offer(peer_username, receiver_channel_name);
                    } else if(action==="sdp-offer"){
                        var offer = message["message"]["sdp"];
                        console.log(offer);
                        create_sdp_answer(offer, peer_username, receiver_channel_name);
                    } else if(action==="sdp-answer"){
                        var answer = message["message"]["sdp"];
                        var peer = peers_map[peer_username][0];
                        peer.setRemoteDescription(answer);
                    }else if(action==="icecandidate"){
                        var candidate = message["message"]["ice"];
                        add_ice_candidate(peer_username, candidate);
                        console.log('ice candidate received');
                        if(peers_map[peer_username][3]===true){
                            setSendICE([true, peer_username, receiver_channel_name]);
                        }else{
                            setSendICE([false, peer_username, receiver_channel_name]);
                        }
                        
                    }
                });
    
                // Connection closed
                socket.addEventListener('close', event => {
                    setWs_connected(false);
                    console.log('WebSocket connection closed:', event.code, event.reason);
                });
            }
        }
    }, [ws_connected]);

    // useEffect(() => {
    // }, [peerId, roomName]);



    useEffect(() => {
        if(callEnded===true){
            // disconnect call and peer
            Object.keys(peers_map).forEach((key) => {
                console.log("disconnected->",key);
                peers_map[key][0].close();
                });
            socket.close();
            toast.success('Call Ended', {
                position: toast.POSITION.TOP_CENTER,
                autoClose: 4000
            });
        }
    }, [callEnded]);

    const startBtnClicked = () => {

        var room_name = room.current.value;
        var username_input = username.current.value;
        console.log(room_name, username_input);

        if( room_name!=="" && room_name.length>2 && username_input!=="" && username_input.length>2){
            setPeerID(username_input);
            setRoomName(room_name);
            setIsRoomCreated(true);
            setCreateRoomClass("create-room gone");
            setCallContainerClass("call-container come");
        }else {
            toast.error('Please Enter username and room name correctly', {
                position: toast.POSITION.TOP_CENTER,
                autoClose: 10000
            });
        }
    }

    const callBtnClicked = () => {
        if(isLocalStreamSet){
            if(peerId!=="" && peerId.length>2 && roomName!=="" && roomName.length>2){
                if(ws_connected===false){
                    if(called===false){
                        setCallEnded(false);
                        const base_url = process.env.REACT_APP_WEBOSCKET_URL;
                        var url = `${base_url}/${roomName}/${peerId}/`;
                        console.log(url);
                        socket = new WebSocket(url);
        
                        // Connection opened
                        socket.addEventListener('open', () => {
                            console.log('WebSocket connection established');
                            send_signal(peerId, "new-peer", {});
                            setWs_connected(true);
                            toast.success('Wait For the user to join', {
                                position: toast.POSITION.TOP_CENTER,
                                autoClose: 4000
                            });
                            setCalled(true);
                        });
        
                        // Listen for messages
                        socket.addEventListener('message', event => {
                            console.log('Received message:', event.data);
                            var message = JSON.parse(event.data)["message"];
                            var action = message["action"];
                            var peer_username = message["peer"];
                            var receiver_channel_name = message["message"]["receiver_channel_name"];
        
                            if(action==="new-peer") {
        
                                toast.success(peer_username + ' is joining', {
                                    position: toast.POSITION.TOP_CENTER,
                                    autoClose: 4000
                                });
                                create_offer(peer_username, receiver_channel_name);
                            } else if(action==="sdp-offer"){
                                var offer = message["message"]["sdp"];
                                console.log(offer);
                                create_sdp_answer(offer, peer_username, receiver_channel_name);
                            } else if(action==="sdp-answer"){
                                var answer = message["message"]["sdp"];
                                var peer = peers_map[peer_username][0];
                                peer.setRemoteDescription(answer);
                            }else if(action==="icecandidate"){
                                var candidate = message["message"]["ice"];
                                add_ice_candidate(peer_username, candidate);
                                console.log('ice candidate received');
                                if(peers_map[peer_username][3]===true){
                                    setSendICE([true, peer_username, receiver_channel_name]);
                                }else{
                                    setSendICE([false, peer_username, receiver_channel_name]);
                                }
                                
                            }
                        });
        
                        // Connection closed
                        socket.addEventListener('close', event => {
                            setWs_connected(false);
                            console.log('WebSocket connection closed:', event.code, event.reason);
                        });
                    }else {
                        setCallEnded(true);
                    }
                }else {
                    send_signal(peerId, "new-peer", {});
                    toast.success('Wait For the user to join', {
                        position: toast.POSITION.TOP_CENTER,
                        autoClose: 4000
                    });
                    setCalled(true);
                }
            }
        }else {
            toast.error('Need Permission to camera to start', {
                position: toast.POSITION.TOP_CENTER,
                autoClose: 10000
            });

            const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
            const screenHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        
            var constraints = {
                video: {
                    width: screenWidth,
                    height: screenWidth
                },
                audio: true
                }

            navigator.mediaDevices.getUserMedia(constraints)
            .then((stream) => {
                my_vid.current.srcObject = stream;
                local_stream = stream;
                setIsLocalStreamSet(true);
                // peer_vid.current.srcObject = stream;
                updateVideoDimensions(stream);
                console.log("Permission granted")
            })
            .catch((error) => {
                console.log("error->", error);
            });
        }
    }

    // useEffect(() => {
    //     console.log("Setting video size");
    //     const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    //     const screenHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    
    //     var constraints = {
    //         video: {
    //             width: screenWidth,
    //             height: screenWidth
    //           },
    //         audio: true
    //         }

    //     navigator.mediaDevices.getUserMedia(constraints)
    //     .then((stream) => {
    //         my_vid.current.srcObject = stream;
    //         local_stream = stream;
    //         setIsLocalStreamSet(true);
    //         // peer_vid.current.srcObject = stream;
    //         updateVideoDimensions(stream);
    //         console.log("Permission granted")
    //     })
    //     .catch((error) => {
    //         console.log("error->", error);
    //     });

    // }, []);


  return (
    <>
        <div className="main-container">
        
            <div className={createRoomClass}>
                <div className="inputs-container">
                    <span >Room:</span>
                    <input ref={room} type="text"/>
                </div>
                <div className="inputs-container">
                    <span className="input-tag">Username:</span>
                    <input ref={username} type="text"/>
                </div>
                
                <button onClick={startBtnClicked} className="call-button">
                    START
                </button>
            </div>

            <div className={callContainerClass}>
                <div className="videos-container">
                    <video ref={peer_vid} autoPlay={true} playsInline={true}  controls={false} className="webrtc-video"></video>
                    <video ref={my_vid} className="my-video" muted={true} autoPlay={true} playsInline={true}  controls={false}></video>
                </div>
            </div>
            

        </div>


        <div className="controls">
            <button onClick={callBtnClicked} className="control-btn">
                <IoIosCall style={{width:"30px", height:"30px", color: called ? "#f15151" : "#51f184" }}/>
            </button>
            <button onClick={muteCall} className="control-btn">
                {isMuted && <PiSpeakerSlashFill style={{width:"30px", height:"30px", color:"#111"}}/>}
                {!isMuted && <PiSpeakerHighFill style={{width:"30px", height:"30px", color:"#111"}}/>}
            </button>

            <button onClick={noVideoClicked} className="control-btn">
                {noVideo && <PiVideoCameraSlashFill style={{width:"30px", height:"30px", color:"#111"}}/>}
                {!noVideo && <PiVideoCameraFill style={{width:"30px", height:"30px", color:"#111"}}/>}
            </button>
        </div>
        <ToastContainer />
    </>
  )

    function send_signal(session_id, action, message){
        var msg = JSON.stringify({"message":{
            "peer":session_id,
            "action":action,
            "message":message
        }});
        console.log('sending->', msg);
        socket.send(msg);
    }

    function create_offer(peer_username, receiver_channel_name){

        setCalled(true);
        var peer = new RTCPeerConnection(rtc_configuration);
        add_local_tracks(peer);

        var dc = peer.createDataChannel("channel");
        dc.addEventListener('open', () => {
            console.log("data channel is open");
        });

        dc.addEventListener('message', (event) => {
            console.log("data channel message", event);
        });
        
        peers_map[peer_username] = [peer, dc, [], true];
        var remote_stream = new MediaStream();
        peer_vid.current.srcObject = remote_stream;
        peer.addEventListener('track', (event) => {
            console.log("Received Track...");
            peer_vid.current.srcObject = event.streams[0];
            // cameraStream.addTrack(event.track, cameraStream);
            // if (cameraVideo.srcObject !== event.streams[0]) {
            //     console.log('Incoming stream', event.streams[0]);
            //     cameraVideo.srcObject = event.streams[0];
            // }else {
            //     console.log('srcObjrct is the same');
            // }
        });


        peer.addEventListener('iceconnectionstatechange', () =>{
            var state = peer.iceConnectionState;
            console.log('state',state);
            if(state==="failed" || state==="disconnected" || state==="closed"){
                delete peers_map[peer_username];
                if(state!=="closed"){
                    peer.close();
                }
                // remove_video(peer_username + '_vid');
                

                toast.error(peer_username + ' left...', {
                    position: toast.POSITION.TOP_CENTER,
                    autoClose: 10000
                });
                // setPeerID("");
                // setRoomName("");

                setCalled(false);
                console.log("Connection for" + peer_username + " is closed!");

            }
            else if(state==="connected"){
                send_signal(peerId, "connected", {'receiver_channel_name': receiver_channel_name});
            }
        });


        peer.addEventListener('icecandidate', (event) => {
            console.log('icessssssssss');
            if (event.candidate) {
                peers_map[peer_username][2].push({"ice":event.candidate});
                
            } else {
                console.log('All ICE candidates sent');
            }
        });

        peer.createOffer().then(offer => {
            console.log("offer->", offer);
            return peer.setLocalDescription(offer);
        }).then(() => {
            if(peer.localDescription!==null){
                console.log("Local SDP->", peer.localDescription);
                send_signal(peerId, "sdp-offer", {
                    'receiver_channel_name': receiver_channel_name,
                    "sdp": peer.localDescription
                });
                console.log("Peer offer sent");

            }else {
                console.log("peer local sdp is null");
            }
        });
    }

    function add_local_tracks(peer){
        local_stream.getTracks().forEach(track => {
            peer.addTrack(track, local_stream);
        });

    }

    function create_sdp_answer(offer, peer_username, receiver_channel_name){

        // var videoTracksLocal = localStream.getVideoTracks();
        // if(videoTracksLocal[0].enabled){
        //     console.log("video tracks is enabled->set to false")
        //     videoTracksLocal[0].stop();
            
        // }

        
        
        var peer = new RTCPeerConnection(rtc_configuration); 
        add_local_tracks(peer);
        

        var remote_stream = new MediaStream();
        peer_vid.current.srcObject = remote_stream;
        peer.addEventListener('track', (event) => {
            console.log("Received Track...");
            peer_vid.current.srcObject = event.streams[0];
            console.log(event.streams[0].height, event.streams[0].width);
            // cameraStream.addTrack(event.track, cameraStream);
            // if (cameraVideo.srcObject !== event.streams[0]) {
            //     console.log('Incoming stream', event.streams[0]);
            //     cameraVideo.srcObject = event.streams[0];
            // }else {
            //     console.log('srcObjrct is the same');
            // }
        });

        peers_map[peer_username] = [peer, null, [], false];

        peer.addEventListener("datachannel", e => {
            peer.dc = e.channel;
            console.log("Received data channel:", e.channel.label);
            
            peer.dc.addEventListener("open", () => {
                console.log("Channel is open");
            });
    
            peer.dc.addEventListener("message", (event)=>{
                console.log("message received->", event.data);
            });

            peers_map[peer_username] = [peer, peer.dc, [], false];
        });
    
        
    
        peer.addEventListener('iceconnectionstatechange', () =>{
            var state = peer.iceConnectionState;
            console.log('state',state);
            if(state==="failed" || state==="disconnected" || state==="closed"){
                delete peers_map[peer_username];
                if(state!=="closed"){
                    peer.close();
                }
                // remove_video(peer_username + '_vid');
                
                toast.error(peer_username + ' left...', {
                    position: toast.POSITION.TOP_CENTER,
                    autoClose: 10000
                });
                // setPeerID("");
                // setRoomName("");

                setCalled(false);
                console.log("Connection for" + peer_username + " is closed!");
    
            }else if(state==="connected"){
                send_signal(peerId, "connected", {'receiver_channel_name': receiver_channel_name});
            }
        });
    
        peer.addEventListener('icecandidate', (event) => {
            console.log('eerererererere');
            if (event.candidate) {
                send_signal(peerId, 'icecandidate', {
                    'ice': event.candidate,
                    'receiver_channel_name': receiver_channel_name
                });
                // console.log('Sending ICE candidate:', event.candidate);
            } else {
                console.log('All ICE candidates sent');
            }
        });
        
    
    
        peer.setRemoteDescription(offer)
        .then(function() {
            return peer.createAnswer();
        })
        .then(function(answer) {
            // Set the local description of the peer connection to the answer
            return peer.setLocalDescription(answer);
        })
        .then(function() {
            // Send the SDP answer to the server, ICE candidate is included automatically in answer
            send_signal(peerId, 'sdp-answer', {
                'sdp': peer.localDescription, //{'type': 'answer', 'sdp':peer.localDescription.sdp},
                'receiver_channel_name': receiver_channel_name
            });
        })
        .catch(function(error) {
            console.error('Error creating SDP answer:', error);
        });
    
    }

    function add_ice_candidate(peer_username, candidate){
        if(peers_map.hasOwnProperty(peer_username)){    
            // var candidate2 = new RTCIceCandidate(candidate);
            peers_map[peer_username][0].addIceCandidate(candidate).catch((error) => console.log("error->", error));
        }else {
            console.log('No peer for ' + peer_username);
        }
    }
}

export default Home