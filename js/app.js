/* global React, $, console, DigestAuthRequest, osmAuth, store, L */
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
            React.createElement("form", {className: "form-signin", onSubmit: this.handleSubmit},
                React.createElement("input", {type: "text", className: "form-control", placeholder: "Ona Username", autofocus: "autofocus", ref: "username"}),
                React.createElement("input", {type: "password", className: "form-control", placeholder: "Ona Password", autoComplete: "off", ref: "password"}),
                this.props.loginError ? React.createElement("p", {className: "bg-danger text-warning"}, "Wrong Username or Password!") : null,
                React.createElement("button", {type: "submit", className: "btn btn-sm btn-primary btn-block"}, "Login into Ona")
            )
        );
    }
});

// Ona Authentication Component
var OnaAuth = React.createClass({displayName: "OnaAuth",
    getInitialState: function() {
        var isLoggedIn = this.props.ona_user !== null ? true: false;

        return {isLoggedIn: isLoggedIn, data: this.props.ona_user, loginError: false};
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
    handleLogout: function(e) {
        if(store.enabled) {
            store.clear();
            window.location.reload();
        }
    },
    render: function() {
        var isLoggedIn = this.state.isLoggedIn;
        var content = React.createElement(OnaAuthForm,
                                          {handleLogin: this.handleLogin, loginError: this.state.loginError});
        if(isLoggedIn) {
            content = React.createElement(
                'span', null, "User: " + this.state.data.name + "  ",
                React.createElement('button', {className: "btn btn-sm btn-default", onClick: this.handleLogout}, "Logout")
            );
        }
        return (content);
    }
});
var FormRow = React.createClass({displayName: "FormRow",
    loadSubmissions: function(e) {
        e.preventDefault();
        this.props.onFormSelected(
            e.target.getAttribute('data-formid'),
            e.target.getAttribute('data-title')
        );
    },
    render: function() {
        return React.createElement(
            'tr', null,
            React.createElement(
                'td', null, React.createElement(
                    'a', {
                        onClick: this.loadSubmissions,
                        'data-formid': this.props.form.formid,
                        'data-title': this.props.form.title
                    }, this.props.form.title
                )
            )
        );
    }
});

var FormList = React.createClass({displayName: "FormList",
    render: function() {
        var formNodes = this.props.data.map(function(form) {
            return React.createElement(
                FormRow, {onFormSelected: this.props.loadSubmissions, form: form, key: form.formid}
            );
        }.bind(this));
        return (
            React.createElement(
                'table', {className: 'table form-list'}, React.createElement(
                    "thead", null, React.createElement(
                        "tr", null,
                        React.createElement("th", null, "Form Name")
                    )
                ),
                React.createElement('tbody', null, formNodes)
        ));
    }
});

var DataRow = React.createClass({displayName: "DataRow",
    render: function() {
        return (
            React.createElement(
                'tr', null, React.createElement(
                    'td', null, React.createElement(
                        'input', {type: "checkbox", value: "{ this.props.submission._id }"}
                    )
                ),
                React.createElement('td', null, this.props.submission._id)
            )
        );
    }
});

var DataList = React.createClass({displayName: "DataList",
    render: function() {
        var rows = this.props.data.map(function(submission){
            return React.createElement(
                DataRow, {submission: submission, key: submission._id}
            );
        });
        return (
            React.createElement(
                'table', {className: 'table data-list'}, React.createElement(
                    "thead", null, React.createElement(
                        "tr", null,
                        React.createElement("th", {width: "20px"}, " "),
                        React.createElement("th", null, "Data Id")
                    )
                ),
                React.createElement('tbody', null, rows)
        ));
    }
});

var OSMMap = React.createClass({displayName: "OSMMap",
    componentDidMount: function() {
        L.mapbox.accessToken = 'pk.eyJ1Ijoib25hIiwiYSI6IlVYbkdyclkifQ.0Bz-QOOXZZK01dq4MuMImQ';
        var map = this.map = L.mapbox.map(
            this.getDOMNode(),
            'examples.map-i875kd35'
        );

        // add an OpenStreetMap tile layer
        // L.tileLayer(
        //     'https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        //         attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
        //     }
        // ).addTo(map);

        var layer = new L.OSM.DataLayer(this.props.xml).addTo(map);
        map.fitBounds(layer.getBounds());
    },
    componentWillUnmount: function() {
        this.map = null;
    },
    render: function(){
        return (
            React.createElement('div', {className: 'map'})
        );
    }
});

var OnaForms = React.createClass({displayName: "OnaForms",
    getInitialState: function() {
        return {
            ona_user: this.props.ona_user,
            forms: [],
            formid: null,
            submissions: [],
            osm: null
        };
    },
    loadOSM: function(formid) {
        $.ajax({
            url: "https://stage.ona.io/api/v1/data/" + formid + ".osm",
            dataType: "xml",
            headers: {'Authorization': 'Token ' + this.state.ona_user.api_token},
            success: function(xml) {
                this.props.loadOSMMap(xml);
            }.bind(this),
            error: function(data) {
                console.log(data);
            }
        });
    },
    loadSubmissions: function(formid, title) {
        this.loadOSM(formid);
        $.ajax({
            url: "https://stage.ona.io/api/v1/data/" + formid + ".json",
            dataType: "json",
            headers: {'Authorization': 'Token ' + this.state.ona_user.api_token},
            success: function(data) {
                this.setState({
                    formid: formid,
                    title: title,
                    submissions: data});
            }.bind(this),
            error: function(data) {
                console.log(data);
            }
        });
    },
    componentDidMount: function() {
        $.ajax({
            url: "https://stage.ona.io/api/v1/forms.json?instances_with_osm=True",
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
                React.createElement(
                    'div', null,
                    React.createElement('h2', null, this.state.title),
                    React.createElement(DataList, {data: this.state.submissions})
                ): React.createElement(
                    FormList, {data: this.state.forms, loadSubmissions: this.loadSubmissions}
                )
        );
    }
});

var OpenStreetMapAuth = React.createClass({displayName: "OpenStreetMapAuth",
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
                React.createElement('button', {className: "btn btn-sm btn-success", onClick: this.handleOSMLogin},
                    "Login to OpenStreetMap.org")
                    :
                React.createElement('button', {className: "btn btn-sm btn-warning", onClick: this.handleOSMLogout}, "Unlink OpenStreetMap.org")
        );
    }
});

