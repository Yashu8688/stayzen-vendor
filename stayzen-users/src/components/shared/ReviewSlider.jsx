import React from 'react';
import { Star, Quote } from 'lucide-react';
import './ReviewSlider.css';

const ReviewSlider = () => {
    const reviews = [
        {
            name: "Rahul Sharma",
            role: "Software Engineer",
            text: "Best platform to find PGs in Hyderabad. The verification process is solid and everything was exactly as shown!",
            rating: 5,
            image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul"
        },
        {
            name: "Priya Murthy",
            role: "Marketing Manager",
            text: "Found my dream apartment in just 2 days. The interface is so smooth and the filters are actually helpful.",
            rating: 5,
            image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya"
        },
        {
            name: "Ankit Verma",
            role: "Designer",
            text: "The roommate matching feature saved me so much time. Found a great place and a great person to live with!",
            rating: 5,
            image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ankit"
        },
        {
            name: "Sneha Kapoor",
            role: "Student",
            text: "StayZen makes house hunting actually enjoyable. Love the maps integration and the quick response from owners.",
            rating: 5,
            image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha"
        },
        {
            name: "Vikram Reddy",
            role: "Business Owner",
            text: "Verified properties and honest prices. Finally a platform I can trust in this crowded rental market.",
            rating: 5,
            image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram"
        }
    ];

    // Duplicate list for infinite scroll effect
    const extendedReviews = [...reviews, ...reviews];

    return (
        <section className="review-section">
            <div className="review-header">
                <h2>Loved by thousands of <span>Happy Tenants</span></h2>
                <p>Join our growing community of satisfied residents</p>
            </div>

            <div className="marquee-wrapper">
                <div className="marquee-content highlight-track">
                    {extendedReviews.map((rev, i) => (
                        <div key={i} className="review-card-item glass-card">
                            <div className="rev-quote-icon">
                                <Quote size={20} />
                            </div>
                            <div className="rev-rating">
                                {[...Array(rev.rating)].map((_, j) => (
                                    <Star key={j} size={14} fill="#f59e0b" color="#f59e0b" />
                                ))}
                            </div>
                            <p className="rev-text">"{rev.text}"</p>
                            <div className="rev-user">
                                <img src={rev.image} alt={rev.name} className="rev-avatar" />
                                <div className="rev-info">
                                    <strong>{rev.name}</strong>
                                    <span>{rev.role}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ReviewSlider;
