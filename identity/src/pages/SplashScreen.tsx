import React, { useEffect } from 'react';

interface SplashScreenProps {
    onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
    useEffect(() => {
        // Автоматически переходим на welcome экран через 2 секунды
        const timer = setTimeout(() => {
            onComplete();
        }, 2000);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="screen splash-screen active">
            <div className="content">
                <h1 className="mark-identity">
                    MARK<span>Identity</span>
                </h1>
            </div>
        </div>
    );
};

export default SplashScreen;