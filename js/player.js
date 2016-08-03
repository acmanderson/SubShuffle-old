var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";

var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var player;
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%'
    });

    // for some reason the YouTube player's event bindings aren't working, here's a hacky workaround until I
    // can figure out why
    setInterval(function() {
        // if the current video has ended, automatically load another one
        if (player.getPlayerState && player.getPlayerState() == YT.PlayerState.ENDED) {
            loadRandomVideo();
        }
    }, 1000);
}
