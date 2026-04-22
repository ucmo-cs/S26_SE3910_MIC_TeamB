import { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './BranchMap.css';

// Fix Leaflet default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons
const branchIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedBranchIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [35, 57],
  iconAnchor: [17, 57],
  popupAnchor: [1, -48],
  shadowSize: [57, 57],
  className: 'selected-marker',
});

const userIcon = new L.DivIcon({
  html: `<div style="background:#dc2626;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  className: 'user-marker-icon',
});

// Pre-loaded branch coordinate lookup (loaded from branches.json)
let _branchCoordsCache = null;

async function loadBranchCoords() {
  if (_branchCoordsCache) return _branchCoordsCache;
  try {
    const response = await fetch('/branches.json');
    const data = await response.json();
    const lookup = {};
    for (const branch of data) {
      // Key by name for matching with backend branch objects
      lookup[branch.name] = { lat: branch.latitude, lng: branch.longitude };
    }
    _branchCoordsCache = lookup;
    return lookup;
  } catch (e) {
    console.error('Failed to load branches.json:', e);
    return {};
  }
}

// Haversine distance in miles
function getDistanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Geocode zip code (still uses Nominatim — only for user-entered zip)
async function geocodeZip(zip) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&postalcode=${encodeURIComponent(zip)}&country=us&limit=1`,
    { headers: { 'Accept-Language': 'en' } }
  );
  const data = await response.json();
  if (data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }
  return null;
}

// Component to recenter the map
function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 11, { duration: 1 });
    }
  }, [center, zoom, map]);
  return null;
}

const NEARBY_RADIUS_MILES = 50;

