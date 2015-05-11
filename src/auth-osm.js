/* global define */
define(["osm-auth"], function(osmAuth) {
    return {
        getAuth: function(oauthConsumerKey, oauthSecret, landing) {
            this.oauthConsumerKey = oauthConsumerKey;
            this.oauthSecret = oauthSecret;
            this.landing = landing;

            return osmAuth({
                oauth_consumer_key: this.oauthConsumerKey,
                oauth_secret: this.oauthSecret,
                auto: true,
                landing: this.landing
            });
        },
        login: function() {
            this.auth.xhr({
                method: 'GET',
                path: '/api/0.6/user/details'
            }, function(err, details) {
                if (err) {
                    console.log(err);
                } else {
                    this.onChange(this.state.auth);
                }
            }.bind(this));
        },
        logout: function() {
            this.auth.logout();
            this.onChange(false);
        },
        loggedIn: function() {
            return this.auth.authenticated();
        },
        onChange: function(){}
    };
});
