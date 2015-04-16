/* global React, $, console, DigestAuthRequest */
var OnaAuthForm = React.createClass({displayName: "OnaAuthForm",
    handleSubmit: function(e) {
        e.preventDefault();
        var username = React.findDOMNode(this.refs.username).value.trim();
        var password = React.findDOMNode(this.refs.password).value.trim();
        if (!username || !password) {
            // TODO: display error message
            return;
        }
        this.props.handleLogin(username, password);
    },
    render: function() {
        return (
            React.createElement("form", {className: "loginForm", onSubmit: this.handleSubmit}, 
                React.createElement("input", {type: "text", placeholder: "Ona Username", autofocus: "autofocus", ref: "username"}), 
                React.createElement("input", {type: "password", placeholder: "Ona Password", autoComplete: "off", ref: "password"}), 
                React.createElement("input", {type: "submit", value: "Login into Ona"}), 
                this.props.loginError ? React.createElement("div", {className: "error"}, "Wrong Username or Password!") : null
            )
        );
    }
});

// Ona Authentication Component
var OnaAuth = React.createClass({displayName: "OnaAuth",
    getInitialState: function() {
        return {isLoggedIn: false, data: null, loginError: false};
    },
    handleLogin: function(username, password) {
        var req = new DigestAuthRequest('GET', this.props.url, username, password);
        req.request(function(data) {
                this.setState({isLoggedIn: true, data: data, loginError: false});
                console.log(data);
            }.bind(this), function(errorCode) {
                this.setState({isLoggedIn: false, data: this.state.data, loginError: true});
                console.error(this.props.url, errorCode.toString());
            }.bind(this)
        );
    },
    render: function() {
        var isLoggedIn = this.state.isLoggedIn;
        var content = React.createElement(OnaAuthForm,
                                          {handleLogin: this.handleLogin, loginError: this.state.loginError});
        if(isLoggedIn) {
            content = React.createElement('div', null, "User: " + this.state.data.name);
        }
        return (content);
    }
});

var MainApp = React.createClass({displayName: "MainApp",
    render: function(){
        return (
            React.createElement(
                "div", {className: "main-container"},
                React.createElement("h1", null, "Ona Osm Integration"),
                React.createElement(OnaAuth, {url: this.props.onaLoginURL})
            )
        );
    }
});

React.render(
    React.createElement(MainApp, {onaLoginURL: 'https://stage.ona.io/api/v1/user.json'}),
    document.getElementById("main")
);
