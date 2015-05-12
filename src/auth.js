/* global define, console */
define(["./digestAuthRequest", "store", "crypto-js", "./config.json"], function(DigestAuthRequest, store, CryptoJS, config) {
    'use strict';

    return {
        login: function(username, password) {
            var url = config.ona_server + "/api/v1/user.json";
            var req = new DigestAuthRequest('GET', url, username, password);

            req.request(function(data) {
                store.set('ona_user', data);
                this.onChange(data);
                console.info(url, data);
            }.bind(this), function(errorCode) {
                this.onChange(errorCode);
                console.error(url, errorCode.toString());
            }.bind(this));
        },
        logout: function() {
            if(store.enabled) {
                store.clear();
            }
        },
        isLoggedIn: function() {
            return store.enabled && store.get('ona_user', null) !== null;
        },
        getUser: function(){
            return store.get('ona_user');
        },
        onChange: function(){}
    };
});
