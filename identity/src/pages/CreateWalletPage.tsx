import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

interface StepProps {
    onNext: () => void;
    onBack?: () => void;
}

const CreateWalletPage: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const { currentUser } = useAuth();
    const [step, setStep] = useState(1);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [recoveryPhrase, setRecoveryPhrase] = useState<string[]>([]);
    const [scrambledWords, setScrambledWords] = useState<string[]>([]);
    const [selectedWords, setSelectedWords] = useState<string[]>([]);
    const [fingerprintEnabled, setFingerprintEnabled] = useState(false);
    const [loading, setLoading] = useState(false);

    // Генерація seed фрази при першому кроці
    useEffect(() => {
        if (step === 2 && recoveryPhrase.length === 0) {
            generateRecoveryPhrase();
        }
    }, [step]);

    const generateRecoveryPhrase = () => {
        const words = [
            'Galaxy', 'Bamboo', 'Velvet', 'Pyramid', 'Harmony', 'Rocket',
            'Symbol', 'Orbit', 'Wisdom', 'Foil', 'Trophy', 'Harbor'
        ];
        setRecoveryPhrase(words);

        // Перемішуємо для підтвердження
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        setScrambledWords(shuffled);
    };

    const handleCreateWallet = async () => {
        if (!currentUser) return;

        setLoading(true);
        try {
            // Зберігаємо гаманець в Firebase
            const walletData = {
                userId: currentUser.uid,
                address: '0x' + Array.from({ length: 40 }, () =>
                    Math.floor(Math.random() * 16).toString(16)
                ).join(''),
                recoveryPhrase: recoveryPhrase.join(' '),
                createdAt: new Date().toISOString(),
                fingerprintEnabled,
                balance: {
                    ICP: 0,
                    POLYGON: 0,
                    SOLANA: 0
                },
                nfts: []
            };

            await setDoc(doc(db, 'wallets', currentUser.uid), walletData);

            // Переходимо до завершення
            setStep(5);
        } catch (error) {
            console.error('Error creating wallet:', error);
            alert('Error creating wallet');
        } finally {
            setLoading(false);
        }
    };

    const handleWordSelect = (word: string) => {
        if (selectedWords.includes(word)) {
            setSelectedWords(selectedWords.filter(w => w !== word));
        } else {
            setSelectedWords([...selectedWords, word]);
        }
    };

    const handleWordFromPhrase = (word: string) => {
        setSelectedWords([...selectedWords, word]);
        setScrambledWords(scrambledWords.filter(w => w !== word));
    };

    const handleRemoveSelected = (word: string) => {
        setSelectedWords(selectedWords.filter(w => w !== word));
        setScrambledWords([...scrambledWords, word]);
    };

    const checkPhraseOrder = () => {
        const isCorrect = selectedWords.length === 12 &&
            selectedWords.every((word, index) => word === recoveryPhrase[index]);

        if (isCorrect) {
            setStep(4);
        } else {
            alert('Incorrect order. Please try again.');
        }
    };

    const Step1Password = ({ onNext }: StepProps) => (
        <div style={styles.container}>
            <h2 style={styles.title}>Create wallet</h2>
            <p style={styles.subtitle}>Secure wallet - remember phrase...</p>

            <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <input
                    type="password"
                    style={styles.input}
                    placeholder="Secure"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>

            <div style={styles.inputGroup}>
                <label style={styles.label}>Confirm</label>
                <input
                    type="password"
                    style={styles.input}
                    placeholder="Secure"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />
            </div>

            <div style={styles.fingerprint}>
                <label style={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={fingerprintEnabled}
                        onChange={(e) => setFingerprintEnabled(e.target.checked)}
                    />
                    <span style={{ marginLeft: '8px' }}>Unlock with fingerprint?</span>
                </label>
            </div>

            <button
                style={styles.button}
                onClick={onNext}
                disabled={!password || password !== confirmPassword}
            >
                Create wallet
            </button>
        </div>
    );

    const Step2RecoveryPhrase = ({ onNext, onBack }: StepProps) => (
        <div style={styles.container}>
            <h2 style={styles.title}>Secure wallet</h2>
            <p style={styles.subtitle}>
                First of all you need to create wallet to start doing NFT!
            </p>
            <p style={styles.warning}>
                You should write your recovery phrase on paper or save it securely offline.
                If something happens to your device.
            </p>

            <div style={styles.phraseBox}>
                {recoveryPhrase.map((word, index) => (
                    <div key={index} style={styles.phraseWord}>
                        <span style={styles.phraseNumber}>{index + 1}.</span>
                        <span style={styles.phraseWordText}>{word}</span>
                    </div>
                ))}
            </div>

            <div style={styles.buttonGroup}>
                <button style={styles.backButton} onClick={onBack}>Back</button>
                <button style={styles.button} onClick={onNext}>Continue</button>
            </div>
        </div>
    );

    const Step3ConfirmPhrase = ({ onNext, onBack }: StepProps) => (
        <div style={styles.container}>
            <h2 style={styles.title}>Confirm recovery phrase</h2>
            <p style={styles.subtitle}>
                To confirm the phrase, you need to arrange the words in the correct order.
            </p>

            {/* Вибрані слова */}
            <div style={styles.selectedBox}>
                {selectedWords.map((word, index) => (
                    <button
                        key={index}
                        style={styles.selectedWord}
                        onClick={() => handleRemoveSelected(word)}
                    >
                        {index + 1}. {word} ✕
                    </button>
                ))}
            </div>

            {/* Доступні слова */}
            <div style={styles.wordsGrid}>
                {scrambledWords.map((word, index) => (
                    <button
                        key={index}
                        style={styles.wordButton}
                        onClick={() => handleWordFromPhrase(word)}
                    >
                        {word}
                    </button>
                ))}
            </div>

            <div style={styles.buttonGroup}>
                <button style={styles.backButton} onClick={onBack}>Back</button>
                <button
                    style={styles.button}
                    onClick={checkPhraseOrder}
                    disabled={selectedWords.length !== 12}
                >
                    Continue
                </button>
            </div>
        </div>
    );

    const Step4Success = ({ onNext }: StepProps) => (
        <div style={styles.container}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.title}>Complete</h2>
            <p style={styles.subtitle}>Wallet created successfully!</p>

            <button style={styles.button} onClick={onNext}>
                Complete
            </button>
        </div>
    );

    return (
        <div style={styles.wrapper}>
            {/* Прогрес бар */}
            <div style={styles.progressBar}>
                {[1, 2, 3, 4].map(i => (
                    <div
                        key={i}
                        style={{
                            ...styles.progressDot,
                            backgroundColor: i <= step ? '#01ff77' : '#ddd'
                        }}
                    />
                ))}
            </div>

            {/* Кроки */}
            {step === 1 && <Step1Password onNext={() => setStep(2)} />}
            {step === 2 && (
                <Step2RecoveryPhrase
                    onNext={() => setStep(3)}
                    onBack={() => setStep(1)}
                />
            )}
            {step === 3 && (
                <Step3ConfirmPhrase
                    onNext={() => setStep(4)}
                    onBack={() => setStep(2)}
                />
            )}
            {step === 4 && (
                <Step4Success onNext={async () => {
                    await handleCreateWallet();
                    onComplete();
                }} />
            )}
        </div>
    );
};

