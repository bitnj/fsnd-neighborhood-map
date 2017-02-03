/*
 * defines a Place class
 */
var Place = function(PlaceObj, MarkerObj) {
    var self = this;

    self.name = PlaceObj.name;
    self.placeTypes = PlaceObj.types;
    self.lat = PlaceObj.geometry.location.lat();
    self.lng = PlaceObj.geometry.location.lng();
    self.marker = MarkerObj;
    self.NYTContent = '';
    self.FoursquareContent = '';
    self.visible = ko.observable(true);
};


/*
 * ViewModel
 */
var ViewModel = function() {
    var self = this;

    // toggle the hamburger menu when clicked
    self.togglemenu = function() {
        $('#placesList').toggle('slide');
    };

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
    self.addPlace = function(PlaceObj, MarkerObj) {
        self.places.push(new Place(PlaceObj, MarkerObj));
    };

    // set the visible property on our places based on the selectedType
    self.setVisible = function(placeType) {
        for (var i = 0, places = self.places(); i < places.length; i++) {
            var place = places[i];
            if (place.placeTypes.includes(placeType) || typeof placeType=="undefined") {
                place.visible(true);
                place.marker.setMap(map);
            }
            else {
                place.visible(false);
                place.marker.setMap(null);
            }
        }
    };

    self.selectedType = ko.observable();
    // get notified when the selection changes so the list of
    // places can be filtered to only show those that have a matching placeType
    self.selectedType.subscribe(function(newValue) {
            self.setVisible(newValue);
    });

    self.currentPlaceObj = null;

    // when a user clicks on an item in the places list
    self.getPlaceDetail = function(PlaceObj) {
        self.currentPlaceObj = PlaceObj;
        map.panTo({lat: PlaceObj.lat, lng: PlaceObj.lng});

        fsqrRequest(PlaceObj);
        nytRequest(PlaceObj);
        // wait until the two ajax calls have finished before setting
        // the content of the open InfoWindow
        $.when(asynch1, asynch2).done(function() {
            self.currentPlaceObj.marker.infowindow.setContent(
                    self.currentPlaceObj.FoursquareContent +
                    self.currentPlaceObj.NYTContent); 
        });
        toggleBounce(PlaceObj.marker);
        toggleInfoWindow(PlaceObj);
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

function initMap() {
    // provides a hard-coded latitude and longitude to center the map on
    var latLng = {lat: 40.3893, lng: -74.7618};

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
           createInfoWindow(marker);
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
    marker.setAnimation(null);
    marker.setMap(map);
    return marker;
}

// create an InfoWindow for displaying available NYT articles links as
// well as available contact information from Foursquare API
function createInfoWindow(marker) {
    marker.infowindow = new google.maps.InfoWindow({});
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
//http://stackoverflow.com/questions/12410062/check-if-infowindow-is-opened-google-maps-v3
function toggleInfoWindow(PlaceObj) {
    var myMap = PlaceObj.marker.infowindow.getMap();
    if (myMap !== null && typeof myMap !== 'undefined') {
        PlaceObj.marker.infowindow.close();
    } else {
        PlaceObj.marker.infowindow.open(map, PlaceObj.marker);
    }
}


var NYTcontentString = '';
// Fill the contentString with the NYT information
function fillContentNYT(data) {
    var articles = data.response.docs;
    if (articles.length > 0) {
        NYTcontentString = '<ul>';
        for (var i = 0; i < articles.length; i++) {
            var article = articles[i];
            NYTcontentString += '<li><a href="' + article.web_url + '">' +
                article.headline.main + '</a></li>';
        }
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
var asynch1;
function nytRequest(PlaceObj) {
    var nytAPIUrl = 'https://api.nytimes.com/svc/search/v2/articlesearch.json?q=';
    var apiKey = '12b1ea26e35c4b7c9f124169f2ae3013';
    var requestURL = nytAPIUrl + PlaceObj.name + ' Hopewell, NJ' + '&api-key=' + apiKey;
    
    asynch1 = $.getJSON(requestURL, function(data) {
        PlaceObj.NYTContent = fillContentNYT(data); 
    })
    .fail(function() {
        alert("ajax request failed");
    });
}


/*
 * Retrieve data from the Foursquare API using the latitude and longitude
 * of the Google MAPS PlaceResult object
 */
var asynch2;
function fsqrRequest(PlaceObj) {
    var fsqrAPIUrl = 'https://api.foursquare.com/v2/venues/search?ll=';
    var client_id='FV0ODMT135QKDMWNIYOLAZHGEIFBZCHE5S54ZEKBBQWV5ZSK';
    var client_secret='4P2FWJ20X4RBAK1U4B1QEX1EKGYASEVWL1BKMDFD2TJECKF2';
    var v = 20170101;

    var requestURL = fsqrAPIUrl + PlaceObj.lat + ',' + PlaceObj.lng +
        '&query=' + PlaceObj.name + '&intent=match' +
        '&client_id=' + client_id + '&client_secret=' + client_secret +
        '&v=' + v;

    asynch2 = $.getJSON(requestURL, function(data) {
        PlaceObj.FoursquareContent = fillContentFsqr(data.response.venues);
    })
    .fail(function() {
        alert("Foursquare request failed");
    });
}
