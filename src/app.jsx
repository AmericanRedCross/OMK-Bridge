var React = require('react');
var Router = require('react-router');
var Login = require('./login.jsx');
var OsmLogin = require('./osm-login.jsx');
var OnaForms = require('./ona-forms.jsx');
var OnaData = require('./ona-data.jsx');
var Route = Router.Route;
var NotFoundRoute = Router.NotFoundRoute;
var RouteHandler = Router.RouteHandler;
var auth = require('./auth');
var osmAuth = require('osm-auth');
var {Link} = Router;

var About = React.createClass({
    render: function() {
        return (
            <h2>About</h2>
        );
    }
});

var Home = React.createClass({
    statics: {
        willTransitionTo: function(transition) {
            if(!auth.isLoggedIn()) {
                transition.redirect('/login', {}, {nextPath: transition.path});
            }
        }
    },
    render: function() {
        return (
            <h2>Home</h2>
        );
    }
});

var NotFound = React.createClass({
    render: function() {
        return (
            <h3>404: Not Found</h3>
        );
    }
});

var Logout = React.createClass({
    contextTypes: {
        router: React.PropTypes.func
    },

    componentDidMount: function() {
        var { router } = this.context;
        auth.logout();
        router.transitionTo('login');
    },
    render: function() {
        return (<div>Logging out</div>);
    }
});

var Menu = React.createClass({
    render: function() {
        return (
            <ul className="nav-menu">
                <li>
                    <a href="#/forms">Forms</a>
                </li>
            </ul>
        );
    }
});

var UserMenu = React.createClass({
    handleUserClick: function(e) {
        e.preventDefault();
        return false;
    },
    render: function() {
        var name = this.props.ona_user !== null ? this.props.ona_user.name : '';
        return (
            <div className="auth-dropdown dropdown right">
                <a href="#" onClick={this.handleUserClick}>
                    <i className="fa fa-user"></i>
                    <span className="logged-in-user">{name}</span>
                    <i className="fa fa-caret-down"></i>
                </a>
                <ul className="menu">
                    <li><Link to="osm-login" query={{logout: true}}>Unlink OpenStreetMaps.org</Link></li>
                    <li><Link to="logout">Logout</Link></li>
                </ul>
            </div>
        );
    }
});

var App = React.createClass({
    getInitialState: function() {

        var osm_options = {
            oauth_consumer_key: 'OTlOD6gfLnzP0oot7uA0w6GZdBOc5gQXJ0r7cdG4',
            oauth_secret: 'cHPXxC3JCa9PazwVA5XOQkmh4jQcIdrhFePBmbSJ',
            landing: '/',
            auto: true
        };

        return {osm_auth: osmAuth(osm_options)};
    },
    setOnaUser: function(ona_user) {
        this.setState({ona_user: ona_user});
    },

    contextTypes: {
        router: React.PropTypes.func
    },

    componentDidMount: function() {
        var { router } = this.context;
        if(auth.isLoggedIn()){
            var ona_user = auth.getUser();
            if(!this.state.osm_auth.authenticated()) {
                router.transitionTo('osm-login');
            } else {
                this.setOnaUser(ona_user);
                router.transitionTo('forms');
            }
        }
    },
    render: function() {
        var ona_user = auth.isLoggedIn() ? auth.getUser(): null;
        return (
            <div>
                <div className="navbar pure-g">
                    <div className="pure-u-1-1">
                        <h2>OSM Bridge</h2>
                        {auth.isLoggedIn() ? <Menu /> : null}
                    </div>
                    <div className="pure-u-1-3">
                        {auth.isLoggedIn() ? <UserMenu ona_user={ona_user} /> : null}
                    </div>
                </div>
                <div className="pure-g">
                    <div className="pure-u-1-1">
                        <RouteHandler ona_user={ona_user} osm_auth={this.state.osm_auth} />
                    </div>
                </div>
            </div>
        );
    }
});

var routes = (
    <Route handler={App}>
        <Route name="home" path="/" handler={Home} />
        <Route name="login" path="/login" handler={Login} />
        <Route name="logout" path="/logout" handler={Logout} />
        <Route name="osm-login" path="/osm-login" handler={OsmLogin} />
        <Route name="about" path="/about" handler={About} />
        <Route name="forms" path="/forms" handler={OnaForms} />
        <Route name="form-data" path="/forms/:formid" handler={OnaData} />
        <NotFoundRoute handler={NotFound} />
    </Route>
);

if (window.location.href.search('oauth_token') !== -1){
    opener.authComplete(window.location.href);
    window.close();
}

Router.run(routes, Router.HashLocation, function(Root) {
    React.render(<Root />, document.getElementById('main'));
});