const styles = {
    wrapper: {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fff',
        zIndex: 2000,
        overflowY: 'auto' as const,
        padding: '20px'
    },
    progressBar: {
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
        padding: '20px 0'
    },
    progressDot: {
        width: '40px',
        height: '4px',
        borderRadius: '2px',
        transition: 'background-color 0.3s'
    },
    container: {
        maxWidth: '400px',
        margin: '0 auto',
        padding: '20px'
    },
    title: {
        fontSize: '24px',
        fontWeight: 'bold' as const,
        color: '#333',
        marginBottom: '10px',
        textAlign: 'center' as const
    },
    subtitle: {
        fontSize: '14px',
        color: '#666',
        marginBottom: '30px',
        textAlign: 'center' as const,
        lineHeight: '1.5'
    },
    warning: {
        fontSize: '12px',
        color: '#ff6b6b',
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: '#fff3f3',
        borderRadius: '8px'
    },
    inputGroup: {
        marginBottom: '20px'
    },
    label: {
        display: 'block',
        fontSize: '14px',
        fontWeight: 'bold' as const,
        color: '#333',
        marginBottom: '5px'
    },
    input: {
        width: '100%',
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        fontSize: '16px'
    },
    fingerprint: {
        marginBottom: '30px'
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer' as const
    },
    phraseBox: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '10px',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '12px'
    },
    phraseWord: {
        display: 'flex',
        gap: '5px',
        padding: '8px',
        backgroundColor: 'white',
        borderRadius: '6px'
    },
    phraseNumber: {
        color: '#01ff77',
        fontWeight: 'bold' as const
    },
    phraseWordText: {
        color: '#333'
    },
    selectedBox: {
        minHeight: '60px',
        padding: '15px',
        backgroundColor: '#f0f8ff',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: '10px'
    },
    selectedWord: {
        padding: '8px 12px',
        backgroundColor: '#01ff77',
        border: 'none',
        borderRadius: '20px',
        cursor: 'pointer' as const,
        fontSize: '14px',
        fontWeight: 'bold' as const
    },
    wordsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        marginBottom: '30px'
    },
    wordButton: {
        padding: '10px',
        backgroundColor: '#f0f0f0',
        border: '1px solid #ddd',
        borderRadius: '8px',
        cursor: 'pointer' as const,
        transition: 'background-color 0.3s',
        ':hover': {
            backgroundColor: '#e0e0e0'
        }
    },
    buttonGroup: {
        display: 'flex',
        gap: '10px',
        marginTop: '20px'
    },
    button: {
        flex: 1,
        padding: '15px',
        backgroundColor: '#01ff77',
        border: 'none',
        borderRadius: '25px',
        fontSize: '16px',
        fontWeight: 'bold' as const,
        cursor: 'pointer' as const,
        transition: 'transform 0.3s',
        ':hover': {
            transform: 'translateY(-2px)'
        }
    },
    backButton: {
        flex: 1,
        padding: '15px',
        backgroundColor: 'transparent',
        border: '1px solid #ddd',
        borderRadius: '25px',
        fontSize: '16px',
        fontWeight: 'bold' as const,
        cursor: 'pointer' as const
    },
    successIcon: {
        width: '80px',
        height: '80px',
        margin: '30px auto',
        backgroundColor: '#01ff77',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '40px',
        color: 'white'
    }
};

export default CreateWalletPage;