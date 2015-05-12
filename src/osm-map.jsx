/* global define, window*/
define(["react", "mapbox.js", "leaflet-osm"], function(React) {
    'use strict';

    var L = window.L;

    return React.createClass({
        componentDidMount: function() {
            if(this.props.xml === undefined) {
                return;
            }
            L.mapbox.accessToken = 'pk.eyJ1Ijoib25hIiwiYSI6IlVYbkdyclkifQ.0Bz-QOOXZZK01dq4MuMImQ';
            var map = this.map = L.mapbox.map(
                this.getDOMNode(),
                'examples.map-i875kd35'
            );

            var dataLayer = new L.OSM.DataLayer(
                this.props.xml
            ).eachLayer(function(layer) {
                var html = '<div class="map-popup"><h4>OSM Way ID: ' + layer.feature.id + "</h4><table>";
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
            map.fitBounds(dataLayer.getBounds());
            this.props.setMapDataLayer(dataLayer);
        },
        componentWillUnmount: function() {
            this.map = null;
        },
        render: function(){
            return (
                React.createElement('div', {className: "map"})
            );
        }
    });
});
