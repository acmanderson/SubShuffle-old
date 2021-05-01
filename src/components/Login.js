import React from "react";
import {connect} from "react-redux";
import {createActions} from "redux-actions";
import Loading from "./Loading";
import Theme from "../Theme";
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import getMuiTheme from "material-ui/styles/getMuiTheme";
import Dialog from "material-ui/Dialog";
import FlatButton from "material-ui/FlatButton";
import {OAUTH2_CLIENT_ID, OAUTH2_SCOPE} from "../consts/auth";

const {
    setUserNeedsToAuthenticate,
    setUserAuthenticated,
    setGapi,
} = createActions(
    'SET_USER_NEEDS_TO_AUTHENTICATE',
    'SET_USER_AUTHENTICATED',
    'SET_GAPI',
);

let Login = React.createClass({
    componentDidMount: function () {
        const {dispatch, router} = this.props;
        const gapi = window.gapi;
        gapi.load("client:auth2", () => {
            gapi.auth2.init({client_id: OAUTH2_CLIENT_ID});
            dispatch(setGapi(gapi));
            if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
                dispatch(setUserNeedsToAuthenticate(true));
            } else {
                dispatch(setUserAuthenticated(true));
                router.push('/');
            }
        })
    },
    authenticate: function (gapi) {
        return gapi.auth2.getAuthInstance()
            .signIn({scope: OAUTH2_SCOPE})
            .then(() => {
                    console.log("Sign-in successful");
                    this.loadClient(gapi);
                },
                function (err) {
                    console.error("Error signing in", err);
                });
    },
    loadClient: function (gapi) {
        const {dispatch, router} = this.props;
        return gapi.client.load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
            .then(function () {
                    console.log("GAPI client loaded for API");
                    dispatch(setGapi(window.gapi));
                    dispatch(setUserNeedsToAuthenticate(false));
                    dispatch(setUserAuthenticated(true));
                    router.push('/');
                },
                function (err) {
                    console.error("Error loading GAPI client for API", err);
                });
    },
    render: function () {
        const {userNeedsToAuthenticate, gapi} = this.props;
        const dialogActions = [
            <FlatButton
                label="Sign In"
                primary={true}
                onTouchTap={() => this.authenticate(gapi)}
            />,
            <FlatButton
                label="Privacy Policy"
                onTouchTap={() => window.open("/privacy.html", "_blank")}
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