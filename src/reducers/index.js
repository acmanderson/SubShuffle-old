import {combineReducers} from 'redux';
import {handleActions} from 'redux-actions';

const loginState = handleActions({
    SET_USER_NEEDS_TO_AUTHENTICATE: (state, action) => ({...state, userNeedsToAuthenticate: action.payload}),
    SET_USER_AUTHENTICATED: (state, action) => ({...state, userAuthenticated: action.payload}),
    SET_GAPI: (state, action) => ({...state, gapi: action.payload}),
}, {
    userNeedsToAuthenticate: false,
    userAuthenticated: false,
    gapi: null,
});

const mainState = handleActions({
    SET_MAIN_STATE: (state, action) => ({...state, ...action.payload}),
}, {
    channelsLoaded: false,
    toggleAllChecked: true,
    channelDrawerOpen: false,
});

const channelState = handleActions({
    ADD_CHANNEL: (state, action) => ({
        selectedChannels: [...state.selectedChannels, Object.keys(action.payload)[0]],
        channels: {...state.channels, ...action.payload},
    }),
    UPDATE_CHANNEL: (state, action) => {
        const updatedChannel = {...state.channels[action.payload.channelId], ...action.payload.data};
        const updatedChannels = {...state.channels, [action.payload.channelId]: updatedChannel};
        return {...state, channels: updatedChannels};
    },
    DELETE_CHANNEL: (state, action) => {
        let selectedChannels = [...state.selectedChannels];
        const index = selectedChannels.indexOf(action.payload);
        if (index !== -1) {
            selectedChannels.splice(index, 1);
        }

        const channels = {...state.channels};
        delete channels[action.payload];

        return {selectedChannels, channels};
    },
    TOGGLE_CHANNEL: (state, action) => {
        let selectedChannels = [...state.selectedChannels];
        const {channelId, checked} = action.payload;
        const index = selectedChannels.indexOf(channelId);
        if (index === -1 && checked) {
            selectedChannels = [...selectedChannels, channelId]
        } else if (index !== -1 && !checked) {
            selectedChannels.splice(index, 1);
        }

        return {...state, selectedChannels};
    },
    TOGGLE_ALL_CHANNELS: (state, action) => ({
        ...state,
        selectedChannels: action.payload ? Object.keys(state.channels) : [],
    }),
}, {selectedChannels: [], channels: {}});

const loadedVideoState = handleActions({
    LOAD_RANDOM_VIDEO: (state, action) => ({
        loadedVideos: [...state.loadedVideos, action.payload],
        currentIndex: state.loadedVideos.length,
    }),
    LOAD_PREVIOUS_VIDEO: (state, action) => ({
        ...state,
        currentIndex: state.currentIndex - 1,
    }),
    LOAD_NEXT_VIDEO: (state, action) => ({
        ...state,
        currentIndex: state.currentIndex + 1,
    }),
}, {loadedVideos: [], currentIndex: -1});

const rootReducer = combineReducers({
    loginState,
    mainState,
    channelState,
    loadedVideoState,
});

export default rootReducer;