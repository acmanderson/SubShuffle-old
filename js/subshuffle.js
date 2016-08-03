var userSubs = {};
var loadedVideos = [];
var currentVideo = -1;

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

function rangeArray(len) {
    var arr = [];
    for (var i = 0; i < len; i++) {
        arr.push(i)
    }
    return arr;
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
                userSubs[v.id].uploadsPlaylistId = v.contentDetails.relatedPlaylists.uploads;
                userSubs[v.id].videoCount = videoCount;
                userSubs[v.id].videoList = rangeArray(videoCount);
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

function addChannelsToNav() {
    $.each(userSubs, function(k, v) {
        var html = `<a class="mdl-navigation__link mdl-color--grey-300 mdl-color-text--grey-600" id="chan-${k}">
                        <label class="mdl-switch mdl-js-switch mdl-js-ripple-effect" for="switch-${k}">
                            <input type="checkbox" id="switch-${k}" class="mdl-switch__input" value="${k}" checked/>
                            <span class="mdl-switch__label">${v.title}</span>
                        </label>
                        <img class="nav-image mdl-shadow--2dp" src="${v.thumbnails.default.url}">
                    </a>`;
        $('#channel-nav').append(html);
    });
    $(".mdl-switch__label").each(function() {
        $clamp(this, {clamp: 1})
    });

    componentHandler.upgradeAllRegistered();
    $('#login-overlay').fadeOut();
    $('#loading-overlay').fadeOut();

    loadRandomVideo();
}

function loadVideo(videoId) {
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

    player.loadVideoById(videoId);
    $("#shuffle-btn").prop('disabled', false);
}

function formatString(str, formatList) {
    return str.replace(/{(\d+)}/g, function(match, number) {
        return typeof formatList[number] != 'undefined'
            ? formatList[number]
            : match
            ;
    });
}

function indexToToken(index) {
    var token = [];
    var ranges = ["AEIMQUYcgkosw048", "IJKLMNOP", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"];
    for (var i = 0; i < ranges.length; i++) {
        var range = ranges[i].split("");
        var temp = index % range.length;
        token.push(range[temp]);
        index = parseInt(index / range.length);
    }
    return formatString("C{1}{0}{2}EAA", token);
}

function buildVideoRequest(videoData) {
    var token = indexToToken(videoData.index);
    var requestOpts = {
        part: 'snippet',
        maxResults: 1,
        fields: 'items(snippet(resourceId(videoId)))',
        order: 'alphabetical',
        playlistId: videoData.playlist,
        pageToken: token
    };

    return gapi.client.youtube.playlistItems.list(requestOpts);
}

function getRandomChannelAndIndex() {
    var selectedChannels = [];
    $('.mdl-switch__input:checked').each(function() {
        selectedChannels.push($(this).val());
    });
    var validChannelIds = Object.keys(userSubs).filter(function(item) {
        return selectedChannels.indexOf(item) >= 0;
    });

    var randomChannelId = validChannelIds[validChannelIds.length * Math.random() << 0];
    var randomChannelData = userSubs[randomChannelId];
    var videoList = randomChannelData.videoList;
    var randomIndex = videoList.splice(videoList.length * Math.random() << 0, 1)[0];

    if (videoList.length <= 0) {
        randomChannelData.videoList = rangeArray(randomChannelData.videoCount);
    }

    return {
        playlist: randomChannelData.uploadsPlaylistId,
        index: randomIndex
    }
}

function loadRandomVideo() {
    var videoData = getRandomChannelAndIndex();
    var request = buildVideoRequest(videoData);
    request.then(function(res) {
        var videoId = res.result.items[0].snippet.resourceId.videoId;

        currentVideo = loadedVideos.length;
        loadedVideos.push(videoId);

        loadVideo(videoId);
    }, function(reason) {
        console.error(reason);
    });
}

$('#prev-btn').click(function() {
    currentVideo--;
    loadVideo(loadedVideos[currentVideo]);
});

$('#shuffle-btn').click(function() {
    $(this).prop('disabled', true);
    loadRandomVideo();
});

$('#next-btn').click(function() {
    currentVideo++;
    loadVideo(loadedVideos[currentVideo]);
});

$('#select-all-btn').click(function() {
    $('.mdl-switch__input').prop('checked', true);
    $('.mdl-switch').addClass('is-checked');
});

$('#deselect-all-btn').click(function() {
    $('.mdl-switch__input').prop('checked', false);
    $('.mdl-switch').removeClass('is-checked');
});
