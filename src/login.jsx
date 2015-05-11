/* global define */
define(["react", "./auth"], function(React, auth) {
    return React.createClass({
        getInitialState: function() {
            return {error: false};
        },
        contextTypes: {
            router: React.PropTypes.func
        },

        componentDidMount: function() {
            var { router } = this.context;
            if(auth.isLoggedIn()) {
                router.transitionTo('/');
            }
        },
        loginSuccess: function(data) {
            var { router } = this.context;
            if (data.api_token !== undefined) {
                router.transitionTo('osm-login');
            } else {
                this.setState({error: true});
            }
        },
        handleSubmit: function(e) {
            e.preventDefault();
            var username = React.findDOMNode(this.refs.username).value.trim();
            var password = React.findDOMNode(this.refs.password).value.trim();
            if (!username || !password) {
                // TODO: display error message
                return;
            }
            auth.onChange = this.loginSuccess;
            auth.login(username, password);
        },
        render: function() {
            return (
                <div id="login-box">
                    <div className="navbar">Login to Ona</div>
                    <form className="pure-form pure-form-stacked" method="post" onSubmit={this.handleSubmit}>
                    {this.state.error ? <div className="alert alert-error">
                        <i className="fa fa-times"></i> Enter the correct Username and Password
                    </div>: null}
                    <div className="pure-control-group">
                        <label htmlFor="username">Username</label>
                        <input type="text" name="username" ref="username" placeholder="Ona Username" autoFocus="true" />
                    </div>
                    <div className="pure-control-group">
                        <label htmlFor="password">Password</label>
                        <input type="password" name="password" ref="password" placeholder="Password" />
                    </div>
                    <div className="pure-control-group">
                        <button type="submit" className="pure-button pure-button-default">Login</button>
                    </div>
                    </form>
                </div>
            );
        }
    });
});
