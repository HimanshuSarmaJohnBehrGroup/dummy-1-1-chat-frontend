import React from "react";
import { BsTelephoneFill, BsCameraVideoFill } from 'react-icons/bs';

const AllUsersInLogin = (props) => {
    const { user, setUser } = props;

    return (
        <div style={{
            display: 'flex',
            gap: '2rem',
            justifyContent: 'center'
        }}>
            <p>{user.name}</p>
            <div style={{
                display: 'flex',
                gap: '1rem'
            }}>
                <BsTelephoneFill style={{
                    fontSize: '1.5rem',
                    cursor: 'pointer'
                }} onClick={() => {
                    setUser(userState => {
                        return {
                            ...userState,
                            name: user.name,
                            callType: 'audio'
                        }
                    })
                }} />
                <BsCameraVideoFill style={{
                    fontSize: '1.5rem',
                    cursor: 'pointer'
                }} onClick={() => {
                    setUser(userState => {
                        return {
                            ...userState,
                            name: user.name,
                            callType: 'video'
                        }
                    })
                }} />
            </div>  
        </div>
    )
};

export default AllUsersInLogin;