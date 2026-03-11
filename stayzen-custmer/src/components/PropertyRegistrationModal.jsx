import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { IoCloseOutline, IoCheckmarkCircleOutline, IoLocationOutline, IoLocateOutline, IoCheckmarkCircle, IoInformationCircleOutline, IoRocketOutline, IoTimeOutline, IoArrowUpOutline } from 'react-icons/io5';
import { auth } from '../firebase';
import './properties.css';

// Fix for Leaflet default icon issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, onPositionChange }) {
    useMapEvents({
        click(e) {
            onPositionChange(e.latlng);
        },
    });
    return position === null ? null : <Marker position={position} />;
}

function RecenterMap({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, 13);
    }, [center, map]);
    return null;
}

const PropertyRegistrationModal = ({ isOpen, onClose, onComplete, userId }) => {
    const [registrationStep, setRegistrationStep] = useState(1);
    const [propertyType, setPropertyType] = useState('Apartment');
    const [errorFields, setErrorFields] = useState([]);

    const [apartmentDetails, setApartmentDetails] = useState({
        managerName: '',
        apartmentName: '',
        contactNumber: '',
        email: '',
        totalFlats: '',
        liftAvailable: 'Yes',
        parkingAvailable: 'Yes',
        state: '',
        city: '',
        colonyArea: '',
        pincode: '',
        googleMapsLink: ''
    });

    const [pgDetails, setPgDetails] = useState({
        managerName: '',
        pgName: '',
        contactNumber: '',
        email: '',
        totalRooms: '',
        pgType: 'Boys PG',
        isProvidingAC: 'No',
        state: '',
        city: '',
        colonyArea: '',
        pincode: '',
        googleMapsLink: ''
    });

    const [roomDetails, setRoomDetails] = useState({
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

    const [markerPosition, setMarkerPosition] = useState([17.3850, 78.4867]);
    const [mapCenter, setMapCenter] = useState([17.3850, 78.4867]);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const searchResultRef = useRef(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (propertyType === 'Apartment') {
            setApartmentDetails(prev => ({ ...prev, [name]: value }));
        } else if (propertyType === 'PGs') {
            setPgDetails(prev => ({ ...prev, [name]: value }));
        } else {
            setRoomDetails(prev => ({ ...prev, [name]: value }));
        }

        if (errorFields.includes(name)) {
            setErrorFields(prev => prev.filter(f => f !== name));
        }
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
                    pincode: pincode
                };
                if (propertyType === 'Apartment') {
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

    const handleSelectLocation = (item) => {
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

        if (propertyType === 'Apartment') {
            setApartmentDetails(prev => ({ ...prev, ...updates }));
        } else if (propertyType === 'PGs') {
            setPgDetails(prev => ({ ...prev, ...updates }));
        } else {
            setRoomDetails(prev => ({ ...prev, ...updates }));
        }

        const newPos = [parseFloat(lat), parseFloat(lon)];
        setMarkerPosition(newPos);
        setMapCenter(newPos);
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

    const handleStepContinue = () => {
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
    };

    const handleSubmit = async () => {
        const isApt = propertyType === 'Apartment';
        const isRoom = propertyType === 'Room';
        const details = isApt ? apartmentDetails : (isRoom ? roomDetails : pgDetails);

        const finalData = {
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
            status: 'Processing', // Requires Admin Approval
            pincode: details.pincode,
            googleMapsLink: details.googleMapsLink,
            features: isApt ? {
                lift: details.liftAvailable,
                parking: details.parkingAvailable
            } : (isRoom ? {} : {
                pgType: details.pgType,
                ac: details.isProvidingAC
            })
        };

        if (onComplete) {
            onComplete(finalData);
            setRegistrationStep(4);
        }
    };

    if (!isOpen) return null;

    return (
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
                        <button className="pp-close-btn pp-close-btn-light" onClick={onClose}>
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
                                    {registrationStep > step ? <IoCheckmarkCircle size={20} /> : step}
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
                    {registrationStep === 1 && (
                        <div style={{ animation: 'ppFadeIn 0.4s ease' }}>
                            <div className="pp-modal-section-title">
                                <IoInformationCircleOutline size={16} />
                                Property Type & Basic Details
                            </div>
                            <div className="pp-form-group">
                                <label>What type of property is this?</label>
                                <div style={{ display: 'flex', background: '#f3f4f6', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                                    {['Apartment', 'PGs', 'Room'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setPropertyType(type)}
                                            style={{
                                                flex: 1, padding: '10px', border: 'none', borderRadius: '10px',
                                                background: propertyType === type ? 'white' : 'transparent',
                                                color: propertyType === type ? '#1aa79c' : '#6b7280',
                                                fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            {type === 'PGs' ? 'PG / Hostel' : (type === 'Room' ? 'Rooms' : type)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pp-form-grid">
                                <div className="pp-form-group">
                                    <label>MANAGER NAME <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input
                                        type="text"
                                        name="managerName"
                                        value={propertyType === 'Apartment' ? apartmentDetails.managerName : (propertyType === 'PGs' ? pgDetails.managerName : roomDetails.managerName)}
                                        onChange={handleInputChange}
                                        className={`pp-form-input ${errorFields.includes('managerName') ? 'error' : ''}`}
                                        placeholder="e.g. Anand"
                                    />
                                </div>
                                <div className="pp-form-group">
                                    <label>{propertyType === 'Apartment' ? 'APARTMENT NAME' : (propertyType === 'PGs' ? 'PG NAME' : 'ROOM NAME')} <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input
                                        type="text"
                                        name={propertyType === 'Apartment' ? "apartmentName" : (propertyType === 'PGs' ? "pgName" : "roomName")}
                                        value={propertyType === 'Apartment' ? apartmentDetails.apartmentName : (propertyType === 'PGs' ? pgDetails.pgName : roomDetails.roomName)}
                                        onChange={handleInputChange}
                                        className={`pp-form-input ${errorFields.includes(propertyType === 'Apartment' ? 'apartmentName' : (propertyType === 'PGs' ? 'pgName' : 'roomName')) ? 'error' : ''}`}
                                        placeholder="e.g. Green Meadows"
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
                                        onChange={handleInputChange}
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
                                        onChange={handleInputChange}
                                        className={`pp-form-input ${errorFields.includes('email') ? 'error' : ''}`}
                                        placeholder="e.g. manager@stayzen.com"
                                    />
                                </div>
                            </div>

                            <div className="pp-form-grid">
                                <div className="pp-form-group">
                                    <label>TOTAL ROOMS/UNITS <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input
                                        type="number"
                                        name={propertyType === 'Apartment' ? "totalFlats" : "totalRooms"}
                                        value={propertyType === 'Apartment' ? apartmentDetails.totalFlats : (propertyType === 'PGs' ? pgDetails.totalRooms : roomDetails.totalRooms)}
                                        onChange={handleInputChange}
                                        className={`pp-form-input ${errorFields.includes(propertyType === 'Apartment' ? 'totalFlats' : 'totalRooms') ? 'error' : ''}`}
                                        placeholder="e.g. 10"
                                        style={{ width: '50%' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {registrationStep === 2 && (
                        <div style={{ animation: 'ppFadeIn 0.4s ease' }}>
                            <div className="pp-modal-section-title">
                                <IoLocateOutline size={16} />
                                Set Property Location
                            </div>
                            <div className="pp-form-grid">
                                <div className="pp-form-group">
                                    <label>PIN CODE <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input
                                        type="text"
                                        name="pincode"
                                        maxLength="6"
                                        value={propertyType === 'Apartment' ? apartmentDetails.pincode : (propertyType === 'PGs' ? pgDetails.pincode : roomDetails.pincode)}
                                        onChange={(e) => {
                                            handleInputChange(e);
                                            if (e.target.value.length === 6) {
                                                handlePincodeLookup(e.target.value);
                                            }
                                        }}
                                        className={`pp-form-input ${errorFields.includes('pincode') ? 'error' : ''}`}
                                        placeholder="Enter PIN code"
                                    />
                                </div>
                                <div className="pp-form-group">
                                    <label>STATE & CITY <span style={{ color: '#ef4444' }}>*</span></label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <input
                                            type="text" name="state"
                                            value={propertyType === 'Apartment' ? apartmentDetails.state : (propertyType === 'PGs' ? pgDetails.state : roomDetails.state)}
                                            onChange={handleInputChange}
                                            className={`pp-form-input ${errorFields.includes('state') ? 'error' : ''}`}
                                            placeholder="State"
                                        />
                                        <input
                                            type="text" name="city"
                                            value={propertyType === 'Apartment' ? apartmentDetails.city : (propertyType === 'PGs' ? pgDetails.city : roomDetails.city)}
                                            onChange={handleInputChange}
                                            className={`pp-form-input ${errorFields.includes('city') ? 'error' : ''}`}
                                            placeholder="City"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="pp-form-group" style={{ marginBottom: '20px' }}>
                                <label>GOOGLE MAPS URL / SEARCH <span style={{ color: '#ef4444' }}>*</span></label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text" name="googleMapsLink"
                                        value={propertyType === 'Apartment' ? apartmentDetails.googleMapsLink : (propertyType === 'PGs' ? pgDetails.googleMapsLink : roomDetails.googleMapsLink)}
                                        onChange={handleInputChange}
                                        className="pp-form-input" placeholder="Paste maps link..."
                                        style={{ flex: 1 }}
                                    />
                                    <button type="button" onClick={handleCurrentLocation} className="pp-btn-outline" style={{ width: 'auto' }}>
                                        <IoLocateOutline size={18} />
                                    </button>
                                </div>
                            </div>
                            <div style={{ height: '200px', borderRadius: '14px', overflow: 'hidden', background: '#f1f5f9' }}>
                                <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <LocationMarker position={markerPosition} onPositionChange={(pos) => {
                                        setMarkerPosition([pos.lat, pos.lng]);
                                        const link = `https://www.google.com/maps?q=${pos.lat},${pos.lng}`;
                                        handleInputChange({ target: { name: 'googleMapsLink', value: link } });
                                    }} />
                                    <RecenterMap center={mapCenter} />
                                </MapContainer>
                            </div>
                        </div>
                    )}

                    {registrationStep === 3 && (
                        <div style={{ animation: 'ppFadeIn 0.4s ease', textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ width: '80px', height: '80px', background: 'rgba(26,167,156,0.1)', color: '#1aa79c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <IoCheckmarkCircle size={48} />
                            </div>
                            <h4 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 12px 0' }}>All Set!</h4>
                            <p style={{ color: '#64748b', fontSize: '15px' }}>
                                Your property details have been captured. Please confirm to submit your registration for approval.
                            </p>
                        </div>
                    )}

                    {registrationStep === 4 && (
                        <div style={{ animation: 'ppFadeIn 0.4s ease', textAlign: 'center', padding: '40px 0' }}>
                            <div style={{ width: '100px', height: '100px', background: '#ecfdf5', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <IoRocketOutline size={50} />
                            </div>
                            <h4 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 12px 0' }}>Registration Sent!</h4>
                            <p style={{ color: '#64748b', fontSize: '16px' }}>
                                Your registration is being reviewed by our admin.
                            </p>
                        </div>
                    )}
                </div>

                <div className="pp-modal-footer" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                    {errorFields.length > 0 && (
                        <div style={{ color: '#ef4444', fontSize: '13px', marginRight: 'auto', fontWeight: '600' }}>
                            Please fill all remaining required fields.
                        </div>
                    )}
                    {registrationStep < 4 && (
                        <button className="pp-secondary-btn" onClick={() => registrationStep === 1 ? onClose() : setRegistrationStep(s => s - 1)}>
                            {registrationStep === 1 ? 'Cancel' : 'Back'}
                        </button>
                    )}
                    {registrationStep < 3 ? (
                        <button className="pp-primary-btn" onClick={handleStepContinue}>Continue</button>
                    ) : (
                        registrationStep === 3 && <button className="pp-primary-btn" onClick={handleSubmit}>Submit</button>
                    )}
                    {registrationStep === 4 && <button className="pp-primary-btn" onClick={onClose}>Close</button>}
                </div>
            </div>
        </div>
    );
};

export default PropertyRegistrationModal;
