import React, {Component} from "react";
import {connect} from "react-redux";
import injectTapEventPlugin from "react-tap-event-plugin";
import { createAction } from 'redux-actions';
import ChannelDrawer from "./ChannelDrawer"
import CircularProgress from "material-ui/CircularProgress";
import Theme from "./Theme";
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import getMuiTheme from "material-ui/styles/getMuiTheme";
import {grey800} from "material-ui/styles/colors";
import IconButton from 'material-ui/IconButton';
import spacing from 'material-ui/styles/spacing';
import AvShuffle from 'material-ui/svg-icons/av/shuffle';
import AvSkipNext from 'material-ui/svg-icons/av/skip-next';
import AvSkipPrevious from 'material-ui/svg-icons/av/skip-previous';
import withWidth, {MEDIUM, LARGE} from 'material-ui/utils/withWidth';
import YouTube from 'react-youtube';
import Paper from 'material-ui/Paper';
import AppBar from "material-ui/AppBar";



// Needed for onTouchTap
// http://stackoverflow.com/a/34015469/988941
injectTapEventPlugin();

const addChannel = createAction('ADD_CHANNEL');
const updateChannel = createAction('UPDATE_CHANNEL');
const deleteChannel = createAction('DELETE_CHANNEL');
const setChannelsLoaded = createAction('CHANNELS_LOADED');
const videoLoaded = createAction('VIDEO_LOADED');
const channelToggled = createAction('CHANNEL_TOGGLED');
const setToggleAllChecked = createAction('SET_TOGGLE_ALL_CHECKED');
const setChannelDrawerOpen = createAction('SET_CHANNEL_DRAWER_OPEN');
const setMuiTheme = createAction('SET_MUI_THEME');
const previousVideoLoaded = createAction('PREVIOUS_VIDEO_LOADED');
const nextVideoLoaded = createAction('NEXT_VIDEO_LOADED');

const styles = {
    appBar: {
        position: 'fixed',
        zIndex: getMuiTheme(Theme).zIndex.appBar + 1,
        top: 0,
    },
    root: {
        paddingTop: spacing.desktopKeylineIncrement,
        paddingBottom: spacing.desktopGutter,
        minHeight: 400,
        backgroundColor: grey800,
    },
    content: {
        margin: spacing.desktopGutter,
        marginBottom: 0,
        height: `calc(100vh - 2 * ${spacing.desktopGutter}px - ${spacing.desktopKeylineIncrement}px)`,
    },
    paper: {
        padding: `20px 20px`,
        height: `100%`,
    },
};

function indexToToken(index) {
    let token = [];
    const ranges = ["AEIMQUYcgkosw048", "IJKLMNOP", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"];
    for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i].split("");
        const temp = index % range.length;
        token.push(range[temp]);
        index = parseInt(index / range.length);
    }
    return `C${token[1]}${token[0]}${token[2]}EAA`;
}

class Main extends Component {
    constructor(props) {
        super(props);

        this.state = {muiTheme: getMuiTheme(Theme)};

        const {channelsLoaded} = props;
        if (channelsLoaded) {
            return;
        }

        this.requestSubscriptions();
    }

    getChildContext() {
        return {
            muiTheme: this.state.muiTheme,
        }
    }

    requestSubscriptions(pageToken = null) {
        const {yt, dispatch} = this.props;
        const requestOpts = {
            mine: true,
            part: 'snippet',
            maxResults: 50,
            fields: 'items(snippet(resourceId(channelId),thumbnails(default),title)),nextPageToken',
            order: 'alphabetical',
            pageToken: pageToken,
        };

        yt.subscriptions.list(requestOpts).then(res => {
            const items = res.result.items;
            for (const channelId in items) {
                const snippet = items[channelId].snippet;
                dispatch(addChannel({
                    [snippet.resourceId.channelId]: {
                        title: snippet.title,
                        thumbnailUrl: snippet.thumbnails.default.url,
                    }
                }));
            }

            const nextPageToken = res.result.nextPageToken;
            if (nextPageToken) {
                this.requestSubscriptions(nextPageToken);
            } else {
                this.getUploadData();
            }
        }, reason => console.error(reason));
    }

    getUploadData(pageToken = null) {
        const { yt, channels, dispatch } = this.props;
        let requestOpts = {
            part: 'statistics,contentDetails',
            maxResults: 50,
            fields: 'items(id,statistics(videoCount),contentDetails(relatedPlaylists(uploads))),nextPageToken',
            id: Object.keys(channels).join(',')
        };
        if (pageToken) {
            requestOpts.pageToken = pageToken;
        }

        yt.channels.list(requestOpts).then(res => {
           const items = res.result.items;
           for (const i in items) {
               const channelData = items[i];
               const channelId = channelData.id;
               const videoCount = parseInt(channelData.statistics.videoCount);
               if (videoCount > 0) {
                   dispatch(updateChannel({
                       channelId,
                       data: {
                           uploadsPlaylistId: channelData.contentDetails.relatedPlaylists.uploads,
                           // TODO: update paging calculation to allow for more than 7936 videos
                           videoCount: Math.min(videoCount, 7936),
                           videoList: [...Array(videoCount).keys()],
                       }
                   }));
               } else {
                    dispatch(deleteChannel(channelId));
               }
           }

           const nextPageToken = res.result.nextPageToken;
           if (nextPageToken) {
               this.getUploadData(nextPageToken);
           } else {
               this.loadRandomVideo();
               dispatch(setChannelsLoaded(true));
           }
        }, reason => console.error(reason));
    }

