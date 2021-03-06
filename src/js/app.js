/**
 * @const
 * @type {{Lat: number, Lng: number}} LatLng
 */
var SETTINGS = {lat: 40.3893, lng: -74.7618};

/**
 * Creates a Place from a {PlaceResult}
 * @class Place
 * @classdesc The Place class combines a subset of information from the passed
 * in Google Maps PlaceResult object with results of the NYT and Foursquare API
 * calls.  It also integrates the Google Maps Marker objects.
 * @property {string} name  - The name of the location.
 * @property {string[]} placeTypes  - An array of Google Maps PlaceTypes.
 * @property {number} lat   - The latitude of this location.
 * @property {number} lng   - The longitude of this location.
 * @property {string} NYTContent    - A string for displaying the NYT API
 * results.
 * @property {string} FoursquareContent - A string for displaying the Foursquare
 * API results.
 * @property {boolean} visible - Is the location displayed in the places list.
 * @property {object} marker    - The Google Maps Marker object for this
 * location.
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

    // create a marker for this place
    self.marker = new google.maps.Marker({
        position: PlaceObj.geometry.location,
        title: self.name
    });
    self.marker.setAnimation(null);
    self.marker.setMap(map);

    /**
     * This click event is used to toggle the state of the Marker
     * animation, InfoWindow, and makes the Ajax calls to the NYT and Foursquare
     * APIs.  This event is also triggered by the selection of items from the
     * placesList
     * @function marker.click
     */
    self.marker.addListener('click', function() {
        if (vm.currentMarker !== null && vm.currentMarker.getAnimation() !== null) {
            toggleBounce(vm.currentMarker);
        }
        vm.currentMarker = self.marker;

        /**
         * center the map on the selected marker
         */
        map.panTo({lat: self.lat, lng: self.lng});

        /**
         * return the jqXHR objects from the Ajax calls
         */
        var asynch1 = fsqrRequest(self);
        var asynch2 = nytRequest(self);
        /**
         * wait until the two ajax calls have finished before setting the
         * content of the open InfoWindow
         */
        $.when(asynch1, asynch2).done(function() {
            infoWindow.setContent(self.FoursquareContent + self.NYTContent);
        });
        toggleInfoWindow(self);
        toggleBounce(self.marker);
    });
};

/**
 * ViewModel for the application that links together the View and the Model
 * using the Knockout library.
 * @namespace ViewModel
 */
var ViewModel = function() {
    var self = this;

    /** 
     * The Open-Closed state of the Overlay Menu
     * @memberof ViewModel
     */
    self.menuState = ko.observable('overlayOpen');

    /**
     * Toggles the Overlay Menu when the hamburger click event is triggered.
     * @function togglemenu
     * @memberof ViewModel
     */
    self.togglemenu = function() {
        if (self.menuState() == 'overlay') {
            self.menuState('overlayOpen'); 
        } else {
            self.menuState('overlay'); 
        }
    };

    /** 
     * Holds an array of data taken from the PlaceResult Objects
     * as returned by the nearbySearch() call to the Google Maps API
     * Places Library
     * @memberof ViewModel
     */
    self.places = ko.observableArray();
    
    /**
     * Hard-coded set of placeTypes that are used to populate the select
     * drop-down
     * @memberof ViewModel
     */
    self.placeTypes = ko.observableArray(['bakery', 'cafe',
            'library', 'lodging',
            'meal_takeaway', 'park',
            'restaurant']);
   
    /**
     * Adds a new Place object to the places array
     * @function addPlace
     * @memberof ViewModel
     */
    self.addPlace = function(PlaceObj) {
        self.places.push(new Place(PlaceObj));
    };

    /**
     * Sets the visible property of the Place object
     * @function setVisible
     * @memberof ViewModel 
     */
    self.setVisible = function(placeType) {
        for (var i = 0, places = self.places(), len = places.length; i < len; i++) {
            var place = places[i];
            var match = place.placeTypes.includes(placeType) || typeof placeType=="undefined"; 
            place.visible(match);
            place.marker.setVisible(match);
        }
    };

    /**
     * The currently selected Place Type
     * @memberof ViewModel
     */
    self.selectedType = ko.observable();
    
    /**
     * Triggers the setVisible() function when the selectedType is changed
     * @memberof ViewModel
     */
    self.selectedType.subscribe(function(newValue) {
            self.setVisible(newValue);
    });
    
    /**
     * The currently selected Marker object
     * @memberof ViewModel
     */
    self.currentMarker = null;

    /**
     * Triggers the click event on a Marker when the corresponding item in the
     * placesList is clicked
     * @function getPlaceDetail
     * @memberof ViewModel
     */
    self.getPlaceDetail = function(PlaceObj) {
        google.maps.event.trigger(PlaceObj.marker, 'click');
        self.togglemenu();
        self.currentMarker = PlaceObj.marker;
    };
};
var vm = new ViewModel();
ko.applyBindings(vm);


var map;
var service;
var infoWindow;
/**
 * Retrieve a list of places from the Google Maps API using the
 * PlacesService library
 * @namespace initMap
 */
function initMap() {
    /** 
     * Provides a hard-coded latitude and longitude to center the map on
     * @memberof initMap
     */
    var latLng = SETTINGS;

    /**
     * Create the map object and center it on our chosen location 
     * @memberof initMap 
     */
    map = new google.maps.Map(document.getElementById('map'), {
        center: latLng,
        zoom: 13
    });

    /**
     * Set the map options to disable dragging and zooming
     * @function setOptions
     * @memberof initMap
     */
    map.setOptions({draggable: false, scrollwheel: false, zoomControl: false});
    
    /** 
     * form the request to be passed to nearbySearch()
     * @memberof initMap 
     */
    var request = {
        location: latLng,
        radius: '5000',     // radius of circle in meters
        types: vm.placeTypes() 
    };

    /**
     * Use the PlacesService to perform a nearbySearch() using the above
     * request and a provided callback function to handle the returned
     * array of PlaceResult objects
     * @memberof initMap
     */
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

/** 
 * Callback function for the nearbyRequest() search which takes
 * the array of PlaceResult objects and the return status of the 
 * nearbySearch() call.
 * @function processResults
 */
function processResults(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        /* add each PlaceResult object to our Model data via the addPlace()
         * function in the ViewModel
         */
        results.forEach(function(result) {
            vm.addPlace(result);
        });

    }
}


/**
 * Handle Google Maps API fail
 * @function mapsAPIFail
 */
function mapsAPIFail() {
    alert("Google Maps API failed to load");
}


/**
 * Toggle the bounce animation of the marker
 * @function toggleBounce
 * @param marker
 */
function toggleBounce(marker) {
    if (marker.getAnimation() !== null) {
        marker.setAnimation(null);
    } else {
        marker.setAnimation(google.maps.Animation.BOUNCE);
    }
}

/** 
 * Refresh the infoWindow
 * @function toggleInfoWindow
 * @param PlaceObj
 */
function toggleInfoWindow(PlaceObj) {
    infoWindow.close();
    infoWindow.open(map, PlaceObj.marker);
}


/**
 * Fill the contentString with the NYT data
 * @function fillContentNYT
 * @param data
 */
var NYTcontentString = '';
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


/**
 * Fill the contentString with the Foursquare data
 * @function fillContentFsqr
 * @param data
 */
var FsqrContentString = '';
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


/**
 * Make the API request to NYT
 * @function nytRequest
 * @param Place
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


/**
 * Make the API request to Foursquare
 * @function fsqrRequest
 * @param Place
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
