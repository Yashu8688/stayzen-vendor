import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import {
    Users, Search, Trash2, MapPin, Sparkles, MessageSquare,
    ExternalLink, Image as ImageIcon, ShieldCheck, Globe
} from 'lucide-react';
import { getDocs, where } from 'firebase/firestore';
import './RoommateMatching.css';

const RoommateMatching = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const q = query(collection(db, "roommate_requests"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPosts(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleDelete = async (postId, postData) => {
        if (window.confirm("Are you sure you want to delete this post? This will remove it from all users' views.")) {
            try {
                // Delete from roommate_requests
                await deleteDoc(doc(db, "roommate_requests", postId));

                // Delete from posts collection to clear from Explore page
                const postsRef = collection(db, "posts");
                const q = query(postsRef, where("userId", "==", postData.userId), where("postType", "==", "roommate"), where("createdAt", "==", postData.createdAt));
                const querySnapshot = await getDocs(q);

                for (const postDoc of querySnapshot.docs) {
                    await deleteDoc(doc(db, "posts", postDoc.id));
                }

                alert("Post deleted successfully.");
            } catch (err) {
                console.error("Delete Error:", err);
                alert("Failed to delete post completely.");
            }
        }
    };

    const filteredPosts = posts.filter(post =>
        (post.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.propertyName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="admin-page roommate-admin">
            <header className="page-header">
                <div className="header-info">
                    <h1>Roommate Matching Management</h1>
                    <p>Overview of all user residency network posts.</p>
                </div>
            </header>

            <div className="controls-bar glass-card">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search posts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="stats-pill">
                    <Users size={16} />
                    <span>{posts.length} Active Posts</span>
                </div>
            </div>

            <div className="posts-table-wrapper glass-card">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Property & Location</th>
                            <th>Qualities</th>
                            <th>Sharing & Rent</th>
                            <th>Posted On</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="loading-cell">Loading requests...</td></tr>
                        ) : filteredPosts.length === 0 ? (
                            <tr><td colSpan="6" className="empty-cell">No matching requests found.</td></tr>
                        ) : filteredPosts.map((post) => (
                            <tr key={post.id} className="post-row">
                                <td className="user-cell">
                                    <div className="user-profile">
                                        <div className="avatar-small">
                                            {post.userName?.charAt(0) || 'U'}
                                        </div>
                                        <div className="user-details">
                                            <span className="name">{post.userName}</span>
                                            <span className="email">{post.userEmail}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="prop-info">
                                        <div className="prop-type-tag">
                                            {post.isExternal ? (
                                                <span className="badge external"><Globe size={10} /> External</span>
                                            ) : (
                                                <span className="badge internal"><ShieldCheck size={10} /> StayZen Resident</span>
                                            )}
                                        </div>
                                        <span className="prop-name">@{post.propertyName}</span>
                                        <div className="location-info">
                                            <MapPin size={12} />
                                            <span>{post.location}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="qualities-tag">
                                        <Sparkles size={12} />
                                        <span>{post.qualities}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="media-preview-cell">
                                        {post.propertyImage || (post.propertyImages && post.propertyImages.length > 0) ? (
                                            <div className="mini-gallery">
                                                <img
                                                    src={post.propertyImage || post.propertyImages[0]}
                                                    alt="Prop"
                                                    className="admin-prop-thumb"
                                                />
                                                {post.propertyImages && post.propertyImages.length > 1 && (
                                                    <span className="plus-count">+{post.propertyImages.length - 1}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="no-media">No Media</span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <div className="rent-badge">
                                        <span className="sharing">{post.sharingType}</span>
                                        <span className="price">{post.rent}</span>
                                    </div>
                                </td>
                                <td>
                                    <span className="date-text">
                                        {new Date(post.createdAt).toLocaleDateString()}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="del-btn" onClick={() => handleDelete(post.id, post)} title="Delete Post">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RoommateMatching;