    loadRandomVideo() {
        const { yt, dispatch } = this.props;
        const videoData = this.getRandomChannelAndIndex();
        const token = indexToToken(videoData.index);
        const requestOpts = {
            part: 'snippet',
            maxResults: 1,
            fields: 'items(snippet(resourceId(videoId)))',
            order: 'alphabetical',
            playlistId: videoData.playlist,
            pageToken: token
        };

        yt.playlistItems.list(requestOpts).then(res => {
            const videoId = res.result.items[0].snippet.resourceId.videoId;
            dispatch(videoLoaded(videoId));
        }, reason => console.error(reason))
    }

    getRandomChannelAndIndex() {
        const { selectedChannels, channels, dispatch } = this.props;
        const randomChannelId = selectedChannels[selectedChannels.length * Math.random() << 0];
        const randomChannelData = channels[randomChannelId];
        const videoList = randomChannelData.videoList;
        const randomIndex = videoList.splice(videoList.length * Math.random() << 0, 1)[0];

        if (videoList.length <= 0) {
            dispatch(updateChannel({
                randomChannelId,
                data: {
                    videoList: [...Array(randomChannelData.videoCount).keys()],
                }
            }))
        }

        return {
            playlist: randomChannelData.uploadsPlaylistId,
            index: randomIndex,
        }
    }

    render() {
        const { channelsLoaded, currentIndex, loadedVideos, channels, selectedChannels, toggleAllChecked, dispatch } = this.props;
        let channelDrawerOpen = this.props.channelDrawerOpen;

        if (!channelsLoaded) {
            return (
                <MuiThemeProvider muiTheme={this.state.muiTheme}>
                    <div style={{width: `100vw`, height: `100vh`, backgroundColor: grey800}}>
                        <CircularProgress size={40} style={{left: `calc(50% - 20px)`, top: `calc(50% - 20px)`,}}/>
                    </div>
                </MuiThemeProvider>
            )
        }

        let docked = false;
        const {prepareStyles} = this.state.muiTheme;
        if (this.props.width === LARGE) {
            docked = true;
            channelDrawerOpen = true;

            styles.navDrawer = {
                zIndex: styles.appBar.zIndex - 1,
            };
            styles.root.paddingLeft = 256;
            // styles.footer.paddingLeft = 256;
        }

        return (
            <div>
                <AppBar
                    title="SubShuffle"
                    onLeftIconButtonTouchTap={() => dispatch(setChannelDrawerOpen(!channelDrawerOpen))}
                    style={styles.appBar}
                    iconElementRight={
                        <div>
                            <IconButton
                                disabled={currentIndex == 0}
                                onTouchTap={() => dispatch(previousVideoLoaded())}
                            ><AvSkipPrevious /></IconButton>
                            <IconButton
                                onTouchTap={() => this.loadRandomVideo()}
                            ><AvShuffle /></IconButton>
                            <IconButton
                                disabled={currentIndex == loadedVideos.length - 1}
                                onTouchTap={() => dispatch(nextVideoLoaded())}
                            ><AvSkipNext /></IconButton>
                        </div>
                    }
                />
                <div style={prepareStyles({...styles.root})}>
                    <div style={prepareStyles({...styles.content})}>
                        <Paper zDepth={1} style={styles.paper}>
                            <YouTube
                                videoId={loadedVideos[currentIndex]}
                                opts={{
                                    width: `100%`,
                                    height: `100%`,
                                    playerVars: {
                                        autoplay: 1,
                                    },
                                }}
                            />
                        </Paper>
                    </div>
                </div>
                <ChannelDrawer
                    open={channelDrawerOpen}
                    docked={docked}
                    onRequestChange={channelDrawerOpen => dispatch(setChannelDrawerOpen(channelDrawerOpen))}
                    channels={channels}
                    selectedChannels={selectedChannels}
                    onChannelToggled={(channelId, checked) => dispatch(channelToggled({channelId, checked}))}
                    onAllChannelsToggled={(_, checked) => {
                        for (const channelId in channels) {
                            dispatch(channelToggled({channelId, checked}));
                        }
                        dispatch(setToggleAllChecked(checked));
                    }}
                    toggleAllChecked={toggleAllChecked}
                    style={styles.navDrawer}
                />
            </div>
        )
    }
}

Main.childContextTypes = {
    muiTheme: React.PropTypes.object.isRequired,
};

export default connect(state => ({
    channels: state.channels.channels,
    selectedChannels: state.channels.selectedChannels,
    yt: state.gapi.client.youtube,
    channelsLoaded: state.channelsLoaded,
    loadedVideos: state.loadedVideos.loadedVideos,
    currentIndex: state.loadedVideos.currentIndex,
    muiTheme: state.muiTheme,
    toggleAllChecked: state.toggleAllChecked,
    channelDrawerOpen: state.channelDrawerOpen,
}))(Main);