/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Lukas Niemeier
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

var corsSuffix = "cors=" + encodeURIComponent(window.location.origin);
var messageBusChannel = 'urn:x-cast:de.lukasniemeier.gamecenterlivesender';
var liveStreaming = true;

var errorDescriptions = {};
errorDescriptions[cast.player.api.ErrorCode.MANIFEST] = "cast.player.api.ErrorCode.MANIFEST";
errorDescriptions[cast.player.api.ErrorCode.MEDIAKEYS] = "cast.player.api.ErrorCode.MEDIAKEYS";
errorDescriptions[cast.player.api.ErrorCode.NETWORK] = "cast.player.api.ErrorCode.NETWORK";
errorDescriptions[cast.player.api.ErrorCode.PLAYBACK] = "cast.player.api.ErrorCode.PLAYBACK";

var castReceiverManager = null;
var mediaManager = null;
var messageBus = null;
var mediaElement = null;
var mediaHost = null;
var mediaProtocol = null;
var mediaPlayer = null;


function appendNeulionCors(url) {
    if (url.indexOf("?") == -1) {
        return url + "?" + corsSuffix;
    } else {
        return url + "&" + corsSuffix;
    }
}

function prepareRequest(requestInfo) {
    // we only want cookies for the main m3u8 request
    var url = requestInfo.url;
    var idx = url.indexOf("_ced.m3u8");
    var sendCookies = url.charAt(idx - 1) == 'd';
    if (sendCookies) {
        console.log('######### Cookies enalbed for this request');
    }
    requestInfo.withCredentials = sendCookies;
    // enforce correct CORS
    requestInfo.url = appendNeulionCors(requestInfo.url);
}

function prepareRequestLicense(requestInfo) {
    // key servlet uses origin for CORS
    requestInfo.withCredentials = true;
    requestInfo.headers = {};
    requestInfo.headers["Accept"] = "*/*";
}

onload = function() {
    mediaElement = document.getElementById('receiverVideoElement');
    mediaElement.autoplay = true;

    mediaElement.addEventListener('loadstart', function(e) {
        console.log('######### MEDIA ELEMENT LOAD START');

        document.getElementById('overlay-logo').style.display = "block";
        document.getElementById('overlay-spinner').style.display = "block";
        document.getElementById('overlay-info').style.display = "none";
    });
    mediaElement.addEventListener('loadeddata', function(e) {
        console.log('######### MEDIA ELEMENT DATA LOADED');
        document.getElementById('overlay-info').style.display = "none";
    });
    mediaElement.addEventListener('canplay', function(e) {
        document.getElementById('overlay-logo').style.display = "none";
    });
    mediaElement.addEventListener('playing', function(e) {
        console.log('######### MEDIA ELEMENT PLAYING');
        document.getElementById('overlay-spinner').style.display = "none";
        document.getElementById('overlay-info').style.display = "none";
    });
    mediaElement.addEventListener('waiting', function(e) {
        console.log('######### MEDIA ELEMENT WAITING');
        document.getElementById('overlay-spinner').style.display = "block";
    });

    cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.ERROR);
    cast.player.api.setLoggerLevel(cast.player.api.LoggerLevel.ERROR);

    castReceiverManager = cast.receiver.CastReceiverManager.getInstance();

    messageBus = castReceiverManager.getCastMessageBus(messageBusChannel);

    messageBus.onMessage = function(event) {
        console.log('### Message Bus - Media Message: ' + JSON.stringify(event));
    };

    mediaManager = new cast.receiver.MediaManager(mediaElement);

    mediaManager['onErrorOrig'] = mediaManager.onError;
    mediaManager.onError = function(obj) {
        console.log('### Nedia Manager - ERROR: ' + JSON.stringify(obj));

        mediaManager['onErrorOrig'](obj);
        if (mediaPlayer) {
            mediaPlayer.unload();
            mediaPlayer = null;
        }
    };

    mediaManager['onLoadOrig'] = mediaManager.onLoad;
    mediaManager.onLoad = function(event) {
        console.log('### Nedia Manager - LOAD: ' + JSON.stringify(event));

        if (mediaPlayer !== null) {
            mediaPlayer.unload();
        }

        document.getElementById('info').innerHTML = "";

        if (event.data['media'] && event.data['media']['contentId']) {
            var url = event.data['media']['contentId'];

            mediaHost = new cast.player.api.Host({
                'mediaElement': mediaElement,
                'url': url
            });

            mediaHost.updateManifestRequestInfo = function(requestInfo) {
                if (!requestInfo.url) {
                    requestInfo.url = url;
                }
                prepareRequest(requestInfo);
            };
            mediaHost.updateSegmentRequestInfo = function(requestInfo) {
                prepareRequest(requestInfo);
            };
            mediaHost.updateLicenseRequestInfo = function(requestInfo) {
                prepareRequestLicense(requestInfo);
            }

            /*mediaHost['getQualityLevelOrig'] = mediaHost.getQualityLevel;
            mediaHost.getQualityLevel = function(streamIndex, qualityLevel) {
              console.error('### HOST QUALITY - streamIndex = ' + streamIndex);
              console.error('### HOST QUALITY - qualityLevel = ' + qualityLevel);
              console.error('### HOST QUALITY - return = ' + 3);
              return 3;
            };*/

            mediaHost.onError = function(errorCode, requestStatus) {
                console.error('### HOST ERROR - Fatal Error: code = ' + errorCode);

                document.getElementById('overlay-info').style.display = "block";
                if (errorCode in errorDescriptions) {
                    console.error('### HOST ERROR - Fatal Error: description = ' + errorDescriptions[errorCode]);
                    document.getElementById('info').innerHTML = 'Fatal Error: ' + errorDescriptions[errorCode];
                } else {
                    document.getElementById('info').innerHTML = 'Fatal Error: ' + errorCode;
                }

                console.error("Request status = " + requestStatus);
                if (mediaPlayer !== null) {
                    mediaPlayer.unload();
                }
            };

            var initialTimeIndexSeconds = event.data['media']['currentTime'] || 0;
            protocol = cast.player.api.CreateHlsStreamingProtocol(mediaHost);

            mediaPlayer = new cast.player.api.Player(mediaHost);

            liveStreaming = event.data['media']['streamType'] == "LIVE";
            console.log("This is a live stream: " + liveStreaming);
            if (liveStreaming) {
                mediaPlayer.load(protocol, Infinity);
            } else {
                mediaPlayer.load(protocol, initialTimeIndexSeconds);
            }
        }
    };

    console.log('### Application Loaded. Starting system.');

    /**
     * Application config
     **/
    var appConfig = new cast.receiver.CastReceiverManager.Config();
    appConfig.statusText = 'Ready to play';
    appConfig.maxInactivity = 10;
    castReceiverManager.start(appConfig);
};