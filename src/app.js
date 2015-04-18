/* global React, $, console, DigestAuthRequest,osmAuth */
var OnaAuthForm = React.createClass({
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
            <form className="loginForm" onSubmit={this.handleSubmit}>
                <input type="text" placeholder="Ona Username" autofocus="autofocus" ref="username" />
                <input type="password" placeholder="Ona Password" autoComplete="off" ref="password" />
                <input type="submit" value="Login into Ona" />
                {this.props.loginError ? <div className="error">Wrong Username or Password!</div> : null}
            </form>
        );
    }
});

// Ona Authentication Component
var OnaAuth = React.createClass({
    getInitialState: function() {
        return {isLoggedIn: false, data: null, loginError: false};
    },
    handleLogin: function(username, password) {
        var req = new DigestAuthRequest('GET', this.props.url, username, password);
        req.request(function(data) {
                this.setState({isLoggedIn: true, data: data, loginError: false});
                this.props.onLoginSuccess(data);
            }.bind(this), function(errorCode) {
                this.setState({isLoggedIn: false, loginError: true});
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
var FormRow = React.createClass({
    loadSubmissions: function(e) {
        this.props.onFormSelected(e.target.getAttribute('data'));
    },
    render: function() {
        return React.createElement(
            'tr', null,
            React.createElement('td', null),
            React.createElement('td', {onClick: this.loadSubmissions, data: this.props.form.formid}, this.props.form.id_string));
    }
});

var FormList = React.createClass({
    render: function() {
        var formNodes = this.props.data.map(function(form) {
            return React.createElement(
                FormRow, {onFormSelected: this.props.loadSubmissions, form: form, key: form.formid}
            );
        }.bind(this));
        return (React.createElement(
            'table', {className: 'form-list'},
            formNodes
        ));
    }
});

var DataList = React.createClass({
    render: function() {
        return (React.createElement('div', null, "Loaded " + this.props.data.length + " submissions."));
    }
});

var OnaForms = React.createClass({
    getInitialState: function() {
        return {
            ona_user: this.props.ona_user,
            forms: [],
            formid: null,
            submissions: []
        };
    },
    loadSubmissions: function(formid) {
        $.ajax({
            url: "http://localhost/api/v1/data/" + formid + ".json",
            dataType: "json",
            headers: {'Authorization': 'Token ' + this.state.ona_user.api_token},
            success: function(data) {
                this.setState({
                    formid: formid,
                    submissions: data});
            }.bind(this),
            error: function(data) {
                console.log(data);
            }
        });
    },
    componentDidMount: function() {
        $.ajax({
            url: "http://localhost/api/v1/forms.json?instances_with_osm=True",
            dataType: "json",
            headers: {'Authorization': 'Token ' + this.state.ona_user.api_token},
            success: function(data) {
                this.setState({forms: data});
            }.bind(this),
            error: function(data) {
                console.log(data);
            }
        });
    },
    render: function(){
        return (
            this.state.submissions.length > 0 && this.state.formid !== null ?
                React.createElement(DataList, {data: this.state.submissions}): React.createElement(
            FormList, {data: this.state.forms, loadSubmissions: this.loadSubmissions}
        ));
    }
});

var OpenStreetMapAuth = React.createClass({
    getInitialState: function() {
        var auth = osmAuth({
            oauth_consumer_key: this.props.oauthConsumerKey,
            oauth_secret: this.props.oauthSecret,
            auto: true,
            landing: this.props.landing
        });

        return {auth: auth};
    },
    handleOSMLogin: function() {
        var auth = this.state.auth;

        auth.xhr({
            method: 'GET',
            path: '/api/0.6/user/details'
        }, function(err, details) {
            if (err) {
                console.log(err);
            } else {
                this.setState({details: details});
            }
        }.bind(this));
    },
    handleOSMLogout: function() {
        var auth = this.state.auth;
        auth.logout();
        this.setState({auth: auth});
    },
    render: function() {
        return (
            this.state.auth.authenticated() === false ?
                React.createElement('button', {onClick: this.handleOSMLogin}, "Login to OpenStreetMap.org")
                    :
                React.createElement('button', {onClick: this.handleOSMLogout}, "Unlink OpenStreetMap.org")
        );
    }
});

var MainApp = React.createClass({
    getInitialState: function(){
        return {ona_user: null};
    },
    setOnaUser: function(user) {
        this.setState({ona_user: user});
    },
    render: function(){
        return (
            React.createElement(
                "div", {className: "main-container"},
                React.createElement("h1", null, "Ona Osm Integration"),
                React.createElement(OnaAuth, {
                    url: this.props.onaLoginURL,
                    onLoginSuccess: this.setOnaUser
                }),
                React.createElement(OpenStreetMapAuth, {
                    oauthConsumerKey: 'OTlOD6gfLnzP0oot7uA0w6GZdBOc5gQXJ0r7cdG4',
                    oauthSecret: 'cHPXxC3JCa9PazwVA5XOQkmh4jQcIdrhFePBmbSJ',
                    landing: '/'
                }),
                this.state.ona_user !== null ? React.createElement(OnaForms, {ona_user: this.state.ona_user}): null
            )
        );
    }
});

if (window.location.href.search('oauth_token') !== -1){
    opener.authComplete(window.location.href);
    window.close();
}

React.render(
    React.createElement(MainApp, {onaLoginURL: 'http://localhost/api/v1/user.json'}),
    document.getElementById("main")
);
