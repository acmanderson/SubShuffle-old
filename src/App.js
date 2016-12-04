import React, {Component} from "react";
import {ReactScriptLoader, ReactScriptLoaderMixin} from "react-script-loader";
import Theme from "./Theme";
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import getMuiTheme from "material-ui/styles/getMuiTheme";
import AppBar from "material-ui/AppBar";
import ChannelDrawer from "./components/ChannelDrawer";
import injectTapEventPlugin from "react-tap-event-plugin";
import withWidth, {MEDIUM, LARGE} from 'material-ui/utils/withWidth';
import YouTube from 'react-youtube';
import IconButton from 'material-ui/IconButton';
import spacing from 'material-ui/styles/spacing';
import AvShuffle from 'material-ui/svg-icons/av/shuffle';
import AvSkipNext from 'material-ui/svg-icons/av/skip-next';
import AvSkipPrevious from 'material-ui/svg-icons/av/skip-previous';
import {
  red500, cyan700, red700,
  pinkA400, pinkA100, pinkA200,
  grey600, grey300, grey400, grey500, grey800, grey900,
  white, darkBlack, fullWhite,
} from 'material-ui/styles/colors';
import Paper from 'material-ui/Paper';
import "./App.css";

const SCRIPT_URL = "https://apis.google.com/js/client.js?onload=googleApiClientReady";
const OAUTH2_CLIENT_ID = '535577359868-1relqi1rem0jbpq6p8l4l8l1lbc69jae.apps.googleusercontent.com';
const OAUTH2_SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly'
];

// Needed for onTouchTap
// http://stackoverflow.com/a/34015469/988941
injectTapEventPlugin();

window.googleApiClientReady = function () {
    ReactScriptLoader.triggerOnScriptLoaded(SCRIPT_URL);
};

