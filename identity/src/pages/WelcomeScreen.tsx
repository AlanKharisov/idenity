import React from 'react';

interface WelcomeScreenProps {
    onNext: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNext }) => {
    return (
        <div className="screen welcome-screen active">
            <div className="content">
                <h1 className="welcome-title">Welcome</h1>
                <p className="welcome-text">
                    Is not just a platform – it's your safeguard for creative ownership
                </p>

                <div className="features">
                    <div className="feature-item">
                        <span>PROTECT YOUR PROPERTY</span>
                        <i className="fas fa-brain icon-feature"></i>
                    </div>
                    <div className="feature-item">
                        <span>SECURE YOUR IDEAS</span>
                        <i className="fas fa-lock icon-feature"></i>
                    </div>
                    <div className="feature-item">
                        <span>EXPERIENCE YOUR LEGACY</span>
                        <i className="fas fa-magic icon-feature"></i>
                    </div>
                </div>

                <div className="next-btn-container">
                    <button className="next-btn" onClick={onNext}>
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;