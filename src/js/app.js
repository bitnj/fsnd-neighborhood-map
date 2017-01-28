/*
 * defines a Place class
 */
var Place = function(PlaceObj, MarkerObj) {
    var self = this;

    self.name = PlaceObj.name;
    self.placeTypes = PlaceObj.types;
    self.marker = MarkerObj;
    self.visible = ko.observable(true);
}


/*
 * ViewModel
 */
var ViewModel = function() {
    var self = this;

    // this will hold an array of data taken from the PlaceResult Objects
    // as returned by the nearbySearch() call to the Google Maps API
    // Places Library
    self.places = ko.observableArray();
    
    // hard-coded set of placeTypes that are used to populate the select
    // drop-down
    self.placeTypes = ko.observableArray(['art_gallery', 'bicycle_store',
            'book_store', 'cafe']);
   
    // add a new place and marker to the places array
    self.addPlace = function(PlaceObj, MarkerObj) {
        self.places.push(new Place(PlaceObj, MarkerObj));
    };

    // set the visible property on our places based on the selectedType
    self.setVisible = function(placeType) {
        for (var i = 0, places = self.places(); i < places.length; i++) {
            if (places[i].placeTypes.includes(placeType) || typeof placeType=="undefined") {
                places[i].visible(true);
                places[i].marker.setMap(map);
            }
            else {
                places[i].visible(false);
                places[i].marker.setMap(null);
            }
        };
    }

    self.selectedType = ko.observable();
    // get notified when the select drop-down changes so the list of
    // places can be filtered to only show those that have a matching placeType
    self.selectedType.subscribe(function(newValue) {
            self.setVisible(newValue);
    });

    // when a user clicks on an item in the list or it's associated marker
    self.getPlaceDetail = function(PlaceObj) {
        toggleBounce(PlaceObj.marker);
    }
};
var vm = new ViewModel();
ko.applyBindings(vm);


/*
 * Retrieve a list of places from the Google Maps API using the PlacesService
 * library
 */
var map;
var service;

function initMap() {
    // provides a hard-coded latitude and longitude to center the map on
    var latLng = {lat: 40.3893, lng: -74.7618};

    // create the map object and center it on our chosen location
    map = new google.maps.Map(document.getElementById('map'), {
        center: latLng,
        zoom: 13 
    });

    // create the map Marker for our hard-coded location
    var marker = new google.maps.Marker({
        position: latLng,
        map: map,
        title: 'Home'
    });

    // set the map options to disable dragging and zooming
    map.setOptions({draggable: false, scrollwheel: false, zoomControl: false});
    
    // form the request to be passed to nearbySearch()
    var request = {
        location: latLng,
        radius: '5000',     // radius of circle in meters
        types: vm.placeTypes() 
    };

    // use the PlacesService to perform a nearbySearch() using the above
    // request and a provided callback function to handle the returned
    // array of PlaceResult objects
    service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request, processResults);

}

// callback function for the nearbyRequest() search which takes
// the array of PlaceResult objects and the return status of the
// nearbySearch() call
function processResults(results, status) {
   if (status == google.maps.places.PlacesServiceStatus.OK) {
       // add each PlaceResult object to our Model data via the addPlace()
       // function in the ViewModel
       for (var i = 0; i < results.length; i++) {
           var marker = createMarker(results[i]);
           vm.addPlace(results[i], marker);
       }
   }
}

// create a Marker for the passed in PlaceResult object and place it
// on the map
function createMarker(PlaceObj) {
    var marker = new google.maps.Marker({
        position: PlaceObj.geometry.location,
        title: PlaceObj.name
    });
    marker.addListener('click', function() {
        toggleBounce(marker);
        createInfoWindow().open(map, marker);
    });
    marker.setMap(map);
    return marker;
}

// create an InfoWindow to associate with the passed in marker
function createInfoWindow() {
    var infowindow = new google.maps.InfoWindow({});
    return infowindow;
}

// toggle the bounce animation on a marker.  From Google map API documentation
function toggleBounce(marker) {
    if (marker.getAnimation() !== null) {
        marker.setAnimation(null);
    } else {
        marker.setAnimation(google.maps.Animation.BOUNCE);
    }
}
