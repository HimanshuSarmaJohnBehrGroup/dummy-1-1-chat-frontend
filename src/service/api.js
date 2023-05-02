
const BASE_API_URL = 'http://localhost:3000/'; // your application server URL


const fetchOptions = {
    headers: {
        "Content-Type": "application/json" ,
			"Access-Control-Allow-Origin" : "*"
    }
};

/**
 * Create Room xhr request
 */
export const createRoom = async () => {
    Object.assign(fetchOptions, {
        method: "POST",
        body: JSON.stringify({
            name: "room for multiparty video meeting",
            owner_ref: "multiparty github sample",
            settings: {
              description: "One-to-One-Video-Chat-Sample-Web-Application",
              scheduled: false,
              adhoc: true,
              moderators: 1,
              participants: 3,
              duration: 30,
              quality: "SD",
              auto_recording: false
            }
        })
    });
    const response = await fetch(BASE_API_URL + 'api/create-room/', fetchOptions);
    return await response.json();
}


/**
 * Join room method to make an xhr request to get new token
 */
export const joinRoom = async (payload) => {
    Object.assign(fetchOptions, {
        method: "POST",
        body: JSON.stringify(payload)
    });
    const response = await fetch(BASE_API_URL + 'api/create-token', fetchOptions);
    return await response.json();
}