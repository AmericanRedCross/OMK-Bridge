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
                this.props.onLoginSuccess(data);
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
var FormRow = React.createClass({displayName: "FormRow",
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

var FormList = React.createClass({displayName: "FormList",
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

var DataList = React.createClass({displayName: "DataList",
    render: function() {
        return (React.createElement('div', null, "Loaded " + this.props.data.length + " submissions."));
    }
});

var OnaForms = React.createClass({displayName: "OnaForms",
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
            url: "https://stage.ona.io/api/v1/data/" + formid + ".json",
            dataType: "json",
            headers: {'Authorization': 'Token ' + this.state.ona_user.api_token},
            success: function(data) {
                this.setState({
                    ona_user: this.state.ona_user,
                    forms: this.state.forms,
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
            url: "https://stage.ona.io/api/v1/forms.json",
            dataType: "json",
            headers: {'Authorization': 'Token ' + this.state.ona_user.api_token},
            success: function(data) {
                this.setState({ona_user: this.state.ona_user, forms: data});
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

var MainApp = React.createClass({displayName: "MainApp",
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
                this.state.ona_user !== null ? React.createElement(OnaForms, {ona_user: this.state.ona_user}): null
            )
        );
    }
});

React.render(
    React.createElement(MainApp, {onaLoginURL: 'https://stage.ona.io/api/v1/user.json'}),
    document.getElementById("main")
);
