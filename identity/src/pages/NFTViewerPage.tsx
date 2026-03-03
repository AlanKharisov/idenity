import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface NFT {
    id: string;
    title: string;
    description: string;
    image: string;
    ownerId: string;
    ownerName: string;
    price?: number;
    createdAt?: string;
}

interface NFTViewerPageProps {
    nft: NFT;
    onClose: () => void;
}

const NFTViewerPage: React.FC<NFTViewerPageProps> = ({ nft, onClose }) => {
    const [scale, setScale] = useState(1);
    const [showQR, setShowQR] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
        generateQRCode();
    }, [nft]);

    const generateQRCode = async () => {
        try {
            const qrData = JSON.stringify({
                id: nft.id,
                title: nft.title,
                owner: nft.ownerName,
                created: nft.createdAt || new Date().toISOString()
            });

            const url = await QRCode.toDataURL(qrData, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });

            setQrCodeUrl(url);
        } catch (error) {
            console.error('Error generating QR:', error);
        }
    };

    const handleZoomIn = () => {
        setScale(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev - 0.25, 0.5));
    };

    const handleResetZoom = () => {
        setScale(1);
    };

    const handleDownloadQR = () => {
        const link = document.createElement('a');
        link.download = `nft-${nft.id}-qr.png`;
        link.href = qrCodeUrl;
        link.click();
    };

    return (
        <div className="nft-viewer-page" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.95)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            color: 'white'
        }}>
            {/* Header */}
            <div style={{
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#111'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#01ff77',
                        fontSize: '24px',
                        cursor: 'pointer'
                    }}
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
                <h2 style={{ margin: 0, color: '#01ff77' }}>{nft.title}</h2>
                <button
                    onClick={() => setShowQR(!showQR)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#01ff77',
                        fontSize: '24px',
                        cursor: 'pointer'
                    }}
                >
                    <i className="fas fa-qrcode"></i>
                </button>
            </div>

            {/* Main Content */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                overflow: 'auto'
            }}>
                {!showQR ? (
                    <>
                        <div style={{
                            overflow: 'auto',
                            maxWidth: '100%',
                            maxHeight: '70vh',
                            textAlign: 'center',
                            cursor: 'zoom-in'
                        }}>
                            <img
                                src={nft.image}
                                alt={nft.title}
                                style={{
                                    transform: `scale(${scale})`,
                                    transition: 'transform 0.3s ease',
                                    maxWidth: 'none',
                                    transformOrigin: 'center'
                                }}
                            />
                        </div>

                        {/* Zoom Controls */}
                        <div style={{
                            display: 'flex',
                            gap: '20px',
                            marginTop: '20px',
                            backgroundColor: '#222',
                            padding: '10px 20px',
                            borderRadius: '30px'
                        }}>
                            <button onClick={handleZoomOut} style={zoomButtonStyle}>
                                <i className="fas fa-search-minus"></i>
                            </button>
                            <span style={{ color: 'white', minWidth: '60px', textAlign: 'center' }}>
                {Math.round(scale * 100)}%
              </span>
                            <button onClick={handleZoomIn} style={zoomButtonStyle}>
                                <i className="fas fa-search-plus"></i>
                            </button>
                            <button onClick={handleResetZoom} style={zoomButtonStyle}>
                                <i className="fas fa-undo"></i>
                            </button>
                        </div>
                    </>
                ) : (
                    // QR Code View
                    <div style={{
                        textAlign: 'center',
                        backgroundColor: 'white',
                        padding: '30px',
                        borderRadius: '20px'
                    }}>
                        <h3 style={{ color: '#333', marginBottom: '20px' }}>NFT Ownership QR</h3>
                        {qrCodeUrl && (
                            <>
                                <img src={qrCodeUrl} alt="QR Code" style={{ width: '250px', height: '250px' }} />
                                <p style={{ color: '#666', marginTop: '10px', fontSize: '12px' }}>
                                    Scan to verify ownership
                                </p>
                                <button
                                    onClick={handleDownloadQR}
                                    style={{
                                        marginTop: '20px',
                                        padding: '10px 20px',
                                        backgroundColor: '#01ff77',
                                        border: 'none',
                                        borderRadius: '20px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    <i className="fas fa-download"></i> Download QR
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Info Footer */}
            <div style={{
                padding: '20px',
                backgroundColor: '#111',
                display: 'flex',
                justifyContent: 'space-around'
            }}>
                <div>
                    <div style={{ color: '#888', fontSize: '12px' }}>Owner</div>
                    <div style={{ color: '#01ff77', fontWeight: 'bold' }}>{nft.ownerName}</div>
                </div>
                <div>
                    <div style={{ color: '#888', fontSize: '12px' }}>Created</div>
                    <div style={{ color: 'white' }}>
                        {nft.createdAt ? new Date(nft.createdAt).toLocaleDateString() : 'Today'}
                    </div>
                </div>
                {nft.price && (
                    <div>
                        <div style={{ color: '#888', fontSize: '12px' }}>Price</div>
                        <div style={{ color: '#01ff77', fontWeight: 'bold' }}>{nft.price} ETH</div>
                    </div>
                )}
            </div>
        </div>
    );
};

const zoomButtonStyle = {
    background: 'none',
    border: 'none',
    color: '#01ff77',
    fontSize: '20px',
    cursor: 'pointer',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

export default NFTViewerPage;