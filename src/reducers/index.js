import {combineReducers} from 'redux';
import {handleAction, handleActions} from 'redux-actions';

const needToAuthenticate = handleAction('NEED_TO_AUTHENTICATE', {
    next(state, action) {
        return action.payload;
    },
    throw(state, action) {}
}, false);

const authenticated = handleAction('AUTHENTICATED', {
    next(state, action) {
        return action.payload;
    },
    throw(state, action) {}
}, false);

const gapi = handleAction('SET_GAPI', {
    next(state, action) {
        return action.payload;
    },
    throw(state, action) {}
}, null);

const muiTheme = handleAction('SET_MUI_THEME', {
    next(state, action) {
        return action.payload;
    },
    throw(state, action) {}
}, null);

const channelsLoaded = handleAction('CHANNELS_LOADED', {
    next(state, action) {
        return action.payload;
    },
    throw(state, action) {}
}, false);

const toggleAllChecked = handleAction('SET_TOGGLE_ALL_CHECKED', {
    next(state, action) {
        return action.payload;
    },
    throw(state, action) {}
}, true);

const channelDrawerOpen = handleAction('SET_CHANNEL_DRAWER_OPEN', {
    next(state, action) {
        return action.payload;
    },
    throw(state, action) {}
}, false);

const channels = handleActions({
    ADD_CHANNEL: (state, action) => ({
        selectedChannels: [...state.selectedChannels, Object.keys(action.payload)[0]],
        channels: Object.assign({}, state.channels, action.payload),
    }),
    UPDATE_CHANNEL: (state, action) => {
        const updatedChannel = {...state.channels[action.payload.channelId], ...action.payload.data};
        const updatedChannels = {...state.channels, [action.payload.channelId]: updatedChannel};
        return {...state, channels: updatedChannels};
    },
    DELETE_CHANNEL: (state, action) => {
        let selectedChannels = [...state.selectedChannels];
        const index = selectedChannels.indexOf(action.payload);
        if (index != -1) {
            selectedChannels.splice(index, 1);
        }

        const channels = {...state.channels};
        delete channels[action.payload];

        return {selectedChannels, channels};
    },
    CHANNEL_TOGGLED: (state, action) => {
        let selectedChannels = [...state.selectedChannels];
        const {channelId, checked} = action.payload;
        const index = selectedChannels.indexOf(channelId);
        if (index == -1 && checked) {
            selectedChannels = [...selectedChannels, channelId]
        } else if (index != -1 && !checked) {
            selectedChannels.splice(index, 1);
        }

        return {...state, selectedChannels};
    }
}, {selectedChannels: [], channels: {}});

const loadedVideos = handleActions({
    VIDEO_LOADED: (state, action) => ({
        loadedVideos: [...state.loadedVideos, action.payload],
        currentIndex: state.loadedVideos.length,
    }),
    PREVIOUS_VIDEO_LOADED: (state, action) => ({
        ...state,
        currentIndex: state.currentIndex - 1,
    }),
    NEXT_VIDEO_LOADED: (state, action) => ({
        ...state,
        currentIndex: state.currentIndex + 1,
    }),
}, {loadedVideos: [], currentIndex: -1});

const rootReducer = combineReducers({
    needToAuthenticate,
    gapi,
    authenticated,
    channels,
    channelsLoaded,
    loadedVideos,
    toggleAllChecked,
    channelDrawerOpen,
    muiTheme,
});

export default rootReducer;