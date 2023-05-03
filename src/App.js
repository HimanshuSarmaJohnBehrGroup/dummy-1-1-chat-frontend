import React, { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route
} from 'react-router-dom';
import { useDispatch } from 'react-redux';

import { getToken } from 'firebase/messaging';
import { messaging } from './firebase/firebase';

// import moengage from '@moengage/web-sdk';
// moengage.initialize({app_id: process.env})

import { socket } from './socket/connection';
import { getFormattedDurationHandler } from './helpers/helperMethods'
 
import Room from "./pages/Room";
import Login from "./pages/Login";
import Lobby from './pages/Lobby';

import { setAppDataHandler, setAuthHandler } from './Redux/root';

const callDetailsInit = {
  callDuration: ``,
  formattedTime: ``
}

function App() {

  const dispatch = useDispatch();

  const [callDetails, setCallDetails] = useState(callDetailsInit)

  const requestPermission = useCallback(async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Generate token.
      const token = await getToken(messaging, {
        vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
      });

      console.log(`Token: ${token}`);
      const userData = {
        ...JSON.parse(localStorage.getItem('userData')),
        fcm_token: token
      }
      localStorage.setItem('userData', JSON.stringify(userData));
      dispatch(setAuthHandler(userData));
    } else if (permission === 'denied') {
      alert(`You won't receive notifications.`);
    }
  }, [dispatch])

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    socket.emit("/home", JSON.stringify({
      ...JSON.parse(localStorage.getItem('userData')),
      ...JSON.parse(localStorage.getItem('call'))
    }));

    socket.on('/home-response', (data) => {
      console.log('/home-response', data);
      dispatch(setAppDataHandler({
        socketId: data?.socketId,
        allUsers: data?.allUsers
      }));
    });

    socket.on(`/other-participant-refresh`, (data) => {
      console.log('/other-participant-refresh', data);
      localStorage.setItem(`call`, JSON.stringify({
        ...JSON.parse(localStorage.getItem('call')),
        otherParticipantSocketId: data?.otherParticipantSocketId
      }))
    })
  }, [dispatch])


  useEffect(() => {
    const parsedCall = JSON.parse(localStorage.getItem('call'));
    if (parsedCall?.callEndTimeStamp) {
      const callDuration = Math.floor((parsedCall?.callEndTimeStamp - parsedCall?.callStartTimeStamp) / 1000);
      const formattedTime = getFormattedDurationHandler(callDuration);
      setCallDetails(callDetails => {
        return {
          ...callDetails,
          callDuration,
          formattedTime
        }
      })
    }
  }, []);


  // useEffect(() => {
  //   const fetchLocalStorageCall = localStorage.getItem('call');
  //   const parsedLocalStorageCall = JSON.parse(fetchLocalStorageCall);
  //   if (fetchLocalStorageCall && parsedLocalStorageCall?.callEnded) {
  //     socket.emit(`/delete-call-room-call-ended`, JSON.stringify({
  //       ...JSON.parse(fetchLocalStorageCall),
  //       otherParticipantSocketId: parsedLocalStorageCall?.otherParticipantSocketId
  //     }));

  //     if (parsedLocalStorageCall?.callDuration) {
  //       console.log(parsedLocalStorageCall?.callDuration);
  //     }
      
  //     localStorage.removeItem('call');
  //   }
  // }, [])

  console.log('App.js')


  return (
    <Router>
      <div>
        {/* Call Stats */}
        {callDetails.callDuration ? <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: '500',
          background: 'yellow',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <h3>Call Stats</h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <p>Call duration: <span style={{
              fontSize: '1.5rem'
            }}>{callDetails.formattedTime}</span></p>
            <button onClick={() => {
              setCallDetails(callDetailsInit)
              localStorage.removeItem('call')
            }}>Close</button>
          </div>
        </div> : null}
        {/* Call Stats */}
        <Switch>
          <Route exact path="/">
            <Login />
          </Route>
          <Route path="/room/:token" children={<Room />} />
          <Route path="/lobby" children={<Lobby />} />
        </Switch>
      </div>
    </Router>
  );
}

export default App;
