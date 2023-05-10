import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const appDataSlice = createSlice({
    name: "appData",
    initialState: {
        auth: null,
        socketId: '',
        allUsers: [],
        callDetails: {
            callType: '',
            roomId: '',
            otherParticipant: {
                isMuted: false
            }
        },
        mixpanelInitialized: false
    },

    reducers: {
        setAppDataHandler(state, action) {
            state.socketId = action.payload?.socketId
            state.allUsers = action.payload?.allUsers
        },
        setAuthHandler(state, action) {
            state.auth = action.payload
        },
        setCallDetails(state, action) {
            console.log(action)
            const updateObj = {};

            action.payload.forEach(updateKey => {
                updateObj[updateKey.key] = updateKey.value;
            })
            
            state.callDetails = {
                ...state.callDetails,
                ...updateObj
            }
        },
        setCallDetailsOtherParticipantHandler(state, action) {
            state.callDetails = {
                ...state.callDetails,
                otherParticipant: {
                    ...state.callDetails.otherParticipant,
                    [action.payload.key]: action.payload.value
                }
            }
        },
        setMixpanelInitializedHandler(state, action) {
            console.log(action.payload);
            state.mixpanelInitialized = action.payload.value
        }
    },
  
    extraReducers: (builder) => {
    //   builder.addCase(setCategory.fulfilled, (state, action) => {
    //     if (action.payload) {
    //       state.category.val = action.payload;
    //       state.category.dataSet = true;
    //     }
    //   });
    },
});

export default appDataSlice.reducer;
export const {
    setAppDataHandler,
    setAuthHandler,
    setCallDetails,
    setCallDetailsOtherParticipantHandler,
    setMixpanelInitializedHandler
} = appDataSlice.actions;