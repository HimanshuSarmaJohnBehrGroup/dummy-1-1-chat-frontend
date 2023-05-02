import React, { useState, useEffect, useCallback } from 'react'
import { useHistory } from "react-router-dom"
import { useSelector, useDispatch } from 'react-redux'

import { setCallDetails, setCallDetailsOtherParticipantHandler } from '../Redux/root';
import { createRoom as createRoomApi, joinRoom } from '../service/api.js'
import { socket } from '../socket/connection.js'
import LoginHeader from '../components/LoginHeader'
import AllUsersInLogin from '../components/allUsersInLogin.js'

import './login.css'

const realTimeManagementInitiatorInit = {
    waitingForReceiver: false,
    callStatus: '',
    roomId: '',
    socketId: '',
    token: '',
    popupClose: false
}

const realTimeManagementReceiverInit = {
    receivedNotification: false,
    callStatus: '',
    roomId: '',
    socketId: '',
    name: '',
    token: '',
    popupClose: false
}

const Login = (props) => {

    const dispatch = useDispatch();
    const history = useHistory();

    const { allUsers, auth } = useSelector(store => store.appData);

    const [user, setUser] = useState({ name: '', room: '', role: '', callType: '' });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [realTimeManagementInitiator, setRealTimeManagementInitiator] = useState(realTimeManagementInitiatorInit);

    const [realTimeManagementReceiver, setRealTimeManagementReceiver] = useState(realTimeManagementReceiverInit);

    const [role, setRole] = useState('')

    const [timeOverData, setTimeOverData] = useState({
        timeElapsed: 0,
        intervalId: 0
    });

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Destructuring states...
    const { timeElapsed, intervalId } = timeOverData;
    const { roomId } = realTimeManagementInitiator;
    // Destructuring states...
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const getIntervalId = useCallback(() => {
        return timeOverData.intervalId;
    }, [timeOverData]);


    const enterRoom = (e) => {
        e.preventDefault();
        setLoading(true);
        console.log('Enter room....');
        let joinData = {
            name: user.name,
            role: 'participant',
            roomId: user.room,
            user_ref: user.name,
        };

        joinRoom(joinData)
            .then(response => {
                console.log(response)
                if (response.token) {
                    history.push(`/room/${response.token}`);
                } else if (response?.error) {
                    alert(`Error occured: ${response.error}`)
                }
            })
            .catch(err => {
                console.log(err)
            });
    }

    const createNewRoom = useCallback((user) => {
        socket.emit("/create-token", 
        JSON.stringify({
            ...JSON.parse(localStorage.getItem('userData')), 
            role: "participant", 
            callType: user.callType,
            receiver: user.name
        }));
        // setLoading(true);
        // createRoomApi()
        //     .then(resp => {
        //         if (resp.result === 0) {
        //             setUser({ ...user, room: resp.room.room_id });
        //             setLoading(false);
        //         }
        //     })
        //     .catch(err => console.log(err));
    }, []);

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // General handler functions..
    const setLocalStorageKeyCall = (updateData) => {
        localStorage.setItem(`call`, JSON.stringify({
            ...JSON.parse(localStorage.getItem(`call`)),
            ...updateData
        }))
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Get data for event listener handlers...
    const getUserHandler = useCallback(() => {
        return user;
    }, [user])

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    const getInitiatorTokenHandler =  useCallback(() => {
        console.log(realTimeManagementInitiator);
        return realTimeManagementInitiator.token;
    }, [realTimeManagementInitiator]);

    const getReceiverTokenHandler =  useCallback(() => {
        console.log(realTimeManagementReceiver);
        return realTimeManagementReceiver.token;
    }, [realTimeManagementReceiver]);

    // Get data for event listener handlers...

    const callCancelledStateCleanupHandler = () => {
        setRealTimeManagementInitiator(realTimeManagementInitiator => {
            return {
                ...realTimeManagementInitiatorInit,
                socketId: realTimeManagementInitiator.socketId
            }
        });
        setRealTimeManagementReceiver(realTimeManagementReceiver => {
            return {
                ...realTimeManagementReceiverInit,
                socketId: realTimeManagementReceiver.socketId
            }
        });
        setTimeOverData({
            timeElapsed: 0,
            intervalId: 0
        })
        setRole('')
        clearInterval(intervalId);

        console.log('reset state');
    };


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    const receiverPopupCloseHandler = () => {
        callCancelledStateCleanupHandler();
        // window.location = '/'
    };

    const initiatorPopupCloseHandler = () => {
        callCancelledStateCleanupHandler();
        // window.location = '/'
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////
    const receiverAcceptCallHandler = async () => {
        console.log(`/receiver-accept`, realTimeManagementReceiver)
        socket.emit(`/receiver-accept`, JSON.stringify({
            roomId: realTimeManagementReceiver.roomId
        }));
    }

    const receiverRejectCallHandler = async () => {
        console.log(realTimeManagementReceiver)
        socket.emit(`/receiver-reject`, JSON.stringify({
            roomId: realTimeManagementReceiver.roomId
        }));
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////
    const initiatorEndCall = async () => {
        socket.emit(`/initiator-end-call`, JSON.stringify({
            roomId: realTimeManagementInitiator.roomId
        }))
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////
    // For both initiator and receiver...
    useEffect(() => {
        socket.on(`/other-participant-audio-muted`, () => {
            dispatch(setCallDetailsOtherParticipantHandler({
                key: `isMuted`,
                value: true
            }))
        })
    }, [dispatch])


    //////////////////////////////////////////////////////////////////////////////////////////////////
    useEffect(() => {

        // For initiator...
        socket.on(JSON.parse(localStorage.getItem('userData')).name, (data) => {
            if (data.role === 'initiator') {
                console.log('initiator');
                setRealTimeManagementInitiator(realTimeManagementInitiator => {
                    return {
                        ...realTimeManagementInitiator,
                        waitingForReceiver: true,
                        roomId: data.roomId,
                        socketId: data.socketId,
                        token: data.token
                    }
                });

                if (data.createdAt) {
                    setTimeOverData(timeOverData => {
                        return {
                            ...timeOverData,
                            timeElapsed: Date.now() - data.createdAt
                        }
                    })
                }

                setRole('initiator')

                // Set interval for tracking time
                let intervalIdTemp = setInterval(() => {
                    setTimeOverData(timeOverData => {
                        return {
                            ...timeOverData,
                            timeElapsed: timeOverData.timeElapsed + 1000
                        }
                    });
                }, 1000);
        
                setTimeOverData(timeOverData => {
                    return {
                        ...timeOverData,
                        intervalId: intervalIdTemp
                    }
                })
                // Set interval for tracking time

                console.log('setCallDetails');
                dispatch(setCallDetails([{
                    key: 'callType',
                    value: data.callType
                }, {
                    key: `roomId`,
                    value: data.roomId
                }]))

                localStorage.setItem('call', JSON.stringify({
                    ...JSON.parse(localStorage.getItem('call')),
                    roomId: data.roomId,
                    role: 'initiator',
                    otherParticipantSocketId: (data.otherParticipantSocketId ? data.otherParticipantSocketId 
                        : JSON.parse(localStorage.getItem('call')).otherParticipantSocketId)
                }))
            }
        })

        socket.on(`initiator-call-start`, (data) => {
            console.log(`initiator-call-start`)
            setLocalStorageKeyCall({
                callStartTimeStamp: data.callStartTimeStamp
            })
            history.push(`/room/${getInitiatorTokenHandler()}`)
        })

        socket.on(`initiator-call-reject`, () => {
            console.log(`initiator-call-reject`)
            setRealTimeManagementInitiator(realTimeManagementInitiator => {
                return {
                    ...realTimeManagementInitiator,
                    waitingForReceiver: false,
                    callStatus: 'rejected'
                }
            })

            console.log('clear interval')
            clearInterval(getIntervalId())
        })

        socket.on(`/initiator-call-timeout`, () => {
            console.log(`/initiator-call-timeout`)
            setRealTimeManagementInitiator(realTimeManagementInitiator => {
                return {
                    ...realTimeManagementInitiator,
                    waitingForReceiver: false,
                    callStatus: 'timeout'
                }
            })

            clearInterval(getIntervalId())
        })

        socket.on(`/initiator-call-ended`, () => {
            setRealTimeManagementInitiator(realTimeManagementInitiator => {
                return {
                    ...realTimeManagementInitiator,
                    waitingForReceiver: false,
                    callStatus: 'initiator-call-ended'
                }
            })

            clearInterval(intervalId);
        });

        return () => {
            socket.off(JSON.parse(localStorage.getItem('userData')).name);
            socket.off(`initiator-call-start`);
            socket.off(`initiator-call-reject`);
            socket.off(`/initiator-call-timeout`);
            socket.off(`/initiator-call-ended`);
        }
    }, [dispatch, history, intervalId, getInitiatorTokenHandler, getIntervalId, getUserHandler]);

    useEffect(() => {

        if (timeElapsed > 1200000 && role === 'initiator') {

            socket.emit('/delete-call-room-timeout', JSON.stringify({
                roomId
            }));

            clearInterval(intervalId);
        }
    }, [timeElapsed, intervalId, roomId, role]);

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////

    useEffect(() => {

        // For receiver...
        socket.on(JSON.parse(localStorage.getItem('userData')).name, (data) => {
            if (data.role === 'receiver') {
                console.log('receiver');
                setRealTimeManagementReceiver(realTimeManagementReceiver => {
                    return {
                        ...realTimeManagementReceiver,
                        receivedNotification: true,
                        roomId: data.roomId,
                        socketId: data.socketId,
                        name: data.initiator,
                        token: data.token
                    }
                });

                setRole('receiver')


                console.log('receiver');
                dispatch(setCallDetails([{
                    key: 'callType',
                    value: data.callType
                }, {
                    key: `roomId`,
                    value: data.roomId
                }]))

                localStorage.setItem('userData', JSON.stringify({
                    ...JSON.parse(localStorage.getItem('userData')),
                }))

                localStorage.setItem('call', JSON.stringify({
                    ...JSON.parse(localStorage.getItem('call')),
                    roomId: data.roomId,
                    role: 'receiver',
                    otherParticipantSocketId: (data.otherParticipantSocketId ? data.otherParticipantSocketId 
                        : JSON.parse(localStorage.getItem('call')).otherParticipantSocketId)
                }))
                // document.getElementById('myAudio').play();
            }
        })

        socket.on(`receiver-call-start`, (data) => {
            console.log(`receiver-call-start`)
            setLocalStorageKeyCall({
                callStartTimeStamp: data.callStartTimeStamp
            })
            history.push(`/room/${getReceiverTokenHandler()}`)
        })


        socket.on(`receiver-call-reject`, () => {
            console.log(`receiver-call-reject`)
            setRealTimeManagementReceiver(realTimeManagementReceiver => {
                return {
                    ...realTimeManagementReceiver,
                    receivedNotification: false,
                    callStatus: 'rejected'
                }
            })

            console.log('clear interval')
            clearInterval(getIntervalId())
        })

        socket.on(`/receiver-call-timeout`, () => {
            setRealTimeManagementReceiver(realTimeManagementReceiver => {
                return {
                    ...realTimeManagementReceiver,
                    receivedNotification: false,
                    callStatus: 'timeout'
                }
            })
        })

        socket.on(`/receiver-call-ended`, () => {
            setRealTimeManagementReceiver(realTimeManagementReceiver => {
                return {
                    ...realTimeManagementReceiver,
                    receivedNotification: false,
                    callStatus: 'initiator-call-ended'
                }
            })
        })

        return () => {
            socket.off(JSON.parse(localStorage.getItem('userData')).name);
            socket.off(`receiver-call-start`);
            socket.off(`receiver-call-reject`);
            socket.off(`/receiver-call-timeout`);
            socket.off(`/receiver-call-ended`);
        }

    }, [dispatch, history, getReceiverTokenHandler, getIntervalId, getUserHandler]);

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    

    console.log(realTimeManagementInitiator, realTimeManagementReceiver, timeElapsed)

    useEffect(() => {
        return () => {
            console.log('interval cleared.');
            clearInterval(intervalId)
        }
    }, [intervalId])

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // For calling the receiver
    useEffect(() => {
        console.log('call', user)
        if (user.name) {
            createNewRoom(user);
        }
    }, [user, createNewRoom]);

    return (
        <main>

            {(realTimeManagementInitiator.waitingForReceiver || 
            (realTimeManagementInitiator.callStatus && !realTimeManagementInitiator.popupClose)) ? <div className='waiting-popup' style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '500px',
                    height: '500px',
                    position: 'fixed',
                    zIndex: '500',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'red',
                    color: 'white',
                    fontSize: '3rem'
                }}>
                    {realTimeManagementInitiator.waitingForReceiver ? (
                        <>
                            <p>Waiting for receiver to pick up...</p>
                            <button onClick={initiatorEndCall}>End call</button>
                        </>
                    ) : realTimeManagementInitiator.callStatus && !realTimeManagementInitiator.popupClose ? (
                        <>
                            {realTimeManagementInitiator.callStatus === 'rejected' ? <p>Receiver rejected the call.</p> : (
                                realTimeManagementInitiator.callStatus === 'timeout' ? <p>Receiver didn't pick up the call.</p> : (
                                    realTimeManagementInitiator.callStatus === 'initiator-call-ended' ? <p>Call ended.</p> : null
                                )
                            )}
        
                            <button onClick={initiatorPopupCloseHandler}>Close this popup</button>
                        </>
                    ) : null}
                    
                </div> : 
            null}


            {/* {realTimeManagementInitiator.waitingForReceiver ? (
                <div className='waiting-popup' style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '500px',
                    height: '500px',
                    position: 'fixed',
                    zIndex: '500',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'red',
                    color: 'white',
                    fontSize: '3rem'
                }}>
                    <p>Waiting for receiver to pick up...</p>
                    <button onClick={initiatorEndCall}>End call</button>
                </div>
            ) : realTimeManagementInitiator.callStatus && !realTimeManagementInitiator.popupClose ? (
                <div className='waiting-popup' style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '500px',
                    height: '500px',
                    position: 'fixed',
                    zIndex: '500',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'red',
                    color: 'white',
                    fontSize: '3rem'
                }}>
                    {realTimeManagementInitiator.callStatus === 'rejected' ? <p>Receiver rejected the call.</p> : (
                        realTimeManagementInitiator.callStatus === 'timeout' ? <p>Receiver didn't pick up the call.</p> : (
                            realTimeManagementInitiator.callStatus === 'initiator-call-ended' ? <p>Call ended.</p> : null
                        )
                    )}

                    <button onClick={initiatorPopupCloseHandler}>Close this popup</button>
                </div>
            ) : null} */}

            {realTimeManagementReceiver.receivedNotification ||
            (realTimeManagementReceiver.callStatus && !realTimeManagementReceiver.popupClose) ? (
                <div className='waiting-popup' style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '500px',
                    height: '500px',
                    position: 'fixed',
                    zIndex: '500',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'red',
                    color: 'white',
                    fontSize: '3rem'
                }}>

                    {realTimeManagementReceiver.receivedNotification ? (
                        <>
                            <p>{`Incoming call from ${realTimeManagementReceiver.name}`}</p>
                            <button onClick={receiverAcceptCallHandler}>Accept</button>
                            <button onClick={receiverRejectCallHandler}>Reject</button>
                        </>
                    ) : realTimeManagementReceiver.callStatus && !realTimeManagementReceiver.popupClose ? (
                        <>
                            {realTimeManagementReceiver.callStatus === 'rejected' ? <p>You rejected the call.</p> : (
                                realTimeManagementReceiver.callStatus === 'timeout' ? <p>You didn't pick up the call.</p> : (
                                    realTimeManagementReceiver.callStatus === 'initiator-call-ended' ? <p>{`${realTimeManagementReceiver.name} ended the call.`}</p> : null
                                )
                            )}

                            <button onClick={receiverPopupCloseHandler}>Close this popup</button> 
                        </>
                    ) : null}
                </div>
            ) : null}
            
            {/* {realTimeManagementReceiver.receivedNotification ? (
                <div className='waiting-popup' style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '500px',
                    height: '500px',
                    position: 'fixed',
                    zIndex: '500',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'red',
                    color: 'white',
                    fontSize: '3rem'
                }}>
                    <p>{`Incoming call from ${realTimeManagementReceiver.name}`}</p>

                    <button onClick={receiverAcceptCallHandler}>Accept</button>
                    <button onClick={receiverRejectCallHandler}>Reject</button>
                </div>
            ) : realTimeManagementReceiver.callStatus && !realTimeManagementReceiver.popupClose ? (
                <div className='waiting-popup' style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '500px',
                    height: '500px',
                    position: 'fixed',
                    zIndex: '500',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'red',
                    color: 'white',
                    fontSize: '3rem'
                }}>
                    {realTimeManagementReceiver.callStatus === 'rejected' ? <p>You rejected the call.</p> : (
                        realTimeManagementReceiver.callStatus === 'timeout' ? <p>You didn't pick up the call.</p> : (
                            realTimeManagementReceiver.callStatus === 'initiator-call-ended' ? <p>{`${realTimeManagementReceiver.name} ended the call.`}</p> : null
                        )
                    )}

                    <button onClick={receiverPopupCloseHandler}>Close this popup</button>
                </div>
            ) : null} */}

            <LoginHeader />
            <div className="container">
                <div className="row d-flex justify-content-center align-items-center">
                    <div className="col-12 col-md-12 col-xl-6 col-lg-6 form-hedding">
                        <h1>1-To-1 Video Call</h1>
                    </div>
                    <div className="col-12 col-md-12 col-xl-5 col-lg-5 offset-md-1">
                        <div className="form-bg login_join_div" style={{ display: 'block', paddingBottom: '25px' }}>
                            <h2 className="text-center">Start a 1-1 video call with someone below</h2>
                            <div style={{ display: 'none' }} className="loading text-center">Loading....</div>
                            <form className="mt-4" id="login_form" /*onSubmit={createNewRoom}*/>
                                <div className="form-row">

                                    <div className="form-group col-12">
                                        {/* <input type="text" className="form-control" id="nameText" name="nameText" placeholder="Name"
                                            onChange={e => setUser({ ...user, name: e.target.value })}
                                            value={user.name}
                                            required /> */}
                                        {auth?.name ? allUsers.map((user, idx) => {
                                            if (user.name !== auth.name) {
                                                return (
                                                    <AllUsersInLogin key={idx} user={user} setUser={setUser} />
                                                )
                                            } else return null
                                        }) : null} 
                                    </div>
                                </div>
                                {/* <div className="form-row">
                                    <div className="form-group col-md-12">
                                        <input type="text" className="form-control" id="roomName" name="roomName"
                                            onChange={e => setUser({ ...user, room: e.target.value })}
                                            value={user.room}
                                            placeholder="Room ID" required />
                                    </div>
                                </div> */}
                                {/* <div className="form-row">
                                    <div className="form-group col-md-12">
                                        <select className="selectpicker show-menu-arrow form-control" id="attendeeRole"
                                            onChange={e => setUser({ ...user, role: e.target.value })}
                                            value={user.role}
                                            name="attendeeRole" required>
                                            <option value="">Select Role</option>
                                            <option value="participant">Join as Participant</option>
                                            <option value="moderator">Join as Moderator</option>
                                        </select>
                                    </div>
                                </div> */}
                                {/* <div className="form-row">
                                    <div className="form-group col-md-12">
                                        <input type="checkbox" name="agree" style={{ height: '15px', width: '15px' }} defaultChecked required />
                                        <label>I
                                    agree to <a target="_blank" rel="noopener noreferrer" href="https://www.enablex.io/legals/tou/">Terms of
                                        Use</a> and
                                        <a target="_blank" rel="noopener noreferrer"
                                                href="https://www.enablex.io/legals/privacy-policy/">Privacy Policy</a>
                                        </label>
                                    </div>
                                </div> */}
                                {/* <div className="form-row justify-content-start"> */}
                                    {/* <div className="form-group col-12 checkbox-sec"> */}
                                        {/* <div> */}
                                            {/* <div> */}
                                                {/* <input type="submit" value="Sign In" className="btn btn-primary" id="joinRoom" /> */}

                                                {/* <button className="btn btn-primary" id="joinRoom">
                                                    {loading ? 'Wait...' : 'Sign In'}
                                                </button> */}

                                            {/* </div> */}
                                            {/* <div id="create_room_div">
                                                <hr />
                                                <p className="text-center">
                                                    Don't have a Room-ID?
                                                        <a href="#" onClick={createNewRoom} id="create_room">
                                                        {loading ? 'Wait...' : 'Create One'}

                                                    </a>
                                                </p>
                                            </div> */}
                                            {/* <br />
                                            <span id="message" style={{ color: 'red' }}></span> */}
                                        {/* </div> */}
                                    {/* </div> */}
                                {/* </div> */}
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            <footer>
                <div className="container">
                    <div className="row">
                        <div className="col-12 col-md-6">
                            <ul className="footerUl">
                                <li><a href="https://www.enablex.io/legals/tou/">Terms</a></li>
                                <li><a href="https://www.enablex.io/legals/privacy-policy/">Privacy Policy</a></li>
                            </ul>
                        </div>
                        <div className="col-12 col-md-6">
                            <p className="footer-p">Copyright © VCLOUDX PTE LTD. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </footer>
        </main>
    )
}

export default Login
