import React, { useEffect } from "react";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";

const Lobby = () => {

    const history = useHistory();

    useEffect(() => {
        history.push('/')
    }, [])

    return (
        <>
            <h1>Lobby area</h1>
        </>
    )
}

export default Lobby;