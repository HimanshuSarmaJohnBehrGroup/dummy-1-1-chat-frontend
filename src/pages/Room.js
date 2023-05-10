import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useHistory } from "react-router-dom";

import { socket } from '../socket/connection';
import { getFormattedDurationHandler } from '../helpers/helperMethods';

import './room.css'
let EnxRtc = window.EnxRtc;
let EnxStream = EnxRtc.EnxStream;

const otherParticipantInit = {
    audio_muted: false
}

export default function Room(props) {

    const history = useHistory();    
    let { token } = useParams();

    const { auth, callDetails } = useSelector(store => store.appData)
    
    // Local state variables...
    const [otherParticipant, setOtherParticipant] = useState(otherParticipantInit);
    const [callDuration, setCallDuration] = useState(0);
    // Local state variables...

    // console.log(`callDetails`, callDetails);

    let ATList = [];
    let audio_muted = false;
    let video_muted = false;
    let video_type = "SD";

    let room = null;
    let SubscribedStreamMap = new Map();
    let localStream,
        remote_view,
        sAMute = true,
        sVMute = true,
        rAmute = true,
        rVMute = true;

    let optionsLocal;
    let remoteOptions;
    let isModerator;
    let VideoSize = {
        'HD': [320, 180, 1280, 720],
        'SD': [640, 480, 640, 480],
        'LD': [80, 45, 640, 360]
    };
    let config = {
        video: true,
        audio: true,
        data: true,
        videoSize: VideoSize[video_type],
    };

    optionsLocal = {
        player: {
            height: "100%",
            width: "100%",
            // minHeight: "150px",
            // minWidth: "150px",
        },
        toolbar: {
            displayMode: false,
        },
        resizer: false,
    };
    remoteOptions = {
        player: {
            height: "100%",
            width: "100%",
        },
        resizer: false,
        toolbar: {
            displayMode: false,
        },
    };

    let enableMuteButton = (muteUnmuteBtn) => {
        muteUnmuteBtn.removeAttribute("disabled");
        muteUnmuteBtn.style.cursor = "pointer";
        muteUnmuteBtn.style.pointerEvents = "auto";
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // General functions...

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Mute video handler...
    const muteVideoHandler = (muteUnmuteBtn) => {
        localStream.muteVideo(function (res) {
            if (res.result === 0) {
                document.querySelector("#self_vMute").classList.remove("fa-video");
                document.querySelector("#self_vMute").classList.add("fa-video-slash");
                video_muted = true;
                enableMuteButton(muteUnmuteBtn);
            } else if (res.result === 1140) {
                enableMuteButton(muteUnmuteBtn);
            }
        });
    }
    // Mute video handler...

    // Mute audio handler...
    const muteAudioHandler = () => {
        localStream.muteAudio(function (arg) {
            document.querySelector("#self_aMute").classList.remove("fa-microphone");
            document.querySelector("#self_aMute").classList.add("fa-microphone-slash");
            audio_muted = true;
        });

        socket.emit(`/mute-audio`, JSON.stringify({
            mutedBy: auth.name,
            roomId: callDetails.roomId
        }))
    }
    // Mute audio handler...

    // End call handler...
    const endCallHandler = () => {
        // localStorage.setItem('call', JSON.stringify({
        //     ...JSON.parse(localStorage.getItem('call')),
        //     callEnded: true,
        //     callDuration,
        //     roomId: callDetails.roomId
        // }))

        const fetchLocalStorageCall = localStorage.getItem('call');
        const parsedLocalStorageCall = JSON.parse(fetchLocalStorageCall);
        if (fetchLocalStorageCall) {
            const currentTimeStamp = Date.now();
            localStorage.setItem(`call`, JSON.stringify({
                ...JSON.parse(localStorage.getItem(`call`)),
                callEndTimeStamp: currentTimeStamp
            }))

            socket.emit(`/delete-call-room-call-ended`, JSON.stringify({
                ...JSON.parse(fetchLocalStorageCall),
                otherParticipantSocketId: parsedLocalStorageCall?.otherParticipantSocketId,
                callEndTimeStamp: currentTimeStamp
            }));
        }

        if (room) {
            room.disconnect();
        } else {
            window.location = '/'
        }
    }
    // End call handler...

    let joinRoom = () => {
        console.log('joining the room...');
        document.querySelector("#local_view").classList.add("local_class_peep");
        document.querySelector("#remote_view").classList.add("remote_class_peep");
        let muteUnmuteBtn = document.querySelector("#self_vMute");
        EnxRtc.Logger.setLogLevel(0);
        localStream = EnxRtc.joinRoom(token, config, function (success, error) {

            console.log(82, success, error)

            if (error) { // We will get an error if the room page is refreshed or if there is an error in
                         // starting the call...
                endCallHandler();
            } 

            // if (error && error == null) { // Doesn't make sense. If error is null, then how error will be true...
            //     document.querySelector(".error_div").innerHTML = "Room connection error." + error.message;
            // }
            // if room connects successfully
            else if (success && success !== null) {

                //play local view
                localStream.play("self-view", optionsLocal);

                // assigning room object to a variable
                room = success.room;

                console.log(`users list`, room.userList)

                // check if the user joined as moderator or participant
                isModerator = room?.me?.role === "moderator" ? true : false;
                var ownId = success?.publishId;
                for (var i = 0; i < success?.streams?.length; i++) {
                    room.subscribe(success?.streams[i]);
                }

                if (room) {
                    // Active talkers handling

                    // To mute video
                    if (callDetails?.callType === 'audio') {
                        muteVideoHandler(muteUnmuteBtn);
                    // To mute video
                    }
                    

                    room.addEventListener("active-talkers-updated", function (event) {
                        console.log("Active Talker List :- " + JSON.stringify(event));
                        var video_player_len = document.querySelector("#call_div").childNodes;

                        ATList = event.message.activeList;

                        if (
                            event.message &&
                            event.message !== null &&
                            event.message.activeList &&
                            event.message.activeList !== null
                        ) {
                            if (ATList.length === 0) {
                                document.querySelector("#call_div").innerHTML = "";
                                document.querySelector(".remote-name").innerText = "";
                            }
                            if (SubscribedStreamMap.size > 0) {

                                if (video_player_len.length >= 1) {
                                    return;
                                } else {
                                    for (var stream in room.remoteStreams.getAll()) {
                                        var st = room.remoteStreams.getAll()[stream];
                                        for (var j = 0; j < ATList.length; j++) {
                                            if (ATList[j].streamId === st.getID()) {
                                                remote_view = st;
                                                document.querySelector(".self-name").innerHTML = room.me.name;
                                                st.play("call_div", remoteOptions);
                                                document.querySelector(".remote-name").innerHTML = ATList[j].name;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    });

                    // room recording start  notification
                    room.addEventListener("room-record-on", function () {
                        document.querySelector("#rec_notification").style.display = 'block';
                    });
                    // room recording stop  notification
                    room.addEventListener("room-record-off", function () {
                        document.querySelector("#rec_notification").style.display = 'none';
                    });

                    room.addEventListener("stream-subscribed", function (streamEvent) {
                        if (streamEvent.stream.getID() !== ownId) {
                            SubscribedStreamMap.set(
                                streamEvent.stream.getID(),
                                streamEvent.stream
                            );
                        }
                    });


                    // user disconnection notification
                    room.addEventListener("user-disconnected", function (streamEvent) {
                        document.querySelector("#call_div").innerHTML = "";
                        document.querySelector(".remote-name").innerText = "";
                    });
                    // room disconnected notification
                    room.addEventListener("room-disconnected", function (streamEvent) {
                        window.location.href = "/";
                    });
                } else {
                    alert(`Room doesn't exist. Taking back to the home page in 2 seconds`);
                    setTimeout(() => {
                        history.push('/');
                    }, 2000);
                }
            }
        });

        // self stream audio mute/unmute  function
        document.querySelector("#self_aMute").addEventListener('click', function (e) {
            console.log(room?.userList);
            if (audio_muted) {
                if (room.mute) {
                    console.log("Your audio is muted by moderator");
                } else {
                    localStream.unmuteAudio(function (arg) {
                        document.querySelector("#self_aMute").classList.remove("fa-microphone-slash");
                        document.querySelector("#self_aMute").classList.add("fa-microphone");
                        audio_muted = false;
                    });
                }
            } else {
                localStream.muteAudio(function (arg) {
                    muteAudioHandler()
                });
            }
        });

        document.querySelector("#disconnect_call").addEventListener("click", function () {
            console.log('disconnected');
            if (room) {
                endCallHandler();
            }
        });

        document.querySelector('#mute_video').addEventListener('click', function () {
            muteUnmuteBtn.style.cursor = "wait";
            muteUnmuteBtn.style.pointerEvents = "none";
            muteUnmuteBtn.disabled = true;
            muteUnmuteBtn.setAttribute("disabled", "disabled");

            if (video_muted) {
                localStream.unmuteVideo(function (res) {
                    if (res.result === 0) {
                        document.querySelector("#self_vMute").classList.remove("fa-video-slash");
                        document.querySelector("#self_vMute").classList.add("fa-video");
                        video_muted = false;
                        enableMuteButton(muteUnmuteBtn);
                    } else if (res.result === 1140) {
                        console.error(res.error);
                        enableMuteButton(muteUnmuteBtn);
                    }
                });
            } else {
                localStream.muteVideo(function (res) {
                    if (res.result === 0) {
                        document.querySelector("#self_vMute").classList.remove("fa-video");
                        document.querySelector("#self_vMute").classList.add("fa-video-slash");
                        video_muted = true;
                        enableMuteButton(muteUnmuteBtn);
                    } else if (res.result === 1140) {
                        enableMuteButton(muteUnmuteBtn);
                    }
                });
            }
        });
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////

    useEffect(() => {
        let audioMuteCheckIntervalId = setInterval(() => {
            if (room?.userList) {
                for (let [key, value] of room.userList) {
                    if (value.name !== auth?.name) {
                        setOtherParticipant(otherParticipant => {
                            return {
                                ...otherParticipant,
                                audio_muted: value.audioMuted
                            }
                        })
                    }
                }
            }
        }, 1000);
        
        return () => {
            clearInterval(audioMuteCheckIntervalId);
        }
    }, [room, auth]);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////

    useEffect(() => {
        socket.on(`/call-ended`, (data) => {
            if (room) {
                localStorage.setItem(`call`, JSON.stringify({
                    ...JSON.parse(localStorage.getItem(`call`)),
                    callEndTimeStamp: data?.callEndTimeStamp
                }))

                room.disconnect();
                // endCallHandler(data);
            }
        })

        return () => {
            socket.off(`/call-ended`);
        }
    }, [room])

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////

    useEffect(() => {
        let intervalId = setInterval(() => {
            const updatedCallDuration = Math.floor((Date.now() - JSON.parse(localStorage.getItem(`call`))?.callStartTimeStamp) / 1000);
            setCallDuration(updatedCallDuration)
        }, 1000);

        return () => {
            clearInterval(intervalId);
        }
    }, [])

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    useEffect(() => {
        joinRoom();
    }, []);

    // console.log(callDuration);

    return (
        <div>
            <div className="layout">
                <div id="overlay" style={{ 'display': 'none' }}>
                    <div className="loader" style={{ "width": "50px" }}>
                        <img src="./img/loading.gif" alt="" />
                    </div>
                </div>

                <div className="container" >
                    <div className="row p-0 m-0" id="call_container_div">

                        <div className="local_class_peep" id="local_view">
                            <div id="self-view"></div>
                            <div className="self-name">Local User</div>
                        </div>

                        <div className="remote_class_peep" id="remote_view">
                            <div id="call_div"></div>
                            <div id="show_stream_div"></div>
                            <div className="remote-name">Remote User</div>
                            <div style={{
                                display: 'flex',
                                gap: '0.75rem'
                            }}>
                                <p>{otherParticipant.audio_muted ? `muted` : `unmuted`}</p>
                            </div>
                        </div>

                        <div className="toolbar-buttons">
                            <div className="tools">
                                <div className="mute-icon" id="mute_audio" title="Mute/Unmute Audio">
                                    <i className="fa fa-microphone" id="self_aMute"></i>
                                </div>
                                <div className="video-mute-icon" id="mute_video" title="Mute/Unmute Video">
                                    <i className="fa fa-video" id="self_vMute"></i>
                                </div>
                                {/* <div className="video-mute-icon" id="share_screen_btn" title="Start Share">
                                    <i className="fa fa-desktop fa-fw SSicon"></i>
                                </div> */}
                                {/* <div className="video-mute-icon" id="toggle_chat" title="Chat">
                                    <i className="fas fa-comment-dots fa-fw CBicon" ></i>
                                    <span className="tag tag-danger top" id="chat-tag">&nbsp;</span>
                                </div> */}
                                <div className="video-mute-icon end-call" title="End Call">
                                    <i className="fas fa-phone fa-fw CBicon" id="disconnect_call"></i>
                                </div>

                                <div className='call-duration'>
                                    <p>{getFormattedDurationHandler(callDuration)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}



