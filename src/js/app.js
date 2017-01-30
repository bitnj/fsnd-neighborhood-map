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
    self.visible = ko.observable(true);
}


/*
 * ViewModel
 */
var ViewModel = function() {
    var self = this;


    // toggle the hamburger menu when clicked
    self.toggleMenu = function() {
        $('#placesList').toggle('slide');
    }

    // this will hold an array of data taken from the PlaceResult Objects
    // as returned by the nearbySearch() call to the Google Maps API
    // Places Library
    self.places = ko.observableArray();
    
    // hard-coded set of placeTypes that are used to populate the select
    // drop-down
    self.placeTypes = ko.observableArray(['art_gallery', 'bakery', 'bicycle_store',
            'book_store', 'cafe',
            'fire_station', 'library', 'lodging',
            'meal_takeaway', 'museum', 'park',
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
        };
    }

    self.selectedType = ko.observable();
    // get notified when the select drop-down changes so the list of
    // places can be filtered to only show those that have a matching placeType
    self.selectedType.subscribe(function(newValue) {
            self.setVisible(newValue);
    });

    // when a user clicks on an item in the places list
    self.getPlaceDetail = function(PlaceObj) {
        nytRequest(PlaceObj);
        fsqrRequest(PlaceObj);
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
    marker.setAnimation(null);
    marker.setMap(map);
    return marker;
}

// create an InfoWindow for displaying available NYT articles links
function createInfoWindow(marker, articles) {
    if (articles.length > 0) {
        var contentString = '<ul>';
        for (var i = 0; i < articles.length; i++) {
            var article = articles[i];
            contentString += '<li>' + '<a href="'+article.web_url+'">' + 
                article.headline.main + '</a></li>';
        };
        contentString += '</ul>';
    } else {
        contentString = 'No NYT articles available';
    }
    marker.infowindow = new google.maps.InfoWindow({
        content: contentString     
    });
    return marker.infowindow;
}

// toggle the bounce animation on a marker.  From Google map API documentation
function toggleBounce(marker) {
    if (marker.getAnimation() !== null) {
        marker.setAnimation(null);
    } else {
        marker.setAnimation(google.maps.Animation.BOUNCE);
    }
}


/*
 * Retrieve links to New York times articles related to the passed in place
 */
function nytRequest(placeObj) {
    var nytAPIUrl = 'https://api.nytimes.com/svc/search/v2/articlesearch.json?q=';
    var apiKey = '12b1ea26e35c4b7c9f124169f2ae3013';
    var requestURL = nytAPIUrl + placeObj.name + ' Hopewell, NJ' + '&api-key=' + apiKey;
    
    if (typeof placeObj.marker.infowindow == 'undefined') {
        $.getJSON(requestURL, function(data) {
            var infowindow = createInfoWindow(placeObj.marker, data.response.docs);
            infowindow.open(map, placeObj.marker);
        })
        .fail(function() {
            alert("ajax request failed");
        });
    } else if (placeObj.marker.getAnimation() !== null) {
        placeObj.marker.infowindow.close();
    } else {
        placeObj.marker.infowindow.open(map);
    }
    toggleBounce(placeObj.marker);
}


/*
 * Retrieve data from the Foursquare API using the latitude and longitude
 * of the Google MAPS PlaceResult object
 */
function fsqrRequest(placeObj) {
    var fsqrAPIUrl = 'https://api.foursquare.com/v2/venues/search?ll=';
    var client_id='FV0ODMT135QKDMWNIYOLAZHGEIFBZCHE5S54ZEKBBQWV5ZSK';
    var client_secret='4P2FWJ20X4RBAK1U4B1QEX1EKGYASEVWL1BKMDFD2TJECKF2';
    var v = 20170101;

    var requestURL = fsqrAPIUrl + placeObj.lat + ',' + placeObj.lng +
        '&query=' + placeObj.name + '&intent=match' +
        '&client_id=' + client_id + '&client_secret=' + client_secret +
        '&v=' + v;

    $.getJSON(requestURL, function(data) {
        alert('success');
        console.log(data);
    })
    .fail(function() {
        alert("Foursquare request failed");
    });
}
