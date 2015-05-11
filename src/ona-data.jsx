/* global define */
define(["react", "react-router", "jquery", "jxon", "./auth", "./osm-map.jsx", "./ona-data-row.jsx", "./config.json"], function(React, Router, $, JXON, auth, OsmMap, DataRow, config) {
    var fetchSubmissions = function(ona_user, formid, page, page_size) {
        return $.ajax({
            url: config.ona_server + "/api/v1/data/" + formid + ".json",
            data: {not_tagged: 'osm-submitted', page: page, page_size: page_size},
            dataType: "json",
            headers: {"Authorization": "Token  " + ona_user.api_token}
        });
    };
    var fetchOSMSubmissions = function(ona_user, formid, page, page_size) {
        return $.ajax({
            url: config.ona_server + "/api/v1/data/" + formid + ".osm",
            data: {not_tagged: 'osm-submitted', page: page, page_size: page_size},
            dataType: "xml",
            headers: {'Authorization': 'Token ' + ona_user.api_token}
        });
    };
    var fetchFormJson = function(ona_user, formid) {
        return $.ajax({
            url: config.ona_server + '/api/v1/forms/' + formid + '/form.json',
            dataType: 'json',
            headers: {'Authorization': 'Token ' + ona_user.api_token}
        });
    };

    var getOSMWay = function(osm_auth, id, callback){
        var params = {
            method: 'GET',
            path: '/api/0.6/way/' + id
        };
        osm_auth.xhr(params, callback);
    };

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
                url: config.ona_server + '/api/v1/data/' + formid + '/' + submission_id + '/labels.json',
                dataType: 'json',
                method: 'POST',
                data: {tags: tag},
                headers: {'Authorization': 'Token ' + ona_user.api_token}
            }).done(function(data) {
                console.log(data);
            });
    };

    var submitToOSM = function(osm_auth, ona_user, changes, formid, done_callback) {
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
        osm_auth.xhr({
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

            osm_auth.xhr({
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
                osm_auth.xhr({
                    method: 'PUT',
                    path: '/api/0.6/changeset/' + changeset_id + '/close'
                }, function(closeErr, closeResult) {
                    if(closeErr) {
                        console.log(closeErr);
                        return;
                    }
                    console.log(closeResult);
                    done_callback();
                });
            });
        });
    };

    var {Link} = Router;

    return React.createClass({
        contextTypes: {
            router: React.PropTypes.func
        },
        getInitialState: function() {
            var {router} = this.context;
            return {
                data: this.props.data !== undefined ? this.props.data: [],
                osm_xml: null,
                page: this.props.query.page !== undefined ? Number.parseInt(this.props.query.page) : 1,
                page_size: this.props.query.page_size !== undefined ? Number.parseInt(this.props.query.page_size) : 50,
                select_all: true
            };
        },
        getData: function(ona_user, formid, page, page_size) {
            var {router} = this.context;
            this.setState({data: [], osm_xml: null});
            var dataRequest = fetchSubmissions(ona_user, formid, page, page_size);
            var formJsonRequest = fetchFormJson(ona_user, formid);
            var osmRequest = fetchOSMSubmissions(ona_user, formid, page, page_size);
            $.when(osmRequest, formJsonRequest, dataRequest).done(
                function(xmlData, formJsonData, submissionData) {
                    var xml = xmlData[0];
                    var formJson = formJsonData[0];
                    var title = formJson.title;
                    var osm_fields = getOSMFields(formJson.children);

                    var submissions = xml !== null ? mergeOsmData(xml, submissionData[0], osm_fields): [];


                    // pull ways for each submission from OpenStreetMap.org
                    submissions.map(function(submission) {
                        var osm = submission['@osm'];

                        if(osm !== undefined && osm.length > 0) {
                            var osm_id = osm[0]['@id'];
                            getOSMWay(this.props.osm_auth, osm_id, function(err, way) {
                                if (err){
                                    console.log(err);
                                    return;
                                }
                                var osmJXON = JXON.build(way);

                                this.setState({
                                    data: this.state.data.map(
                                        function(s) {
                                            var o = s['@osm'];
                                            if(o !== undefined) {
                                                if(o[0]['@id'] === Number.parseInt(osm_id)) {
                                                    s['@osm_current'] = osmJXON.osm.way;
                                                }
                                            }
                                            return s;
                                        }
                                    )
                                });
                            }.bind(this));
                        }
                    }.bind(this));

                    this.setState({
                        osm_xml: xml,
                        osm_fields: osm_fields,
                        formid: formid,
                        title: title,
                        formjson: formJson,
                        data: submissions,
                        no_submissions: submissions.length === 0
                    });
                }.bind(this)
            ).fail(function(err) {
                if (err.status === 404) {
                    this.setState({page: 1, submissions: []}, function(){
                        this.getData(ona_user, formid, 1, this.state.page_size);
                        router.transitionTo('form-data', {formid: formid}, {page: 1, page_size: this.state.page_size});
                    }.bind(this));
                }
            }.bind(this));
        },
        submitToOSM: function(e) {
            e.preventDefault();
            var {router} = this.context;
            var checked_osm = [];

            $('input[name=osm_id]:checked').each(function(index, element) {
                checked_osm.push(Number.parseInt(element.value));
            });

            var changes = this.state.data.filter(function (submission) {
                return checked_osm.indexOf(submission._id) !== -1;
            });
            if(checked_osm.length < 1){
                return;
            }

            var doneCallback = function() {
                this.setState({page: 1});
                router.transitionTo('form-data', {formid: this.state.formid}, {page: 1, page_size: this.state.page_size});
                this.getData(this.state.ona_user, this.state.formid, 1, this.state.page_size);
            }.bind(this);

            submitToOSM(this.props.osm_auth, this.state.ona_user, changes, this.state.formid, doneCallback);
        },
        componentDidMount: function() {
            var {router} = this.context;
            if(auth.isLoggedIn()) {
                var ona_user = auth.getUser();
                var formid = router.getCurrentParams().formid;
                if(ona_user) {
                    this.setState({ona_user: ona_user, formid: formid});
                    this.getData(ona_user, formid, this.state.page, this.state.page_size);
                }
            }
        },
        setMapDataLayer: function(layer) {
            this.setState({map_data_layer: layer});
        },
        previousPage: function() {
            var {router} = this.context;
            var formid = router.getCurrentParams().formid;
            var current_page = Number.parseInt(this.state.page) <= 1 ? 1 : this.state.page - 1;
            this.setState({page: current_page});
            router.transitionTo('form-data', {formid: formid}, {page: current_page, page_size: this.state.page_size});
            this.getData(this.state.ona_user, this.state.formid, current_page, this.state.page_size);
        },
        nextPage: function() {
            var {router} = this.context;
            var formid = router.getCurrentParams().formid;
            var current_page = Number.parseInt(this.state.page) + 1;
            this.setState({page: current_page});
            this.getData(this.state.ona_user, this.state.formid, current_page, this.state.page_size);
            router.transitionTo('form-data', {formid: formid}, {page: current_page, page_size: this.state.page_size});
        },
        selectAll: function(e) {
            e.preventDefault();
            this.setState({select_all: false});
            $('input[name=osm_id]').each(function(){
                this.checked = true;
            });
        },
        unSelectAll: function(e) {
            e.preventDefault();
            this.setState({select_all: true});
            $('input[name=osm_id]').each(function(){
                this.checked = false;
            });
        },
        render: function() {
            var rows = this.state.data.map(function(submission) {
                return (
                    this.state.map_data_layer !== undefined ? <DataRow key={submission._id} data={submission} data_layer={this.state.map_data_layer} />: null
                );
            }.bind(this));

            return (
                <div className="container pure-g">
                    <div className="pure-u-1-1">
                        {this.state.title !== undefined ? <h3>{this.state.title}</h3> : <h3 />}
                    </div>
                    <div className="pure-u-1-3">
                    {this.state.no_submissions ? <div className="alert error">No Submissions to process</div>: null}
                        {this.state.data.length > 0 ?
                        <div className="form-list-actions">
                        {this.state.select_all === true ? <button className="pure-button pure-button-default" onClick={this.selectAll}>
                            <i className="fa fa-square-o" />Select All
                        </button> :
                        <button className="pure-button pure-button-default" onClick={this.unSelectAll}>
                            <i className="fa fa-check-square-o" />UnSelect All
                        </button>}
                        <span className="right">
                            <button className="pure-button pure-button-default" title="Previous" onClick={this.previousPage}>
                                <i className="fa fa-chevron-left" />
                            </button>
                            <button className="pure-button pure-button-default" title="Next" onClick={this.nextPage}>
                                <i className="fa fa-chevron-right" />
                            </button>
                        </span>
                        </div>
                        : null}
                        {this.state.data.length > 0 ? <button className="pure-button pure-button-default" title="Submit to OpenStreetMap.org" onClick={this.submitToOSM}>
                                <i className="fa fa-check" />
                                Submit to OpenStreetMap.org
                            </button> : <br /> }
                        <div className="submissions-list">
                        {this.state.data.length < 1 && this.state.no_submissions !== true ? <div className="fa fa-2x fa-spin fa-spinner"></div> : <br />}
                            {rows}
                        </div>
                    </div>
                    <div className="pure-u-2-3">
                        {this.state.osm_xml !== null ? <OsmMap xml={this.state.osm_xml} setMapDataLayer={this.setMapDataLayer} /> : <div className="fa fa-2x fa-spin fa-spinner"></div>}
                    </div>
                </div>
            );
        }
    });
});
