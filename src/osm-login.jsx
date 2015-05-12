/* global define, console */
define(["react", "osm-auth"], function(React) {
    return React.createClass({
        getInitialState: function() {
            return {auth: this.props.osmAuth};
        },
        login: function() {
            this.state.auth.xhr({
                method: 'GET',
                path: '/api/0.6/user/details'
            }, function(err, details) {
                if (err) {
                    console.log(err);
                } else {
                    this.onChange(this.state.auth, details);
                }
            }.bind(this));
        },
        logout: function() {
            this.state.auth.logout();
            this.onChange(false);
        },
        isLoggedIn: function() {
            return this.state.auth.authenticated() === true;
        },
        onChange: function(v) {
            var router = this.context.router;
            if (v !== false ) {
                router.transitionTo('forms');
            } else {
                router.transitionTo('osm-login');
            }
        },

        contextTypes: {
            router: React.PropTypes.func
        },

        componentDidMount: function(){
            var router = this.context.router;
            var logout = this.props.query.logout;
            if(logout) {
                this.logout();
            }

            if(this.isLoggedIn()) {
                router.transitionTo('home');
            }
        },
        render: function() {
            return (
                <div id="auth-osm-box" className="auth-box .form-holder">
                    <div className="pure-g auth-detail">
                        <div className="pure-u-1-4">
                            <img src="img/osm_fixed.png" className="img-responsive" id="osm-auth-logo" />
                        </div>
                        <div className="pure-u-3-4 auth-text">
                            <h2>Authorization required by OpenStreetMaps.org</h2>
                            <p>Log into your OpenStreetMap account to authorize mapping features. Save your changes and you will be redirected to the home page.</p>
                            <button className="pure-button pure-button-default" onClick={this.login}>Login to OpenStreetMap.org</button>
                        </div>
                    </div>
                </div>
            );
        }
    });
});
