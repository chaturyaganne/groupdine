// ⚠️ WARNING: Your API key is placed directly here. **Never** do this for a public, production app.
const YELP_API_KEY = "oGabTV8TLdWrsEzXPc93Qyyi8_s8Dx9ISV_xaZ4kMEQJnh2KS7rlWCBLYoqtyVBn8o5YKxDtMV3dnYoJxasT2tA75k3NhA8ug2Uy3gnc-IQaVEvyYs-rXeDio5oTaXYx";
const API_BASE_URL = "https://cors-anywhere.herokuapp.com/https://api.yelp.com/v3/businesses/search";

document.addEventListener('DOMContentLoaded', () => {
    const locationsContainer = document.getElementById('locations-container');
    const addLocationBtn = document.getElementById('add-location-btn');
    const findPointBtn = document.getElementById('find-point-btn');
    const resultsContainer = document.getElementById('results-container');
    const termSelect = document.getElementById('term-select');
    const errorMessage = document.getElementById('error-message');

    addLocationBtn.addEventListener('click', addLocationInput);
    findPointBtn.addEventListener('click', findMeetingPoint);
    locationsContainer.addEventListener('input', checkInputs);

    // --- Geocoding Mockup Function (Needed for a true Midpoint) ---
    // NOTE: In a real app, this function would call a Geocoding service (like Google Maps/Bing Maps)
    // to convert the text address into (latitude, longitude).
    // For this simple example, we'll assign a fixed coordinate for common US cities.
    function geocodeLocation(address) {
        address = address.toLowerCase();
        // A simple, hardcoded lookup for demonstration purposes
        if (address.includes('new york') || address.includes('ny')) return { lat: 40.7128, lng: -74.0060 };
        if (address.includes('san francisco') || address.includes('sf')) return { lat: 37.7749, lng: -122.4194 };
        if (address.includes('los angeles') || address.includes('la')) return { lat: 34.0522, lng: -118.2437 };
        if (address.includes('chicago')) return { lat: 41.8781, lng: -87.6298 };
        if (address.includes('miami')) return { lat: 25.7617, lng: -80.1918 };

        // Default coordinate if not recognized
        return { lat: 34.000, lng: -100.000 };
    }

    // --- Core "AI" Logic: Calculate the Geographic Midpoint ---
    function calculateMidpoint(coords) {
        if (coords.length === 0) return null;

        let sumLat = 0;
        let sumLng = 0;

        // Simple arithmetic mean of coordinates
        coords.forEach(coord => {
            sumLat += coord.lat;
            sumLng += coord.lng;
        });

        return {
            latitude: sumLat / coords.length,
            longitude: sumLng / coords.length
        };
    }
    
    // --- UI/Helper Functions ---
    function checkInputs() {
        const inputs = document.querySelectorAll('.location-input');
        const filled = Array.from(inputs).every(input => input.value.trim() !== '');
        findPointBtn.disabled = !filled;
    }

    function addLocationInput() {
        if (locationsContainer.children.length >= 5) return; // Limit to 5 locations
        const div = document.createElement('div');
        div.className = 'location-input-group';
        div.innerHTML = `
            <input type="text" class="location-input" placeholder="Enter Location ${locationsContainer.children.length + 1}" required>
            <button type="button" class="remove-location-btn" style="background-color:#ccc; margin-left: 5px;">-</button>
        `;
        locationsContainer.appendChild(div);
        div.querySelector('.remove-location-btn').addEventListener('click', (e) => {
            locationsContainer.removeChild(e.target.parentNode);
            // Re-numbering placeholders
            document.querySelectorAll('.location-input').forEach((input, index) => {
                input.placeholder = `Enter Location ${index + 1}`;
            });
            checkInputs();
        });
        checkInputs();
    }

    // --- Main Execution Function ---
    async function findMeetingPoint() {
        resultsContainer.innerHTML = '';
        errorMessage.classList.add('hidden');
        resultsContainer.innerHTML = '<p>Calculating meeting point and fetching businesses...</p>';

        const locationAddresses = Array.from(document.querySelectorAll('.location-input'))
            .map(input => input.value.trim())
            .filter(val => val.length > 0);

        if (locationAddresses.length < 2) {
            displayError('Please enter at least two locations.');
            return;
        }

        // 1. **Geocode and Calculate Midpoint**
        const coordinates = locationAddresses.map(geocodeLocation);
        const midpoint = calculateMidpoint(coordinates);

        if (!midpoint) {
             displayError('Could not calculate a valid midpoint.');
             return;
        }
        
        // 2. **Yelp API Call**
        const term = termSelect.value;
        const url = `${API_BASE_URL}?term=${term}&latitude=${midpoint.latitude}&longitude=${midpoint.longitude}&limit=10&sort_by=distance`;
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${YELP_API_KEY}`,
                    // CORS proxy headers
                    'X-Requested-With': 'XMLHttpRequest' 
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error ? errorData.error.description : `Yelp API failed with status ${response.status}`);
            }

            const data = await response.json();
            displayResults(data.businesses);

        } catch (error) {
            console.error('Fetch Error:', error);
            displayError(`Failed to fetch businesses. Check your API key or network. Error: ${error.message}`);
        }
    }

    // --- Display Functions ---
    function displayResults(businesses) {
        resultsContainer.innerHTML = ''; // Clear status message

        if (businesses.length === 0) {
            resultsContainer.innerHTML = '<p>No businesses found near the calculated midpoint for that search term.</p>';
            return;
        }

        businesses.forEach(business => {
            const card = document.createElement('div');
            card.className = 'result-card';
            
            // Format distance from meters to miles
            const distanceMiles = (business.distance / 1609.34).toFixed(2); 

            card.innerHTML = `
                <img src="${business.image_url}" alt="${business.name} image">
                <div class="result-card-info">
                    <strong><a href="${business.url}" target="_blank">${business.name}</a></strong>
                    <p>Rating: ${business.rating} stars (${business.review_count} reviews)</p>
                    <p>Price: ${business.price || 'N/A'}</p>
                    <p>Distance from Midpoint: ${distanceMiles} miles</p>
                    <p>${business.location.display_address.join(', ')}</p>
                </div>
            `;
            resultsContainer.appendChild(card);
        });
    }

    function displayError(message) {
        resultsContainer.innerHTML = '';
        errorMessage.textContent = `Error: ${message}`;
        errorMessage.classList.remove('hidden');
    }

    // Initialize the UI
    checkInputs(); 
});
