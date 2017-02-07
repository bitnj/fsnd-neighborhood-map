/**
 * Short of moving it to a separate file store the starting latitude and longitude 
 * to make more readily changeable without having to search.
 */
var SETTINGS = {lat: 40.3893, lng: -74.7618};

/*
 * defines a Place class
 */
var Place = function(PlaceObj) {
    var self = this;

    self.name = PlaceObj.name;
    self.placeTypes = PlaceObj.types;
    self.lat = PlaceObj.geometry.location.lat();
    self.lng = PlaceObj.geometry.location.lng();
    self.NYTContent = '';
    self.FoursquareContent = '';
    self.visible = ko.observable(true);

    /** create a marker for this place */
    self.marker = new google.maps.Marker({
        position: PlaceObj.geometry.location,
        title: self.name
    });
    self.marker.setAnimation(null);
    self.marker.setMap(map);

    self.marker.addListener('click', function() {
        if (vm.currentMarker !== null && vm.currentMarker.getAnimation() !== null) {
            toggleBounce(vm.currentMarker);
        }
        vm.currentMarker = self.marker

        map.panTo({lat: self.lat, lng: self.lng});

        var asynch1 = fsqrRequest(self);
        var asynch2 = nytRequest(self);
        // wait until the two ajax calls have finished before setting
        // the content of the open InfoWindow
        $.when(asynch1, asynch2).done(function() {
            infoWindow.setContent(self.FoursquareContent + self.NYTContent);
        });
        toggleInfoWindow(self);
        toggleBounce(self.marker);
    });
};


/*
 * ViewModel
 */
var ViewModel = function() {
    var self = this;

    /* @menuState */
    self.menuState = ko.observable('overlayOpen');

    // toggle the overlay when the hamburger menu is clicked
    self.togglemenu = function() {
        if (self.menuState() == 'overlay') {
            self.menuState('overlayOpen'); 
        } else {
            self.menuState('overlay'); 
        }
    }

    // this will hold an array of data taken from the PlaceResult Objects
    // as returned by the nearbySearch() call to the Google Maps API
    // Places Library
    self.places = ko.observableArray();
    
    // hard-coded set of placeTypes that are used to populate the select
    // drop-down
    self.placeTypes = ko.observableArray(['bakery', 'cafe',
            'library', 'lodging',
            'meal_takeaway', 'park',
            'restaurant']);
   
    // add a new place and marker to the places array
    self.addPlace = function(PlaceObj) {
        self.places.push(new Place(PlaceObj));
    };

    // set the visible property on our places based on the selectedType
    self.setVisible = function(placeType) {
        for (var i = 0, places = self.places(), len = places.length; i < len; i++) {
            var place = places[i];
            var match = place.placeTypes.includes(placeType) || typeof placeType=="undefined"; 
            place.visible(match);
            place.marker.setVisible(match);
        }
    };

    self.selectedType = ko.observable();
    // get notified when the selection changes so the list of
    // places can be filtered to only show those that have a matching placeType
    self.selectedType.subscribe(function(newValue) {
            self.setVisible(newValue);
    });
    
    self.currentMarker = null;

    // when a user clicks on an item in the places list
    self.getPlaceDetail = function(PlaceObj) {
        google.maps.event.trigger(PlaceObj.marker, 'click');
        self.togglemenu();
        self.currentMarker = PlaceObj.marker;
    };
};
var vm = new ViewModel();
ko.applyBindings(vm);


/*
 * Retrieve a list of places from the Google Maps API using the PlacesService
 * library
 */
var map;
var service;
var infoWindow;

function initMap() {
    // provides a hard-coded latitude and longitude to center the map on
    var latLng = SETTINGS;

    // create the map object and center it on our chosen location
    map = new google.maps.Map(document.getElementById('map'), {
        center: latLng,
        zoom: 13
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

    /**
     * a global InfoWindow to use for the active marker
     */
    infoWindow = new google.maps.InfoWindow({
        content: 'Loading...'
    });
    google.maps.event.addListener(infoWindow, 'closeclick', function() {
       toggleBounce(vm.currentMarker);
    });
}

/** callback function for the nearbyRequest() search which takes
 * the array of PlaceResult objects and the return status of the 
 * nearbySearch() call */
function processResults(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        /** add each PlaceResult object to our Model data via the addPlace()
        * function in the ViewModel */
        results.forEach(function(result) {
            vm.addPlace(result);
        });

    }
}


/*
 * Google Maps API fail
 */
function mapsAPIFail() {
    alert("Google Maps API failed to load");
}


// toggle the bounce animation on a marker.  From Google map API documentation
function toggleBounce(marker) {
    if (marker.getAnimation() !== null) {
        marker.setAnimation(null);
    } else {
        marker.setAnimation(google.maps.Animation.BOUNCE);
    }
}

// toggle the visibility of an infowindow
function toggleInfoWindow(PlaceObj) {
    infoWindow.close();
    infoWindow.open(map, PlaceObj.marker);
}


var NYTcontentString = '';
// Fill the contentString with the NYT information
function fillContentNYT(data) {
    var articles = data.response.docs;
    if (articles.length > 0) {
        NYTcontentString = '<ul>';
        articles.forEach(function(article) {
            NYTcontentString += '<li><a href="' + article.web_url +
                '"target="_blank">' + article.headline.main + '</a></li>';
        });
        NYTcontentString += '</ul>';
    } else {
        NYTcontentString = 'No NYT articles available';
    }
    return NYTcontentString;
}


var FsqrContentString = '';
// Fill the contentString with the Foursquare information
function fillContentFsqr(data) {
    if (data.length > 0) {
        FsqrContentString = data[0].name + '<br>' + 'ph: ' +
            data[0].contact.formattedPhone +
            '<br><br>';
    } else {
        FsqrContentString = 'No Foursqare data available' + '<br>';
    }
    return FsqrContentString;
}


/*
 * Retrieve links to New York times articles related to the passed in place
 */
function nytRequest(Place) {
    var nytAPIUrl = 'https://api.nytimes.com/svc/search/v2/articlesearch.json?q=';
    var apiKey = '12b1ea26e35c4b7c9f124169f2ae3013';
    var requestURL = nytAPIUrl + Place.name + ' Hopewell, NJ' + '&api-key=' + apiKey;
    
    return $.getJSON(requestURL, function(data) {
        Place.NYTContent = fillContentNYT(data); 
    })
    .fail(function() {
        alert("ajax request failed");
    });
}


/*
 * Retrieve data from the Foursquare API using the latitude and longitude
 * of the Google MAPS PlaceResult object
 */
function fsqrRequest(Place) {
    var fsqrAPIUrl = 'https://api.foursquare.com/v2/venues/search?ll=';
    var client_id='FV0ODMT135QKDMWNIYOLAZHGEIFBZCHE5S54ZEKBBQWV5ZSK';
    var client_secret='4P2FWJ20X4RBAK1U4B1QEX1EKGYASEVWL1BKMDFD2TJECKF2';
    var v = 20170101;

    var requestURL = fsqrAPIUrl + Place.lat + ',' + Place.lng +
        '&query=' + Place.name + '&intent=match' +
        '&client_id=' + client_id + '&client_secret=' + client_secret +
        '&v=' + v;

    return $.getJSON(requestURL, function(data) {
        Place.FoursquareContent = fillContentFsqr(data.response.venues);
    })
    .fail(function() {
        alert("Foursquare request failed");
    });
}
