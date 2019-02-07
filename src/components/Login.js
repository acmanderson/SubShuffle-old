import React from "react";
import {ReactScriptLoader, ReactScriptLoaderMixin} from "react-script-loader";
import {connect} from "react-redux";
import {createActions} from "redux-actions";
import Loading from "./Loading";
import Theme from "../Theme";
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import getMuiTheme from "material-ui/styles/getMuiTheme";
import Dialog from "material-ui/Dialog";
import FlatButton from "material-ui/FlatButton";
import {OAUTH2_CLIENT_ID, OAUTH2_SCOPES, SCRIPT_URL} from "../consts/auth";

const {
    setUserNeedsToAuthenticate,
    setUserAuthenticated,
    setGapi,
} = createActions(
    'SET_USER_NEEDS_TO_AUTHENTICATE',
    'SET_USER_AUTHENTICATED',
    'SET_GAPI',
);

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
        gapi.auth.init(this.authorize(gapi));
        dispatch(setGapi(gapi));
    },
    onScriptError: function () {

    },
    authorize: function (gapi) {
        return (immediate = true) => {
            const {dispatch} = this.props;
            gapi.auth.authorize({
                client_id: OAUTH2_CLIENT_ID,
                scope: OAUTH2_SCOPES,
                immediate: immediate,
            }, authResult => {
                dispatch(setGapi(gapi));
                this.handleAuthResult(authResult);
            });
        }
    },
    handleAuthResult: function (authResult) {
        const {gapi, dispatch, router} = this.props;
        if (authResult && !authResult.error) {
            gapi.client.load('youtube', 'v3').then(() => {
                dispatch(setGapi(gapi));
                dispatch(setUserNeedsToAuthenticate(false));
                dispatch(setUserAuthenticated(true));
                router.push('/');
            }, reason => {
                console.error(reason);
            });
        } else {
            dispatch(setUserNeedsToAuthenticate(true));
        }
    },
    render: function () {
        const {userNeedsToAuthenticate, gapi} = this.props;
        const dialogActions = [
            <FlatButton
                label="Sign In"
                primary={true}
                onTouchTap={() => this.authorize(gapi)(false)}
            />,
        ];
        return (
            <MuiThemeProvider muiTheme={getMuiTheme(Theme)}>
                <Loading>
                    <Dialog
                        open={userNeedsToAuthenticate}
                        title="SubShuffle"
                        actions={dialogActions}
                        modal={true}
                    >
                        SubShuffle requires read-only access to your YouTube account in order to view your subscriptions
                        and to play videos. Click the "Sign In" button to authenticate with your YouTube account.
                    </Dialog>
                </Loading>
            </MuiThemeProvider>
        );
    }
});

Login = connect(state => ({
    gapi: state.loginState.gapi,
    userNeedsToAuthenticate: state.loginState.userNeedsToAuthenticate,
}))(Login);

export default Login;