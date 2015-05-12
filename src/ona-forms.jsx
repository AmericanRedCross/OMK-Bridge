/* global define, console */
define(["react", "react-router", "jquery", "./auth", "./config.json"], function(React, Router, $, auth, config) {
    'use strict';

    var Link = Router.Link;

    var fetchOnaForms = function(onaUser) {
        return $.ajax({
            url: config.ona_server + "/api/v1/forms.json",
            data: {"instances_with_osm": "True"},
            dataType: "json",
            headers: {"Authorization": "Token  " + onaUser.api_token}
        });
    };

    return React.createClass({
        getInitialState: function() {
            return {data: this.props.data !== undefined ? this.props.data : []};
        },
        componentDidMount: function() {
            if(auth.isLoggedIn()) {
                var onaUser = auth.getUser();
                if (onaUser) {
                    fetchOnaForms(onaUser).done(function(data) {
                        this.setState({data: data});
                    }.bind(this)).fail(function(jqXHR, textStatus) {
                        console.error("Failed fetching forms from Ona: ", textStatus);
                    });
                }
            }
        },
        render: function() {
            var rows = this.state.data.map(function(form) {
                return (
                    <tr key={form.formid}>
                        <td>
                            <Link to="form-data" params={{formid: form.formid}} query={{page: 1, size: 50}}>{form.title}</Link></td>
                        <td>{form.num_of_submissions}</td>
                    </tr>
                );
            });
            return (
                <div className="container pure-g">
                    <div className="pure-u-1-1">
                        <h3>Osm Forms</h3>
                    </div>
                    <div className="pure-u-3-5">
                        <table className="pure-table pure-table-bordered">
                            <thead>
                                <tr>
                                    <th>Forms</th>
                                    <th># of submissions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows}
                            </tbody>
                        </table>
                        {this.state.data.length < 1 ? <div className="fa fa-2x fa-spin fa-spinner"></div> : <br />}
                    </div>
                    <div className="pure-u-2-5">
                        <div className="big-hint t-center">
                            Click a form to view the OSM tags submissions.
                        </div>
                    </div>
                </div>
            );
        }
    });
});
