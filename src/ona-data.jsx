/* global define, console */
define(["react", "react-router", "jquery", "jxon", "./auth", "./osm-map.jsx", "./ona-data-row.jsx", "./config.json"], function(React, Router, $, JXON, auth, OsmMap, DataRow, config) {
    'use strict';

    var fetchSubmissions = function(onaUser, formid, page, size) {
        return $.ajax({
            url: config.ona_server + "/api/v1/data/" + formid + ".json",
            data: {'not_tagged': 'osm-submitted', 'page': page, 'page_size': size},
            dataType: "json",
            headers: {"Authorization": "Token  " + onaUser.api_token}
        });
    };
    var fetchOSMSubmissions = function(onaUser, formid, page, size) {
        return $.ajax({
            url: config.ona_server + "/api/v1/data/" + formid + ".osm",
            data: {'not_tagged': 'osm-submitted', 'page': page, 'page_size': size},
            dataType: "xml",
            headers: {'Authorization': 'Token ' + onaUser.api_token}
        });
    };
    var fetchFormJson = function(onaUser, formid) {
        return $.ajax({
            url: config.ona_server + '/api/v1/forms/' + formid + '/form.json',
            dataType: 'json',
            headers: {'Authorization': 'Token ' + onaUser.api_token}
        });
    };

    var getOSMWay = function(osmAuth, id, callback){
        var params = {
            method: 'GET',
            path: '/api/0.6/way/' + id
        };
        osmAuth.xhr(params, callback);
    };

    var getWayByID = function(osmId, osmJXON) {
        if (Array.isArray(osmJXON.osm.way)){
        return osmJXON.osm.way.filter(function(way) {
            return way['@id'] === Number.parseInt(osmId);
        });
        }

        return osmJXON.osm.way['@id'] === Number.parseInt(osmId) ? [osmJXON.osm.way] : [];
    };

    var getOSMFields = function(data) {
        return data.filter(function(question){
            return question.type === 'osm';
        });
    };

    var mergeOsmData = function(osm, data, osmFields) {
        var osmJXON = JXON.build(osm);
        var newData = data.filter(function(obj) {
            var fields = osmFields.filter(function(field) {
                return obj[field.name] !== undefined;
            });

            return fields.length > 0;
        }).map(function(obj) {
            obj['@osm'] = [];
            osmFields.map(function(field){
                var filename = obj[field.name];
                if (filename !== undefined){
                    if(filename.startsWith('OSMWay') && filename.endsWith('.osm')) {
                        var osmId = filename.replace('OSMWay', '').replace('.osm', '');
                        obj['@osm'] = getWayByID(osmId, osmJXON);
                    }
                }
            });

            return obj;
        });

        return newData;
    };

    var tagOnaSubmission = function(onaUser, formid, submissionId, tag) {
        $.ajax({
                url: config.ona_server + '/api/v1/data/' + formid + '/' + submissionId + '/labels.json',
                dataType: 'json',
                method: 'POST',
                data: {tags: tag},
                headers: {'Authorization': 'Token ' + onaUser.api_token}
            }).done(function(data) {
                console.log(data);
            });
    };

    var submitToOSM = function(osmAuth, onaUser, changes, formid, doneCallback) {
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
        osmAuth.xhr({
            method: 'PUT',
            path: '/api/0.6/changeset/create',
            options: { header: { 'Content-Type': 'text/xml' } },
            content: JXON.stringify(changeset)
        }, function(changesetErr, changesetId) {
            if(changesetErr) {
                console.log(changesetErr);
                return;
            }
            var osmChanges = changes.map(function(change) {
                var way = change['@osm'][0];
                way['@changeset'] = changesetId;
                way['@version'] = change['@osm_current']['@version'];

                return way;
            });
            console.log(changesetId);
            // with changesetId, upload osmChange
            var osmChange = {
                osmChange: {
                    modify: {
                        way: osmChanges
                    }
                }
            };

            osmAuth.xhr({
                method: 'POST',
                path: '/api/0.6/changeset/' + changesetId + '/upload',
                options: { header: { 'Content-Type': 'text/xml' } },
                content: JXON.stringify(osmChange)
            }, function(osmChangeErr, diffResult) {
                if(osmChangeErr) {
                    console.log(changesetErr);
                    return;
                }
                changes.map(function(change) {
                    tagOnaSubmission(onaUser, formid, change._id, 'osm-submitted');
                });
                console.log(diffResult);
                // close changeset
                osmAuth.xhr({
                    method: 'PUT',
                    path: '/api/0.6/changeset/' + changesetId + '/close'
                }, function(closeErr, closeResult) {
                    if(closeErr) {
                        console.log(closeErr);
                        return;
                    }
                    console.log(closeResult);
                    doneCallback();
                });
            });
        });
    };

    return React.createClass({
        contextTypes: {
            router: React.PropTypes.func
        },
        getInitialState: function() {
            return {
                data: this.props.data !== undefined ? this.props.data : [],
                osmXml: null,
                page: this.props.query.page !== undefined ? Number.parseInt(this.props.query.page) : 1,
                size: this.props.query.size !== undefined ? Number.parseInt(this.props.query.size) : 50,
                selectAll: true
            };
        },
        getData: function(onaUser, formid, page, size) {
            var router = this.context.router;
            this.setState({data: [], osmXml: null});
            var dataRequest = fetchSubmissions(onaUser, formid, page, size);
            var formJsonRequest = fetchFormJson(onaUser, formid);
            var osmRequest = fetchOSMSubmissions(onaUser, formid, page, size);
            $.when(osmRequest, formJsonRequest, dataRequest).done(
                function(xmlData, formJsonData, submissionData) {
                    var xml = xmlData[0];
                    var formJson = formJsonData[0];
                    var title = formJson.title;
                    var osmFields = getOSMFields(formJson.children);

                    var submissions = xml !== null ? mergeOsmData(xml, submissionData[0], osmFields) : [];


                    // pull ways for each submission from OpenStreetMap.org
                    submissions.map(function(submission) {
                        var osm = submission['@osm'];

                        if(osm !== undefined && osm.length > 0) {
                            var osmId = osm[0]['@id'];
                            getOSMWay(this.props.osmAuth, osmId, function(err, way) {
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
                                                if(o[0]['@id'] === Number.parseInt(osmId)) {
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
                        osmXml: xml,
                        osmFields: osmFields,
                        formid: formid,
                        title: title,
                        formjson: formJson,
                        data: submissions,
                        noSubmissions: submissions.length === 0
                    });
                }.bind(this)
            ).fail(function(err) {
                if (err.status === 404) {
                    this.setState({page: 1, submissions: []}, function(){
                        this.getData(onaUser, formid, 1, this.state.size);
                        router.transitionTo('form-data', {formid: formid}, {page: 1, size: this.state.size});
                    }.bind(this));
                }
            }.bind(this));
        },
        submitToOSM: function(e) {
            e.preventDefault();
            var router = this.context.router;
            var checkedOSM = [];

            $('input[name=osm_id] :checked').each(function(index, element) {
                checkedOSM.push(Number.parseInt(element.value));
            });

            var changes = this.state.data.filter(function (submission) {
                return checkedOSM.indexOf(submission._id) !== -1;
            });
            if(checkedOSM.length < 1){
                return;
            }

            var doneCallback = function() {
                this.setState({page: 1});
                router.transitionTo('form-data', {formid: this.state.formid}, {page: 1, size: this.state.size});
                this.getData(this.state.onaUser, this.state.formid, 1, this.state.size);
            }.bind(this);

            submitToOSM(this.props.osmAuth, this.state.onaUser, changes, this.state.formid, doneCallback);
        },
        componentDidMount: function() {
            var router = this.context.router;
            if(auth.isLoggedIn()) {
                var onaUser = auth.getUser();
                var formid = router.getCurrentParams().formid;
                if(onaUser) {
                    this.setState({onaUser: onaUser, formid: formid});
                    this.getData(onaUser, formid, this.state.page, this.state.size);
                }
            }
        },
        setMapDataLayer: function(layer) {
            this.setState({mapDataLayer: layer});
        },
        previousPage: function() {
            var router = this.context.router;
            var formid = router.getCurrentParams().formid;
            var currentPage = Number.parseInt(this.state.page) <= 1 ? 1 : this.state.page - 1;
            this.setState({page: currentPage});
            router.transitionTo('form-data', {formid: formid}, {page: currentPage, size: this.state.size});
            this.getData(this.state.onaUser, this.state.formid, currentPage, this.state.size);
        },
        nextPage: function() {
            var router = this.context.router;
            var formid = router.getCurrentParams().formid;
            var currentPage = Number.parseInt(this.state.page) + 1;
            this.setState({page: currentPage});
            this.getData(this.state.onaUser, this.state.formid, currentPage, this.state.size);
            router.transitionTo('form-data', {formid: formid}, {page: currentPage, size: this.state.size});
        },
        selectAll: function(e) {
            e.preventDefault();
            this.setState({selectAll: false});
            $('input[name=osm_id]').each(function(){
                this.checked = true;
            });
        },
        unSelectAll: function(e) {
            e.preventDefault();
            this.setState({selectAll: true});
            $('input[name=osm_id]').each(function(){
                this.checked = false;
            });
        },
        render: function() {
            var rows = this.state.data.map(function(submission) {
                return (
                    this.state.mapDataLayer !== undefined ? <DataRow key={submission._id} data={submission} data_layer={this.state.mapDataLayer} /> : null
                );
            }.bind(this));

            return (
                <div className="container pure-g">
                    <div className="pure-u-1-1">
                        {this.state.title !== undefined ? <h3>{this.state.title}</h3> : <h3 />}
                    </div>
                    <div className="pure-u-1-3">
                    {this.state.noSubmissions ? <div className="alert error">No Submissions to process</div> : null}
                        {this.state.data.length > 0 ?
                        <div className="form-list-actions">
                        {this.state.selectAll === true ? <button className="pure-button pure-button-default" onClick={this.selectAll}>
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
                        {this.state.data.length < 1 && this.state.noSubmissions !== true ? <div className="fa fa-2x fa-spin fa-spinner"></div> : <br />}
                            {rows}
                        </div>
                    </div>
                    <div className="pure-u-2-3">
                        {this.state.osmXml !== null ? <OsmMap xml={this.state.osmXml} setMapDataLayer={this.setMapDataLayer} /> : <div className="fa fa-2x fa-spin fa-spinner"></div>}
                    </div>
                </div>
            );
        }
    });
});