var MainApp = React.createClass({displayName: "MainApp",
    getInitialState: function(){
        return {
            ona_user: store.enabled ? store.get('ona_user', null): null,
            osm: null
        };
    },
    setOnaUser: function(user) {
        this.setState({ona_user: user});

        if(store.enabled){
            store.set('ona_user', user);
        }
    },
    loadOSMMap: function(xml) {
        this.setState({osm: xml});
    },
    render: function(){
        return (
            React.createElement(
                "div", {className: "main-container"},
                React.createElement("h1", null, "Ona Osm Integration"),
                React.createElement(
                    'div', {className: "row"},
                    React.createElement(
                        "div", {className: "col-sm-8"},
                        React.createElement(OnaAuth, {
                            url: this.props.onaLoginURL,
                            onLoginSuccess: this.setOnaUser,
                            ona_user: this.state.ona_user
                        })
                    ),
                    React.createElement(
                        "div", {className: "col-sm-4"},
                        this.state.ona_user !== null ? React.createElement(OpenStreetMapAuth, {
                            oauthConsumerKey: 'OTlOD6gfLnzP0oot7uA0w6GZdBOc5gQXJ0r7cdG4',
                            oauthSecret: 'cHPXxC3JCa9PazwVA5XOQkmh4jQcIdrhFePBmbSJ',
                            landing: '/'
                        }): null
                    )
                ),
                React.createElement(
                    'div', {className: "row"},
                    React.createElement(
                        "div", {className: "col-sm-3"},
                        this.state.ona_user !== null ? React.createElement(
                            OnaForms, {
                                ona_user: this.state.ona_user,
                                loadOSMMap: this.loadOSMMap
                            }): null
                    ),
                    React.createElement(
                        "div", {className: "col-sm-9"},
                        this.state.osm !== null ? React.createElement(OSMMap, {xml: this.state.osm}): null
                    )
                )
            )
        );
    }
});

if (window.location.href.search('oauth_token') !== -1){
    opener.authComplete(window.location.href);
    window.close();
}

React.render(
    React.createElement(MainApp, {onaLoginURL: 'https://stage.ona.io/api/v1/user.json'}),
    document.getElementById("main")
);
