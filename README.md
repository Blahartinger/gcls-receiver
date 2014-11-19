NHL Gamecenter Live (Chromecast) - Receiver Application
===============================

This project implements an Chromecast receiver app, which allows casting of NHL Gamecenter Live streams
 on a Chromecast device. Since it's a personal and prototypical project, there is no guarantee for
 it to work.

**This app does not circumvent the DRM content protection of NHL Gamecenter Live in any way. You
 need a valid NHL Gamecenter Live subscription to start this app.**

Build Instructions
--------------------------------

Setup a web server serving the files in *default/static*. You can also use this repository to deploy
 a Heroku application. Using the Google Cast SDK Developer Console retrieve an Application ID. **Be
 sure to serve the receiver application via HTTPS, otherwise decryption of live games won't work.**