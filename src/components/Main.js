import React, {Component} from "react";
import {connect} from "react-redux";
import injectTapEventPlugin from "react-tap-event-plugin";
import YouTube from "react-youtube";
import {createActions} from "redux-actions";
import ChannelDrawer from "./ChannelDrawer";
import Theme from "../Theme";
import Loading from "./Loading";
import getMuiTheme from "material-ui/styles/getMuiTheme";
import {grey800} from "material-ui/styles/colors";
import spacing from "material-ui/styles/spacing";
import IconButton from "material-ui/IconButton";
import AvShuffle from "material-ui/svg-icons/av/shuffle";
import AvSkipNext from "material-ui/svg-icons/av/skip-next";
import AvSkipPrevious from "material-ui/svg-icons/av/skip-previous";
import MoreVertIcon from "material-ui/svg-icons/navigation/more-vert";
import withWidth, {LARGE} from "material-ui/utils/withWidth";
import Paper from "material-ui/Paper";
import AppBar from "material-ui/AppBar";
import MenuItem from "material-ui/MenuItem";
import IconMenu from "material-ui/IconMenu";

// Needed for onTouchTap
// http://stackoverflow.com/a/34015469/988941
injectTapEventPlugin();

const {
    setMainState,
    addChannel,
    updateChannel,
    deleteChannel,
    toggleChannel,
    toggleAllChannels,
    loadRandomVideo,
    loadPreviousVideo,
    loadNextVideo,
} = createActions(
    'SET_MAIN_STATE',
    'ADD_CHANNEL',
    'UPDATE_CHANNEL',
    'DELETE_CHANNEL',
    'TOGGLE_CHANNEL',
    'TOGGLE_ALL_CHANNELS',
    'LOAD_RANDOM_VIDEO',
    'LOAD_PREVIOUS_VIDEO',
    'LOAD_NEXT_VIDEO',
    'SET_GAPI',
);

function indexToToken(index) {
    let token = [];
    const ranges = ["AEIMQUYcgkosw048", "IJKLMNOP", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"];
    for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i].split("");
        const temp = index % range.length;
        token.push(range[temp]);
        index = parseInt(index / range.length, 10);
    }
    return `C${token[1]}${token[0]}${token[2]}EAA`;
}

function chunkArray(array, chunkSize) {
    let chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

class Main extends Component {
    constructor(props) {
        super(props);

        // some material-ui components need the muiTheme context which
        // requires using component state
        this.state = {muiTheme: getMuiTheme(Theme)};

        const {channelsLoaded, gapi, router} = props;
        if (channelsLoaded) {
            return;
        }
        gapi.auth2.getAuthInstance().isSignedIn.listen(status => {
            if (!status) {
                router.push('/login');
            }
        })

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
            for (let i = 0; i < items.length; i++) {
                const snippet = items[i].snippet;
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
        const {yt, channels, dispatch} = this.props;
        const promises = [];
        for (const channelsChunk of chunkArray(Object.keys(channels), 50)) {
            let requestOpts = {
                part: 'statistics,contentDetails',
                maxResults: 50,
                fields: 'items(id,statistics(videoCount),contentDetails(relatedPlaylists(uploads))),nextPageToken',
                id: channelsChunk.join(',')
            };
            if (pageToken) {
                requestOpts.pageToken = pageToken;
            }

            promises.push(yt.channels.list(requestOpts).then(res => {
                const items = res.result.items;
                for (let i = 0; i < items.length; i++) {
                    const channelData = items[i];
                    const channelId = channelData.id;
                    const videoCount = parseInt(channelData.statistics.videoCount, 10);
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
                }
            }, reason => console.error(reason)));
        }

        Promise.all(promises).then(() => {
            this.loadRandomVideo();
            dispatch(setMainState({channelsLoaded: true}));
        })
    }

    loadRandomVideo() {
        const {yt, dispatch} = this.props;
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
            dispatch(loadRandomVideo(videoId));
        }, err => {
            console.error(err);
        });
    }

    getRandomChannelAndIndex() {
        const {selectedChannels, channels, dispatch} = this.props;
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

    getStyles() {
        return {
            appBar: {
                position: 'fixed',
                zIndex: this.state.muiTheme.zIndex.appBar + 1,
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
    }

    render() {
        const {
            channelsLoaded,
            currentIndex,
            loadedVideos,
            channels,
            selectedChannels,
            toggleAllChecked,
            dispatch
        } = this.props;
        let channelDrawerOpen = this.props.channelDrawerOpen;
        const styles = this.getStyles();

        if (!channelsLoaded) {
            return (
                <Loading/>
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
        }

        return (
            <div>
                <AppBar
                    title="SubShuffle"
                    onLeftIconButtonTouchTap={() => dispatch(setMainState({channelDrawerOpen: !channelDrawerOpen}))}
                    style={styles.appBar}
                    iconElementRight={
                        <div>
                            <IconButton
                                disabled={currentIndex === 0}
                                onTouchTap={() => dispatch(loadPreviousVideo())}
                            ><AvSkipPrevious/></IconButton>
                            <IconButton
                                disabled={selectedChannels.length === 0}
                                onTouchTap={() => this.loadRandomVideo()}
                            ><AvShuffle/></IconButton>
                            <IconButton
                                disabled={currentIndex === loadedVideos.length - 1}
                                onTouchTap={() => dispatch(loadNextVideo())}
                            ><AvSkipNext/></IconButton>
                            <IconMenu
                                iconButtonElement={
                                    <IconButton><MoreVertIcon/></IconButton>
                                }
                                targetOrigin={{horizontal: 'left', vertical: 'top'}}
                                anchorOrigin={{horizontal: 'left', vertical: 'top'}}
                            >
                                <MenuItem
                                    primaryText="GitHub"
                                    leftIcon={
                                        <IconButton
                                            iconClassName="github-icon"
                                        />
                                    }
                                    href="https://github.com/acmanderson/SubShuffle"
                                />
                            </IconMenu>
                        </div>
                    }
                />
                <div style={prepareStyles(styles.root)}>
                    <div style={prepareStyles(styles.content)}>
                        <Paper zDepth={2} style={styles.paper}>
                            <YouTube
                                videoId={loadedVideos[currentIndex]}
                                onEnd={() => this.loadRandomVideo()}
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
                    onRequestChange={channelDrawerOpen => dispatch(setMainState({channelDrawerOpen}))}
                    channels={channels}
                    selectedChannels={selectedChannels}
                    onChannelToggled={(channelId, checked) => dispatch(toggleChannel({channelId, checked}))}
                    onAllChannelsToggled={(_, checked) => {
                        dispatch(toggleAllChannels(checked));
                        dispatch(setMainState({toggleAllChecked: checked}));
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

export default withWidth()(connect(state => ({
    channelsLoaded: state.mainState.channelsLoaded,
    toggleAllChecked: state.mainState.toggleAllChecked,
    channelDrawerOpen: state.mainState.channelDrawerOpen,
    gapi: state.loginState.gapi,
    yt: state.loginState.gapi.client.youtube,
    channels: state.channelState.channels,
    selectedChannels: state.channelState.selectedChannels,
    loadedVideos: state.loadedVideoState.loadedVideos,
    currentIndex: state.loadedVideoState.currentIndex,
}))(Main));