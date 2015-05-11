## OMK Bridge

Grab OSM data from an OMK/ODK compliant server (Currently Ona), preview and submit into OSM.

### Install

    npm -g install webpack webpack-dev-server
    npm install


### Compile/Build js/bundle.js

    webpack

    # js/bundle.min.js
    webpack --config webpack.config.min.js

### Run

    npm start

    # development using webpack-dev-server
    webpack-dev-server --progress --colors --watch --port 3000
