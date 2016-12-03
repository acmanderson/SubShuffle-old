import React, {Component} from "react";
import {ReactScriptLoader, ReactScriptLoaderMixin} from "react-script-loader";
import {connect} from "react-redux";
import CircularProgress from "material-ui/CircularProgress";
import Theme from "./Theme";
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import getMuiTheme from "material-ui/styles/getMuiTheme";
import {grey800} from "material-ui/styles/colors";
import Dialog from "material-ui/Dialog";
import FlatButton from "material-ui/FlatButton";
import { createAction } from 'redux-actions';

const SCRIPT_URL = "https://apis.google.com/js/client.js?onload=googleApiClientReady";
const OAUTH2_CLIENT_ID = '535577359868-1relqi1rem0jbpq6p8l4l8l1lbc69jae.apps.googleusercontent.com';
const OAUTH2_SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly'
];

const needToAuthenticate = createAction('NEED_TO_AUTHENTICATE');
const authenticated = createAction('AUTHENTICATED');
const setGapi = createAction('SET_GAPI');

window.googleApiClientReady = function () {
    ReactScriptLoader.triggerOnScriptLoaded(SCRIPT_URL);
};

let Login = React.createClass({
    mixins: [ReactScriptLoaderMixin],
    getScriptURL: () => SCRIPT_URL,
    deferOnScriptLoaded: () => true,
    onScriptLoaded: function () {
        const {dispatch} = this.props;
        const gapi = Object.assign({}, window.gapi);
        gapi.auth.init(this.authorize);
        dispatch(setGapi(gapi));
    },
    onScriptError: function () {

    },
    authorize: function (immediate = true) {
        const {gapi, dispatch} = this.props;
        gapi.auth.authorize({
            client_id: OAUTH2_CLIENT_ID,
            scope: OAUTH2_SCOPES,
            immediate: immediate,
        }, authResult => {
            dispatch(setGapi(gapi));
            this.handleAuthResult(authResult);
        });
    },
    handleAuthResult: function (authResult) {
        const {gapi, dispatch, router} = this.props;
        if (authResult && !authResult.error) {
            gapi.client.load('youtube', 'v3').then(() => {
                dispatch(setGapi(gapi));
                dispatch(needToAuthenticate(false));
                dispatch(authenticated(true));
                router.push('/');
            }, reason => {
                console.error(reason);
            });
        } else {
            dispatch(needToAuthenticate(true));
        }
    },
    render: function () {
        const {needToAuthenticate} = this.props;
        const dialogActions = [
            <FlatButton
                label="Sign In"
                primary={true}
                onTouchTap={() => this.authorize(false)}
            />,
        ];
        return (
            <MuiThemeProvider muiTheme={getMuiTheme(Theme)}>
                <div style={{width: `100vw`, height: `100vh`, backgroundColor: grey800}}>
                    <CircularProgress size={40} style={{left: `calc(50% - 20px)`, top: `calc(50% - 20px)`,}}/>
                    <Dialog
                        open={needToAuthenticate == true}
                        title="SubShuffle"
                        actions={dialogActions}
                        modal={true}
                    >
                        SubShuffle requires read-only access to your YouTube account in order to view your subscriptions and to play videos. Click the "Sign In" button to authenticate with your YouTube account.
                    </Dialog>
                </div>
            </MuiThemeProvider>
        );
    }
});

Login = connect(state => ({
    gapi: state.gapi,
    needToAuthenticate: state.needToAuthenticate,
}))(Login);

export default Login;