var App = React.createClass({
    // mixins: [ReactScriptLoaderMixin],
    getInitialState: () => ({
        scriptLoading: true,
        scriptLoadError: false,
        channelDrawerOpen: true,
        authenticated: false,
        channels: {},
        channelsLoaded: false,
        toggleAllChecked: true,
        muiTheme: getMuiTheme(Theme),
        currentVideoIndex: 0,
        loadedVideos: [],
        currentVideoId: null
    }),
    getScriptURL: () => SCRIPT_URL,
    deferOnScriptLoaded: () => true,
    childContextTypes: {
        muiTheme: React.PropTypes.object.isRequired,
    },
    getChildContext: function() {
        return {
            muiTheme: this.state.muiTheme,
        };
    },
    authorize: function (immediate) {
        const gapi = Object.assign({}, this.state.gapi);
        gapi.auth.authorize({
            client_id: OAUTH2_CLIENT_ID,
            scope: OAUTH2_SCOPES,
            immediate: immediate
        }, authResult => {
            this.setState({gapi}, () => {
                this.handleAuthResult(authResult);
            })
        });
    },
    checkAuth: function() {
        this.authorize(true);
    },
    handleAuthResult: function(authResult) {
        const gapi = Object.assign({}, this.state.gapi);
        if (authResult && !authResult.error) {
            gapi.client.load('youtube', 'v3').then(() => {
                this.setState({gapi: gapi, authenticated: true});
                this.requestSubscriptions();
            }, reason => {
                console.error(reason);
            });
        } else {
            this.authorize(false);
        }
    },
    requestSubscriptions: function(pageToken) {
        const gapi = this.state.gapi;
        const requestOpts = {
            mine: true,
            part: 'snippet',
            maxResults: 50,
            fields: 'items(snippet(resourceId(channelId),thumbnails(default),title)),nextPageToken',
            order: 'alphabetical'
        };
        if (pageToken) {
            requestOpts.pageToken = pageToken;
        }

        gapi.client.youtube.subscriptions.list(requestOpts).then(res => {
            let channels = Object.assign({}, this.state.channels);
            Object.assign(channels, res.result.items.reduce((acc, v) => {
                let channel = v.snippet;
                channel.selected = true;
                acc[v.snippet.resourceId.channelId] = channel;
                return acc;
            }, {}));

            this.setState({channels}, () => {
                const nextPageToken = res.result.nextPageToken;
                if (nextPageToken) {
                    this.requestSubscriptions(nextPageToken);
                } else {
                    this.getUploadData();
                }
            }, reason => {
                console.error(reason);
            });
        });
    },
    onScriptLoaded: function () {
        this.setState({scriptLoading: false, gapi: window.gapi}, () => {
            const gapi = Object.assign({}, this.state.gapi);
            gapi.auth.init(this.checkAuth);
            this.setState({gapi: gapi});
        });
    },
    onScriptError: function () {
        this.setState({scriptLoading: false, scriptLoadError: true});
    },
    handleChannelSelected: function (channelId, checked) {
        let channels = Object.assign({}, this.state.channels);
        channels[channelId].selected = checked;
        this.setState({channels});
    },
    handleAllChannelsSelected: function(_, checked) {
        let channels = Object.assign({}, this.state.channels);
        for (const channelId in channels) {
            channels[channelId].selected = checked;
        }
        this.setState({channels: channels, toggleAllChecked: checked});
    },
    getUploadData: function(pageToken) {
        let { gapi, channels } = Object.assign({}, this.state);
        let requestOpts = {
            part: 'statistics,contentDetails',
            maxResults: 50,
            fields: 'items(id,statistics(videoCount),contentDetails(relatedPlaylists(uploads))),nextPageToken',
            id: Object.keys(channels).join(',')
        };
        if (pageToken) {
            requestOpts.pageToken = pageToken;
        }

        gapi.client.youtube.channels.list(requestOpts).then(res => {
            const items = res.result.items;
            for (const channelId in items) {
                const val = items[channelId];
                const videoCount = parseInt(val.statistics.videoCount);
                if (videoCount > 0) {
                    channels[val.id].uploadsPlaylistId = val.contentDetails.relatedPlaylists.uploads;
                    // TODO: update paging calculation to allow for more than 7936 videos
                    channels[val.id].videoCount = Math.min(videoCount, 7936);
                    channels[val.id].videoList = [...Array(videoCount).keys()];
                } else {
                    delete channels[val.id];
                }
            }
            this.setState({channels}, () => {
                const nextPageToken = res.result.nextPageToken;
                if (nextPageToken) {
                    this.getUploadData(nextPageToken);
                } else {
                    this.setState({channelsLoaded: true});
                    this.loadRandomVideo();
                }
            });
        }, reason => {
            console.error(reason);
        })
    },
    getRandomChannelAndIndex: function() {
        let channels = Object.assign({}, this.state.channels);
        let selectedChannels = Object.keys(channels).filter(channelId => {
            return channels[channelId] && channels[channelId].selected;
        });
        const randomChannelId = selectedChannels[selectedChannels.length * Math.random() << 0];
        const randomChannelData = channels[randomChannelId];
        const videoList = randomChannelData.videoList;
        const randomIndex = videoList.splice(videoList.length * Math.random() << 0, 1)[0];

        if (videoList.length <= 0) {
            channels[randomChannelId].videoList = [...Array(randomChannelData.videoCount).keys()];
            this.setState({channels});
        }

        return {
            playlist: randomChannelData.uploadsPlaylistId,
            index: randomIndex
        }
    },
    loadRandomVideo: function() {
        const videoData = this.getRandomChannelAndIndex();
        if (videoData == null) {
            return
        }

        const token = this.indexToToken(videoData.index);
        const requestOpts = {
            part: 'snippet',
            maxResults: 1,
            fields: 'items(snippet(resourceId(videoId)))',
            order: 'alphabetical',
            playlistId: videoData.playlist,
            pageToken: token
        };

        this.state.gapi.client.youtube.playlistItems.list(requestOpts).then(res => {
            const videoId = res.result.items[0].snippet.resourceId.videoId;
            let { loadedVideos } = Object.assign({}, this.state);
            loadedVideos.push(videoId);
            this.setState({
               currentVideoIndex: loadedVideos.length,
                loadedVideos: loadedVideos,
                currentVideoId: videoId,
            });
        }, reason => {
            console.error(reason);
        });
    },
    indexToToken: function(index) {
        var token = [];
        var ranges = ["AEIMQUYcgkosw048", "IJKLMNOP", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"];
        for (var i = 0; i < ranges.length; i++) {
            var range = ranges[i].split("");
            var temp = index % range.length;
            token.push(range[temp]);
            index = parseInt(index / range.length);
        }
        return `C${token[1]}${token[0]}${token[2]}EAA`;
    },
    getStyles: function() {
        const contentHeight = `calc(100vh - 2 * ${spacing.desktopGutter}px - ${spacing.desktopKeylineIncrement}px)`;
        const styles = {
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
                height: contentHeight,
            },
            contentWhenMedium: {
                margin: spacing.desktopGutter,
            }
        };

        // if (this.props.width === MEDIUM || this.props.width === LARGE) {
        //   styles.content = Object.assign(styles.content, styles.contentWhenMedium);
        // }

        return styles;
    },
    render: function () {
        if (!this.state.channelsLoaded) {
            return (
                <h1>hey!</h1>
            );
        }
        let { channelDrawerOpen } = this.state;
        let docked = false;
        const {
          prepareStyles,
        } = this.state.muiTheme;
        const styles = this.getStyles();

        if (this.props.width === LARGE) {
            docked = true;
            channelDrawerOpen = true;

            styles.navDrawer = {
                zIndex: styles.appBar.zIndex - 1,
            };
            styles.root.paddingLeft = 256;
            // styles.footer.paddingLeft = 256;
        }
        console.log(this.state.currentVideoId);
        return (
            <div>
                <AppBar
                    title="SubShuffle"
                    onLeftIconButtonTouchTap={() => this.setState({channelDrawerOpen: !channelDrawerOpen})}
                    style={styles.appBar}
                    iconElementRight={
                        <div>
                            <IconButton disabled={this.state.currentVideoIndex == 1} onTouchTap={() => {
                                const newVideoIndex = this.state.currentVideoIndex - 1;
                                this.setState({
                                    currentVideoIndex: newVideoIndex,
                                    currentVideoId: this.state.loadedVideos[newVideoIndex - 1],
                                }, () => {console.log(this.state)});
                            }}><AvSkipPrevious /></IconButton>
                            <IconButton onTouchTap={() => {
                                this.loadRandomVideo();
                            }}><AvShuffle /></IconButton>
                            <IconButton disabled={this.state.currentVideoIndex >= this.state.loadedVideos.length} onTouchTap={() => {
                                const newVideoIndex = this.state.currentVideoIndex + 1;
                                this.setState({
                                   currentVideoIndex: newVideoIndex,
                                    currentVideoId: this.state.loadedVideos[newVideoIndex - 1],
                                });
                            }}><AvSkipNext /></IconButton>
                        </div>
                    }
                />
                <div style={prepareStyles(styles.root)}>
                    <div style={prepareStyles(styles.content)}>
                        <Paper zDepth={1} style={{padding: `20px 20px`, height: `100%`}}>
                            <YouTube
                                videoId={this.state.currentVideoId}
                                opts={{width: `100%`, height: `100%`, playerVars: {autoplay: 0}}}
                              />
                        </Paper>
                    </div>
                </div>
                <ChannelDrawer
                    open={channelDrawerOpen}
                    docked={docked}
                    onRequestChange={(channelDrawerOpen) => this.setState({channelDrawerOpen})}
                    gapi={this.state.gapi}
                    channels={this.state.channels}
                    handleChannelSelected={this.handleChannelSelected}
                    handleAllChannelsSelected={this.handleAllChannelsSelected}
                    toggleAllChecked={this.state.toggleAllChecked}
                    style={styles.navDrawer}
                />
            </div>
        );
    }
});

export default withWidth()(App);
