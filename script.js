// script.js

let map;
let infowindow;
let autocomplete;
const defaultLocation = { lat: 19.033, lng: 73.029 }; // Nerul, Navi Mumbai

// Initialize the map
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultLocation,
        zoom: 14,
    });

    infowindow = new google.maps.InfoWindow();

    // Initialize Autocomplete for the search input
    const input = document.getElementById("place-input");
    autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo("bounds", map);

    autocomplete.addListener("place_changed", () => {
        infowindow.close();
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            alert("No details available for input: '" + place.name + "'");
            return;
        }

        // If the place has a geometry, then present it on the map.
        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(14);
        }

        fetchNearbyLawyers({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
        });
    });

    // Fetch lawyers for the default location on load
    fetchNearbyLawyers(defaultLocation);

    // Initialize event listeners
    initEventListeners();

    // Show location permission modal
    showLocationModal();
}

// Initialize event listeners
function initEventListeners() {
    document.getElementById("search-button").addEventListener("click", () => {
        const place = autocomplete.getPlace();
        if (place && place.geometry) {
            fetchNearbyLawyers({
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
            });
        } else {
            alert("Please select a valid location from the suggestions.");
        }
    });

    document.getElementById("use-my-location-button").addEventListener("click", () => {
        getUserLocation();
    });

    // Modal buttons
    document.getElementById("modal-yes").addEventListener("click", () => {
        getUserLocation();
        closeModal();
    });

    document.getElementById("modal-no").addEventListener("click", () => {
        fetchNearbyLawyers(defaultLocation);
        closeModal();
    });
}

// Show the location permission modal
function showLocationModal() {
    const modal = document.getElementById("location-modal");
    modal.style.display = "block";
}

// Close the modal
function closeModal() {
    const modal = document.getElementById("location-modal");
    modal.style.display = "none";
}

// Get user's current location
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                map.setCenter(userLocation);
                fetchNearbyLawyers(userLocation);
            },
            (error) => {
                alert("Error fetching location. Using default location.");
                fetchNearbyLawyers(defaultLocation);
            }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
        fetchNearbyLawyers(defaultLocation);
    }
}

// Fetch nearby lawyers using Google Places API
function fetchNearbyLawyers(location) {
    const service = new google.maps.places.PlacesService(map);
    service.nearbySearch(
        {
            location: location,
            radius: 5000, // 5 kilometers
            type: ["lawyer"], // Note: Adjust the type as needed
        },
        (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                map.setCenter(location);
                displayPlaces(results);
            } else {
                alert("No lawyers found in this area.");
            }
        }
    );
}

// Display the list of places (lawyers)
function displayPlaces(places) {
    const placesList = document.getElementById("places-list");
    placesList.innerHTML = "";

    if (places.length === 0) {
        placesList.innerHTML = "<li>No lawyers found.</li>";
        return;
    }

    places.forEach((place) => {
        const listItem = document.createElement("li");
        listItem.className = "place-item";
        listItem.innerHTML = `
            <h3>${place.name}</h3>
            <p>Rating: ${place.rating || "N/A"} (${place.user_ratings_total || 0} reviews)</p>
            <p>${place.vicinity || "No address available"}</p>
        `;

        // Add click listener to show detailed info
        listItem.addEventListener("click", () => {
            showPlaceDetails(place);
        });

        placesList.appendChild(listItem);

        // Add marker to the map
        const marker = new google.maps.Marker({
            map: map,
            position: place.geometry.location,
            title: place.name,
        });

        marker.addListener("click", () => {
            infowindow.setContent(generateInfoWindowContent(place));
            infowindow.open(map, marker);
        });
    });
}

// Generate content for the info window
function generateInfoWindowContent(place) {
    return `
        <div>
            <strong>${place.name}</strong><br>
            Rating: ${place.rating || "N/A"} (${place.user_ratings_total || 0} reviews)<br>
            ${place.vicinity || "No address available"}<br>
            ${(place.opening_hours && place.opening_hours.isOpen()) ? "Open Now" : "Closed Now"}
        </div>
    `;
}

// Show detailed information about a place (lawyer)
function showPlaceDetails(place) {
    const service = new google.maps.places.PlacesService(map);
    service.getDetails(
        {
            placeId: place.place_id,
            fields: ["name", "formatted_address", "rating", "formatted_phone_number", "opening_hours", "website", "photos"],
        },
        (placeDetails, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                const content = `
                    <div style="color: #000;">
                        <h2>${placeDetails.name}</h2>
                        <p><strong>Address:</strong> ${placeDetails.formatted_address || "N/A"}</p>
                        <p><strong>Phone:</strong> ${placeDetails.formatted_phone_number || "N/A"}</p>
                        <p><strong>Rating:</strong> ${placeDetails.rating || "N/A"}</p>
                        <p><strong>Website:</strong> ${placeDetails.website ? `<a href="${placeDetails.website}" target="_blank">${placeDetails.website}</a>` : "N/A"}</p>
                        <p><strong>Open Now:</strong> ${(placeDetails.opening_hours && placeDetails.opening_hours.isOpen()) ? "Yes" : "No"}</p>
                        ${placeDetails.photos ? `<img src="${placeDetails.photos[0].getUrl({ maxWidth: 300, maxHeight: 200 })}" alt="${placeDetails.name}" />` : ""}
                    </div>
                `;
                infowindow.setContent(content);
                infowindow.setPosition(place.geometry.location);
                infowindow.open(map);
            } else {
                alert("Unable to fetch details for this lawyer.");
            }
        }
    );
}
