

import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IoSearchOutline, IoOptionsOutline, IoTrashOutline, IoCloseOutline, IoLocationOutline, IoLocateOutline, IoCheckmarkCircleOutline, IoMapOutline, IoRocketOutline, IoInformationCircleOutline, IoListOutline, IoShieldCheckmarkOutline, IoImageOutline, IoArrowUpOutline, IoTimeOutline, IoPeopleOutline, IoAddOutline, IoCreateOutline, IoCalendarOutline, IoCashOutline, IoDownloadOutline } from 'react-icons/io5';

// Fix for Leaflet default icon issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
import './properties.css';

import { auth } from '../firebase';
import { subscribeToProperties, addProperty, addPost, deleteProperty, convertToBase64, requestPropertyEdit, subscribeToRenters, addRenter, updateRenter, deleteRenter } from '../services/dataService';

export default function PropertiesPage({ userId }) {
    const [activeFilter, setActiveFilter] = React.useState('All');
    const [properties, setProperties] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [isPublishing, setIsPublishing] = React.useState(false);
    const [isStayingListModalOpen, setIsStayingListModalOpen] = React.useState(false);
    const [selectedPropertyForList, setSelectedPropertyForList] = React.useState(null);
    const [allRenters, setAllRenters] = React.useState([]);
    const [isRenterFormOpen, setIsRenterFormOpen] = React.useState(false);
    const [editingRenter, setEditingRenter] = React.useState(null);
    const [renterForm, setRenterForm] = React.useState({
        name: '', phone: '', email: '', unit: '',
        rentAmount: '', paidAmount: '', paymentType: 'Cash',
        sharingType: '', entryDate: '', exitDate: ''
    });
    const [isRegistering, setIsRegistering] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const imageInputRef = React.useRef(null);
    const searchResultRef = React.useRef(null);
    const [selectedImages, setSelectedImages] = React.useState([]);
    const [imagePreviews, setImagePreviews] = React.useState([]);
    const [errorFields, setErrorFields] = React.useState([]);

    React.useEffect(() => {
        const uid = userId || auth.currentUser?.uid;
        if (!uid) return;

        const unsubscribeProperties = subscribeToProperties(uid, (data) => {
            setProperties(data);
            setLoading(false);
        });

        const unsubscribeRenters = subscribeToRenters(uid, (data) => {
            setAllRenters(data);
        });

        return () => {
            unsubscribeProperties();
            if (unsubscribeRenters) unsubscribeRenters();
        };
    }, [userId]);

    const tabs = ['All', 'Approved', 'Processing', 'Rejected'];

    const filteredProperties = activeFilter === 'All'
        ? properties
        : properties.filter(prop => prop.status === activeFilter);

    const [isRegisterModalOpen, setIsRegisterModalOpen] = React.useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);
    const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);
    const [registrationStep, setRegistrationStep] = React.useState(1);
    const [editingProperty, setEditingProperty] = React.useState(null);
    const [propertyType, setPropertyType] = React.useState('Apartment');
    const [markerPosition, setMarkerPosition] = React.useState([12.9716, 77.5946]); // Default to Bangalore
    const [mapCenter, setMapCenter] = React.useState([12.9716, 77.5946]);

    // Add effect to manage background scrolling
    React.useEffect(() => {
        const isAnyModalOpen = isRegisterModalOpen || isPublishModalOpen || isViewModalOpen;
        if (isAnyModalOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
        return () => document.body.classList.remove('modal-open');
    }, [isRegisterModalOpen, isPublishModalOpen, isViewModalOpen]);

    // Reset step when modal opens & Auto-locate on Step 2
    React.useEffect(() => {
        if (isRegisterModalOpen) {
            if (registrationStep === 1) {
                setErrorFields([]);
            } else if (registrationStep === 2) {
                // Auto-trigger current location for better UX on Step 2
                handleCurrentLocation();
            }
        }
    }, [isRegisterModalOpen, registrationStep]);

    // Close search results when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchResultRef.current && !searchResultRef.current.contains(event.target)) {
                setSearchResults([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [apartmentDetails, setApartmentDetails] = React.useState({
        managerName: '', apartmentName: '', contactNumber: '', email: '',
        totalFlats: '', liftAvailable: 'Yes',
        parkingAvailable: 'Yes', state: '', city: '', colonyArea: '',
        pincode: '', googleMapsLink: ''
    });

    const [pgDetails, setPgDetails] = React.useState({
        managerName: '',
        pgName: '',
        contactNumber: '',
        email: '',
        pgType: 'Girls PG',
        state: '',
        city: '',
        colonyArea: '',
        pincode: '',
        googleMapsLink: '',
        isProvidingAC: 'No',
        totalRooms: ''
    });

    const [roomDetails, setRoomDetails] = React.useState({
        managerName: '',
        roomName: '',
        contactNumber: '',
        email: '',
        totalRooms: '',
        state: '',
        city: '',
        colonyArea: '',
        pincode: '',
        googleMapsLink: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (propertyType === 'Apartment') {
            setApartmentDetails(prev => ({ ...prev, [name]: value }));
        } else if (propertyType === 'PGs') {
            setPgDetails(prev => ({ ...prev, [name]: value }));
        } else {
            setRoomDetails(prev => ({ ...prev, [name]: value }));
        }

        if (name === 'googleMapsLink') {
            if (value.length === 0) {
                setSearchResults([]);
                return;
            }

            const coords = extractCoordsFromUrl(value);
            const queryFromUrl = extractQueryFromUrl(value);

            if (coords && window.google) {
                const lat = coords.lat;
                const lon = coords.lon;
                setMarkerPosition([lat, lon]);
                setMapCenter([lat, lon]);
                const geocoder = new window.google.maps.Geocoder();
                geocoder.geocode({ location: { lat, lng: lon } }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        updateFieldsFromGoogleResult(results[0], 'Apartment/PG');
                    }
                });
            } else if (queryFromUrl && window.google) {
                // Handle complex URLs with names but no direct coords
                const geocoder = new window.google.maps.Geocoder();
                geocoder.geocode({ address: queryFromUrl }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        const loc = results[0].geometry.location;
                        setMarkerPosition([loc.lat(), loc.lng()]);
                        setMapCenter([loc.lat(), loc.lng()]);
                        updateFieldsFromGoogleResult(results[0], 'Apartment/PG');
                    }
                });
            } else if (value.length > 2 && !value.startsWith('http')) {
                handleSearchLocation(value);
            }
        }
    };


    const [searchQuery, setSearchQuery] = React.useState('');
    const [searchResults, setSearchResults] = React.useState([]);
    const [isSearchingLocation, setIsSearchingLocation] = React.useState(false);


    const [selectedProperty, setSelectedProperty] = React.useState(null);
    const [publishDetails, setPublishDetails] = React.useState({
        propertyType: 'Apartment',
        managerName: '',
        propertyName: '',
        contactNumber: '',
        email: '',
        totalUnits: '',
        unitType: '1BHK',
        customUnitType: '',
        roomType: '1x Sharing',
        customRoomType: '',
        emptyUnits: '',
        monthlyRent: '',
        furnitureProvided: 'Semi-Furnished',
        liftAvailable: 'Yes',
        parkingSpace: 'Yes',
        waterAvailability: 'Yes',
        powerBackup: 'Yes',
        cctvSecurity: 'Yes',
        wifiAvailable: 'No',
        individualCooking: 'Yes',
        isProvidingAC: 'No',
        state: '',
        city: '',
        colonyArea: '',
        pincode: '',
        googleMapsLink: '',
        advancePayment: '',
        dailyRent: '',
        weeklyRent: '',
        rentType: 'Monthly',
        postDetails: '',
        roomConfigurations: [{ type: '1x Sharing', customType: '', count: '', rentType: 'Monthly', rentAmount: '' }],
        bhkAllocations: [{ bhkType: '1BHK', count: '', pricePerUnit: '', rentType: 'Monthly' }]
    });

    const handlePublishInputChange = (e) => {
        const { name, value } = e.target;
        setPublishDetails(prev => ({ ...prev, [name]: value }));
        setErrorFields(prev => prev.filter(f => f !== name));

        if (name === 'googleMapsLink') {
            if (value.length === 0) {
                setSearchResults([]);
                return;
            }

            const coords = extractCoordsFromUrl(value);
            const queryFromUrl = extractQueryFromUrl(value);

            if (coords && window.google) {
                const lat = coords.lat;
                const lon = coords.lon;
                setMarkerPosition([lat, lon]);
                setMapCenter([lat, lon]);
                const geocoder = new window.google.maps.Geocoder();
                geocoder.geocode({ location: { lat, lng: lon } }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        updateFieldsFromGoogleResult(results[0], 'Publish');
                    }
                });
            } else if (queryFromUrl && window.google) {
                const geocoder = new window.google.maps.Geocoder();
                geocoder.geocode({ address: queryFromUrl }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        const loc = results[0].geometry.location;
                        setMarkerPosition([loc.lat(), loc.lng()]);
                        setMapCenter([loc.lat(), loc.lng()]);
                        updateFieldsFromGoogleResult(results[0], 'Publish');
                    }
                });
            } else if (value.length > 2 && !value.startsWith('http')) {
                handleSearchLocation(value);
            }
        }
    };

    const handlePublishClick = (property) => {
        setSelectedProperty(property);
        const features = property.features || {};

        const totalUnits = property.units || features.totalUnits || features.totalRooms || features.totalFlats || '';

        setPublishDetails({
            propertyType: property.type || 'Apartment',
            managerName: property.manager || property.managerName || '',
            propertyName: property.name || property.apartmentName || property.pgName || '',
            contactNumber: property.contactNumber || '',
            email: property.email || '',
            totalUnits: totalUnits,
            unitType: (features.flatType && features.flatType !== 'Not Specified' ? features.flatType : null) || features.pgType || (property.flatType && property.flatType !== 'Not Specified' ? property.flatType : null) || property.pgType || (property.type === 'Apartment' ? '1BHK' : (property.type === 'Room' ? 'Standard' : 'Girls PG')),
            customUnitType: '',
            roomType: (features.roomType && features.roomType !== 'Not Specified' ? features.roomType : null) || property.roomType || (property.type === 'Room' ? '1 bed' : '1x Sharing'),
            customRoomType: '',
            emptyUnits: property.emptyUnits || totalUnits || '',
            monthlyRent: property.type === 'Room' ? '' : (features.monthlyRent || (property.rent && property.rent !== '₹0' ? property.rent.replace('₹', '') : '')),
            furnitureProvided: features.furnitureProvided || property.furnitureProvided || 'Semi-Furnished',
            liftAvailable: features.lift || property.liftAvailable || 'Yes',
            parkingSpace: features.parking || property.parkingSpace || 'Yes',
            waterAvailability: features.waterAvailability || property.waterAvailability || 'Yes',
            powerBackup: features.powerBackup || property.powerBackup || 'Yes',
            cctvSecurity: features.cctvSecurity || property.cctvSecurity || 'Yes',
            wifiAvailable: features.wifiAvailable || property.wifiAvailable || (property.type === 'PGs' ? 'Yes' : 'No'),
            individualCooking: features.individualCooking || property.individualCooking || 'Yes',
            isProvidingAC: features.ac || property.isProvidingAC || 'No',
            state: property.address?.state || property.state || '',
            city: property.address?.city || property.city || '',
            colonyArea: property.address?.area || property.colonyArea || '',
            pincode: property.address?.pincode || property.pincode || '',
            googleMapsLink: property.googleMapsLink || property.locationLink || '',
            advancePayment: property.advancePayment || features.advancePayment || '',
            dailyRent: property.dailyRent || features.dailyRent || '',
            rentType: 'Monthly',
            postDetails: property.postDetails || '',
            roomConfigurations: property.roomConfigurations || [{
                type: (features.roomType && features.roomType !== 'Not Specified' ? features.roomType : null) || property.roomType || '1x Sharing',
                customType: '',
                count: totalUnits || '',
                rentType: 'Monthly',
                rentAmount: features.monthlyRent || (property.rent && property.rent !== '₹0' ? property.rent.replace('₹', '') : '') || ''
            }],
            bhkAllocations: property.bhkAllocations || [{ bhkType: '1BHK', count: '', pricePerUnit: '', rentType: 'Monthly' }]
        });
        setIsPublishModalOpen(true);
        setSelectedImages([]);
        setImagePreviews([]);
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + selectedImages.length > 16) {
            alert("Maximum 16 images allowed.");
            return;
        }

        const newImages = [...selectedImages, ...files];
        setSelectedImages(newImages);

        const newPreviews = files.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
    };



    const [viewingProperty, setViewingProperty] = React.useState(null);

    const handleViewClick = (property) => {
        setViewingProperty(property);
        setIsViewModalOpen(true);
    };

    const handleEditClick = (property) => {
        setEditingProperty(property);
        setRegistrationStep(1);
        setPropertyType(property.type);
        if (property.type === 'Apartment') {
            setApartmentDetails({
                managerName: property.manager || '',
                apartmentName: property.name || '',
                contactNumber: property.contactNumber || '',
                email: property.email || '',
                totalFlats: property.units || '',
                liftAvailable: property.features?.lift || 'Yes',
                parkingAvailable: property.features?.parking || 'Yes',
                state: property.address?.state || '',
                city: property.address?.city || '',
                colonyArea: property.address?.area || '',
                pincode: property.address?.pincode || '',
                googleMapsLink: property.googleMapsLink || ''
            });
        } else if (property.type === 'Room') {
            setRoomDetails({
                managerName: property.manager || '',
                roomName: property.name || '',
                contactNumber: property.contactNumber || '',
                email: property.email || '',
                totalRooms: property.units || '',
                state: property.address?.state || '',
                city: property.address?.city || '',
                colonyArea: property.address?.area || '',
                pincode: property.address?.pincode || '',
                googleMapsLink: property.googleMapsLink || ''
            });
        } else {
            setPgDetails({
                managerName: property.manager || '',
                pgName: property.name || '',
                contactNumber: property.contactNumber || '',
                email: property.email || '',
                pgType: property.features?.pgType || 'Girls PG',
                state: property.address?.state || '',
                city: property.address?.city || '',
                colonyArea: property.address?.area || '',
                pincode: property.address?.pincode || '',
                googleMapsLink: property.googleMapsLink || '',
                isProvidingAC: property.features?.ac || 'No',
                totalRooms: property.units || ''
            });
        }
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        try {
            const isApt = propertyType === 'Apartment';
            const isRoom = propertyType === 'Room';
            const details = isApt ? apartmentDetails : (isRoom ? roomDetails : pgDetails);

            const updatedData = {
                type: propertyType,
                name: isApt ? details.apartmentName : (isRoom ? details.roomName : details.pgName),
                manager: details.managerName,
                contactNumber: details.contactNumber,
                email: details.email,
                units: isApt ? details.totalFlats : details.totalRooms,
                location: `${details.city}, ${details.state}`,
                address: {
                    state: details.state,
                    city: details.city,
                    area: details.colonyArea,
                    pincode: details.pincode,
                    googleMapsLink: details.googleMapsLink
                },
                pincode: details.pincode,
                googleMapsLink: details.googleMapsLink,
                features: isApt ? {
                    flatType: editingProperty?.features?.flatType || '1BHK',
                    lift: details.liftAvailable,
                    parking: details.parkingAvailable
                } : (isRoom ? {
                    roomType: editingProperty?.features?.roomType || 'Standard'
                } : {
                    pgType: details.pgType,
                    roomType: editingProperty?.features?.roomType || '1x Sharing',
                    ac: details.isProvidingAC
                })
            };

            setIsEditing(true);
            await requestPropertyEdit(editingProperty.id, updatedData, userId);
            setIsEditing(false);
            setIsEditModalOpen(false);
            setEditingProperty(null);
        } catch (err) {
            console.error('Error saving edit:', err);
            setIsEditing(false);
        }
    };

    const extractCoordsFromUrl = (url) => {
        if (!url || typeof url !== 'string') return null;
        const patterns = [
            /@(-?\d+\.\d+),(-?\d+\.\d+)/,
            /(?:search|place|dir)\/(-?\d+\.\d+)(?:,\s*|\+|,)(-?\d+\.\d+)/,
            /q=(-?\d+\.\d+)(?:,\s*|\+|,)(-?\d+\.\d+)/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
        }
        return null;
    };

    const extractQueryFromUrl = (url) => {
        if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;
        try {
            const decoded = decodeURIComponent(url);
            if (decoded.includes('/dir//')) return decoded.split('/dir//')[1].split(/[/?# ]/)[0].replace(/\+/g, ' ');
            if (decoded.includes('/search/')) return decoded.split('/search/')[1].split(/[/?# ]/)[0].replace(/\+/g, ' ');
            if (decoded.includes('/place/')) return decoded.split('/place/')[1].split(/[/?# ]/)[0].replace(/\+/g, ' ');
        } catch (e) { }
        return null;
    };

    const updateFieldsFromGoogleResult = (result, type) => {
        const components = result.address_components;
        let state = '', city = '', colonyArea = '', pincode = '';
        components.forEach(c => {
            const types = c.types;
            if (types.includes('administrative_area_level_1')) state = c.long_name;
            if (types.includes('locality') || types.includes('administrative_area_level_3')) city = c.long_name;
            if (types.includes('sublocality_level_1') || types.includes('neighborhood')) colonyArea = c.long_name;
            if (types.includes('postal_code')) pincode = c.long_name;
        });
        if (!colonyArea) {
            const subLoc = components.find(cn => cn.types.includes('sublocality'));
            if (subLoc) colonyArea = subLoc.long_name;
        }
        const updates = { state, city, colonyArea, pincode };
        if (type === 'Publish') {
            setPublishDetails(prev => ({ ...prev, ...updates }));
        } else {
            if (propertyType === 'Apartment') setApartmentDetails(prev => ({ ...prev, ...updates }));
            else if (propertyType === 'PGs') setPgDetails(prev => ({ ...prev, ...updates }));
            else setRoomDetails(prev => ({ ...prev, ...updates }));
        }
    };

    // Search debounce ref
    const searchTimeout = React.useRef(null);

    const handleSearchLocation = (query) => {
        if (!query || query.length < 3) {
            setSearchResults([]);
            return;
        }

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(() => {
            if (!window.google) {
                console.error("Google Maps Script not loaded");
                return;
            }

            setIsSearchingLocation(true);
            const autocompleteService = new window.google.maps.places.AutocompleteService();

            // Bias results near the current map center
            const center = new window.google.maps.LatLng(mapCenter[0], mapCenter[1]);

            autocompleteService.getPlacePredictions({
                input: query,
                location: center,
                radius: 10000, // 10km radius bias
                componentRestrictions: { country: 'in' }
            }, (predictions, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                    const formattedResults = predictions.map(p => ({
                        display_name: p.description,
                        place_id: p.place_id,
                        main_text: p.structured_formatting.main_text,
                        secondary_text: p.structured_formatting.secondary_text,
                        isGoogle: true
                    }));
                    setSearchResults(formattedResults);
                }
                setIsSearchingLocation(false);
            });
        }, 250);
    };

    const handleSelectLocation = (item) => {
        if (item.isGoogle && window.google) {
            const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
            placesService.getDetails({
                placeId: item.place_id,
                fields: ['address_components', 'geometry', 'formatted_address']
            }, (place, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && place.geometry) {
                    const lat = place.geometry.location.lat();
                    const lon = place.geometry.location.lng();

                    const components = place.address_components;
                    let state = '', city = '', colonyArea = '', pincode = '';

                    components.forEach(c => {
                        const types = c.types;
                        if (types.includes('administrative_area_level_1')) state = c.long_name;
                        if (types.includes('locality') || types.includes('administrative_area_level_3')) city = c.long_name;
                        if (types.includes('sublocality_level_1') || types.includes('neighborhood')) colonyArea = c.long_name;
                        if (types.includes('postal_code')) pincode = c.long_name;
                    });

                    // If colonyArea is still empty, try sublocality
                    if (!colonyArea) {
                        const subLoc = components.find(c => c.types.includes('sublocality'));
                        if (subLoc) colonyArea = subLoc.long_name;
                    }

                    const googleMapsLink = `https://www.google.com/maps?q=${lat},${lon}`;
                    const updates = { state, city, colonyArea, pincode, googleMapsLink };

                    if (isPublishModalOpen) {
                        setPublishDetails(prev => ({ ...prev, ...updates }));
                    } else if (propertyType === 'Apartment') {
                        setApartmentDetails(prev => ({ ...prev, ...updates }));
                    } else if (propertyType === 'PGs') {
                        setPgDetails(prev => ({ ...prev, ...updates }));
                    } else {
                        setRoomDetails(prev => ({ ...prev, ...updates }));
                    }

                    const newPos = [lat, lon];
                    setMarkerPosition(newPos);
                    setMapCenter(newPos);
                    setSearchQuery('');
                    setSearchResults([]);
                }
            });
            return;
        }

        // Fallback for non-google results
        const address = item.address || {};
        const displayNameParts = item.display_name.split(', ');

        const state = address.state || address.region || '';
        const city = address.city || address.town || address.village || '';

        const areaParts = displayNameParts.filter(part => {
            const p = part.toLowerCase();
            return p !== city.toLowerCase() && p !== state.toLowerCase() && p !== 'india';
        });

        let colonyArea = areaParts.length > 0 ? areaParts[0] : '';
        if (colonyArea.toLowerCase() === city.toLowerCase()) colonyArea = '';

        const lat = item.lat || markerPosition[0];
        const lon = item.lon || markerPosition[1];
        const googleMapsLink = `https://www.google.com/maps?q=${lat},${lon}`;
        const pincode = address.postcode || address.pincode || '';

        const updates = { state, city, colonyArea, pincode, googleMapsLink };

        if (isPublishModalOpen) {
            setPublishDetails(prev => ({
                ...prev,
                ...updates
            }));
        } else if (propertyType === 'Apartment') {
            setApartmentDetails(prev => ({ ...prev, ...updates }));
        } else if (propertyType === 'PGs') {
            setPgDetails(prev => ({ ...prev, ...updates }));
        } else {
            setRoomDetails(prev => ({ ...prev, ...updates }));
        }

        // Sync map
        const newPos = [parseFloat(lat), parseFloat(lon)];
        setMarkerPosition(newPos);
        setMapCenter(newPos);

        setSearchQuery('');
        setSearchResults([]);
    };

    const handleCurrentLocation = () => {
        if (!navigator.geolocation) return;

        setIsSearchingLocation(true);
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const { latitude, longitude } = pos.coords;
                setMarkerPosition([latitude, longitude]);
                setMapCenter([latitude, longitude]);
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
                const data = await response.json();
                handleSelectLocation(data);
                setIsSearchingLocation(false);
            } catch (error) {
                console.error("Reverse geocoding error:", error);
                setIsSearchingLocation(false);
            }
        }, (err) => {
            console.error("Geolocation error:", err);
            setIsSearchingLocation(false);
        });
    };

    const handlePincodeLookup = async (pincode) => {
        if (pincode.length !== 6) return;
        try {
            const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
            const data = await response.json();
            if (data[0].Status === "Success") {
                const postOffice = data[0].PostOffice[0];
                const updates = {
                    state: postOffice.State,
                    city: postOffice.District,
                    colonyArea: postOffice.Name,
                    pincode: pincode // Also update pincode explicitly
                };
                if (isPublishModalOpen) {
                    setPublishDetails(prev => ({
                        ...prev,
                        state: updates.state,
                        city: updates.city,
                        colonyArea: updates.colonyArea,
                        pincode: pincode
                    }));
                } else if (propertyType === 'Apartment') {
                    setApartmentDetails(prev => ({ ...prev, ...updates }));
                } else if (propertyType === 'PGs') {
                    setPgDetails(prev => ({ ...prev, ...updates }));
                } else {
                    setRoomDetails(prev => ({ ...prev, ...updates }));
                }
            }
        } catch (error) {
            console.error("Pincode error:", error);
        }
    };

    const handleDeleteProperty = async (id, name) => {
        try {
            await deleteProperty(id);
            // No need to alert as subscribeToProperties will update the list instantly
        } catch (err) {
            console.error("Error deleting property: ", err);
        }
    };

    const handleOpenRenterForm = (renter = null) => {
        if (renter) {
            setEditingRenter(renter);
            setRenterForm({
                name: renter.name || '',
                phone: renter.phone || '',
                email: renter.email || '',
                unit: renter.unit || '',
                rentAmount: renter.rentAmount || '',
                paidAmount: renter.paidAmount || '',
                paymentType: renter.paymentType || 'Cash',
                sharingType: renter.sharingType || '',
                entryDate: renter.entryDate || '',
                exitDate: renter.exitDate || ''
            });
        } else {
            setEditingRenter(null);
            setRenterForm({
                name: '', phone: '', email: '', unit: '',
                rentAmount: '', paidAmount: '', paymentType: 'Cash',
                sharingType: '', entryDate: '', exitDate: ''
            });
        }
        setIsRenterFormOpen(true);
    };

    const handleSaveRenter = async () => {
        if (!renterForm.name || !selectedPropertyForList) {
            alert("Name is required");
            return;
        }

        try {
            const data = {
                ...renterForm,
                property: selectedPropertyForList.name,
                ownerId: userId || auth.currentUser?.uid,
                rentAmount: Number(renterForm.rentAmount) || 0,
                paidAmount: Number(renterForm.paidAmount) || 0
            };

            if (editingRenter) {
                await updateRenter(editingRenter.id, data);
            } else {
                await addRenter(data);
            }
            setIsRenterFormOpen(false);
        } catch (error) {
            console.error("Error saving renter:", error);
            alert("Failed to save renter");
        }
    };

    const handleDeleteRenter = async (renterId) => {
        if (window.confirm("Are you sure you want to remove this person?")) {
            try {
                await deleteRenter(renterId);
            } catch (error) {
                console.error("Error deleting renter:", error);
            }
        }
    };

    const handleDownloadList = () => {
        if (!selectedPropertyForList) return;

        const propertyRenters = allRenters.filter(r => r.property === selectedPropertyForList.name);
        if (propertyRenters.length === 0) {
            alert("No data to download");
            return;
        }

        // CSV Header
        const headers = ["Room No.", "Person Name", "Email", "Phone", "Sharing/Type", "Entry Date", "Exit Date", "Rent Amount", "Paid Amount", "Payment Method", "Status"];

        // CSV Rows
        const rows = propertyRenters.map(r => {
            const balance = (Number(r.rentAmount) || 0) - (Number(r.paidAmount) || 0);
            const status = balance <= 0 && (Number(r.rentAmount) > 0) ? "PAID" : "PENDING";

            return [
                `"${r.unit || '-'}"`,
                `"${r.name || '-'}"`,
                `"${r.email || '-'}"`,
                `"${r.phone || '-'}"`,
                `"${r.sharingType || (selectedPropertyForList.type === 'Apartment' ? '1BHK' : 'Standard')}"`,
                `"${r.entryDate ? new Date(r.entryDate).toLocaleDateString() : '-'}"`,
                `"${r.exitDate ? new Date(r.exitDate).toLocaleDateString() : '-'}"`,
                r.rentAmount || 0,
                r.paidAmount || 0,
                `"${r.paymentType || 'Cash'}"`,
                `"${status}"`
            ].join(",");
        });

        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Staying_List_${selectedPropertyForList.name.replace(/\s+/g, '_')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="pp-container">
            {/* Top Action Bar */}
            <div className="pp-action-bar">
                <div className="pp-search-wrapper">
                    <IoSearchOutline className="pp-search-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Search properties..."
                        className="pp-search-input"
                    />
                </div>

                <div className="pp-actions">
                    <button className="pp-filter-btn">
                        <IoOptionsOutline size={20} />
                    </button>
                    <button
                        className="pp-register-btn"
                        onClick={() => setIsRegisterModalOpen(true)}
                    >
                        Register Property
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="pp-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        className={`pp-tab-btn ${activeFilter === tab ? 'active' : ''}`}
                        onClick={() => setActiveFilter(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Property List */}
            <div className="pp-list-container">
                {filteredProperties.length > 0 ? (
                    filteredProperties.map(property => (
                        <div key={property.id} className="pp-list-item">
                            <div className="pp-item-main">
                                <div className="pp-info-left">
                                    <h3>{property.name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <p className="pp-location">
                                            <IoLocationOutline style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                            {property.location}
                                        </p>
                                        {property.googleMapsLink && (
                                            <a
                                                href={property.googleMapsLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="View on Map"
                                                style={{ color: '#1aa79c', display: 'flex', alignItems: 'center' }}
                                            >
                                                <IoMapOutline size={16} />
                                            </a>
                                        )}
                                    </div>

                                    <div className="pp-meta-tags">
                                        <span className="pp-meta-tag">UNITS <strong>{property.units}</strong></span>
                                        <span className="pp-meta-tag">MANAGER <strong>{property.manager}</strong></span>
                                        <span className="pp-meta-tag">TYPE <strong>{property.type}</strong></span>
                                    </div>
                                </div>

                                <div className="pp-info-right">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className={`pp-status-pill ${property.status && property.status.toLowerCase()}`}>
                                            {property.status}
                                        </span>
                                        {property.editStatus === 'Pending Approval' && (
                                            <span className="pp-status-pill processing" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                                                Edit Pending
                                            </span>
                                        )}
                                    </div>

                                    <div className="pp-card-actions">
                                        <button
                                            className="pp-btn-outline"
                                            onClick={() => handleViewClick(property)}
                                        >
                                            View
                                        </button>
                                        <button
                                            className="pp-btn-outline"
                                            onClick={() => handleEditClick(property)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className={`pp-btn-filled ${property.status !== 'Approved' ? 'disabled' : ''}`}
                                            disabled={property.status !== 'Approved'}
                                            onClick={() => handlePublishClick(property)}
                                        >
                                            Publish Post
                                        </button>
                                        <button
                                            className="pp-btn-outline"
                                            onClick={() => {
                                                setSelectedPropertyForList(property);
                                                setIsStayingListModalOpen(true);
                                            }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <IoPeopleOutline size={18} />
                                            Staying People List
                                        </button>
                                        <button
                                            className="pp-delete-btn"
                                            onClick={() => handleDeleteProperty(property.id, property.name)}
                                        >
                                            <IoTrashOutline size={18} color="#ef4444" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="pp-empty-state">
                        <p>No properties found in {activeFilter} status.</p>
                    </div>
                )}
            </div>

            {isRegisterModalOpen && (
                <div className="pp-modal-overlay">
                    <div className="pp-modal-content" style={{ width: '500px', maxWidth: '90vw', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className="pp-modal-header" style={{
                            background: 'linear-gradient(135deg, var(--pp-primary) 0%, #148f85 100%)',
                            color: 'white',
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            padding: '16px 20px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 style={{ margin: 0, color: 'white' }}>Property Registration</h3>
                                <button className="pp-close-btn pp-close-btn-light" onClick={() => setIsRegisterModalOpen(false)}>
                                    <IoCloseOutline size={22} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {[1, 2, 3, 4].map((step) => (
                                    <div key={step} style={{ display: 'flex', alignItems: 'center', flex: step === 4 ? 'none' : 1 }}>
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: registrationStep >= step ? 'white' : 'rgba(255,255,255,0.3)',
                                            color: registrationStep >= step ? '#1aa79c' : 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px',
                                            fontWeight: '700'
                                        }}>
                                            {registrationStep > step ? <IoCheckmarkCircleOutline size={20} /> : step}
                                        </div>
                                        {step < 4 && (
                                            <div style={{
                                                height: '2px',
                                                flex: 1,
                                                background: registrationStep > step ? 'white' : 'rgba(255,255,255,0.3)',
                                                margin: '0 8px'
                                            }} />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', fontWeight: '600' }}>
                                <span style={{ opacity: registrationStep >= 1 ? 1 : 0.6 }}>Basic Info</span>
                                <span style={{ opacity: registrationStep >= 2 ? 1 : 0.6 }}>Location</span>
                                <span style={{ opacity: registrationStep >= 3 ? 1 : 0.6 }}>Confirmation</span>
                                <span style={{ opacity: registrationStep >= 4 ? 1 : 0.6 }}>Complete</span>
                            </div>
                        </div>

                        <div className="pp-modal-body">
                            {/* Step 1: Type & Info */}
                            {registrationStep === 1 && (
                                <div style={{ animation: 'ppFadeIn 0.4s ease' }}>
                                    <div className="pp-modal-section-title">
                                        <IoInformationCircleOutline size={16} />
                                        Property Type & Basic Details
                                    </div>
                                    <div className="pp-form-group">
                                        <label>What type of property is this?</label>
                                        <div style={{
                                            display: 'flex',
                                            background: '#f3f4f6',
                                            padding: '4px',
                                            borderRadius: '12px',
                                            gap: '4px'
                                        }}>
                                            <button
                                                onClick={() => setPropertyType('Apartment')}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    background: propertyType === 'Apartment' ? 'white' : 'transparent',
                                                    boxShadow: propertyType === 'Apartment' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                                    color: propertyType === 'Apartment' ? '#1aa79c' : '#6b7280',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                Apartment
                                            </button>
                                            <button
                                                onClick={() => setPropertyType('PGs')}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    background: propertyType === 'PGs' ? 'white' : 'transparent',
                                                    boxShadow: propertyType === 'PGs' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                                    color: propertyType === 'PGs' ? '#1aa79c' : '#6b7280',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                PG / Hostel
                                            </button>
                                            <button
                                                onClick={() => setPropertyType('Room')}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    background: propertyType === 'Room' ? 'white' : 'transparent',
                                                    boxShadow: propertyType === 'Room' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                                    color: propertyType === 'Room' ? '#1aa79c' : '#6b7280',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                Rooms
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pp-form-grid">
                                        <div className="pp-form-group">
                                            <label>{propertyType === 'Apartment' ? 'Manager Name' : (propertyType === 'PGs' ? 'PG Warden Name' : 'Manager Name')} <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input
                                                type="text"
                                                name="managerName"
                                                value={propertyType === 'Apartment' ? apartmentDetails.managerName : (propertyType === 'PGs' ? pgDetails.managerName : roomDetails.managerName)}
                                                onChange={(e) => {
                                                    handleInputChange(e);
                                                    setErrorFields(prev => prev.filter(f => f !== 'managerName'));
                                                }}
                                                className={`pp-form-input ${errorFields.includes('managerName') ? 'error' : ''}`}
                                                placeholder={propertyType === 'Apartment' ? "e.g. Anand" : "e.g. Mrs. Sharma"}
                                            />
                                        </div>
                                        <div className="pp-form-group">
                                            <label>{propertyType === 'Apartment' ? 'Apartment Name' : (propertyType === 'PGs' ? 'PG Name' : 'Hotel/Room Name')} <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input
                                                type="text"
                                                name={propertyType === 'Apartment' ? "apartmentName" : (propertyType === 'PGs' ? "pgName" : "roomName")}
                                                value={propertyType === 'Apartment' ? apartmentDetails.apartmentName : (propertyType === 'PGs' ? pgDetails.pgName : roomDetails.roomName)}
                                                onChange={(e) => {
                                                    handleInputChange(e);
                                                    setErrorFields(prev => prev.filter(f => f !== (propertyType === 'Apartment' ? 'apartmentName' : (propertyType === 'PGs' ? 'pgName' : 'roomName'))));
                                                }}
                                                className={`pp-form-input ${errorFields.includes(propertyType === 'Apartment' ? 'apartmentName' : (propertyType === 'PGs' ? 'pgName' : 'roomName')) ? 'error' : ''}`}
                                                placeholder={propertyType === 'Apartment' ? "e.g. Green Meadows" : "e.g. Comfort Stay"}
                                            />
                                        </div>
                                    </div>

                                    <div className="pp-form-grid">
                                        <div className="pp-form-group">
                                            <label>CONTACT NUMBER <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input
                                                type="text"
                                                name="contactNumber"
                                                value={propertyType === 'Apartment' ? apartmentDetails.contactNumber : (propertyType === 'PGs' ? pgDetails.contactNumber : roomDetails.contactNumber)}
                                                onChange={(e) => {
                                                    handleInputChange(e);
                                                    setErrorFields(prev => prev.filter(f => f !== 'contactNumber'));
                                                }}
                                                className={`pp-form-input ${errorFields.includes('contactNumber') ? 'error' : ''}`}
                                                placeholder="e.g. 9876543210"
                                            />
                                        </div>
                                        <div className="pp-form-group">
                                            <label>EMAIL ADDRESS <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={propertyType === 'Apartment' ? apartmentDetails.email : (propertyType === 'PGs' ? pgDetails.email : roomDetails.email)}
                                                onChange={(e) => {
                                                    handleInputChange(e);
                                                    setErrorFields(prev => prev.filter(f => f !== 'email'));
                                                }}
                                                className={`pp-form-input ${errorFields.includes('email') ? 'error' : ''}`}
                                                placeholder="e.g. manager@stayzen.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="pp-form-grid">
                                        <div className="pp-form-group">
                                            <label>Total Rooms/Units <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input
                                                type="number"
                                                name={propertyType === 'Apartment' ? "totalFlats" : "totalRooms"}
                                                value={propertyType === 'Apartment' ? apartmentDetails.totalFlats : (propertyType === 'PGs' ? pgDetails.totalRooms : roomDetails.totalRooms)}
                                                onChange={(e) => {
                                                    handleInputChange(e);
                                                    setErrorFields(prev => prev.filter(f => f !== (propertyType === 'Apartment' ? 'totalFlats' : 'totalRooms')));
                                                }}
                                                className={`pp-form-input ${errorFields.includes(propertyType === 'Apartment' ? 'totalFlats' : 'totalRooms') ? 'error' : ''}`}
                                                placeholder="e.g. 10"
                                            />
                                        </div>
                                    </div>

                                    {propertyType === 'Apartment' ? (
                                        <div className="pp-form-grid">
                                            <div className="pp-form-group">
                                                <label>Lift Facility <span style={{ color: '#ef4444' }}>*</span></label>
                                                <select name="liftAvailable" value={apartmentDetails.liftAvailable} onChange={handleInputChange} className="pp-form-select">
                                                    <option value="Yes">Yes</option>
                                                    <option value="No">No</option>
                                                </select>
                                            </div>
                                            <div className="pp-form-group">
                                                <label>Parking Available <span style={{ color: '#ef4444' }}>*</span></label>
                                                <select name="parkingAvailable" value={apartmentDetails.parkingAvailable} onChange={handleInputChange} className="pp-form-select">
                                                    <option value="Yes">Yes</option>
                                                    <option value="No">No</option>
                                                </select>
                                            </div>
                                        </div>
                                    ) : propertyType === 'PGs' ? (
                                        <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div className="pp-form-group">
                                                <label>PG For <span style={{ color: '#ef4444' }}>*</span></label>
                                                <select name="pgType" value={pgDetails.pgType} onChange={handleInputChange} className="pp-form-select">
                                                    <option value="Girls PG">Girls PG</option>
                                                    <option value="Boys PG">Boys PG</option>
                                                    <option value="Co-Living">Co-Living</option>
                                                </select>
                                            </div>
                                            <div className="pp-form-group">
                                                <label>AC Available <span style={{ color: '#ef4444' }}>*</span></label>
                                                <select name="isProvidingAC" value={pgDetails.isProvidingAC} onChange={handleInputChange} className="pp-form-select">
                                                    <option value="Yes">Yes</option>
                                                    <option value="No">No</option>
                                                </select>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            {/* Step 2: Location */}
                            {registrationStep === 2 && (
                                <div style={{ animation: 'ppFadeIn 0.4s ease' }}>
                                    <div className="pp-modal-section-title">
                                        <IoLocateOutline size={16} />
                                        Set Property Location
                                    </div>
                                    <div className="pp-form-grid">
                                        <div className="pp-form-group">
                                            <label>STATE & CITY <span style={{ color: '#ef4444' }}>*</span></label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                <input
                                                    type="text"
                                                    name="state"
                                                    value={propertyType === 'Apartment' ? apartmentDetails.state : (propertyType === 'PGs' ? pgDetails.state : roomDetails.state)}
                                                    onChange={(e) => {
                                                        handleInputChange(e);
                                                        setErrorFields(prev => prev.filter(f => f !== 'state'));
                                                    }}
                                                    className={`pp-form-input ${errorFields.includes('state') ? 'error' : ''}`}
                                                    placeholder="State"
                                                />
                                                <input
                                                    type="text"
                                                    name="city"
                                                    value={propertyType === 'Apartment' ? apartmentDetails.city : (propertyType === 'PGs' ? pgDetails.city : roomDetails.city)}
                                                    onChange={(e) => {
                                                        handleInputChange(e);
                                                        setErrorFields(prev => prev.filter(f => f !== 'city'));
                                                    }}
                                                    className={`pp-form-input ${errorFields.includes('city') ? 'error' : ''}`}
                                                    placeholder="City"
                                                />
                                            </div>
                                        </div>
                                        <div className="pp-form-group">
                                            <label>AREA & PINCODE <span style={{ color: '#ef4444' }}>*</span></label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                <input
                                                    type="text"
                                                    name="colonyArea"
                                                    value={propertyType === 'Apartment' ? apartmentDetails.colonyArea : (propertyType === 'PGs' ? pgDetails.colonyArea : roomDetails.colonyArea)}
                                                    onChange={(e) => {
                                                        handleInputChange(e);
                                                        setErrorFields(prev => prev.filter(f => f !== 'colonyArea'));
                                                    }}
                                                    className={`pp-form-input ${errorFields.includes('colonyArea') ? 'error' : ''}`}
                                                    placeholder="Colony / Area"
                                                />
                                                <input
                                                    type="text"
                                                    name="pincode"
                                                    value={propertyType === 'Apartment' ? apartmentDetails.pincode : (propertyType === 'PGs' ? pgDetails.pincode : roomDetails.pincode)}
                                                    onChange={(e) => {
                                                        handleInputChange(e);
                                                        setErrorFields(prev => prev.filter(f => f !== 'pincode'));
                                                        if (e.target.value.length === 6) handlePincodeLookup(e.target.value);
                                                    }}
                                                    className={`pp-form-input ${errorFields.includes('pincode') ? 'error' : ''}`}
                                                    placeholder="6-digit pincode"
                                                    maxLength={6}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pp-form-group">
                                        <label>Google Maps URL / Search <span style={{ color: '#ef4444' }}>*</span></label>
                                        <div className="pp-location-search-wrapper">
                                            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                                                <input
                                                    type="text"
                                                    name="googleMapsLink"
                                                    value={propertyType === 'Apartment' ? apartmentDetails.googleMapsLink : (propertyType === 'PGs' ? pgDetails.googleMapsLink : roomDetails.googleMapsLink)}
                                                    onChange={(e) => {
                                                        handleInputChange(e);
                                                        setErrorFields(prev => prev.filter(f => f !== 'googleMapsLink'));
                                                    }}
                                                    className={`pp-form-input ${errorFields.includes('googleMapsLink') ? 'error' : ''}`}
                                                    placeholder="Search area, colony or paste maps link..."
                                                    style={{ flex: 1 }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleCurrentLocation}
                                                    className="pp-btn-outline"
                                                    disabled={isSearchingLocation}
                                                    style={{ width: 'auto', padding: '0 12px', height: '40px', color: '#ef4444', borderColor: '#fee2e2', opacity: isSearchingLocation ? 0.6 : 1 }}
                                                    title="Use Live Location"
                                                >
                                                    <IoLocateOutline size={18} className={isSearchingLocation ? "pp-spin" : ""} />
                                                </button>
                                            </div>

                                            {/* Integrated Search Suggestions */}
                                            {(searchResults.length > 0 || isSearchingLocation) && (
                                                <div className="pp-search-dropdown" ref={searchResultRef}>
                                                    {isSearchingLocation ? (
                                                        <div className="pp-search-loading">Searching locations...</div>
                                                    ) : (
                                                        searchResults.map((item, idx) => (
                                                            <button
                                                                key={idx}
                                                                className="pp-search-result-item"
                                                                onClick={() => handleSelectLocation(item)}
                                                            >
                                                                <div className="item-icon">
                                                                    {idx === 0 ? <IoTimeOutline size={18} /> : <IoLocationOutline size={18} />}
                                                                </div>
                                                                <div className="item-details">
                                                                    <div className="item-name">{item.main_text || item.address?.name || item.display_name.split(',')[0]}</div>
                                                                    <div className="item-sub">{item.secondary_text || item.display_name}</div>
                                                                </div>
                                                                <div className="item-arrow">
                                                                    <IoArrowUpOutline size={18} />
                                                                </div>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{
                                        height: '240px',
                                        borderRadius: '14px',
                                        overflow: 'hidden',
                                        border: '1px solid var(--pp-border)',
                                        background: '#f1f5f9',
                                        position: 'relative',
                                        zIndex: 1
                                    }}>
                                        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                            <LocationMarker
                                                position={markerPosition}
                                                onPositionChange={(pos) => {
                                                    const newPos = [pos.lat, pos.lng];
                                                    setMarkerPosition(newPos);
                                                    const link = `https://www.google.com/maps?q=${pos.lat},${pos.lng}`;
                                                    const updates = { googleMapsLink: link };
                                                    setErrorFields(prev => prev.filter(f => f !== 'googleMapsLink'));
                                                    if (propertyType === 'Apartment') {
                                                        setApartmentDetails(prev => ({ ...prev, ...updates }));
                                                    } else if (propertyType === 'PGs') {
                                                        setPgDetails(prev => ({ ...prev, ...updates }));
                                                    } else {
                                                        setRoomDetails(prev => ({ ...prev, ...updates }));
                                                    }
                                                }}
                                            />
                                            <RecenterMap center={mapCenter} />
                                        </MapContainer>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Confirmation */}
                            {registrationStep === 3 && (
                                <div style={{ animation: 'ppFadeIn 0.4s ease', textAlign: 'center', padding: '20px 0' }}>
                                    <div style={{ width: '80px', height: '80px', background: 'var(--pp-primary-light)', color: 'var(--pp-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                        <IoCheckmarkCircleOutline size={48} />
                                    </div>
                                    <h4 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--pp-text-main)', margin: '0 0 12px 0' }}>All Set!</h4>
                                    <p style={{ color: 'var(--pp-text-sec)', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
                                        Your property details have been captured. Please confirm to submit your registration for approval.
                                    </p>
                                </div>
                            )}

                            {/* Step 4: Success Message */}
                            {registrationStep === 4 && (
                                <div style={{ animation: 'ppFadeIn 0.4s ease', textAlign: 'center', padding: '40px 0' }}>
                                    <div style={{
                                        width: '100px',
                                        height: '100px',
                                        background: '#ecfdf5',
                                        color: '#10b981',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 24px',
                                        boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.1)'
                                    }}>
                                        <IoRocketOutline size={50} />
                                    </div>
                                    <h4 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--pp-text-main)', margin: '0 0 12px 0' }}>Registration Sent!</h4>
                                    <p style={{ color: 'var(--pp-text-sec)', fontSize: '16px', lineHeight: '1.6', maxWidth: '300px', margin: '0 auto' }}>
                                        Your {propertyType} registration is being reviewed by our admin. You'll be notified once it's approved.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Wizard Footer */}
                        <div className="pp-modal-footer">
                            <button
                                className="pp-secondary-btn"
                                onClick={() => registrationStep === 1 ? setIsRegisterModalOpen(false) : setRegistrationStep(s => s - 1)}
                                style={{ display: registrationStep === 4 ? 'none' : 'block' }}
                            >
                                {registrationStep === 1 ? 'Cancel' : 'Back'}
                            </button>

                            {registrationStep < 3 ? (
                                <button
                                    className="pp-primary-btn"
                                    onClick={() => {
                                        const errors = [];
                                        if (registrationStep === 1) {
                                            const isApt = propertyType === 'Apartment';
                                            const isRoom = propertyType === 'Room';
                                            const details = isApt ? apartmentDetails : (isRoom ? roomDetails : pgDetails);

                                            if (!details.managerName) errors.push("managerName");
                                            if (isApt && !details.apartmentName) errors.push("apartmentName");
                                            if (propertyType === 'PGs' && !details.pgName) errors.push("pgName");
                                            if (isRoom && !details.roomName) errors.push("roomName");
                                            if (!details.contactNumber) errors.push("contactNumber");
                                            if (!details.email) errors.push("email");
                                            if (isApt && !details.totalFlats) errors.push("totalFlats");
                                            if ((propertyType === 'PGs' || isRoom) && !details.totalRooms) errors.push("totalRooms");
                                        } else if (registrationStep === 2) {
                                            const details = propertyType === 'Apartment' ? apartmentDetails : (propertyType === 'PGs' ? pgDetails : roomDetails);

                                            if (!details.state) errors.push("state");
                                            if (!details.city) errors.push("city");
                                            if (!details.colonyArea) errors.push("colonyArea");
                                            if (!details.pincode) errors.push("pincode");
                                            if (!details.googleMapsLink) errors.push("googleMapsLink");
                                        }

                                        if (errors.length > 0) {
                                            setErrorFields(errors);
                                            return;
                                        }

                                        setErrorFields([]);
                                        setRegistrationStep(s => s + 1);
                                    }}
                                >
                                    Continue
                                </button>
                            ) : (
                                <button
                                    className="pp-primary-btn"
                                    onClick={async () => {
                                        try {
                                            const isApt = propertyType === 'Apartment';
                                            const isRoom = propertyType === 'Room';
                                            const details = isApt ? apartmentDetails : (isRoom ? roomDetails : pgDetails);

                                            const standardizedData = {
                                                type: propertyType,
                                                name: isApt ? details.apartmentName : (isRoom ? details.roomName : details.pgName),
                                                manager: details.managerName,
                                                contactNumber: details.contactNumber,
                                                email: details.email,
                                                rent: `₹0`,
                                                units: details.totalFlats || details.totalRooms,
                                                location: `${details.city}, ${details.state}`,
                                                address: {
                                                    state: details.state,
                                                    city: details.city,
                                                    area: details.colonyArea,
                                                    pincode: details.pincode,
                                                    googleMapsLink: details.googleMapsLink
                                                },
                                                pincode: details.pincode,
                                                googleMapsLink: details.googleMapsLink,
                                                features: isApt ? {
                                                    flatType: '1BHK',
                                                    lift: details.liftAvailable,
                                                    parking: details.parkingAvailable
                                                } : (isRoom ? {
                                                    roomType: 'Standard',
                                                    ac: 'No'
                                                } : {
                                                    pgType: details.pgType,
                                                    roomType: '1x Sharing',
                                                    ac: 'No'
                                                }),
                                                status: 'Processing',
                                                emptyUnits: details.totalFlats || details.totalRooms,
                                                ownerId: auth.currentUser?.uid || userId || null,
                                                authEmail: auth.currentUser?.email || null
                                            };

                                            setIsRegistering(true);
                                            await addProperty(standardizedData);
                                            setIsRegistering(false);

                                            // Move to Success Step
                                            setRegistrationStep(4);

                                            // Auto-close and switch to Processing tab after delay
                                            setTimeout(() => {
                                                setIsRegisterModalOpen(false);
                                                setActiveFilter('Processing');

                                                // Reset
                                                setApartmentDetails({
                                                    managerName: '', apartmentName: '', contactNumber: '', email: '',
                                                    totalFlats: '', liftAvailable: 'Yes',
                                                    parkingAvailable: 'Yes', state: '', city: '', colonyArea: '',
                                                    pincode: '', googleMapsLink: ''
                                                });
                                                setPgDetails({
                                                    managerName: '', pgName: '', contactNumber: '', email: '',
                                                    pgType: 'Girls PG', state: '', city: '', colonyArea: '',
                                                    pincode: '', googleMapsLink: '', isProvidingAC: 'No', totalRooms: ''
                                                });
                                                setRoomDetails({
                                                    managerName: '', roomName: '', contactNumber: '', email: '',
                                                    totalRooms: '', state: '', city: '', colonyArea: '',
                                                    pincode: '', googleMapsLink: ''
                                                });
                                            }, 2000);

                                        } catch (err) {
                                            console.error('Error:', err);
                                            setIsRegistering(false);
                                        }
                                    }}
                                    disabled={isRegistering}
                                    style={{ display: registrationStep === 4 ? 'none' : 'block' }}
                                >
                                    {isRegistering ? 'Registering...' : 'Complete Registration'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}



            {isEditModalOpen && (
                <div className="pp-modal-overlay">
                    <div className="pp-modal-content" style={{ width: '500px', maxWidth: '90vw', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className="pp-modal-header" style={{
                            background: 'linear-gradient(135deg, #1aa79c 0%, #148f85 100%)',
                            color: 'white',
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            padding: '16px 20px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 style={{ margin: 0, color: 'white' }}>Edit Property Details</h3>
                                <button className="pp-close-btn pp-close-btn-light" onClick={() => setIsEditModalOpen(false)}>
                                    <IoCloseOutline size={22} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {[1, 2].map((step) => (
                                    <div key={step} style={{ display: 'flex', alignItems: 'center', flex: step === 2 ? 'none' : 1 }}>
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: registrationStep >= step ? 'white' : 'rgba(255,255,255,0.3)',
                                            color: registrationStep >= step ? '#1aa79c' : 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px',
                                            fontWeight: '700'
                                        }}>
                                            {registrationStep > step ? <IoCheckmarkCircleOutline size={20} /> : step}
                                        </div>
                                        {step < 2 && (
                                            <div style={{
                                                height: '2px',
                                                flex: 1,
                                                background: registrationStep > step ? 'white' : 'rgba(255,255,255,0.3)',
                                                margin: '0 8px'
                                            }} />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', fontWeight: '600' }}>
                                <span style={{ opacity: registrationStep >= 1 ? 1 : 0.6 }}>Basic Info</span>
                                <span style={{ opacity: registrationStep >= 2 ? 1 : 0.6 }}>Location</span>
                            </div>
                        </div>

                        <div className="pp-modal-body">
                            {registrationStep === 1 && (
                                <div style={{ animation: 'ppFadeIn 0.4s ease' }}>
                                    <div className="pp-modal-section-title">
                                        <IoInformationCircleOutline size={16} />
                                        Basic Details
                                    </div>

                                    <div className="pp-form-grid">
                                        <div className="pp-form-group">
                                            <label>{propertyType === 'Apartment' ? 'Manager Name' : 'PG Warden Name'} <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input
                                                type="text"
                                                name="managerName"
                                                value={propertyType === 'Apartment' ? apartmentDetails.managerName : pgDetails.managerName}
                                                onChange={handleInputChange}
                                                className="pp-form-input"
                                            />
                                        </div>
                                        <div className="pp-form-group">
                                            <label>{propertyType === 'Apartment' ? 'Apartment Name' : 'PG Name'} <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input
                                                type="text"
                                                name={propertyType === 'Apartment' ? "apartmentName" : "pgName"}
                                                value={propertyType === 'Apartment' ? apartmentDetails.apartmentName : pgDetails.pgName}
                                                onChange={handleInputChange}
                                                className="pp-form-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="pp-form-grid">
                                        <div className="pp-form-group">
                                            <label>Contact Number <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input
                                                type="text"
                                                name="contactNumber"
                                                value={propertyType === 'Apartment' ? apartmentDetails.contactNumber : pgDetails.contactNumber}
                                                onChange={handleInputChange}
                                                className="pp-form-input"
                                            />
                                        </div>
                                        <div className="pp-form-group">
                                            <label>Email Address</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={propertyType === 'Apartment' ? apartmentDetails.email : pgDetails.email}
                                                onChange={handleInputChange}
                                                className="pp-form-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="pp-form-grid">
                                        <div className="pp-form-group">
                                            <label>{propertyType === 'Apartment' ? 'Total Flats' : 'Total Rooms'} <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input
                                                type="number"
                                                name={propertyType === 'Apartment' ? "totalFlats" : "totalRooms"}
                                                value={propertyType === 'Apartment' ? apartmentDetails.totalFlats : pgDetails.totalRooms}
                                                onChange={handleInputChange}
                                                className="pp-form-input"
                                            />
                                        </div>
                                        <div className="pp-form-group">
                                            <label>Lift Available</label>
                                            <select
                                                name="liftAvailable"
                                                value={propertyType === 'Apartment' ? apartmentDetails.liftAvailable : pgDetails.liftAvailable}
                                                onChange={handleInputChange}
                                                className="pp-form-select"
                                            >
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {registrationStep === 2 && (
                                <div style={{ animation: 'ppFadeIn 0.4s ease' }}>
                                    <div className="pp-modal-section-title">
                                        <IoLocateOutline size={16} />
                                        Update Location
                                    </div>

                                    <div className="pp-form-group">
                                        <label>Google Maps Link or Search Location</label>
                                        <div className="pp-location-search-wrapper" ref={searchResultRef}>
                                            <input
                                                type="text"
                                                name="googleMapsLink"
                                                placeholder="Paste Google Maps link or type area name..."
                                                value={propertyType === 'Apartment' ? apartmentDetails.googleMapsLink : pgDetails.googleMapsLink}
                                                onChange={handleInputChange}
                                                className="pp-form-input"
                                            />
                                            {isSearchingLocation && <div className="pp-search-loader"></div>}
                                            {searchResults.length > 0 && (
                                                <div className="pp-search-results">
                                                    {searchResults.map((item, i) => (
                                                        <div key={i} className="pp-search-item" onClick={() => handleSelectLocation(item)}>
                                                            <IoLocationOutline size={16} />
                                                            <span>{item.display_name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pp-form-grid">
                                        <div className="pp-form-group">
                                            <label>City</label>
                                            <input type="text" name="city" value={propertyType === 'Apartment' ? apartmentDetails.city : pgDetails.city} onChange={handleInputChange} className="pp-form-input" />
                                        </div>
                                        <div className="pp-form-group">
                                            <label>State</label>
                                            <input type="text" name="state" value={propertyType === 'Apartment' ? apartmentDetails.state : pgDetails.state} onChange={handleInputChange} className="pp-form-input" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pp-modal-footer">
                            <button className="pp-secondary-btn" onClick={() => registrationStep === 1 ? setIsEditModalOpen(false) : setRegistrationStep(1)}>
                                {registrationStep === 1 ? 'Cancel' : 'Back'}
                            </button>
                            {registrationStep === 1 ? (
                                <button className="pp-primary-btn" onClick={() => setRegistrationStep(2)}>Continue</button>
                            ) : (
                                <button className="pp-primary-btn" onClick={handleSaveEdit} disabled={isEditing}>
                                    {isEditing ? 'Submitting...' : 'Request Changes'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {
                isPublishModalOpen && selectedProperty && (
                    <div className="pp-modal-overlay">
                        <div className="pp-modal-content" style={{ width: '700px', maxWidth: '90vw' }}>
                            <div className="pp-modal-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ background: 'var(--pp-primary-light)', padding: '8px', borderRadius: '10px', color: 'var(--pp-primary)' }}>
                                        <IoRocketOutline size={24} />
                                    </div>
                                    <h3>Publish Property Post</h3>
                                </div>
                                <button className="pp-close-btn" onClick={() => setIsPublishModalOpen(false)}>
                                    <IoCloseOutline size={24} />
                                </button>
                            </div>

                            <div className="pp-modal-body">
                                {/* Section 1: Basic Info */}
                                <div className="pp-modal-section-title">
                                    <IoInformationCircleOutline size={16} />
                                    Property & Manager Details
                                </div>

                                <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="pp-form-group">
                                        <label>{publishDetails.propertyType === 'Apartment' ? 'Property Manager Name' : (publishDetails.propertyType === 'Room' ? 'Hotel Manager Name' : 'PG Wardens Name')}</label>
                                        <input type="text" name="managerName" value={publishDetails.managerName} readOnly className="pp-form-input locked" />
                                    </div>
                                    <div className="pp-form-group">
                                        <label>{publishDetails.propertyType === 'Apartment' ? 'Apartment Name' : (publishDetails.propertyType === 'Room' ? 'Hotel Name' : 'PG Name')}</label>
                                        <input type="text" name="propertyName" value={publishDetails.propertyName} readOnly className="pp-form-input locked" />
                                    </div>
                                </div>

                                <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="pp-form-group">
                                        <label>Contact Number</label>
                                        <input type="text" name="contactNumber" value={publishDetails.contactNumber} readOnly className="pp-form-input locked" />
                                    </div>
                                    <div className="pp-form-group">
                                        <label>Email ID</label>
                                        <input type="email" name="email" value={publishDetails.email} readOnly className="pp-form-input locked" />
                                    </div>
                                </div>

                                {/* Section 2: Specifications */}
                                <div className="pp-modal-section-title">
                                    <IoListOutline size={16} />
                                    Property Specifications
                                </div>

                                {publishDetails.propertyType === 'Room' ? (
                                    <div className="pp-form-grid">
                                        <div className="pp-form-group">
                                            <label>ROOM TYPE <span style={{ color: '#ef4444' }}>*</span></label>
                                            <select name="roomType" value={publishDetails.roomType} onChange={handlePublishInputChange} className={`pp-form-select ${errorFields.includes('roomType') ? 'error' : ''}`}>
                                                <option value="1 bed">1 bed</option>
                                                <option value="2 bed">2 bed</option>
                                                <option value="3 bed">3 bed</option>
                                                <option value="Custom">Custom</option>
                                            </select>
                                            {publishDetails.roomType === 'Custom' && (
                                                <input
                                                    type="text"
                                                    name="customRoomType"
                                                    value={publishDetails.customRoomType}
                                                    onChange={handlePublishInputChange}
                                                    className={`pp-form-input ${errorFields.includes('customRoomType') ? 'error' : ''}`}
                                                    placeholder="Enter custom room type"
                                                    style={{ marginTop: '10px' }}
                                                />
                                            )}
                                        </div>
                                        <div className="pp-form-group">
                                            <label>Available Rooms <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input
                                                type="number"
                                                name="emptyUnits"
                                                value={publishDetails.emptyUnits}
                                                onChange={handlePublishInputChange}
                                                className={`pp-form-input ${errorFields.includes('emptyUnits') ? 'error' : ''}`}
                                                placeholder="Total available rooms"
                                            />
                                        </div>
                                        <div className="pp-form-group">
                                            <label>PAYMENT MODE <span style={{ color: '#ef4444' }}>*</span></label>
                                            <select name="rentType" value={publishDetails.rentType} onChange={handlePublishInputChange} className="pp-form-select">
                                                <option value="Daywise">Daywise Rent</option>
                                                <option value="Weekly">Weekly Rent</option>
                                                <option value="Monthly">Monthly Rent</option>
                                            </select>
                                        </div>
                                        {publishDetails.rentType === 'Monthly' ? (
                                            <>
                                                <div className="pp-form-group">
                                                    <label>MONTHLY RENT (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                                                    <input
                                                        type="text"
                                                        name="monthlyRent"
                                                        value={publishDetails.monthlyRent}
                                                        onChange={handlePublishInputChange}
                                                        className={`pp-form-input ${errorFields.includes('monthlyRent') ? 'error' : ''}`}
                                                        placeholder="e.g. 15000"
                                                    />
                                                </div>
                                                <div className="pp-form-group">
                                                    <label>Advance Rent (Optional)</label>
                                                    <input
                                                        type="text"
                                                        name="advancePayment"
                                                        value={publishDetails.advancePayment}
                                                        onChange={handlePublishInputChange}
                                                        className="pp-form-input"
                                                        placeholder="e.g. ₹2000"
                                                    />
                                                </div>
                                            </>
                                        ) : publishDetails.rentType === 'Weekly' ? (
                                            <>
                                                <div className="pp-form-group">
                                                    <label>WEEKLY RENT (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                                                    <input
                                                        type="text"
                                                        name="weeklyRent"
                                                        value={publishDetails.weeklyRent}
                                                        onChange={handlePublishInputChange}
                                                        className={`pp-form-input ${errorFields.includes('weeklyRent') ? 'error' : ''}`}
                                                        placeholder="e.g. 5000"
                                                    />
                                                </div>
                                                <div className="pp-form-group">
                                                    <label>Advance Rent (Optional)</label>
                                                    <input
                                                        type="text"
                                                        name="advancePayment"
                                                        value={publishDetails.advancePayment}
                                                        onChange={handlePublishInputChange}
                                                        className="pp-form-input"
                                                        placeholder="e.g. ₹1000"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="pp-form-group">
                                                    <label>PER DAY RENT (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                                                    <input
                                                        type="text"
                                                        name="dailyRent"
                                                        value={publishDetails.dailyRent}
                                                        onChange={handlePublishInputChange}
                                                        className={`pp-form-input ${errorFields.includes('dailyRent') ? 'error' : ''}`}
                                                        placeholder="e.g. 1000"
                                                    />
                                                </div>
                                                <div className="pp-form-group">
                                                    <label>Advance Rent (Optional)</label>
                                                    <input
                                                        type="text"
                                                        name="advancePayment"
                                                        value={publishDetails.advancePayment}
                                                        onChange={handlePublishInputChange}
                                                        className="pp-form-input"
                                                        placeholder="e.g. ₹2000"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : publishDetails.propertyType === 'Apartment' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div className="pp-form-grid" style={{ marginBottom: '12px' }}>
                                            <div className="pp-form-group">
                                                <label>Total Flats <span style={{ color: '#ef4444' }}>*</span></label>
                                                <input
                                                    type="number"
                                                    name="totalUnits"
                                                    value={publishDetails.totalUnits}
                                                    onChange={handlePublishInputChange}
                                                    className={`pp-form-input ${errorFields.includes('totalUnits') ? 'error' : ''}`}
                                                    placeholder="Total flats in building"
                                                />
                                            </div>
                                            <div className="pp-form-group">
                                                <label>Number of Empty Flats <span style={{ color: '#ef4444' }}>*</span></label>
                                                <input
                                                    type="number"
                                                    name="emptyUnits"
                                                    value={publishDetails.emptyUnits}
                                                    onChange={handlePublishInputChange}
                                                    className={`pp-form-input ${errorFields.includes('emptyUnits') ? 'error' : ''}`}
                                                    placeholder="Available flats"
                                                />
                                            </div>
                                        </div>

                                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                <label style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: 0 }}>BHK ALLOCATION <span style={{ color: '#ef4444' }}>*</span></label>
                                                <button
                                                    type="button"
                                                    className="pp-btn-outline"
                                                    style={{ padding: '6px 12px', fontSize: '12px', height: 'auto' }}
                                                    onClick={() => {
                                                        setPublishDetails(prev => ({
                                                            ...prev,
                                                            bhkAllocations: [...prev.bhkAllocations, { bhkType: '1BHK', count: '', pricePerUnit: '', rentType: 'Monthly' }]
                                                        }));
                                                    }}
                                                >
                                                    <IoAddOutline size={16} style={{ marginRight: '4px' }} /> Add BHK
                                                </button>
                                            </div>

                                            {publishDetails.bhkAllocations.map((alloc, idx) => {
                                                const allocatedCount = publishDetails.bhkAllocations
                                                    .filter((_, i) => i < idx)
                                                    .reduce((sum, a) => sum + (parseInt(a.count) || 0), 0);
                                                const remainingUnits = Math.max(0, (parseInt(publishDetails.totalUnits) || 0) - allocatedCount);

                                                return (
                                                    <div key={idx}>
                                                        <div style={{
                                                            background: '#ffffff',
                                                            padding: '16px',
                                                            borderRadius: '10px',
                                                            marginBottom: '12px',
                                                            border: '1.5px solid #e2e8f0',
                                                            display: 'grid',
                                                            gridTemplateColumns: '1.3fr 1fr 1fr 1fr auto',
                                                            gap: '12px',
                                                            alignItems: 'flex-start'
                                                        }}>
                                                        <div>
                                                            <label style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>BHK TYPE</label>
                                                            <select
                                                                value={alloc.bhkType}
                                                                onChange={(e) => {
                                                                    const newAllocs = [...publishDetails.bhkAllocations];
                                                                    newAllocs[idx].bhkType = e.target.value;
                                                                    setPublishDetails(prev => ({ ...prev, bhkAllocations: newAllocs }));
                                                                }}
                                                                className="pp-form-select"
                                                                style={{ fontSize: '13px' }}
                                                            >
                                                                <option value="Studio">Studio</option>
                                                                <option value="1BHK">1BHK</option>
                                                                <option value="2BHK">2BHK</option>
                                                                <option value="3BHK">3BHK</option>
                                                                <option value="4BHK">4BHK</option>
                                                                <option value="5BHK+">5BHK+</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>COUNT (ROOMS)</label>
                                                            <input
                                                                type="number"
                                                                value={alloc.count}
                                                                onChange={(e) => {
                                                                    const newAllocs = [...publishDetails.bhkAllocations];
                                                                    newAllocs[idx].count = e.target.value;
                                                                    setPublishDetails(prev => ({ ...prev, bhkAllocations: newAllocs }));
                                                                }}
                                                                className="pp-form-input"
                                                                placeholder="Units"
                                                                style={{ fontSize: '13px' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>PRICE (₹)</label>
                                                            <input
                                                                type="number"
                                                                value={alloc.pricePerUnit}
                                                                onChange={(e) => {
                                                                    const newAllocs = [...publishDetails.bhkAllocations];
                                                                    newAllocs[idx].pricePerUnit = e.target.value;
                                                                    setPublishDetails(prev => ({ ...prev, bhkAllocations: newAllocs }));
                                                                }}
                                                                className="pp-form-input"
                                                                placeholder="Price"
                                                                style={{ fontSize: '13px' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>RENT TYPE</label>
                                                            <select
                                                                value={alloc.rentType}
                                                                onChange={(e) => {
                                                                    const newAllocs = [...publishDetails.bhkAllocations];
                                                                    newAllocs[idx].rentType = e.target.value;
                                                                    setPublishDetails(prev => ({ ...prev, bhkAllocations: newAllocs }));
                                                                }}
                                                                className="pp-form-select"
                                                                style={{ fontSize: '13px' }}
                                                            >
                                                                <option value="Daily">Daily</option>
                                                                <option value="Weekly">Weekly</option>
                                                                <option value="Monthly">Monthly</option>
                                                                <option value="Yearly">Yearly</option>
                                                            </select>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="pp-btn-danger"
                                                            style={{ padding: '8px 10px', fontSize: '12px', height: 'auto', marginTop: '24px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                                                            onClick={() => {
                                                                setPublishDetails(prev => ({
                                                                    ...prev,
                                                                    bhkAllocations: prev.bhkAllocations.filter((_, i) => i !== idx)
                                                                }));
                                                            }}
                                                        >
                                                            <IoTrashOutline size={14} />
                                                        </button>
                                                    </div>
                                                    <div style={{
                                                        background: '#f0fdf4',
                                                        border: '1px solid #dcfce7',
                                                        borderRadius: '8px',
                                                        padding: '14px 16px',
                                                        marginTop: '8px',
                                                        fontSize: '12px',
                                                        color: '#64748b',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        minHeight: '40px'
                                                    }}>
                                                        <span>Remaining Units:</span>
                                                        <span style={{ fontWeight: '600', color: '#059669' }}>{remainingUnits}</span>
                                                    </div>
                                                    </div>
                                                );
                                            })}

                                            {publishDetails.bhkAllocations.length > 0 && (
                                                <div style={{
                                                    background: '#ecfdf5',
                                                    border: '1px solid #bbf7d0',
                                                    borderRadius: '10px',
                                                    padding: '12px 16px',
                                                    marginTop: '12px'
                                                }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                                                        <div>
                                                            <span style={{ color: '#64748b' }}>Total Allocated:</span>
                                                            <span style={{ fontWeight: '600', color: '#059669', marginLeft: '8px' }}>
                                                                {publishDetails.bhkAllocations.reduce((sum, a) => sum + (parseInt(a.count) || 0), 0)} units
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span style={{ color: '#64748b' }}>Remaining:</span>
                                                            <span style={{ fontWeight: '600', color: '#059669', marginLeft: '8px' }}>
                                                                {Math.max(0, (parseInt(publishDetails.totalUnits) || 0) - publishDetails.bhkAllocations.reduce((sum, a) => sum + (parseInt(a.count) || 0), 0))} units
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pp-form-grid">
                                            <div className="pp-form-group">
                                                <label>PAYMENT MODE <span style={{ color: '#ef4444' }}>*</span></label>
                                                <select name="rentType" value={publishDetails.rentType} onChange={handlePublishInputChange} className="pp-form-select">
                                                    <option value="Monthly">Monthly Rent</option>
                                                    <option value="Weekly">Weekly Rent</option>
                                                    <option value="Daywise">Daywise Rent</option>
                                                </select>
                                            </div>
                                            {publishDetails.rentType === 'Monthly' && (
                                                <>
                                                    <div className="pp-form-group">
                                                        <label>Advance Payment Details <span style={{ color: '#ef4444' }}>*</span></label>
                                                        <input
                                                            type="text"
                                                            name="advancePayment"
                                                            value={publishDetails.advancePayment}
                                                            onChange={handlePublishInputChange}
                                                            className={`pp-form-input ${errorFields.includes('advancePayment') ? 'error' : ''}`}
                                                            placeholder="e.g. 1 Month Rent"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pp-form-grid">
                                        <div className="pp-form-group">
                                            <label>PG TYPE <span style={{ color: '#ef4444' }}>*</span></label>
                                            <select name="unitType" value={publishDetails.unitType} onChange={handlePublishInputChange} className="pp-form-select">
                                                <option value="Girls PG">Girls PG</option>
                                                <option value="Boys PG">Boys PG</option>
                                                <option value="Co-Living">Co-Living</option>
                                            </select>
                                        </div>
                                        <div className="pp-form-group" style={{ gridColumn: 'span 2' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <label>PG ROOMS CONFIGURATION <span style={{ color: '#ef4444' }}>*</span></label>
                                                <button
                                                    type="button"
                                                    className="pp-btn-outline"
                                                    style={{ padding: '4px 8px', fontSize: '12px', height: 'auto' }}
                                                    onClick={() => {
                                                        setPublishDetails(prev => ({
                                                            ...prev,
                                                            roomConfigurations: [...prev.roomConfigurations, { type: '1x Sharing', customType: '', count: '', rentType: 'Monthly', rentAmount: '' }]
                                                        }));
                                                    }}
                                                >
                                                    <IoAddOutline size={14} style={{ marginRight: '4px' }} /> Add Type
                                                </button>
                                            </div>

                                            {publishDetails.roomConfigurations.map((conf, idx) => (
                                                <div key={idx} style={{
                                                    background: '#f8fafc',
                                                    padding: '16px',
                                                    borderRadius: '12px',
                                                    marginBottom: '12px',
                                                    border: '1px solid #e2e8f0'
                                                }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1.2fr auto', gap: '10px', alignItems: 'flex-start' }}>
                                                        <div>
                                                            <label style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>SHARING TYPE</label>
                                                            <select
                                                                value={conf.type}
                                                                onChange={(e) => {
                                                                    const newConfs = [...publishDetails.roomConfigurations];
                                                                    newConfs[idx].type = e.target.value;
                                                                    setPublishDetails(prev => ({ ...prev, roomConfigurations: newConfs }));
                                                                }}
                                                                className="pp-form-select"
                                                            >
                                                                <option value="1x Sharing">1x Sharing</option>
                                                                <option value="2x Sharing">2x Sharing</option>
                                                                <option value="3x Sharing">3x Sharing</option>
                                                                <option value="4x Sharing">4x Sharing</option>
                                                                <option value="Custom">Custom</option>
                                                            </select>
                                                            {conf.type === 'Custom' && (
                                                                <input
                                                                    type="text"
                                                                    value={conf.customType}
                                                                    onChange={(e) => {
                                                                        const newConfs = [...publishDetails.roomConfigurations];
                                                                        newConfs[idx].customType = e.target.value;
                                                                        setPublishDetails(prev => ({ ...prev, roomConfigurations: newConfs }));
                                                                    }}
                                                                    className="pp-form-input"
                                                                    placeholder="e.g. 5x Sharing"
                                                                    style={{ marginTop: '5px' }}
                                                                />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>PAY TYPE</label>
                                                            <select
                                                                value={conf.rentType}
                                                                onChange={(e) => {
                                                                    const newConfs = [...publishDetails.roomConfigurations];
                                                                    newConfs[idx].rentType = e.target.value;
                                                                    setPublishDetails(prev => ({ ...prev, roomConfigurations: newConfs }));
                                                                }}
                                                                className="pp-form-select"
                                                            >
                                                                <option value="Monthly">Monthly</option>
                                                                <option value="Weekly">Weekly</option>
                                                                <option value="Daily">Daily</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>ROOMS</label>
                                                            <input
                                                                type="number"
                                                                value={conf.count}
                                                                onChange={(e) => {
                                                                    const newConfs = [...publishDetails.roomConfigurations];
                                                                    newConfs[idx].count = e.target.value;
                                                                    setPublishDetails(prev => ({ ...prev, roomConfigurations: newConfs }));
                                                                }}
                                                                className="pp-form-input"
                                                                placeholder="Qty"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>AMOUNT (₹)</label>
                                                            <input
                                                                type="text"
                                                                value={conf.rentAmount}
                                                                onChange={(e) => {
                                                                    const newConfs = [...publishDetails.roomConfigurations];
                                                                    newConfs[idx].rentAmount = e.target.value;
                                                                    setPublishDetails(prev => ({ ...prev, roomConfigurations: newConfs }));
                                                                }}
                                                                className="pp-form-input"
                                                                placeholder="e.g. 5000"
                                                            />
                                                        </div>
                                                        <div style={{ paddingTop: '20px' }}>
                                                            {publishDetails.roomConfigurations.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newConfs = publishDetails.roomConfigurations.filter((_, i) => i !== idx);
                                                                        setPublishDetails(prev => ({ ...prev, roomConfigurations: newConfs }));
                                                                    }}
                                                                    style={{ padding: '8px', background: '#fee2e2', border: 'none', borderRadius: '8px', color: '#ef4444', cursor: 'pointer' }}
                                                                >
                                                                    <IoTrashOutline size={18} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 'bold', textAlign: 'right' }}>
                                                Total Configured Capacity: {publishDetails.roomConfigurations.reduce((acc, c) => acc + (Number(c.count) || 0), 0)} / {publishDetails.totalUnits || 0} Rooms
                                            </div>
                                        </div>

                                        <div className="pp-form-group">
                                            <label>Total Rooms (Total Capacity)</label>
                                            <input
                                                type="number"
                                                name="totalUnits"
                                                value={publishDetails.totalUnits}
                                                readOnly
                                                className="pp-form-input locked"
                                                placeholder="e.g. 50"
                                            />
                                        </div>
                                        <div className="pp-form-group">
                                            <label>Total Vacant Rooms <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input
                                                type="number"
                                                name="emptyUnits"
                                                value={publishDetails.emptyUnits}
                                                onChange={handlePublishInputChange}
                                                className={`pp-form-input ${errorFields.includes('emptyUnits') ? 'error' : ''}`}
                                                placeholder="e.g. 5"
                                            />
                                        </div>
                                        <div className="pp-form-group" style={{ gridColumn: 'span 2' }}>
                                            <label>Common Advance Payment Details (Optional)</label>
                                            <input
                                                type="text"
                                                name="advancePayment"
                                                value={publishDetails.advancePayment}
                                                onChange={handlePublishInputChange}
                                                className="pp-form-input"
                                                placeholder="e.g. 1 Month Rent"
                                            />
                                        </div>
                                    </div>
                                )}
                                {publishDetails.propertyType === 'Apartment' && (
                                    <div className="pp-form-grid">
                                        <div className="pp-form-group">
                                            <label>Furniture Status</label>
                                            <select name="furnitureProvided" value={publishDetails.furnitureProvided} onChange={handlePublishInputChange} className="pp-form-select">
                                                <option value="Fully-Furnished">Fully-Furnished</option>
                                                <option value="Semi-Furnished">Semi-Furnished</option>
                                                <option value="Unfurnished">Unfurnished</option>
                                            </select>
                                        </div>
                                        <div className="pp-form-group"></div>
                                    </div>
                                )}

                                {/* Section 3: Amenities */}
                                <div className="pp-modal-section-title">
                                    <IoShieldCheckmarkOutline size={16} />
                                    Amenities & Features
                                </div>

                                <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                    <div className="pp-form-group">
                                        <label>Lift Available <span style={{ color: '#ef4444' }}>*</span></label>
                                        <select name="liftAvailable" value={publishDetails.liftAvailable} onChange={handlePublishInputChange} className="pp-form-select">
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </div>
                                    <div className="pp-form-group">
                                        <label>Parking Space <span style={{ color: '#ef4444' }}>*</span></label>
                                        <select name="parkingSpace" value={publishDetails.parkingSpace} onChange={handlePublishInputChange} className="pp-form-select">
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </div>
                                    <div className="pp-form-group">
                                        <label>24/7 Water <span style={{ color: '#ef4444' }}>*</span></label>
                                        <select name="waterAvailability" value={publishDetails.waterAvailability} onChange={handlePublishInputChange} className="pp-form-select">
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                    <div className="pp-form-group">
                                        <label>Power Backup</label>
                                        <select name="powerBackup" value={publishDetails.powerBackup} onChange={handlePublishInputChange} className="pp-form-select">
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </div>
                                    <div className="pp-form-group">
                                        <label>CCTV Security</label>
                                        <select name="cctvSecurity" value={publishDetails.cctvSecurity} onChange={handlePublishInputChange} className="pp-form-select">
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </div>
                                </div>

                                {publishDetails.propertyType !== 'Apartment' && (
                                    <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                        <div className="pp-form-group">
                                            <label>Cooking Allowed</label>
                                            <select name="individualCooking" value={publishDetails.individualCooking} onChange={handlePublishInputChange} className="pp-form-select">
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                        </div>
                                        <div className="pp-form-group">
                                            <label>AC Available</label>
                                            <select name="isProvidingAC" value={publishDetails.isProvidingAC} onChange={handlePublishInputChange} className="pp-form-select">
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                        </div>
                                        <div className="pp-form-group">
                                            <label>WiFi Provided</label>
                                            <select name="wifiAvailable" value={publishDetails.wifiAvailable} onChange={handlePublishInputChange} className="pp-form-select">
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* Section 4: Images */}
                                <div className="pp-modal-section-title">
                                    <IoImageOutline size={16} />
                                    Property Images
                                </div>

                                <div className="pp-form-group">
                                    <div className="pp-image-upload-zone"
                                        onClick={() => imageInputRef.current?.click()}
                                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--pp-primary)'; }}
                                        onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                            const files = Array.from(e.dataTransfer.files);
                                            handleImageChange({ target: { files } });
                                        }}
                                        style={{ textAlign: 'center', cursor: 'pointer' }}
                                    >
                                        <div style={{ color: 'var(--pp-primary)', marginBottom: '12px' }}>
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                        </div>
                                        <p style={{ fontWeight: '700', color: 'var(--pp-text-main)', margin: '0', fontSize: '15px' }}>Click to upload or drag & drop</p>
                                        <p style={{ fontSize: '13px', color: 'var(--pp-text-sec)', marginTop: '6px' }}>Upload up to 16 high-quality images (Min 1)</p>
                                        <input
                                            type="file"
                                            ref={imageInputRef}
                                            multiple
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={handleImageChange}
                                        />
                                    </div>

                                    {imagePreviews.length > 0 && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginTop: '20px' }}>
                                            {imagePreviews.map((url, idx) => (
                                                <div key={idx} style={{ position: 'relative', height: '90px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: 'var(--pp-shadow-sm)' }}>
                                                    <img src={url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#f1f5f9' }} />
                                                    <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '4px' }}>
                                                        <button
                                                            style={{ background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedImages(prev => prev.filter((_, i) => i !== idx));
                                                                setImagePreviews(prev => prev.filter((_, i) => i !== idx));
                                                            }}
                                                        >
                                                            <IoCloseOutline size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Section 5: Location */}
                                <div className="pp-modal-section-title">
                                    <IoLocateOutline size={16} />
                                    Property Location
                                </div>

                                <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="pp-form-group">
                                        <label>State</label>
                                        <input type="text" name="state" value={publishDetails.state} readOnly className="pp-form-input locked" />
                                    </div>
                                    <div className="pp-form-group">
                                        <label>City</label>
                                        <input type="text" name="city" value={publishDetails.city} readOnly className="pp-form-input locked" />
                                    </div>
                                </div>

                                <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="pp-form-group">
                                        <label>Colony or Area</label>
                                        <input type="text" name="colonyArea" value={publishDetails.colonyArea} readOnly className="pp-form-input locked" />
                                    </div>
                                    <div className="pp-form-group">
                                        <label>Pincode</label>
                                        <input
                                            type="text"
                                            name="pincode"
                                            value={publishDetails.pincode}
                                            readOnly
                                            className="pp-form-input locked"
                                        />
                                    </div>
                                </div>

                                <div className="pp-form-grid">
                                    <div className="pp-form-group">
                                        <label>Maps Location</label>
                                        <div className="pp-location-search-wrapper">
                                            <div style={{
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '10px',
                                                padding: '6px 10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                background: '#f1f5f9'
                                            }}>
                                                <input
                                                    type="text"
                                                    name="googleMapsLink"
                                                    value={publishDetails.googleMapsLink || ''}
                                                    readOnly
                                                    style={{
                                                        flex: 1,
                                                        border: 'none',
                                                        outline: 'none',
                                                        background: 'transparent',
                                                        fontSize: '14px',
                                                        color: '#64748b',
                                                        cursor: 'not-allowed'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pp-form-group">
                                    <label>Description (Customer Facing) <span style={{ color: '#ef4444' }}>*</span></label>
                                    <textarea
                                        name="postDetails"
                                        value={publishDetails.postDetails}
                                        onChange={handlePublishInputChange}
                                        className={`pp-form-input ${errorFields.includes('postDetails') ? 'error' : ''}`}
                                        placeholder="Enter key highlights about your property..."
                                        style={{ height: '100px', resize: 'vertical' }}
                                    />
                                </div>
                            </div>

                            <div className="pp-modal-footer" style={{ borderTop: '1px solid #f3f4f6', padding: '16px 24px', background: '#f9fafb' }}>
                                <button className="pp-secondary-btn" onClick={() => setIsPublishModalOpen(false)} disabled={isPublishing}>Cancel</button>
                                <button className="pp-primary-btn" disabled={isPublishing} onClick={async () => {
                                    // Validation
                                    const errors = [];

                                    // Common mandatory field
                                    if (!publishDetails.postDetails) errors.push('postDetails');

                                    if (publishDetails.propertyType === 'Apartment') {
                                        if (publishDetails.rentType === 'Monthly') {
                                            if (!publishDetails.monthlyRent) errors.push('monthlyRent');
                                            if (!publishDetails.advancePayment) errors.push('advancePayment');
                                        } else if (publishDetails.rentType === 'Weekly') {
                                            if (!publishDetails.weeklyRent) errors.push('weeklyRent');
                                        } else {
                                            if (!publishDetails.dailyRent) errors.push('dailyRent');
                                        }
                                        if (!publishDetails.totalUnits) errors.push('totalUnits');
                                        if (!publishDetails.emptyUnits) errors.push('emptyUnits');
                                        if (publishDetails.unitType === 'Custom' && !publishDetails.customUnitType) errors.push('customUnitType');
                                    } else if (publishDetails.propertyType === 'Room') {
                                        if (publishDetails.rentType === 'Monthly') {
                                            if (!publishDetails.monthlyRent) errors.push('monthlyRent');
                                        } else if (publishDetails.rentType === 'Weekly') {
                                            if (!publishDetails.weeklyRent) errors.push('weeklyRent');
                                        } else {
                                            if (!publishDetails.dailyRent) errors.push('dailyRent');
                                        }
                                        if (!publishDetails.emptyUnits) errors.push('emptyUnits');
                                        if (publishDetails.roomType === 'Custom' && !publishDetails.customRoomType) errors.push('customRoomType');
                                    } else {
                                        // PGs
                                        if (!publishDetails.totalUnits) errors.push('totalUnits');
                                        if (!publishDetails.emptyUnits) errors.push('emptyUnits');

                                        // Validate room configurations
                                        const configTotal = publishDetails.roomConfigurations.reduce((acc, c) => acc + (Number(c.count) || 0), 0);
                                        if (configTotal > Number(publishDetails.totalUnits)) {
                                            alert(`Total configured rooms (${configTotal}) exceeds total property units (${publishDetails.totalUnits})`);
                                            return;
                                        }

                                        const hasEmptyConfig = publishDetails.roomConfigurations.some(c => !c.count || !c.rentAmount || (c.type === 'Custom' && !c.customType));
                                        if (hasEmptyConfig) {
                                            alert("Please complete all room configuration details (Sharing Type, Count, and Amount)");
                                            return;
                                        }
                                    }

                                    if (selectedImages.length === 0) {
                                        alert("Please upload at least one image");
                                        return;
                                    }

                                    if (errors.length > 0) {
                                        setErrorFields(errors);
                                        return;
                                    }

                                    try {
                                        setIsPublishing(true);

                                        // 1. Convert Images to Base64 strings (Stored in Firestore)
                                        const base64Images = await Promise.all(
                                            selectedImages.map(file => convertToBase64(file))
                                        );

                                        // 2. Create Post with base64 strings
                                        const isPG = publishDetails.propertyType.toUpperCase().includes('PG') || publishDetails.propertyType.toLowerCase().includes('hostel');

                                        const isRoom = publishDetails.propertyType === 'Room';

                                        await addPost({
                                            ...publishDetails,
                                            imageUrls: base64Images,
                                            propertyId: selectedProperty.id,
                                            ownerId: userId || auth.currentUser?.uid || null,
                                            publishedAt: new Date().toISOString(),
                                            unitType: publishDetails.unitType === 'Custom' ? publishDetails.customUnitType : publishDetails.unitType,
                                            roomType: isPG ?
                                                publishDetails.roomConfigurations.map(c => `${c.count}x ${c.type === 'Custom' ? c.customType : c.type} (${c.rentAmount}/${c.rentType === 'Monthly' ? 'mo' : (c.rentType === 'Weekly' ? 'wk' : 'day')})`).join(', ') :
                                                (isRoom ? (publishDetails.roomType === 'Custom' ? publishDetails.customRoomType : publishDetails.roomType) : null),
                                            roomConfigurations: isPG ? publishDetails.roomConfigurations : null,
                                            // Ensure backward compatibility or clear legacy fields
                                            monthlyRent: isPG ? (publishDetails.roomConfigurations[0]?.rentType === 'Monthly' ? publishDetails.roomConfigurations[0]?.rentAmount : '') : publishDetails.monthlyRent,
                                            dailyRent: isPG ? (publishDetails.roomConfigurations[0]?.rentType === 'Daily' ? publishDetails.roomConfigurations[0]?.rentAmount : '') : publishDetails.dailyRent,
                                            weeklyRent: isPG ? (publishDetails.roomConfigurations[0]?.rentType === 'Weekly' ? publishDetails.roomConfigurations[0]?.rentAmount : '') : publishDetails.weeklyRent
                                        });

                                        // Successfully published post
                                        setIsPublishModalOpen(false);
                                    } catch (err) {
                                        console.error("Publishing Error:", err);
                                    } finally {
                                        setIsPublishing(false);
                                    }
                                }}>
                                    {isPublishing ? 'Uploading & Publishing...' : 'Confirm & Publish'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            {/* View Details Modal */}
            {
                isViewModalOpen && viewingProperty && (
                    <div className="pp-modal-overlay">
                        <div className="pp-modal-content" style={{ width: '600px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div className="pp-modal-header" style={{ borderBottom: '1px solid #f3f4f6', padding: '20px 24px' }}>
                                <div>
                                    <h3 style={{ margin: 0 }}>Property Details</h3>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#6b7280' }}>Registered on {new Date(viewingProperty.createdAt).toLocaleDateString()}</p>
                                </div>
                                <button className="pp-close-btn" onClick={() => setIsViewModalOpen(false)}>
                                    <IoCloseOutline size={24} color="#6b7280" />
                                </button>
                            </div>

                            <div className="pp-modal-body" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '25px' }}>
                                    <div>
                                        <h4 style={{ color: '#1aa79c', marginBottom: '10px' }}>Owner / Manager</h4>
                                        <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>Name:</strong> {viewingProperty.manager}</p>
                                        <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>Phone:</strong> {viewingProperty.contactNumber}</p>
                                        <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>Email:</strong> {viewingProperty.email}</p>
                                    </div>
                                    <div>
                                        <h4 style={{ color: '#1aa79c', marginBottom: '10px' }}>Property Info</h4>
                                        <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>Name:</strong> {viewingProperty.name}</p>
                                        <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>Type:</strong> {viewingProperty.type}</p>
                                        <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>Status:</strong> <span className={`pp-status-pill ${viewingProperty.status.toLowerCase()}`}>{viewingProperty.status}</span></p>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '25px' }}>
                                    <h4 style={{ color: '#1aa79c', marginBottom: '10px' }}>Financials & Units</h4>
                                    <div style={{ display: 'flex', gap: '40px' }}>
                                        <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>Monthly Rent:</strong> {viewingProperty.rent}</p>
                                        <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>Total {viewingProperty.type === 'Apartment' ? 'Flats' : 'Rooms'}:</strong> {viewingProperty.units}</p>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '25px' }}>
                                    <h4 style={{ color: '#1aa79c', marginBottom: '10px' }}>Address Details</h4>
                                    <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>Area:</strong> {viewingProperty.address?.area || 'N/A'}</p>
                                    <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>City:</strong> {viewingProperty.address?.city || 'N/A'}</p>
                                    <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>State:</strong> {viewingProperty.address?.state || 'N/A'}</p>
                                    {viewingProperty.googleMapsLink && (
                                        <div style={{ marginTop: '10px' }}>
                                            <a
                                                href={viewingProperty.googleMapsLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    color: '#1aa79c',
                                                    textDecoration: 'none',
                                                    fontWeight: '600',
                                                    fontSize: '14px',
                                                    padding: '8px 12px',
                                                    borderRadius: '6px',
                                                    background: 'rgba(26, 167, 156, 0.1)',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(26, 167, 156, 0.2)'}
                                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(26, 167, 156, 0.1)'}
                                            >
                                                <IoMapOutline size={18} />
                                                View on Google Maps
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 style={{ color: '#1aa79c', marginBottom: '10px' }}>Amenities & Features</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        {viewingProperty.type === 'Apartment' ? (
                                            <>
                                                <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>Flat Type:</strong> {viewingProperty.features?.flatType || 'N/A'}</p>
                                                <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>Lift:</strong> {viewingProperty.features?.lift || 'No'}</p>
                                                <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>Parking:</strong> {viewingProperty.features?.parking || 'No'}</p>
                                            </>
                                        ) : (
                                            <>
                                                <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>PG Type:</strong> {viewingProperty.features?.pgType || 'N/A'}</p>
                                                <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>Room Type:</strong> {viewingProperty.features?.roomType || 'N/A'}</p>
                                                <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>AC:</strong> {viewingProperty.features?.ac || 'No'}</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pp-modal-footer" style={{ borderTop: '1px solid #f3f4f6', padding: '16px 24px', background: '#f9fafb', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    className="pp-secondary-btn"
                                    onClick={() => {
                                        const prop = viewingProperty;
                                        setIsViewModalOpen(false);
                                        handleEditClick(prop);
                                    }}
                                    style={{ borderColor: '#1aa79c', color: '#1aa79c' }}
                                >
                                    Edit Property
                                </button>
                                <button className="pp-primary-btn" onClick={() => setIsViewModalOpen(false)}>Close Overview</button>
                            </div>
                        </div>
                    </div>
                )}

            {/* Staying People List Modal (Excel Style) */}
            {isStayingListModalOpen && selectedPropertyForList && (
                <div className="pp-modal-overlay">
                    <div className="pp-modal-content" style={{ width: '950px', maxWidth: '90vw', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className="pp-modal-header pp-staying-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                <div style={{ background: 'rgba(26, 167, 156, 0.1)', padding: '8px', borderRadius: '10px', color: '#1aa79c', flexShrink: 0 }}>
                                    <IoPeopleOutline size={24} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <h3 style={{ margin: 0, fontSize: '16px' }}>Staying People List</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedPropertyForList.name}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: '12px' }}>
                                <button
                                    className="pp-secondary-btn"
                                    style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', background: 'white', whiteSpace: 'nowrap' }}
                                    onClick={handleDownloadList}
                                >
                                    <IoDownloadOutline size={16} />
                                    <span style={{ display: 'inline' }}>Download</span>
                                </button>
                                <button
                                    className="pp-primary-btn"
                                    style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                                    onClick={() => handleOpenRenterForm()}
                                >
                                    <IoAddOutline size={16} />
                                    <span style={{ display: 'inline' }}>Add</span>
                                </button>
                                <button className="pp-close-btn" onClick={() => setIsStayingListModalOpen(false)} style={{ padding: '4px', minWidth: '32px', minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <IoCloseOutline size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="pp-modal-body" style={{ padding: '24px', overflowY: 'auto' }}>
                            <div style={{
                                width: '100%',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                background: 'white',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                    <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                        <tr>
                                            <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569', borderRight: '1px solid #e2e8f0' }}>Room No.</th>
                                            <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569', borderRight: '1px solid #e2e8f0' }}>Person Name</th>
                                            <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569', borderRight: '1px solid #e2e8f0' }}>Contact</th>
                                            <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569', borderRight: '1px solid #e2e8f0' }}>Sharing/Type</th>
                                            <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569', borderRight: '1px solid #e2e8f0' }}>Entry Date</th>
                                            <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569', borderRight: '1px solid #e2e8f0' }}>Exit Date</th>
                                            <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569', borderRight: '1px solid #e2e8f0' }}>Payment</th>
                                            <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569', borderRight: '1px solid #e2e8f0' }}>Status</th>
                                            <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569', textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allRenters.filter(r => r.property === selectedPropertyForList.name).length > 0 ? (
                                            allRenters.filter(r => r.property === selectedPropertyForList.name).map((renter, idx) => {
                                                const balance = (Number(renter.rentAmount) || 0) - (Number(renter.paidAmount) || 0);
                                                const isPaid = balance <= 0 && (Number(renter.rentAmount) > 0);

                                                return (
                                                    <tr key={renter.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fcfdfe' }}>
                                                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#334155', borderRight: '1px solid #f1f5f9' }}>{renter.unit || '-'}</td>
                                                        <td style={{ padding: '12px 16px', color: '#334155', borderRight: '1px solid #f1f5f9' }}>
                                                            <div style={{ fontWeight: '600' }}>{renter.name}</div>
                                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{renter.email}</div>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', color: '#475569', borderRight: '1px solid #f1f5f9' }}>{renter.phone || '-'}</td>
                                                        <td style={{ padding: '12px 16px', borderRight: '1px solid #f1f5f9' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#1aa79c' }}>{renter.sharingType || (selectedPropertyForList.type === 'Apartment' ? '1BHK' : 'Standard')}</span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', color: '#475569', borderRight: '1px solid #f1f5f9' }}>{renter.entryDate ? new Date(renter.entryDate).toLocaleDateString() : '-'}</td>
                                                        <td style={{ padding: '12px 16px', color: '#475569', borderRight: '1px solid #f1f5f9' }}>{renter.exitDate ? new Date(renter.exitDate).toLocaleDateString() : '-'}</td>
                                                        <td style={{ padding: '12px 16px', borderRight: '1px solid #f1f5f9' }}>
                                                            <div style={{ fontSize: '13px', fontWeight: '700' }}>₹{renter.paidAmount || 0} / ₹{renter.rentAmount || 0}</div>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', borderRight: '1px solid #f1f5f9' }}>
                                                            <span style={{
                                                                background: isPaid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                                color: isPaid ? '#10b981' : '#ef4444',
                                                                padding: '4px 10px',
                                                                borderRadius: '6px',
                                                                fontSize: '11px',
                                                                fontWeight: '700',
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                {isPaid ? 'PAID' : 'PENDING'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                                                <button onClick={() => handleOpenRenterForm(renter)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><IoCreateOutline size={18} /></button>
                                                                <button onClick={() => handleDeleteRenter(renter.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><IoTrashOutline size={18} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="9" style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                                                    <div style={{ marginBottom: '8px' }}><IoPeopleOutline size={32} opacity={0.3} /></div>
                                                    No staying people records found for this property.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="pp-modal-footer" style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                className="pp-secondary-btn"
                                onClick={() => setIsStayingListModalOpen(false)}
                                style={{ background: 'white' }}
                            >
                                Close List
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Renter Form Modal */}
            {isRenterFormOpen && (
                <div className="pp-modal-overlay" style={{ zIndex: 3000 }}>
                    <div className="pp-modal-content" style={{ width: '600px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className="pp-modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: 'rgba(26, 167, 156, 0.1)', padding: '8px', borderRadius: '10px', color: '#1aa79c' }}>
                                    {editingRenter ? <IoCreateOutline size={24} /> : <IoAddOutline size={24} />}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0 }}>{editingRenter ? 'Edit Resident' : 'Add New Resident'}</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>For {selectedPropertyForList?.name}</p>
                                </div>
                            </div>
                            <button className="pp-close-btn" onClick={() => setIsRenterFormOpen(false)}>
                                <IoCloseOutline size={24} />
                            </button>
                        </div>

                        <div className="pp-modal-body" style={{ padding: '24px', overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>FULL NAME *</label>
                                    <input
                                        className="pp-form-input"
                                        type="text"
                                        value={renterForm.name}
                                        onChange={(e) => setRenterForm({ ...renterForm, name: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>PHONE NUMBER</label>
                                    <input
                                        className="pp-form-input"
                                        type="tel"
                                        value={renterForm.phone}
                                        onChange={(e) => setRenterForm({ ...renterForm, phone: e.target.value })}
                                        placeholder="+91 98765 43210"
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>EMAIL ADDRESS</label>
                                    <input
                                        className="pp-form-input"
                                        type="email"
                                        value={renterForm.email}
                                        onChange={(e) => setRenterForm({ ...renterForm, email: e.target.value })}
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>ROOM / UNIT NO.</label>
                                    <input
                                        className="pp-form-input"
                                        type="text"
                                        value={renterForm.unit}
                                        onChange={(e) => setRenterForm({ ...renterForm, unit: e.target.value })}
                                        placeholder="101"
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>SHARING / ROOM TYPE</label>
                                    <input
                                        className="pp-form-input"
                                        type="text"
                                        value={renterForm.sharingType}
                                        onChange={(e) => setRenterForm({ ...renterForm, sharingType: e.target.value })}
                                        placeholder={selectedPropertyForList?.type === 'PG' ? '2x Sharing' : 'Deluxe Room'}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>MONTHLY RENT (₹) *</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>₹</div>
                                        <input
                                            className="pp-form-input"
                                            type="number"
                                            style={{ paddingLeft: '28px' }}
                                            value={renterForm.rentAmount}
                                            onChange={(e) => setRenterForm({ ...renterForm, rentAmount: e.target.value })}
                                            placeholder="5000"
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>AMOUNT PAID (₹)</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>₹</div>
                                        <input
                                            className="pp-form-input"
                                            type="number"
                                            style={{ paddingLeft: '28px' }}
                                            value={renterForm.paidAmount}
                                            onChange={(e) => setRenterForm({ ...renterForm, paidAmount: e.target.value })}
                                            placeholder="2000"
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>ENTRY DATE</label>
                                    <input
                                        className="pp-form-input"
                                        type="date"
                                        value={renterForm.entryDate}
                                        onChange={(e) => setRenterForm({ ...renterForm, entryDate: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>EXIT DATE (OPTIONAL)</label>
                                    <input
                                        className="pp-form-input"
                                        type="date"
                                        value={renterForm.exitDate}
                                        onChange={(e) => setRenterForm({ ...renterForm, exitDate: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>PAYMENT METHOD</label>
                                    <select
                                        className="pp-form-input"
                                        value={renterForm.paymentType}
                                        onChange={(e) => setRenterForm({ ...renterForm, paymentType: e.target.value })}
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="Online">Online / UPI</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="pp-modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="pp-secondary-btn" onClick={() => setIsRenterFormOpen(false)}>Cancel</button>
                            <button className="pp-primary-btn" onClick={handleSaveRenter}>
                                {editingRenter ? 'Update Details' : 'Save Resident'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// Helper component for Map Marker
function LocationMarker({ position, onPositionChange }) {
    useMapEvents({
        click(e) {
            onPositionChange(e.latlng);
        },
    });

    return (
        <Marker
            position={position}
            draggable={true}
            eventHandlers={{
                dragend: (e) => {
                    onPositionChange(e.target.getLatLng());
                },
            }}
        />
    );
}

// Helper to recenter map when search result is picked
function RecenterMap({ center }) {
    const map = useMap();
    React.useEffect(() => {
        if (center) {
            map.flyTo(center, 15, { duration: 1.5 });
        }
    }, [center, map]);
    return null;
}