const BranchMap = ({ branches, selectedBranch, onSelectBranch }) => {
  const [zipCode, setZipCode] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [branchCoords, setBranchCoords] = useState({});
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const [mapCenter, setMapCenter] = useState([39.0, -94.5]); // Kansas City area default
  const [mapZoom, setMapZoom] = useState(10);
  const [searched, setSearched] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const geocodedRef = useRef(false);

  // Load pre-geocoded coordinates from branches.json on mount (instant, no API calls)
  useEffect(() => {
    if (geocodedRef.current) return;
    geocodedRef.current = true;

    const initCoords = async () => {
      const coordsLookup = await loadBranchCoords();
      const coords = {};
      for (const branch of branches) {
        // Match by branch name from the JSON lookup
        const coord = coordsLookup[branch.name];
        if (coord && coord.lat && coord.lng) {
          coords[branch.id] = coord;
        }
      }
      setBranchCoords(coords);

      // Center map on branches
      const positions = Object.values(coords);
      if (positions.length > 0) {
        const avgLat = positions.reduce((s, p) => s + p.lat, 0) / positions.length;
        const avgLng = positions.reduce((s, p) => s + p.lng, 0) / positions.length;
        setMapCenter([avgLat, avgLng]);
      }
    };

    initCoords();
  }, [branches]);

  const getBranchDistance = (branchId) => {
    if (!userLocation || !branchCoords[branchId]) return null;
    const coord = branchCoords[branchId];
    return getDistanceMiles(userLocation.lat, userLocation.lng, coord.lat, coord.lng);
  };

  // Filter and sort branches by distance when user location is set
  const nearbyBranches = useMemo(() => {
    if (!userLocation || Object.keys(branchCoords).length === 0) return branches;

    const withDistance = branches
      .map((branch) => {
        const coord = branchCoords[branch.id];
        if (!coord) return { branch, distance: Infinity };
        const distance = getDistanceMiles(userLocation.lat, userLocation.lng, coord.lat, coord.lng);
        return { branch, distance };
      })
      .sort((a, b) => a.distance - b.distance);

    if (showAll) return withDistance.map((item) => item.branch);

    // Only show branches within NEARBY_RADIUS_MILES
    const filtered = withDistance
      .filter((item) => item.distance <= NEARBY_RADIUS_MILES)
      .map((item) => item.branch);

    return filtered;
  }, [branches, branchCoords, userLocation, showAll]);

  // All branches sorted by distance (for "show all" fallback)
  const allBranchesSorted = useMemo(() => {
    if (!userLocation || Object.keys(branchCoords).length === 0) return branches;
    return [...branches].sort((a, b) => {
      const distA = getBranchDistance(a.id) ?? Infinity;
      const distB = getBranchDistance(b.id) ?? Infinity;
      return distA - distB;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches, branchCoords, userLocation]);

  const displayBranches = searched ? nearbyBranches : branches;

  const handleZipSearch = async () => {
    if (!zipCode.trim() || zipCode.trim().length < 5) {
      setGeocodeError('Please enter a valid 5-digit zip code.');
      return;
    }

    setGeocoding(true);
    setGeocodeError('');
    setShowAll(false);
    try {
      const result = await geocodeZip(zipCode.trim());
      if (result) {
        setUserLocation(result);
        setMapCenter([result.lat, result.lng]);
        setMapZoom(11);
        setSearched(true);
      } else {
        setGeocodeError('Could not find that zip code. Please try again.');
      }
    } catch {
      setGeocodeError('Failed to look up location. Please try again.');
    } finally {
      setGeocoding(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleZipSearch();
    }
  };

  return (
    <div className="branch-map-container">
      {/* Zip code search */}
      <div className="zip-search">
        <div className="zip-search-row">
          <div className="form-group zip-input-group">
            <label htmlFor="zipcode">Enter your zip code to find nearby branches</label>
            <div className="zip-input-wrapper">
              <input
                type="text"
                id="zipcode"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                onKeyDown={handleKeyDown}
                placeholder="e.g. 64133"
                maxLength="5"
                inputMode="numeric"
              />
              <button
                className="btn btn-primary zip-search-btn"
                onClick={handleZipSearch}
                disabled={geocoding}
              >
                {geocoding ? 'Searching...' : 'Find Branches'}
              </button>
            </div>
          </div>
        </div>
        {geocodeError && <p className="zip-error">{geocodeError}</p>}
      </div>

      {/* Results summary */}
      {searched && userLocation && (
        <div className="branch-results-summary">
          {nearbyBranches.length > 0 ? (
            <p>
              <strong>{nearbyBranches.length}</strong> branch{nearbyBranches.length !== 1 ? 'es' : ''} found
              within {NEARBY_RADIUS_MILES} miles of <strong>{zipCode}</strong>
            </p>
          ) : (
            <div className="no-nearby-branches">
              <p>No branches found within {NEARBY_RADIUS_MILES} miles of <strong>{zipCode}</strong>.</p>
              <button
                className="btn btn-secondary"
                onClick={() => setShowAll(true)}
                style={{ marginTop: '0.5rem', fontSize: '0.875rem', padding: '0.5rem 1.5rem', minWidth: 'auto' }}
              >
                Show all branches
              </button>
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div className="map-wrapper">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter center={mapCenter} zoom={mapZoom} />

          {/* User location marker */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup>Your location</Popup>
            </Marker>
          )}

          {/* Branch markers */}
          {(searched ? displayBranches : branches).map((branch) => {
            const coord = branchCoords[branch.id];
            if (!coord) return null;
            const isSelected = selectedBranch?.id === branch.id;
            const distance = getBranchDistance(branch.id);
            return (
              <Marker
                key={branch.id}
                position={[coord.lat, coord.lng]}
                icon={isSelected ? selectedBranchIcon : branchIcon}
                eventHandlers={{
                  click: () => onSelectBranch(branch),
                }}
              >
                <Popup>
                  <strong>{branch.name}</strong>
                  <br />
                  {branch.address}
                  {distance !== null && (
                    <>
                      <br />
                      <em>{distance.toFixed(1)} miles away</em>
                    </>
                  )}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Branch list */}
      <div className="branch-list">
        {(searched ? displayBranches : branches).map((branch) => {
          const distance = getBranchDistance(branch.id);
          return (
            <div
              key={branch.id}
              className={`branch-card ${selectedBranch?.id === branch.id ? 'selected' : ''}`}
              onClick={() => {
                onSelectBranch(branch);
                // Pan map to branch
                const coord = branchCoords[branch.id];
                if (coord) {
                  setMapCenter([coord.lat, coord.lng]);
                  setMapZoom(13);
                }
              }}
            >
              <div className="branch-header">
                <h3 className="branch-name">
                  {branch.name}
                  {distance !== null && (
                    <span className="branch-distance">{distance.toFixed(1)} mi</span>
                  )}
                </h3>
                <div className={`branch-radio ${selectedBranch?.id === branch.id ? 'checked' : ''}`}>
                  {selectedBranch?.id === branch.id && <div className="radio-dot" />}
                </div>
              </div>
              <p className="branch-address">{branch.address}</p>
              <div className="branch-hours">
                <div className="hours-row">
                  <span className="hours-label">Mon-Fri:</span>
                  <span className="hours-value">8:30 AM – 5:30 PM</span>
                </div>
                <div className="hours-row">
                  <span className="hours-label">Saturday:</span>
                  <span className="hours-value">Closed</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BranchMap;
