/* global React, $, console, DigestAuthRequest, osmAuth, store, L, JXON, FixedDataTable */
var Table = FixedDataTable.Table;
var Column = FixedDataTable.Column;

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
var OnaAuth = React.createClass({
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
var FormRow = React.createClass({
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
            ),
            React.createElement(
                'td', null, this.props.form.num_of_submissions
            )
        );
    }
});

var FormList = React.createClass({
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
                        React.createElement("th", null, "Form Name"),
                        React.createElement("th", null, "# of submissions")
                    )
                ),
                React.createElement('tbody', null, formNodes)
        ));
    }
});

var DataRow = React.createClass({
    getInitialState: function() {
        return {show: false};
    },
    getTags: function(data) {
        return data.tag.map(function(tag) {
            return React.createElement(
                'tr', null,
                React.createElement('td', {className: 'key'}, tag['@k']),
                React.createElement('td', {className: 'value'}, tag['@v'])
            );
        });
    },
    toggleViewTags: function(e) {
        e.preventDefault();
        this.setState({show: this.state.show === false});
    },
    render: function() {
        var way = this.props.data['@osm'][0];
        var tags = this.getTags(way);

        return (
            React.createElement(
                'div', {className: 'way-view'},
                React.createElement('a', {href: "#"+ way['@id'], onClick: this.toggleViewTags}, "OSM Way: " + way['@id']),
                this.state.show ? React.createElement('table', null, tags): null
            )
        );
    }
});

var DataList = React.createClass({
    render: function() {
        var rows = this.props.data.map(function(submission) {
            return React.createElement(DataRow, {data: submission, key: submission._id});
        });

        return (
            React.createElement('div', {className: 'data-list'}, rows)
        );
    }
});

