import React, { useState, useRef } from 'react';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../context/AuthContext';

interface AddNFTPageProps {
    onSuccess?: () => void;
}

const AddNFTPage: React.FC<AddNFTPageProps> = ({ onSuccess }) => {
    const { currentUser } = useAuth();
    const { addPost } = usePosts();

    const [ownershipType, setOwnershipType] = useState<'own' | 'coauthored'>('own');
    const [nftName, setNftName] = useState('');
    const [nftDescription, setNftDescription] = useState('');
    const [nftTags, setNftTags] = useState('');
    const [nftExternalLink, setNftExternalLink] = useState('');
    const [attributesCount, setAttributesCount] = useState(0);
    const [nftImagePreview, setNftImagePreview] = useState<string | null>(null);
    const [nftImageFile, setNftImageFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNftImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setNftImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const increaseAttributes = () => setAttributesCount(prev => prev + 1);
    const decreaseAttributes = () => {
        if (attributesCount > 0) setAttributesCount(prev => prev - 1);
    };

    const createNFT = async () => {
        if (!currentUser) {
            alert('Please login first');
            return;
        }

        if (!nftName || !nftDescription) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);

        try {
            const tagsArray = nftTags
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

            const result = await addPost({
                title: nftName,
                description: nftDescription,
                tags: tagsArray,
                image: nftImagePreview || '/img/default-nft.png'
            });

            if (result.success) {
                alert(`NFT "${nftName}" created successfully!`);

                setNftName('');
                setNftDescription('');
                setNftTags('');
                setNftExternalLink('');
                setAttributesCount(0);
                setNftImagePreview(null);
                setNftImageFile(null);

                if (onSuccess) {
                    onSuccess();
                }
            } else {
                const errorData = (result as any).error;
                const errorMessage = errorData?.message ||
                    (typeof errorData === 'string' ? errorData :
                        'Unknown error occurred');
                alert(`Error creating NFT: ${errorMessage}`);
                console.error('NFT creation error:', errorData);
            }
        } catch (error) {
            console.error('Error in createNFT:', error);
            alert('An error occurred while creating NFT');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page add-nft-page active">
            <h2 className="add-nft-title">Create NFT</h2>

            <div className="form-section">
                <span className="section-title">Property NFT Type</span>
                <div className="ownership-options">
                    <div
                        className={`ownership-option ${ownershipType === 'own' ? 'selected' : ''}`}
                        onClick={() => setOwnershipType('own')}
                    >
                        <i className="fas fa-user"></i>
                        <div>Own</div>
                    </div>
                    <div
                        className={`ownership-option ${ownershipType === 'coauthored' ? 'selected' : ''}`}
                        onClick={() => setOwnershipType('coauthored')}
                    >
                        <i className="fas fa-users"></i>
                        <div>Co-authored</div>
                    </div>
                </div>
            </div>

            <div className="form-section">
                <span className="section-title">NFT name*</span>
                <input
                    type="text"
                    className="text-input"
                    placeholder="Enter NFT name"
                    value={nftName}
                    onChange={(e) => setNftName(e.target.value)}
                />
            </div>

            <div className="form-section">
                <span className="section-title">NFT image*</span>
                <div className="upload-area" onClick={triggerFileInput}>
                    <div className="upload-icon">
                        <i className="fas fa-image"></i>
                    </div>
                    <div className="upload-text">
                        <strong>Drag and drop or click to upload</strong>
                        <small>
                            You may change this after deploying your contract.<br />
                            Recommended size: 350 x 350.<br />
                            File types: JPG, PNG, SVG, or GIF
                        </small>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={handleImageUpload}
                    />
                </div>
                {nftImagePreview && (
                    <div className="nft-preview">
                        <img src={nftImagePreview} alt="Preview" />
                    </div>
                )}
            </div>

            <div className="form-section">
                <span className="section-title">Description*</span>
                <textarea
                    className="text-input"
                    rows={3}
                    placeholder="Enter description here..."
                    value={nftDescription}
                    onChange={(e) => setNftDescription(e.target.value)}
                />
            </div>

            <div className="form-section">
                <span className="section-title">Tags*</span>
                <input
                    type="text"
                    className="tags-input"
                    placeholder="Enter tags separated by commas (e.g. art, crypto, nft)"
                    value={nftTags}
                    onChange={(e) => setNftTags(e.target.value)}
                />
            </div>

            <div className="form-section">
                <span className="section-title">External link</span>
                <input
                    type="text"
                    className="text-input"
                    placeholder="Enter URL"
                    value={nftExternalLink}
                    onChange={(e) => setNftExternalLink(e.target.value)}
                />
            </div>

            <div className="form-section">
                <span className="section-title">Attributes</span>
                <div style={{ color: '#888', marginBottom: '10px' }}>
                    Number of attributes
                </div>
                <div className="attributes-control">
                    <button className="attribute-btn" onClick={decreaseAttributes}>-</button>
                    <span className="attributes-count">{attributesCount}</span>
                    <button className="attribute-btn" onClick={increaseAttributes}>+</button>
                </div>
            </div>

            <button
                className="create-nft-btn"
                onClick={createNFT}
                disabled={loading}
            >
                {loading ? 'Creating...' : 'Create NFT'}
            </button>
        </div>
    );
};

export default AddNFTPage;