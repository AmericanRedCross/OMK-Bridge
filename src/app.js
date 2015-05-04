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
        return {show: false, data: this.props.data, conflicts: false};
    },
    getTags: function(way, latest_way) {
        var tags = Array.isArray(way.tag) ? way.tag : [way.tag];
        return tags.map(function(tag) {
            var k = tag['@k'];
            var v = tag['@v'];
            var title = tag['@v'];
            var highlight = '';

            if (latest_way !== undefined) {
                var match = Array.isArray(latest_way.tag) ? latest_way.tag.filter(function(t){
                        return t['@k'] === k;
                    }) : latest_way.tag['@k'] === k ? [latest_way.tag]: [];
                if(match.length > 0) {
                    highlight += match[0]['@v'] === v ? '': ' text-danger';
                    title = match[0]['@v'];
                } else {
                    highlight += ' text-success';
                }
            }
            return React.createElement(
                'tr', {key: k, className: highlight},
                React.createElement('td', {className: 'key' + highlight}, k),
                React.createElement('td', {className: 'value' + highlight, title: title}, v)
            );
        });
    },
    toggleViewTags: function(e) {
        e.preventDefault();
        this.setState({show: this.state.show === false});
        var way_id = e.target.href.split('#').length > 1 ? e.target.href.split('#')[1] : null;
        if(way_id !== null) {
            this.props.highlightWay(way_id);
        }
    },
    highlightWay: function(e) {
        e.preventDefault();
        var way_id = e.target.href.split('#').length > 1 ? e.target.href.split('#')[1] : null;
        if(way_id !== null) {
            this.props.highlightWay(way_id);
        }
    },
    render: function() {
        var way = this.props.data['@osm'][0];
        var latest_way = this.props.data['@osm_current'];
        var latest_version = null, version = way['@version'];
        var tags = this.getTags(way, latest_way);
        var highlight = tags.filter(function(tag) {
            return tag.props.className.search('text-danger') > -1;
        }).length > 0 ? ' bg-danger': '';

        if (latest_way !== undefined) {
            latest_version = latest_way['@version'];
        }

        return (
            React.createElement(
                'div', {className: 'checkbox way-view' + highlight},
                latest_version !== null && highlight === ''? React.createElement(
                    'input', {type: 'checkbox', name: 'osm_id', value: this.props.data._id}):null,
                React.createElement('a', {href: "#"+ way['@id'], onClick: this.toggleViewTags, onMouseOver: this.highlightWay}, "OSM Way: " + way['@id']),
                React.createElement('span', {className: 'version'}, 'v' + version),
                latest_version !== null? React.createElement('span', {className: latest_version !== version? 'latest-version': 'version'}, 'v' + latest_version): null,
                this.state.show ? React.createElement('table', null, tags): null
            )
        );
    }
});