var OSMMap = React.createClass({
    componentDidMount: function() {
        L.mapbox.accessToken = 'pk.eyJ1Ijoib25hIiwiYSI6IlVYbkdyclkifQ.0Bz-QOOXZZK01dq4MuMImQ';
        var map = this.map = L.mapbox.map(
            this.getDOMNode(),
            'examples.map-i875kd35'
        );

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

var getWayByID = function(osm_id, osmJXON) {
    return osmJXON.osm.way.filter(function(way) {
        return way['@id'] === Number.parseInt(osm_id);
    });
};

var getOSMFields = function(data) {
    return data.filter(function(question){
        return question.type === 'osm';
    });
};

var mergeOsmData = function(osm, data, osm_fields) {
    var osmJXON = JXON.build(osm);
    var new_data = data.map(function(obj) {
        obj['@osm'] = [];
        osm_fields.map(function(field){
            var filename = obj[field.name];
            if (filename !== undefined){
                if(filename.startsWith('OSMWay') && filename.endsWith('.osm')) {
                    var osm_id = filename.replace('OSMWay', '').replace('.osm', '');
                    obj['@osm'] = getWayByID(osm_id, osmJXON);
                }
            }
        });

        return obj;
    });

    return new_data;
};

var OnaForms = React.createClass({
    getInitialState: function() {
        return {
            ona_user: this.props.ona_user,
            forms: [],
            formid: null,
            formJson: null,
            submissions: [],
            osm: null
        };
    },
    loadFormJson: function(formid) {
        return $.ajax({
            url: 'http://localhost/api/v1/forms/' + formid + '/form.json',
            dataType: 'json',
            headers: {'Authorization': 'Token ' + this.state.ona_user.api_token}
        });
    },
    getOSMWay: function(id, callback){
        var auth = this.props.osmauth;
        var params = {
            method: 'GET',
            path: '/api/0.6/way/' + id
        };
        auth.xhr(params, callback);
    },
    submitToOSM: function(e) {
        e.preventDefault();
        var auth = this.props.osmauth;
        this.state.submissions.map(function(submission) {
            var osm = submission['@osm'];
            if (osm === undefined || osm.length === 0){
                return submission;
            }
            var change = osm[0];
            var id = change['@id'];
            this.getOSMWay(id, function (err, xml) {
                if(err) {
                    console.log(err);
                } else {
                    var way = JXON.build(xml).osm.way;
                    change['@version'] = way['@version'];
                    var changeset = {
                        osm: {
                            changeset: {
                                tag: {
                                    '@k': 'comment',
                                    '@v': "OMK Push"
                                }
                            }
                        }
                    };
                    // create a changeset
                    auth.xhr({
                        method: 'PUT',
                        path: '/api/0.6/changeset/create',
                        options: { header: { 'Content-Type': 'text/xml' } },
                        content: JXON.stringify(changeset)
                    }, function(changesetErr, changeset_id) {
                        if(changesetErr) {
                            console.log(changesetErr);
                            return;
                        }
                        console.log(changeset_id);
                        // with changeset_id, upload osmChange
                        change['@changeset'] = changeset_id;
                        var osmChange = {
                            osmChange: {
                                modify: {
                                    way: change
                                }
                            }
                        };
                        auth.xhr({
                            method: 'POST',
                            path: '/api/0.6/changeset/' + changeset_id + '/upload',
                            options: { header: { 'Content-Type': 'text/xml' } },
                            content: JXON.stringify(osmChange)
                        }, function(osmChangeErr, diffResult) {
                            if(osmChangeErr) {
                                console.log(changesetErr);
                                return;
                            }
                            console.log(diffResult);
                            // close changeset
                            auth.xhr({
                                method: 'PUT',
                                path: '/api/0.6/changeset/' + changeset_id + '/close'
                            }, function(closeErr, closeResult) {
                                if(closeErr) {
                                    console.log(closeErr);
                                    return;
                                }
                                console.log(closeResult);
                            });
                        });
                    });
                }
            });
        }.bind(this));
    },
    loadOSM: function(formid) {
        return $.ajax({
            url: "http://localhost/api/v1/data/" + formid + ".osm",
            dataType: "xml",
            headers: {'Authorization': 'Token ' + this.state.ona_user.api_token}
            // success: function(xml) {
            //     this.props.loadOSMMap(xml);
            //     // Pull in all changes
            //     // for each way or node that has @action modify
            //     // get latest way or node by id
            //     // apply changes
            //     // generate osmChange xml
            //     var osmJXON = JXON.build(xml);

            //     this.setState({osm: xml, osmJXON: osmJXON});

            //     if (Array.isArray(osmJXON.osm.way)) {
            //         var changes = [];
            //         osmJXON.osm.way.forEach(function(obj) {
            //             if(obj["@action"] === "modify") {
            //                 changes.push(obj);
            //             }
            //         });
            //         this.setState({changes: changes});
            //     }
            //     this.combinedData();
            // }.bind(this),
            // error: function(err) {
            //     console.log(err);
            // }
        });
    },
    loadSubmissions: function(formid, title) {
        var osmRequest = this.loadOSM(formid);
        var formJsonRequest = this.loadFormJson(formid);
        var dataRequest = $.ajax({
            url: "http://localhost/api/v1/data/" + formid + '.json',
            dataType: "json",
            headers: {'Authorization': 'Token ' + this.state.ona_user.api_token}
        });
        $.when(osmRequest, formJsonRequest, dataRequest).done(
            function(xmlData, formJsonData, submissionData) {
                var xml = xmlData[0];
                var formJson = formJsonData[0];
                var osm_fields = getOSMFields(formJson.children);
                var submissions = submissionData[0];
                this.props.loadOSMMap(xml);

                this.setState({
                    osm: xml,
                    osm_fields: osm_fields,
                    formid: formid,
                    title: title,
                    formjson: formJson,
                    submissions: mergeOsmData(xml, submissions, osm_fields)
                });
            }.bind(this)
        );
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
    rowGetter: function(rowIndex) {
        if(this.state.submissions.length > 0) {
            return this.state.submissions[rowIndex];
        }
    },
    getSize: function(){
        return this.state.submissions.length;
    },
    render: function(){
        return (
            this.state.submissions.length > 0 && this.state.formid !== null && this.state.osm !== null && this.state.osm_fields !== undefined?
                React.createElement(
                    'div', null,
                    React.createElement('h2', null, this.state.title),
                    React.createElement(
                        'form', {onSubmit: this.submitToOSM},
                        React.createElement("button", {type: "submit", className: "btn btn-sm btn-primary btn-block"}, "Submit to OpenStreetMap.org"),
                        React.createElement(DataList, {data: this.state.submissions})
                        // React.createElement(
                        //     'div', {className: 'data-list'}, React.createElement(
                        //         Table, {width: 200, height: 465, rowGetter: this.rowGetter, rowsCount: this.getSize(), rowHeight: 30,
                        //             headerHeight: 30
                        //         },
                        //         React.createElement(Column, {dataKey: '_id', label: 'Data Id', width: 100})
                        //     )
                        // )
                    )
                ): React.createElement(
                    FormList, {data: this.state.forms, loadSubmissions: this.loadSubmissions}
                )
        );
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
    componentDidMount: function() {
        if (this.state.auth.authenticated()) {
            this.props.osmLoginSuccess(this.state.auth);
        }
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
                this.props.osmLoginSuccess(this.state.auth);
            }
        }.bind(this));
    },
    handleOSMLogout: function() {
        var auth = this.state.auth;
        auth.logout();
        this.setState({auth: auth});
        this.props.osmLoginSuccess(null);
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

var MainApp = React.createClass({
    getInitialState: function(){
        return {
            ona_user: store.enabled ? store.get('ona_user', null): null,
            osm: null,
            osmauth: null
        };
    },
    setOnaUser: function(user) {
        this.setState({ona_user: user});

        if(store.enabled){
            store.set('ona_user', user);
        }
    },
    setOSMAuth: function(auth) {
        this.setState({osmauth: auth});
    },
    loadOSMMap: function(xml) {
        this.setState({osm: xml});
    },
    render: function(){
        return (
            React.createElement(
                "div", {className: "main-container"},
                React.createElement("h1", null, "OMK Push"),
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
                            landing: '/',
                            osmLoginSuccess: this.setOSMAuth
                        }): null
                    )
                ),
                this.state.osmauth !== null ? React.createElement(
                    'div', {className: "row"},
                    React.createElement(
                        "div", {className: "col-sm-3"},
                        this.state.ona_user !== null ? React.createElement(
                            OnaForms, {
                                ona_user: this.state.ona_user,
                                osmauth: this.state.osmauth,
                                loadOSMMap: this.loadOSMMap
                            }): null
                    ),
                    React.createElement(
                        "div", {className: "col-sm-9"},
                        this.state.osm !== null ? React.createElement(OSMMap, {xml: this.state.osm}): null
                    )
                ): null
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
