import React, {Component} from "react";
import {ReactScriptLoader, ReactScriptLoaderMixin} from "react-script-loader";
import Theme from "./Theme";
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import getMuiTheme from "material-ui/styles/getMuiTheme";
import AppBar from "material-ui/AppBar";
import ChannelDrawer from "./ChannelDrawer";
import injectTapEventPlugin from "react-tap-event-plugin";
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
    mixins: [ReactScriptLoaderMixin],
    getInitialState: () => ({
        scriptLoading: true,
        scriptLoadError: false,
        channelDrawerOpen: true,
        authenticated: false,
        channels: {},
        channelsLoaded: false,
        toggleAllChecked: true,
    }),
    getScriptURL: () => SCRIPT_URL,
    deferOnScriptLoaded: () => true,
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
                    this.setState({channelsLoaded: true});
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
    render: function () {
        if (!this.state.channelsLoaded) {
            return (
                <h1>hey!</h1>
            );
        }
        return (
            <MuiThemeProvider muiTheme={getMuiTheme(Theme)}>
                <div>
                    <AppBar
                        title="SubShuffle"
                        onLeftIconButtonTouchTap={() => this.setState({channelDrawerOpen: true})}
                    />
                    <ChannelDrawer
                        open={this.state.channelDrawerOpen}
                        onRequestChange={(channelDrawerOpen) => this.setState({channelDrawerOpen})}
                        gapi={this.state.gapi}
                        channels={this.state.channels}
                        handleChannelSelected={this.handleChannelSelected}
                        handleAllChannelsSelected={this.handleAllChannelsSelected}
                        toggleAllChecked={this.state.toggleAllChecked}
                    />
                </div>
            </MuiThemeProvider>
        );
    }
});

export default App;
