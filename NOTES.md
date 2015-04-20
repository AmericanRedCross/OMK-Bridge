# OMK Push

Pull osm files collected through [Ona](ona.io) and push to [OpenStreetMap](https://www.openstreetmap.org).

## Plan of action

Use [reactjs](https://facebook.github.io/react/)

### Authentication with Ona

- Use `username` and `password` to get temp api token
- Pull Forms user has access to
- Select form
- Show list of submissions
- Show on map all OSM entities
- Allow selection of an OSM entity, show tags
- Submit to OSM osm file for all submissions

- Select a submission and show all entities
- Show on map all OSM entities for the submission
- Allow selection of an OSM entity, show tags
- Submit to OSM osm file of the submission

### Submit to OSM

- Check that user is authenticated against [OpenStreetMap](https://www.openstreetmap.org)
 if not redirect to OSM and authenticate
- create a change set for an OSM entity
- make submision to OSM

### Authentication with [OpenStreetMap](https://www.openstreetmap.org) through Oauth 1

- Integrate or make use of [osm-auth](https://github.com/osmlab/osm-auth)

### UI design
- Implement UI design to incorporate a list of submissions, a map, show tags of items,
 submission to [OpenStreetMap](https://www.openstreetmap.org), user login
