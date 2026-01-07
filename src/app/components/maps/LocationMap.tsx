"use client";

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Box, Typography } from '@mui/material';

// Fix for default marker icon in Next.js/Webpack
const fixLeafletIcon = () => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
};

// Call fixing function immediately
fixLeafletIcon();

// Custom user location icon (Blue Dot)
const userLocationIcon = typeof window !== 'undefined' ? L.divIcon({
    className: 'user-location-marker',
    html: `<div style="
        width: 16px; 
        height: 16px; 
        background-color: #3b82f6; 
        border: 3px solid white; 
        border-radius: 50%; 
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
        animation: pulse 2s infinite;
    "></div>
    <style>
        @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
    </style>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
}) : undefined;

interface LocationMapProps {
    lat: number;
    lng: number;
    radius?: number; // Radius in meters
    interactive?: boolean;
    onLocationSelect?: (lat: number, lng: number) => void;
    height?: string | number;
    zoom?: number;

    // Optional overrides for specific elements
    markerPosition?: { lat: number; lng: number } | null; // If null, no marker
    circlePosition?: { lat: number; lng: number }; // Defaults to center
    userLocation?: { lat: number; lng: number; accuracy?: number }; // Shows a special "You are here" marker if provided
    additionalZones?: { lat: number; lng: number; radius: number; name?: string }[]; // Extra allowed circles
    fitBounds?: boolean; // Whether to auto-fit bounds to include all markers/circles
}

// Component to handle map clicks for updates
const MapEvents = ({ onSelect }: { onSelect: (lat: number, lng: number) => void }) => {
    useMapEvents({
        click(e) {
            onSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
};

// Component to recenter map when props change
const RecenterMap = ({ lat, lng, zoom }: { lat: number; lng: number, zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        // Only flyTo if not fitting bounds
        map.setView([lat, lng], zoom);
    }, [lat, lng, zoom, map]);
    return null;
};

// Component to fit bounds
const FitMapBounds = ({ markers, circles }: { markers: { lat: number, lng: number }[], circles: { lat: number, lng: number, radius: number }[] }) => {
    const map = useMap();
    const hasFitted = React.useRef(false);
    const prevItemsRef = React.useRef<string>("");

    useEffect(() => {
        if (markers.length === 0 && circles.length === 0) return;

        // Create a signature to detect changes in zones or user location
        const signature = JSON.stringify({
            c: circles.map(c => ({ lat: c.lat, lng: c.lng, r: c.radius })),
            m: markers.map(m => ({ lat: m.lat, lng: m.lng }))
        });

        const itemsChanged = prevItemsRef.current !== signature;

        if (itemsChanged) {
            // If it's the first time we got a user marker, or zones changed, allow re-fitting
            const hadUserMarker = prevItemsRef.current.includes('"m":[{');
            const hasUserMarker = signature.includes('"m":[{');

            if (itemsChanged || (!hadUserMarker && hasUserMarker)) {
                hasFitted.current = false;
            }
            prevItemsRef.current = signature;
        }

        if (!hasFitted.current) {
            const bounds = L.latLngBounds([]);

            markers.forEach(m => bounds.extend([m.lat, m.lng]));
            circles.forEach(c => {
                bounds.extend([c.lat, c.lng]);
                // Extend for radius (rough degree calculation)
                const rLat = c.radius / 111320;
                const rLng = c.radius / (111320 * Math.cos(c.lat * Math.PI / 180));
                bounds.extend([c.lat + rLat, c.lng + rLng]);
                bounds.extend([c.lat - rLat, c.lng - rLng]);
            });

            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 19 });
                hasFitted.current = true;
            }
        }
    }, [markers, circles, map]);
    return null;
};

const LocationMap: React.FC<LocationMapProps> = ({
    lat,
    lng,
    radius,
    interactive = false,
    onLocationSelect,
    height = "300px",
    zoom = 15,
    markerPosition,
    circlePosition,
    userLocation,
    additionalZones,
    fitBounds = false
}) => {
    // Determine effective positions
    // If markerPosition is undefined, use center (lat,lng). If null, show nothing.
    const effectiveMarkerPos = markerPosition === undefined ? { lat, lng } : markerPosition;
    const effectiveCirclePos = circlePosition || { lat, lng };

    return (
        <Box sx={{ height: height, width: '100%', overflow: 'hidden', borderRadius: 2, border: '1px solid #ddd', position: 'relative' }}>
            <MapContainer
                center={[lat, lng]}
                zoom={zoom}
                scrollWheelZoom={interactive}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Main Marker (Target or Selected) */}
                {effectiveMarkerPos && typeof effectiveMarkerPos.lat === 'number' && typeof effectiveMarkerPos.lng === 'number' && (
                    <Marker
                        key={`marker-${effectiveMarkerPos.lat}-${effectiveMarkerPos.lng}`}
                        position={[effectiveMarkerPos.lat, effectiveMarkerPos.lng]}
                    >
                        <Popup>
                            Selected: {effectiveMarkerPos.lat.toFixed(5)}, {effectiveMarkerPos.lng.toFixed(5)}
                        </Popup>
                    </Marker>
                )}

                {/* User Location Marker (Blue Dot representation usually, but standard marker for now with distinct popup) */}
                {/* User Location Marker (Blue Pulsing Dot) */}
                {userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number' && (
                    <>
                        <Marker
                            key={`user-${userLocation.lat}-${userLocation.lng}`}
                            position={[userLocation.lat, userLocation.lng]}
                            icon={userLocationIcon}
                            zIndexOffset={1000}
                        >
                            <Popup>You are here</Popup>
                        </Marker>
                        {/* Outer accuracy circle */}
                        <Circle
                            center={[userLocation.lat, userLocation.lng]}
                            radius={userLocation.accuracy || 20}
                            pathOptions={{
                                fillColor: '#3b82f6',
                                color: '#3b82f6',
                                weight: 1,
                                opacity: 0.15,
                                fillOpacity: 0.05
                            }}
                        />
                    </>
                )}

                {/* Radius Circle (Primary) */}
                {radius && radius > 0 && (
                    <Circle
                        center={[effectiveCirclePos.lat, effectiveCirclePos.lng]}
                        pathOptions={{ fillColor: 'blue', color: 'blue', opacity: 0.6, weight: 2, fillOpacity: 0.3 }}
                        radius={radius}
                    />
                )}

                {/* Additional Zones (Secondary) */}
                {additionalZones && additionalZones.map((zone, idx) => (
                    <Circle
                        key={idx}
                        center={[zone.lat, zone.lng]}
                        pathOptions={{ fillColor: 'green', color: 'green', opacity: 0.6, weight: 2, fillOpacity: 0.3 }}
                        radius={zone.radius}
                    >
                        <Popup>Allowed Zone: {zone.name || `Zone ${idx + 1}`}</Popup>
                    </Circle>
                ))}

                {/* Interactive Click Handler */}
                {interactive && onLocationSelect && (
                    <MapEvents onSelect={onLocationSelect} />
                )}

                {/* Auto Recenter or Fit Bounds */}
                {fitBounds ? (
                    <FitMapBounds
                        markers={[
                            ...(effectiveMarkerPos && (!markerPosition || markerPosition !== null) ? [effectiveMarkerPos] : []),
                            ...(userLocation ? [userLocation] : [])
                        ]}
                        circles={[
                            ...(radius && radius > 0 ? [{ lat: effectiveCirclePos.lat, lng: effectiveCirclePos.lng, radius }] : []),
                            ...(additionalZones || [])
                        ]}
                    />
                ) : (
                    <RecenterMap lat={lat} lng={lng} zoom={zoom} />
                )}
            </MapContainer>

            {interactive && (
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 10,
                        left: 10,
                        bgcolor: 'rgba(255,255,255,0.8)',
                        padding: '4px 8px',
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        zIndex: 1000,
                        pointerEvents: 'none'
                    }}
                >
                    <Typography variant="caption">Click map to set location</Typography>
                </Box>
            )}
        </Box>
    );
};

export default LocationMap;
