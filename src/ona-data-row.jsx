/* global define */
define(["react"], function(React) {
    'use strict';

    return React.createClass({
        getInitialState: function() {
            return {show: false, data: this.props.data, conflicts: false};
        },
        getTags: function(way, latestWay) {
            var tags = Array.isArray(way.tag) ? way.tag : [way.tag];
            return tags.map(function(tag) {
                var k = tag['@k'];
                var v = tag['@v'];
                var title = tag['@v'];
                var highlight = '';

                if (latestWay !== undefined) {
                    var match = Array.isArray(latestWay.tag) ? latestWay.tag.filter(function(t){
                            return t['@k'] === k;
                        }) : latestWay.tag['@k'] === k ? [latestWay.tag] : [];
                    if(match.length > 0) {
                        highlight += match[0]['@v'] === v ? '' : ' text-danger';
                        title = match[0]['@v'];
                    } else {
                        highlight += ' text-success';
                    }
                }
                return React.createElement(
                    'tr', {key: k, className: highlight},
                    React.createElement('td', {className: 'key' + highlight}, k),
                    React.createElement(
                        'td', {className: 'value' + highlight, title: title}, v,
                        highlight.search('text-danger') > -1 ? React.createElement("span", null, " ( ", React.createElement('span', {className: "strikethrough"}, title), " )") : null
                    )
                );
            });
        },
        toggleViewTags: function(e) {
            e.preventDefault();
            this.setState({show: this.state.show === false});
            var wayId = e.target.href.split('#').length > 1 ? e.target.href.split('#')[1] : null;
            if(wayId !== null) {
                this.highlightWay(e);
            }
        },
        highlightWay: function(e) {
            e.preventDefault();
            var wayId = e.target.href.split('#').length > 1 ? e.target.href.split('#')[1] : null;
            if(wayId !== null) {
                var layer = this.props.data_layer;
                layer.getLayers().map(function(lyr) {
                    lyr.setStyle({color: "#0000FF"});

                    return lyr;
                }).filter(function(lyr) {
                    return lyr.feature.id === wayId;
                }).map(function(lyr) {
                    lyr.setStyle({color: "#FF0F0F"});
                    lyr.openPopup();

                    return lyr;
                });
            }
        },
        render: function() {
            var way = this.props.data['@osm'][0];
            var latestWay = this.props.data['@osm_current'];
            var latestVersion = null, version = way['@version'];
            var tags = this.getTags(way, latestWay);
            var highlight = tags.filter(function(tag) {
                return tag.props.className.search('text-danger') > -1;
            }).length > 0 ? ' bg-danger' : '';

            if (latestWay !== undefined) {
                latestVersion = latestWay['@version'];
            }

            return (
                React.createElement(
                    'div', {className: 'checkbox way-view' + highlight},
                    latestVersion !== null ? React.createElement(
                        'input', {type: 'checkbox', name: 'osm_id', value: this.props.data._id}) : null,
                    React.createElement('a', {href: "#" + way['@id'], onClick: this.toggleViewTags, onMouseOver: this.highlightWay}, "OSM Way: " + way['@id']),
                    React.createElement('span', {className: 'version'}, 'v' + version),
                    latestVersion !== null ? React.createElement(
                        'span', {className: latestVersion !== version ? 'latest-version' : 'version'},
                        React.createElement('a', {href: 'https://www.openstreetmap.org/way/' + way['@id'], target: '_blank'}, 'v' + latestVersion)) : null,
                    this.state.show ? React.createElement('table', null, tags) : null
                )
            );
        }
    });
});