var DataList = React.createClass({
    render: function() {
        var rows = this.props.data.map(function(submission) {
            return React.createElement(DataRow, {
                data: submission, key: submission._id, highlightWay: this.props.highlightWay});
        }.bind(this));

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

        var data_layer = new L.OSM.DataLayer(
            this.props.xml
        ).eachLayer(function(layer) {
            var html = '<div class="map-popup"><h4>OSM Way ID: ' + layer.feature.id + "</h4><table>";
            var i = 0;
            var tag;
            for(tag in layer.feature.tags) {
                if(layer.feature.tags.hasOwnProperty(tag)) {
                    html += "<tr><td>" + tag + "</td><td>" + layer.feature.tags[tag] + "</td></tr>";
                }
            }
            html += "</table>";
            layer.bindPopup(html);
            layer.on({
                mouseover: function (e) {
                    var lyr = e.target;
                    lyr.setStyle({color: "#FF0000"});
                },
                mouseout: function (e) {
                    var lyr = e.target;
                    lyr.setStyle({color: "#0000FF"});
                }
            });
        }).addTo(map);
        map.fitBounds(data_layer.getBounds());
        this.props.setMapDataLayer(data_layer);
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
    if (Array.isArray(osmJXON.osm.way)){
    return osmJXON.osm.way.filter(function(way) {
        return way['@id'] === Number.parseInt(osm_id);
    });
    }

    return osmJXON.osm.way['@id'] === Number.parseInt(osm_id)? [osmJXON.osm.way]: [];
};

var getOSMFields = function(data) {
    return data.filter(function(question){
        return question.type === 'osm';
    });
};

var mergeOsmData = function(osm, data, osm_fields) {
    var osmJXON = JXON.build(osm);
    var new_data = data.filter(function(obj) {
        var fields = osm_fields.filter(function(field) {
            return obj[field.name] !== undefined;
        });

        return fields.length > 0;
    }).map(function(obj) {
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

var tagOnaSubmission = function(ona_user, formid, submission_id, tag) {
    $.ajax({
            url: 'https://stage.ona.io/api/v1/data/' + formid + '/' + submission_id + '/labels.json',
            dataType: 'json',
            method: 'POST',
            data: {tags: tag},
            headers: {'Authorization': 'Token ' + ona_user.api_token}
        }).done(function(data) {
            console.log(data);
        });
};

var submitToOSM = function(auth, ona_user, changes, formid) {
    // create a changeset
    var changeset = {
        osm: {
            changeset: {
                tag: {
                    '@k': 'comment',
                    '@v': "OMK Bridge"
                }
            }
        }
    };
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
        var osm_changes = changes.map(function(change) {
            var way = change['@osm'][0];
            way['@changeset'] = changeset_id;
            way['@version'] = change['@osm_current']['@version'];

            return way;
        });
        console.log(changeset_id);
        // with changeset_id, upload osmChange
        var osmChange = {
            osmChange: {
                modify: {
                    way: osm_changes
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
            changes.map(function(change) {
                tagOnaSubmission(ona_user, formid, change._id, 'osm-submitted');
            });
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
};

var OnaForms = React.createClass({
    getInitialState: function() {
        return {
            ona_user: this.props.ona_user,
            forms: [],
            formid: null,
            formJson: null,
            submissions: [],
            osm: null,
            page: 1,
            page_size: 100
        };
    },
    loadFormJson: function(formid) {
        return $.ajax({
            url: 'https://stage.ona.io/api/v1/forms/' + formid + '/form.json',
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
    setOSMWay: function(osm_id, way) {
        var osmJXON = JXON.build(way);
        this.setState({
            submissions: this.state.submissions.map(function(submission) {
                var osm = submission['@osm'];
                if(osm !== undefined) {
                    if(osm[0]['@id'] === Number.parseInt(osm_id)) {
                        submission['@osm_current'] = osmJXON.osm.way;
                    }
                }
                return submission;
            })
        });
    },
    submitToOSM: function(e) {
        e.preventDefault();
        var checked_osm = [];

        $('input[name=osm_id]:checked').each(function(index, element) {
            checked_osm.push(Number.parseInt(element.value));
        });

        var changes = this.state.submissions.filter(function (submission) {
            return checked_osm.indexOf(submission._id) !== -1;
        });
        if(checked_osm.length < 1){
            return;
        }

        submitToOSM(this.props.osmauth, this.state.ona_user, changes, this.state.formid);
    },
    getPagingQuery: function() {
        return 'page=' + this.state.page + '&page_size=' + this.state.page_size;
    },
    loadOSM: function(formid) {
        return $.ajax({
            url: "https://stage.ona.io/api/v1/data/" + formid + ".osm?not_tagged=osm-submitted&" + this.getPagingQuery(),
            dataType: "xml",
            headers: {'Authorization': 'Token ' + this.state.ona_user.api_token}
        });
    },
    loadSubmissions: function(formid, title) {
        var auth = this.props.osmauth;
        var osmRequest = this.loadOSM(formid);
        var formJsonRequest = this.loadFormJson(formid);
        var dataRequest = $.ajax({
            url: "https://stage.ona.io/api/v1/data/" + formid + '.json?not_tagged=osm-submitted&' + this.getPagingQuery(),
            dataType: "json",
            headers: {'Authorization': 'Token ' + this.state.ona_user.api_token}
        });
        $.when(osmRequest, formJsonRequest, dataRequest).done(
            function(xmlData, formJsonData, submissionData) {
                var xml = xmlData[0];
                var formJson = formJsonData[0];
                var osm_fields = getOSMFields(formJson.children);
                var submissions = mergeOsmData(xml, submissionData[0], osm_fields);

                // load map
                this.props.loadOSMMap(xml);

                // pull ways for each submission from OpenStreetMap.org
                submissions.map(function(submission) {
                    var osm = submission['@osm'];

                    if(osm !== undefined && osm.length > 0) {
                        var osm_id = osm[0]['@id'];
                        this.getOSMWay(osm_id, function(err, way) {
                            if (err){
                                console.log(err);
                                return;
                            }
                            this.setOSMWay(osm_id, way);
                        }.bind(this));
                    }
                }.bind(this));
                this.setState({
                    osm: xml,
                    osm_fields: osm_fields,
                    formid: formid,
                    title: title,
                    formjson: formJson,
                    submissions: submissions
                });
            }.bind(this)
        ).fail(function(err) {
            if (err.status === 404) {
                this.setState({page: this.state.page - 1, submissions: []}, function(){
                    this.loadSubmissions(this.state.formid, this.state.title);
                }.bind(this));
            }
        }.bind(this));
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
    selectAll: function(e) {
        e.preventDefault();
        $('input[name=osm_id]').each(function(){
            this.checked = true;
        });
    },
    unselectAll: function(e) {
        e.preventDefault();
        $('input[name=osm_id]').each(function(){
            this.checked = false;
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
    nextPage: function(e) {
        e.preventDefault();
        this.setState({page: this.state.page + 1, submissions: []}, function(){
            this.loadSubmissions(this.state.formid, this.state.title);
        }.bind(this));
    },
    previousPage: function(e) {
        e.preventDefault();
        if(this.state.page !== 1){
            this.setState({page: this.state.page - 1, submissions: []}, function(){
                this.loadSubmissions(this.state.formid, this.state.title);
            }.bind(this));
        }
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
                        React.createElement("br", null),
                        React.createElement(
                            'div', null,
                            React.createElement("a", {onClick: this.previousPage, className: "btn btn-xs btn-default"}, "Previous"),
                            React.createElement("a", {className: "btn btn-default btn-xs", onClick: this.selectAll}, "Select All"),
                            React.createElement("a", {className: "btn btn-default btn-xs", onClick: this.unselectAll}, "UnSelect All"),
                            React.createElement("a", {onClick: this.nextPage, className: "btn btn-xs btn-default btn-next"}, "Next")
                        ),
                        React.createElement(DataList, {data: this.state.submissions, highlightWay: this.props.highlightWay})
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
    setMapDataLayer: function(data_layer) {
        this.setState({data_layer: data_layer});
    },
    highlightWay: function(way_id) {
        var layer = this.state.data_layer;
        layer.getLayers().map(function(lyr) {
            lyr.setStyle({color: "#0000FF"});

            return lyr;
        }).filter(function(lyr) {
            return lyr.feature.id === way_id;
        }).map(function(lyr) {
            lyr.setStyle({color: "#FF0F0F"});
            lyr.openPopup();

            return lyr;
        });
    },
    render: function(){
        return (
            React.createElement(
                "div", {className: "main-container"},
                this.state.osmauth === null ? React.createElement("h1", null, "OMK Bridge"): null,
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
                this.state.osmauth !== null ? React.createElement("h1", null, "OMK Bridge"): null,
                this.state.osmauth !== null ? React.createElement(
                    'div', {className: "row"},
                    React.createElement(
                        "div", {className: "col-sm-3"},
                        this.state.ona_user !== null ? React.createElement(
                            OnaForms, {
                                ona_user: this.state.ona_user,
                                osmauth: this.state.osmauth,
                                loadOSMMap: this.loadOSMMap,
                                highlightWay: this.highlightWay
                            }): null
                    ),
                    React.createElement(
                        "div", {className: "col-sm-9"},
                        this.state.osm !== null ?
                            React.createElement(OSMMap, {xml: this.state.osm, setMapDataLayer: this.setMapDataLayer}): null
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
    React.createElement(MainApp, {onaLoginURL: 'https://stage.ona.io/api/v1/user.json'}),
    document.getElementById("main")
);
