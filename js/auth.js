var OAUTH2_CLIENT_ID = '535577359868-1relqi1rem0jbpq6p8l4l8l1lbc69jae.apps.googleusercontent.com';
var OAUTH2_SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly'
];

googleApiClientReady = function() {
    gapi.auth.init(function() {
        window.setTimeout(checkAuth, 1);
    });
};

function checkAuth() {
    gapi.auth.authorize({
        client_id: OAUTH2_CLIENT_ID,
        scope: OAUTH2_SCOPES,
        immediate: true
    }, handleAuthResult);
}

function handleAuthResult(authResult) {
    if (authResult && !authResult.error) {
        loadAPIClientInterfaces();
    } else {
        $('#login-overlay').fadeIn(function() {
            $('#loading-overlay').hide();
        });
        $('#login-button').click(function() {
            gapi.auth.authorize({
                client_id: OAUTH2_CLIENT_ID,
                scope: OAUTH2_SCOPES,
                immediate: false
            }, handleAuthResult);
        });
    }
}

function loadAPIClientInterfaces() {
    gapi.client.load('youtube', 'v3').then(function() {
        requestSubscriptions();
    }, function(reason) {
        console.error(reason);
    });
}
