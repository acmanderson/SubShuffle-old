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
        // Make the #login-link clickable. Attempt a non-immediate OAuth 2.0
        // client flow. The current function is called when that flow completes.
        gapi.auth.authorize({
            client_id: OAUTH2_CLIENT_ID,
            scope: OAUTH2_SCOPES,
            immediate: false
        }, handleAuthResult);
    }
}

function loadAPIClientInterfaces() {
    gapi.client.load('youtube', 'v3').then(function() {
        handleAPILoaded();
    }, function(reason) {
        console.error(reason);
    });
}

var userSubs = {};
var loadedVideos = [];
var loadedVideoData = {};
var currentVideo = -1;

function handleAPILoaded() {
    // See https://developers.google.com/youtube/v3/docs/channels/list
    requestSubscriptions();
}

function requestSubscriptions(pageToken) {
    var requestOpts = {
        mine: true,
        part: 'snippet',
        maxResults: 50,
        fields: 'items(snippet(resourceId(channelId),thumbnails(default),title)),nextPageToken',
        order: 'alphabetical'
    };
    if (pageToken) {
        requestOpts.pageToken = pageToken;
    }

    gapi.client.youtube.subscriptions.list(requestOpts).then(function(res) {
        $.each(res.result.items, function(_, v) {
            userSubs[v.snippet.resourceId.channelId] = v.snippet;
        });
        var nextPageToken = res.result.nextPageToken;
        if (nextPageToken) {
            requestSubscriptions(nextPageToken);
        } else {
            getUploadData();
        }
    }, function(reason) {
        console.error(reason);
    });
    return userSubs;
}

function getUploadData(pageToken) {
    var requestOpts = {
        part: 'statistics,contentDetails',
        maxResults: 50,
        fields: 'items(id,statistics(videoCount),contentDetails(relatedPlaylists(uploads))),nextPageToken',
        id: Object.keys(userSubs).join(',')
    };
    if (pageToken) {
        requestOpts.pageToken = pageToken;
    }

    gapi.client.youtube.channels.list(requestOpts).then(function(res) {
        $.each(res.result.items, function(_, v) {
            var videoCount = parseInt(v.statistics.videoCount);
            if (videoCount > 0) {
                var playlistId = v.contentDetails.relatedPlaylists.uploads;
                userSubs[v.id].uploadsPlaylistId = playlistId;
                userSubs[v.id].videoCount = videoCount;
                userSubs[v.id].firstFiftyVideos = getFirstFiftyVideos(playlistId);
            } else {
                delete userSubs[v.id];
            }
        });
        var nextPageToken = res.result.nextPageToken;
        if (nextPageToken) {
            getUploadData(nextPageToken);
        } else {
            addChannelsToNav();
        }
    }, function(reason) {
        console.error(reason);
    });
}

function getFirstFiftyVideos(playlistId) {
    var videoIds = [];
    var requestOpts = {
        part: 'snippet',
        maxResults: 50,
        fields: 'items(snippet(resourceId(videoId)))',
        playlistId: playlistId
    };

    gapi.client.youtube.playlistItems.list(requestOpts).then(function(res) {
        $.each(res.result.items, function(_, v) {
            videoIds.push(v.snippet.resourceId.videoId);
        });
    });

    return videoIds
}

function addChannelsToNav() {
    $.each(userSubs, function(k, v) {
        var html = `<a class="mdl-navigation__link mdl-color--grey-300 mdl-color-text--grey-600" id="chan-${k}">
                        <label class="mdl-switch mdl-js-switch mdl-js-ripple-effect" for="switch-${k}">
                            <input type="checkbox" id="switch-${k}" class="mdl-switch__input" value="${k}" checked/>
                            <span class="mdl-switch__label">${v.title}</span>
                        </label>
                        <img class="nav-image mdl-shadow--2dp material-icons" src="${v.thumbnails.default.url}">
                    </a>`;
        $('#channel-nav').append(html);
    });
    $(".mdl-switch__label").each(function() {
        $clamp(this, {clamp: 1})
    });

    componentHandler.upgradeAllRegistered();
    loadRandomVideo();
}

function markVideoAsLoaded(videoData) {
    if (loadedVideoData[videoData.playlist]) {
        loadedVideoData[videoData.playlist].numLoaded++;
    } else {
        loadedVideoData[videoData.playlist] = {
            total: videoData.channelCount,
            numLoaded: 1
        };
        loadedVideoData[videoData.playlist].videoHash = {};
    }
    loadedVideoData[videoData.playlist].videoHash[videoData.index.toString()] = true;
}

function loadVideo(videoData) {
    if (currentVideo < 1) {
        $('#prev-btn').prop('disabled', true);
    } else {
        $('#prev-btn').prop('disabled', false);
    }

    if (currentVideo >= loadedVideos.length - 1) {
        $('#next-btn').prop('disabled', true);
    } else {
        $('#next-btn').prop('disabled', false);
    }

    var playerHtml;
    var queryString = {
        autoplay: 1,
        list: videoData.playlist
    };
    var videoId = "";
    if (videoData.index > 50) {
        queryString.index = videoData.index;
    } else {
        videoId = userSubs[videoData.channelId].firstFiftyVideos[videoData.index];
    }
    $('.player-container').html(`<iframe allowfullscreen height=100% src="https://www.youtube.com/embed/${videoId}?${$.param(queryString)}"></iframe>`);
}

function getRandomVideo() {
    function _getVideo() {
        var selectedChannels = [];
        $('.mdl-switch__input:checked').each(function() {
            selectedChannels.push($(this).val());
        });

        var validChannelIds = Object.keys(userSubs).filter(function(item) {
            return selectedChannels.indexOf(item) >= 0;
        });
        var randomKey = validChannelIds[validChannelIds.length * Math.random() << 0];
        var randomChannel = userSubs[randomKey];
        var randomIndex = randomChannel.videoCount * Math.random() << 0;
        return {
            playlist: randomChannel.uploadsPlaylistId,
            index: randomIndex,
            channelCount: randomChannel.videoCount,
            channelId: randomKey
        }
    }

    var validVideo = null;
    do {
        var maybeVideo = _getVideo();
        var playlistData = loadedVideoData[maybeVideo.playlist];
        if (playlistData) {
            if (playlistData.videoHash[maybeVideo.index.toString()]) {
                if (playlistData.numLoaded >= playlistData.total) {
                    delete loadedVideoData[maybeVideo.playlist].videoHash;
                    loadedVideoData[maybeVideo.playlist].videoHash = {};
                    loadedVideoData[maybeVideo.playlist].numLoaded = 0;
                }
            } else {
                validVideo = maybeVideo;
            }
        } else {
            validVideo = maybeVideo;
        }
    } while (validVideo == null);

    loadedVideos.push(validVideo);
    markVideoAsLoaded(validVideo);

    return validVideo;
}

function loadRandomVideo() {
    currentVideo = loadedVideos.length;
    loadVideo(getRandomVideo());
}
