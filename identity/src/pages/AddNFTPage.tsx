import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { addNFTToWallet, updateNFTInWallet, getUserNFTs, NFT } from '../firebase/wallet';
import { notifyNFTCreated } from '../firebase/notifications';
import { usePosts } from '../hooks/usePosts';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { collection, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// ─── Константи ───────────────────────────────────────────────────────────────
const CATEGORIES  = ['Art', 'Music', 'Photography', 'Gaming', '3D', 'Collectible', 'Sports', 'Meme'];
const CURRENCIES  = ['ETH', 'SOL', 'MATIC', 'ICP'];
const BLOCKCHAINS = [
    { id: 'ethereum', name: 'Ethereum', icon: '🔷', currency: 'ETH',  fee: '~$5-20'  },
    { id: 'solana',   name: 'Solana',   icon: '◎',  currency: 'SOL',  fee: '~$0.01'  },
    { id: 'polygon',  name: 'Polygon',  icon: '🟣', currency: 'MATIC',fee: '~$0.01'  },
    { id: 'icp',      name: 'ICP',      icon: '∞',  currency: 'ICP',  fee: '~$0.001' },
];

type Step = 1 | 2 | 3;
type Mode = 'create' | 'wallet';

interface AddNFTPageProps {
    preselectedNFT?: NFT | null;
}

const AddNFTPage: React.FC<AddNFTPageProps> = ({ preselectedNFT }) => {
    const { currentUser }  = useAuth();
    const { addPost }      = usePosts();
    const fileInputRef     = useRef<HTMLInputElement>(null);

    // ── Режим ────────────────────────────────────────────────────────────────
    const [mode, setMode] = useState<Mode>(preselectedNFT ? 'wallet' : 'create');
    const activeMode      = mode as string; // уникає TypeScript narrowing

    // ── Wallet mode: список NFT ───────────────────────────────────────────────
    const [walletNFTs, setWalletNFTs]       = useState<NFT[]>([]);
    const [walletLoading, setWalletLoading] = useState(false);

    // ── Wallet mode: вибрана NFT + форма редагування ─────────────────────────
    const [selectedWalletNFT, setSelectedWalletNFT] = useState<NFT | null>(preselectedNFT || null);

    // Поля форми — заповнюємо з вибраної NFT або порожні
    const [editTitle, setEditTitle]           = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editTags, setEditTags]             = useState<string[]>([]);
    const [editTagInput, setEditTagInput]     = useState('');
    const [editCategory, setEditCategory]     = useState('Art');
    const [sellPrice, setSellPrice]           = useState('');
    const [sellCurrency, setSellCurrency]     = useState('ETH');
    const [selling, setSelling]               = useState(false);
    const [sellSuccess, setSellSuccess]       = useState(false);

    // ── Create mode ──────────────────────────────────────────────────────────
    const [step, setStep]                     = useState<Step>(1);
    const [loading, setLoading]               = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [dragOver, setDragOver]             = useState(false);
    const [success, setSuccess]               = useState(false);
    const [selectedFile, setSelectedFile]     = useState<File | null>(null);
    const [previewUrl, setPreviewUrl]         = useState('');
    const [title, setTitle]                   = useState('');
    const [description, setDescription]       = useState('');
    const [tags, setTags]                     = useState<string[]>([]);
    const [tagInput, setTagInput]             = useState('');
    const [category, setCategory]             = useState('Art');
    const [forSale, setForSale]               = useState(false);
    const [price, setPrice]                   = useState('');
    const [currency, setCurrency]             = useState('ETH');
    const [blockchain, setBlockchain]         = useState('ethereum');
    const [royalty, setRoyalty]               = useState('10');

    // ── Завантаження NFT з гаманця ───────────────────────────────────────────
    useEffect(() => {
        if (activeMode === 'wallet' && !preselectedNFT && !selectedWalletNFT) {
            setWalletLoading(true);
            getUserNFTs(currentUser!.uid).then(nfts => {
                setWalletNFTs(nfts.filter(n => !n.forSale));
                setWalletLoading(false);
            });
        }
    }, [activeMode, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Коли вибирають NFT — заповнюємо форму ────────────────────────────────
    useEffect(() => {
        if (selectedWalletNFT) {
            setEditTitle(selectedWalletNFT.title || '');
            setEditDescription(selectedWalletNFT.description || '');
            setEditTags((selectedWalletNFT as any).tags || []);
            setEditCategory((selectedWalletNFT as any).category || 'Art');
            setSellCurrency((selectedWalletNFT as any).currency || 'ETH');
        }
    }, [selectedWalletNFT]);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const getNFTImage = (nft: any) => nft.image || nft.nftImage || '/img/default-nft.png';

    const processFile = (file: File) => {
        if (!file.type.startsWith('image/')) { alert('Please upload an image file'); return; }
        if (file.size > 10 * 1024 * 1024)   { alert('File too large. Max 10MB.');    return; }
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const addTag = (input: string, list: string[], setList: (t: string[]) => void, setInput: (s: string) => void) => {
        const t = input.trim().replace(/^#/, '');
        if (t && !list.includes(t) && list.length < 8) { setList([...list, t]); setInput(''); }
    };

    const uploadImageToStorage = async (file: File): Promise<string> => {
        const ext = file.name.split('.').pop() || 'jpg';
        const sRef = ref(storage, `nfts/${currentUser!.uid}/${Date.now()}.${ext}`);
        setUploadProgress('Uploading image...');
        await uploadBytes(sRef, file);
        setUploadProgress('Getting URL...');
        const url = await getDownloadURL(sRef);
        setUploadProgress('');
        return url;
    };

    const canGoNext = () => {
        if (step === 1) return !!selectedFile && !!title.trim() && !!description.trim();
        if (step === 2) return !!blockchain;
        return true;
    };

    // ── SUBMIT: створення нової NFT ──────────────────────────────────────────
    const handleCreateSubmit = async () => {
        if (!currentUser || !selectedFile) return;
        setLoading(true);
        try {
            const imageUrl      = await uploadImageToStorage(selectedFile);
            const selectedChain = BLOCKCHAINS.find(b => b.id === blockchain);
            const nftCurrency   = selectedChain?.currency || currency;
            const nftPrice      = forSale && price ? parseFloat(price) : null;

            const nft: any = {
                id:          `nft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title:       title.trim(),
                description: description.trim(),
                image:       imageUrl,
                tags,
                category,
                blockchain,
                royalty:     parseInt(royalty),
                ownerId:     currentUser.uid,
                ownerName:   currentUser.name || 'Unknown',
                price:       nftPrice,
                forSale,
                createdAt:   new Date().toISOString(),
                currency:    nftCurrency,
            };

            await addNFTToWallet(currentUser.uid, nft);
            await addPost({
                image: imageUrl, title: title.trim(), description: description.trim(),
                tags, category, blockchain, royalty: parseInt(royalty),
                price: nftPrice, forSale, currency: nftCurrency,
            });
            await notifyNFTCreated(currentUser.uid, title.trim());
            setSuccess(true);
        } catch (error: any) {
            if (error.code === 'storage/unauthorized') {
                alert('❌ Firebase Storage permission denied. Check Storage Rules.');
            } else {
                alert(`❌ Error: ${error.message}`);
            }
        } finally {
            setLoading(false);
            setUploadProgress('');
        }
    };

    // ── SUBMIT: перепродаж NFT з гаманця ─────────────────────────────────────
    const handleSellFromWallet = async () => {
        if (!currentUser || !selectedWalletNFT || !sellPrice || !editTitle.trim()) return;
        const numPrice = parseFloat(sellPrice);
        if (isNaN(numPrice) || numPrice <= 0) { alert('Enter valid price'); return; }

        setSelling(true);
        try {
            // 1. Оновлюємо NFT у гаманці з новими даними (назва, опис, теги)
            const updatedNFT: NFT = {
                ...selectedWalletNFT,
                title:       editTitle.trim(),
                description: editDescription.trim(),
                price:       numPrice,
                forSale:     true,
                currency:    sellCurrency,
            };
            // Зберігаємо теги і категорію
            (updatedNFT as any).tags     = editTags;
            (updatedNFT as any).category = editCategory;

            await updateNFTInWallet(currentUser.uid, updatedNFT);

            // 2. Видаляємо старий пост якщо був
            const oldQ = query(
                collection(db, 'posts'),
                where('walletNftId', '==', selectedWalletNFT.id),
                where('userId', '==', currentUser.uid)
            );
            const oldSnap = await getDocs(oldQ);
            for (const d of oldSnap.docs) await deleteDoc(d.ref);

            // 3. Публікуємо новий пост з оновленими даними
            await addDoc(collection(db, 'posts'), {
                userId:      currentUser.uid,
                userName:    currentUser.name,
                userAvatar:  currentUser.avatar || '/img/default-avatar.png',
                nftImage:    getNFTImage(selectedWalletNFT),
                title:       editTitle.trim(),
                description: editDescription.trim(),
                tags:        editTags,
                category:    editCategory,
                price:       numPrice,
                currency:    sellCurrency,
                forSale:     true,
                ownerId:     currentUser.uid,
                ownerName:   currentUser.name,
                walletNftId: selectedWalletNFT.id,
                likes:       0,
                likedBy:     [],
                comments:    [],
                createdAt:   new Date().toISOString(),
            });

            setSellSuccess(true);
        } catch (err: any) {
            alert(`❌ Error: ${err.message}`);
        } finally {
            setSelling(false);
        }
    };

    const handleReset = () => {
        setStep(1); setSelectedFile(null); setPreviewUrl(''); setTitle('');
        setDescription(''); setTags([]); setTagInput(''); setCategory('Art');
        setForSale(false); setPrice(''); setCurrency('ETH');
        setBlockchain('ethereum'); setRoyalty('10'); setSuccess(false);
    };

    // ── Перемикач режиму (таби) ──────────────────────────────────────────────
    const ModeTabs = () => (
        <div style={s.modeTabs}>
            <button
                style={{ ...s.modeTab, background: activeMode === 'create' ? '#01ff77' : '#f0f0f0', color: activeMode === 'create' ? 'black' : '#666' }}
                onClick={() => { setMode('create'); setSelectedWalletNFT(null); }}
            >🎨 Create New</button>
            <button
                style={{ ...s.modeTab, background: activeMode === 'wallet' ? '#01ff77' : '#f0f0f0', color: activeMode === 'wallet' ? 'black' : '#666' }}
                onClick={() => setMode('wallet')}
            >💼 Sell from Wallet</button>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════════════
    // РЕЖИМ: ПРОДАЖ З ГАМАНЦЯ
    // ══════════════════════════════════════════════════════════════════════════
    if (activeMode === 'wallet') {

        // Успіх
        if (sellSuccess) {
            return (
                <div className="page active" style={s.page}>
                    <div style={s.successBox}>
                        <div style={s.successCircle}>💰</div>
                        <h2 style={s.successTitle}>NFT Listed!</h2>
                        <p style={s.successText}>
                            <strong>"{editTitle}"</strong> listed for{' '}
                            <strong>{sellPrice} {sellCurrency}</strong>
                        </p>
                        {selectedWalletNFT && (
                            <img src={getNFTImage(selectedWalletNFT)} alt={editTitle}
                                 style={s.successPreview}
                                 onError={e => { e.currentTarget.src = '/img/default-nft.png'; }} />
                        )}
                        <button style={s.primaryBtn} onClick={() => {
                            setSellSuccess(false); setSelectedWalletNFT(null);
                            setSellPrice(''); setMode('create');
                        }}>+ Create New NFT</button>
                        <button style={{ ...s.primaryBtn, background: '#f0f0f0', marginTop: '10px', color: '#333' }}
                                onClick={() => {
                                    setSellSuccess(false); setSelectedWalletNFT(null);
                                    setSellPrice(''); setEditTitle(''); setEditDescription(''); setEditTags([]);
                                    setWalletLoading(true);
                                    getUserNFTs(currentUser!.uid).then(nfts => {
                                        setWalletNFTs(nfts.filter(n => !n.forSale));
                                        setWalletLoading(false);
                                    });
                                }}>Sell Another NFT</button>
                    </div>
                </div>
            );
        }

        return (
            <div className="page active" style={s.page}>
                <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
                <ModeTabs />

                {/* ── КРОК 1: вибір NFT з сітки ── */}
                {!selectedWalletNFT ? (
                    <div style={{ ...s.stepContent, marginTop: '16px' }}>
                        <h2 style={s.stepTitle}>Sell from Wallet</h2>
                        <p style={s.stepSub}>Choose an NFT from your collection</p>

                        {walletLoading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <div style={s.miniSpinner} />
                                <p style={{ color: '#888', marginTop: '12px' }}>Loading your NFTs...</p>
                            </div>
                        ) : walletNFTs.length === 0 ? (
                            <div style={s.emptyWallet}>
                                <div style={{ fontSize: '44px', marginBottom: '12px' }}>🖼</div>
                                <strong>No NFTs available to sell</strong>
                                <p style={{ fontSize: '13px', color: '#888', marginTop: '6px' }}>
                                    All your NFTs are already listed, or you don't have any yet.
                                </p>
                                <button style={s.primaryBtn} onClick={() => setMode('create')}>
                                    Create New NFT
                                </button>
                            </div>
                        ) : (
                            <div style={s.nftPickGrid}>
                                {walletNFTs.map(nft => (
                                    <div key={nft.id} style={s.nftPickCard}
                                         onClick={() => setSelectedWalletNFT(nft)}>
                                        <img src={getNFTImage(nft)} alt={nft.title}
                                             style={s.nftPickImg}
                                             onError={e => { e.currentTarget.src = '/img/default-nft.png'; }} />
                                        <div style={s.nftPickOverlay}>
                                            <div style={s.nftPickTitle}>{nft.title}</div>
                                            <div style={{ fontSize: '11px', color: '#01ff77' }}>Tap to select →</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── КРОК 2: повна форма редагування ── */
                    <div style={{ ...s.stepContent, marginTop: '16px' }}>
                        <h2 style={s.stepTitle}>Edit & List for Sale</h2>
                        <p style={s.stepSub}>Edit details before listing</p>

                        {/* Прев'ю + кнопка зміни */}
                        <div style={s.sellPreviewRow}>
                            <img src={getNFTImage(selectedWalletNFT)} alt={selectedWalletNFT.title}
                                 style={s.sellPreviewImg}
                                 onError={e => { e.currentTarget.src = '/img/default-nft.png'; }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Selected NFT</div>
                                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{selectedWalletNFT.title}</div>
                            </div>
                            <button style={s.changeBtn} onClick={() => setSelectedWalletNFT(null)}>✕ Change</button>
                        </div>

                        {/* Назва */}
                        <div style={s.field}>
                            <label style={s.fieldLabel}>Title</label>
                            <input style={s.input} placeholder="NFT title"
                                   value={editTitle} maxLength={60}
                                   onChange={e => setEditTitle(e.target.value)} />
                            <span style={s.charCount}>{editTitle.length}/60</span>
                        </div>

                        {/* Опис */}
                        <div style={s.field}>
                            <label style={s.fieldLabel}>Description</label>
                            <textarea
                                style={{ ...s.input, height: '80px', resize: 'none' } as any}
                                placeholder="Describe your NFT..."
                                value={editDescription} maxLength={300}
                                onChange={e => setEditDescription(e.target.value)} />
                            <span style={s.charCount}>{editDescription.length}/300</span>
                        </div>

                        {/* Категорія */}
                        <div style={s.field}>
                            <label style={s.fieldLabel}>Category</label>
                            <div style={s.chipRow}>
                                {CATEGORIES.map(cat => (
                                    <button key={cat} style={{
                                        ...s.chip,
                                        background: editCategory === cat ? '#01ff77' : '#f0f0f0',
                                        color:      editCategory === cat ? 'black'   : '#555',
                                        fontWeight: editCategory === cat ? 'bold'    : 'normal',
                                    }} onClick={() => setEditCategory(cat)}>{cat}</button>
                                ))}
                            </div>
                        </div>

                        {/* Теги */}
                        <div style={s.field}>
                            <label style={s.fieldLabel}>Tags (up to 8)</label>
                            <div style={s.tagInputRow}>
                                <input style={{ ...s.input, flex: 1, margin: 0 }}
                                       placeholder="#tag" value={editTagInput}
                                       onChange={e => setEditTagInput(e.target.value)}
                                       onKeyDown={e => {
                                           if (e.key === 'Enter' || e.key === ',') {
                                               e.preventDefault();
                                               addTag(editTagInput, editTags, setEditTags, setEditTagInput);
                                           }
                                       }} />
                                <button style={s.addTagBtn}
                                        onClick={() => addTag(editTagInput, editTags, setEditTags, setEditTagInput)}>
                                    Add
                                </button>
                            </div>
                            {editTags.length > 0 && (
                                <div style={s.tagsRow}>
                                    {editTags.map(tag => (
                                        <span key={tag} style={s.tagBadge}>
                                            #{tag}
                                            <button style={s.tagRemove}
                                                    onClick={() => setEditTags(editTags.filter(t => t !== tag))}>✕</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Розділювач */}
                        <div style={{ borderTop: '1px solid #f0f0f0', margin: '4px 0 18px' }} />

                        {/* Валюта */}
                        <div style={s.field}>
                            <label style={s.fieldLabel}>Currency</label>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as any }}>
                                {CURRENCIES.map(c => (
                                    <button key={c} style={{
                                        ...s.chip,
                                        background: sellCurrency === c ? '#01ff77' : '#f0f0f0',
                                        color:      sellCurrency === c ? 'black'   : '#555',
                                        fontWeight: sellCurrency === c ? 'bold'    : 'normal',
                                    }} onClick={() => setSellCurrency(c)}>{c}</button>
                                ))}
                            </div>
                        </div>

                        {/* Ціна */}
                        <div style={s.field}>
                            <label style={s.fieldLabel}>Listing Price ({sellCurrency})</label>
                            <input type="number" min="0" step="0.001"
                                   placeholder="e.g. 0.5"
                                   value={sellPrice}
                                   onChange={e => setSellPrice(e.target.value)}
                                   style={s.input} />
                            {sellPrice && !isNaN(parseFloat(sellPrice)) && parseFloat(sellPrice) > 0 && (
                                <div style={s.priceNote}>
                                    You receive <strong style={{ color: '#01ff77' }}>{parseFloat(sellPrice)} {sellCurrency}</strong> — buyer pays +1% platform fee
                                </div>
                            )}
                        </div>

                        {/* Кнопки */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                            <button style={s.backBtn}
                                    onClick={() => setSelectedWalletNFT(null)} disabled={selling}>
                                ← Back
                            </button>
                            <button
                                style={{ ...s.nextBtn, flex: 1, opacity: (!sellPrice || !editTitle.trim() || selling) ? 0.5 : 1 }}
                                onClick={handleSellFromWallet}
                                disabled={!sellPrice || !editTitle.trim() || selling}
                            >
                                {selling
                                    ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><span style={s.btnSpinner} /> Listing...</span>
                                    : `💰 List for ${sellPrice || '?'} ${sellCurrency}`
                                }
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // РЕЖИМ: СТВОРЕННЯ НОВОЇ NFT
    // ══════════════════════════════════════════════════════════════════════════
    if (success) {
        return (
            <div className="page active" style={s.page}>
                <div style={s.successBox}>
                    <div style={s.successCircle}>🎨</div>
                    <h2 style={s.successTitle}>NFT Created!</h2>
                    <p style={s.successText}>
                        <strong>"{title}"</strong> added to your Marki Wallet!
                        {forSale && price && ` Listed for ${price} ${currency}.`}
                    </p>
                    {previewUrl && <img src={previewUrl} alt={title} style={s.successPreview} />}
                    <button style={s.primaryBtn} onClick={handleReset}>+ Create Another NFT</button>
                </div>
            </div>
        );
    }

    return (
        <div className="page active" style={s.page}>
            <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>

            <ModeTabs />

            {/* Прогрес */}
            <div style={s.progressWrap}>
                {([1, 2, 3] as Step[]).map(i => (
                    <React.Fragment key={i}>
                        <div style={{ ...s.progressStep, background: step >= i ? '#01ff77' : '#e0e0e0', color: step >= i ? 'black' : '#999' }}>
                            {step > i ? '✓' : i}
                        </div>
                        {i < 3 && <div style={{ ...s.progressLine, background: step > i ? '#01ff77' : '#e0e0e0' }} />}
                    </React.Fragment>
                ))}
            </div>
            <div style={s.stepLabels}>
                <span style={step === 1 ? s.labelActive : s.label}>Upload</span>
                <span style={step === 2 ? s.labelActive : s.label}>Blockchain</span>
                <span style={step === 3 ? s.labelActive : s.label}>Price</span>
            </div>

            {/* ─── КРОК 1 ─── */}
            {step === 1 && (
                <div style={s.stepContent}>
                    <h2 style={s.stepTitle}>Upload your NFT</h2>
                    <div
                        style={{ ...s.dropZone, borderColor: dragOver ? '#01ff77' : previewUrl ? '#01ff77' : '#ddd', background: dragOver ? '#f0fff0' : previewUrl ? '#f9fff9' : 'white' }}
                        onClick={() => !previewUrl && fileInputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                    >
                        {previewUrl ? (
                            <div style={s.previewWrap}>
                                <img src={previewUrl} alt="preview" style={s.previewImg} />
                                <button style={s.removeImgBtn}
                                        onClick={e => { e.stopPropagation(); setPreviewUrl(''); setSelectedFile(null); }}>
                                    ✕ Change
                                </button>
                            </div>
                        ) : (
                            <div style={s.dropContent}>
                                <div style={{ fontSize: '40px', marginBottom: '10px' }}>📁</div>
                                <p style={{ fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>Drag & drop your file here</p>
                                <p style={{ color: '#888', fontSize: '13px', marginBottom: '4px' }}>or click to browse</p>
                                <p style={{ color: '#bbb', fontSize: '11px' }}>JPG, PNG, GIF, WebP · Max 10MB</p>
                            </div>
                        )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                           onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />

                    <div style={s.field}>
                        <label style={s.fieldLabel}>NFT Title *</label>
                        <input style={s.input} placeholder="e.g. Cosmic Dream #1"
                               value={title} maxLength={60} onChange={e => setTitle(e.target.value)} />
                        <span style={s.charCount}>{title.length}/60</span>
                    </div>
                    <div style={s.field}>
                        <label style={s.fieldLabel}>Description *</label>
                        <textarea style={{ ...s.input, height: '90px', resize: 'none' } as any}
                                  placeholder="Describe your NFT..." value={description} maxLength={300}
                                  onChange={e => setDescription(e.target.value)} />
                        <span style={s.charCount}>{description.length}/300</span>
                    </div>
                    <div style={s.field}>
                        <label style={s.fieldLabel}>Category</label>
                        <div style={s.chipRow}>
                            {CATEGORIES.map(cat => (
                                <button key={cat} style={{ ...s.chip, background: category === cat ? '#01ff77' : '#f0f0f0', color: category === cat ? 'black' : '#555', fontWeight: category === cat ? 'bold' : 'normal' }}
                                        onClick={() => setCategory(cat)}>{cat}</button>
                            ))}
                        </div>
                    </div>
                    <div style={s.field}>
                        <label style={s.fieldLabel}>Tags (up to 8)</label>
                        <div style={s.tagInputRow}>
                            <input style={{ ...s.input, flex: 1, margin: 0 }} placeholder="#tag"
                                   value={tagInput} onChange={e => setTagInput(e.target.value)}
                                   onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput, tags, setTags, setTagInput); } }} />
                            <button style={s.addTagBtn} onClick={() => addTag(tagInput, tags, setTags, setTagInput)}>Add</button>
                        </div>
                        {tags.length > 0 && (
                            <div style={s.tagsRow}>
                                {tags.map(tag => (
                                    <span key={tag} style={s.tagBadge}>
                                        #{tag}
                                        <button style={s.tagRemove} onClick={() => setTags(tags.filter(t => t !== tag))}>✕</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── КРОК 2 ─── */}
            {step === 2 && (
                <div style={s.stepContent}>
                    <h2 style={s.stepTitle}>Choose Blockchain</h2>
                    {BLOCKCHAINS.map(chain => (
                        <div key={chain.id} style={{ ...s.chainCard, borderColor: blockchain === chain.id ? '#01ff77' : '#e0e0e0', background: blockchain === chain.id ? '#f0fff4' : 'white' }}
                             onClick={() => { setBlockchain(chain.id); setCurrency(chain.currency); }}>
                            <span style={{ fontSize: '28px', flexShrink: 0 }}>{chain.icon}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', color: '#222', fontSize: '15px' }}>{chain.name}</div>
                                <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>Fee: {chain.fee}</div>
                            </div>
                            <div style={{ ...s.chainRadio, background: blockchain === chain.id ? '#01ff77' : 'white', borderColor: blockchain === chain.id ? '#01ff77' : '#ccc' }}>
                                {blockchain === chain.id && <span style={s.chainRadioDot} />}
                            </div>
                        </div>
                    ))}
                    <div style={s.field}>
                        <label style={s.fieldLabel}>Royalty: <strong style={{ color: '#01ff77' }}>{royalty}%</strong></label>
                        <input type="range" min="0" max="30" step="1" value={royalty}
                               onChange={e => setRoyalty(e.target.value)} style={s.slider} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#bbb' }}>
                            <span>0%</span><span>15%</span><span>30%</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── КРОК 3 ─── */}
            {step === 3 && (
                <div style={s.stepContent}>
                    <h2 style={s.stepTitle}>Review & Price</h2>
                    {previewUrl && (
                        <div style={s.reviewCard}>
                            <img src={previewUrl} alt={title} style={s.reviewImg} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#222', marginBottom: '4px' }}>{title}</div>
                                <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>{description.slice(0, 80)}{description.length > 80 ? '...' : ''}</div>
                                <div style={{ fontSize: '12px', color: '#555' }}>{BLOCKCHAINS.find(b => b.id === blockchain)?.icon} {blockchain} · Royalty {royalty}%</div>
                                {tags.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap' as any, gap: '5px', marginTop: '6px' }}>
                                        {tags.slice(0, 4).map(t => <span key={t} style={s.reviewTag}>#{t}</span>)}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <div style={s.toggleRow}>
                        <div>
                            <div style={{ fontWeight: 'bold', color: '#222' }}>List for Sale</div>
                            <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>Make available to buy</div>
                        </div>
                        <div style={{ ...s.toggle, background: forSale ? '#01ff77' : '#ccc' }} onClick={() => setForSale(!forSale)}>
                            <div style={{ ...s.toggleThumb, left: forSale ? '26px' : '4px' }} />
                        </div>
                    </div>
                    {forSale && (
                        <div style={s.field}>
                            <label style={s.fieldLabel}>Price</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input type="number" style={{ ...s.input, flex: 1, margin: 0 }}
                                       placeholder="0.00" min="0" step="0.001"
                                       value={price} onChange={e => setPrice(e.target.value)} />
                                <select style={s.currencySelect} value={currency} onChange={e => setCurrency(e.target.value)}>
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            {price && !isNaN(parseFloat(price)) && (
                                <div style={s.priceNote}>
                                    Buyer pays: <strong>{(parseFloat(price) * 1.01).toFixed(4)} {currency}</strong> (includes 1% platform fee)
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Навігація */}
            <div style={s.navRow}>
                {step > 1 && (
                    <button style={s.backBtn} onClick={() => setStep((step - 1) as Step)} disabled={loading}>← Back</button>
                )}
                {step < 3 ? (
                    <button style={{ ...s.nextBtn, opacity: canGoNext() ? 1 : 0.5, flex: step === 1 ? 1 : undefined }}
                            onClick={() => setStep((step + 1) as Step)} disabled={!canGoNext()}>
                        Next →
                    </button>
                ) : (
                    <button style={{ ...s.nextBtn, flex: 1, opacity: loading ? 0.7 : 1 }}
                            onClick={handleCreateSubmit} disabled={loading}>
                        {loading
                            ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><span style={s.btnSpinner} />{uploadProgress || 'Creating...'}</span>
                            : <span>🚀 {forSale ? 'Create & List NFT' : 'Save to Wallet'}</span>
                        }
                    </button>
                )}
            </div>
        </div>
    );
};

// ─── Стилі ───────────────────────────────────────────────────────────────────
const s: any = {
    page:          { background: '#f5f5f5', minHeight: '100vh', paddingBottom: '100px' },
    modeTabs:      { display: 'flex', margin: '16px 15px 0', background: '#f0f0f0', borderRadius: '25px', padding: '4px' },
    modeTab:       { flex: 1, padding: '11px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.25s' },
    progressWrap:  { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 30px 8px', gap: 0 },
    progressStep:  { width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', transition: 'all 0.3s', flexShrink: 0 },
    progressLine:  { flex: 1, height: '3px', transition: 'background 0.3s' },
    stepLabels:    { display: 'flex', justifyContent: 'space-between', padding: '0 20px', marginBottom: '16px' },
    label:         { fontSize: '11px', color: '#aaa', flex: 1, textAlign: 'center' },
    labelActive:   { fontSize: '11px', color: '#01ff77', fontWeight: 'bold', flex: 1, textAlign: 'center' },
    stepContent:   { background: 'white', margin: '0 15px', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
    stepTitle:     { fontSize: '20px', fontWeight: 'bold', color: '#222', marginBottom: '4px' },
    stepSub:       { fontSize: '13px', color: '#888', marginBottom: '20px' },
    // Wallet mode
    miniSpinner:   { width: '32px', height: '32px', border: '3px solid #ddd', borderTop: '3px solid #01ff77', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' },
    emptyWallet:   { textAlign: 'center', padding: '30px 10px', color: '#555' },
    nftPickGrid:   { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' },
    nftPickCard:   { position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '1', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    nftPickImg:    { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    nftPickOverlay:{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.75))', padding: '10px', color: 'white' },
    nftPickTitle:  { fontWeight: 'bold', fontSize: '13px', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    sellPreviewRow:{ display: 'flex', gap: '12px', background: '#f8f8f8', borderRadius: '12px', padding: '12px', marginBottom: '18px', alignItems: 'center', position: 'relative' },
    sellPreviewImg:{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 },
    changeBtn:     { background: 'rgba(0,0,0,0.08)', border: 'none', borderRadius: '10px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', color: '#555', flexShrink: 0 },
    priceNote:     { fontSize: '12px', color: '#888', marginTop: '6px', padding: '8px 10px', background: '#f8f8f8', borderRadius: '8px' },
    // Create mode
    dropZone:      { border: '2px dashed', borderRadius: '12px', minHeight: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: '20px', transition: 'all 0.2s', overflow: 'hidden' },
    dropContent:   { textAlign: 'center', padding: '20px' },
    previewWrap:   { position: 'relative', width: '100%' },
    previewImg:    { width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' },
    removeImgBtn:  { position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '20px', padding: '4px 12px', cursor: 'pointer', fontSize: '12px' },
    // Shared form
    field:         { marginBottom: '18px' },
    fieldLabel:    { display: 'block', fontWeight: '600', fontSize: '13px', color: '#444', marginBottom: '6px' },
    input:         { width: '100%', padding: '11px 14px', border: '1px solid #e0e0e0', borderRadius: '10px', fontSize: '15px', background: '#fafafa', outline: 'none', boxSizing: 'border-box' },
    charCount:     { fontSize: '11px', color: '#bbb', float: 'right', marginTop: '3px' },
    chipRow:       { display: 'flex', flexWrap: 'wrap', gap: '8px' },
    chip:          { padding: '6px 14px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' },
    tagInputRow:   { display: 'flex', gap: '8px', marginBottom: '10px' },
    addTagBtn:     { padding: '11px 16px', background: '#01ff77', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' },
    tagsRow:       { display: 'flex', flexWrap: 'wrap', gap: '8px' },
    tagBadge:      { background: '#f0fff4', color: '#00aa44', border: '1px solid #b2f0c8', borderRadius: '20px', padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' },
    tagRemove:     { background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '11px', padding: 0 },
    chainCard:     { display: 'flex', alignItems: 'center', gap: '14px', border: '2px solid', borderRadius: '12px', padding: '14px', marginBottom: '12px', cursor: 'pointer', transition: 'all 0.2s' },
    chainRadio:    { width: '20px', height: '20px', borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 },
    chainRadioDot: { width: '8px', height: '8px', borderRadius: '50%', background: 'black' },
    slider:        { width: '100%', accentColor: '#01ff77', marginBottom: '4px' },
    reviewCard:    { display: 'flex', gap: '14px', background: '#f8f8f8', borderRadius: '12px', padding: '14px', marginBottom: '20px' },
    reviewImg:     { width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover' },
    reviewTag:     { fontSize: '11px', color: '#01bb55', background: '#f0fff4', borderRadius: '10px', padding: '2px 8px' },
    toggleRow:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f8f8', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
    toggle:        { width: '50px', height: '28px', borderRadius: '14px', position: 'relative', cursor: 'pointer', transition: 'background 0.3s', flexShrink: 0 },
    toggleThumb:   { position: 'absolute', width: '20px', height: '20px', background: 'white', borderRadius: '50%', top: '4px', transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' },
    currencySelect:{ padding: '11px 10px', border: '1px solid #e0e0e0', borderRadius: '10px', background: '#fafafa', fontSize: '15px', fontWeight: 'bold', minWidth: '80px' },
    navRow:        { display: 'flex', gap: '12px', padding: '16px 15px', position: 'sticky', bottom: '70px', background: 'linear-gradient(transparent, #f5f5f5 30%)' },
    backBtn:       { padding: '14px 24px', background: 'white', border: '1px solid #ddd', borderRadius: '12px', fontSize: '15px', cursor: 'pointer' },
    nextBtn:       { padding: '14px 30px', background: '#01ff77', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.2s' },
    btnSpinner:    { width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid black', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' },
    successBox:    { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', textAlign: 'center' },
    successCircle: { width: '90px', height: '90px', background: '#01ff77', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '44px', marginBottom: '20px' },
    successTitle:  { fontSize: '26px', fontWeight: 'bold', color: '#222', marginBottom: '10px' },
    successText:   { fontSize: '15px', color: '#555', marginBottom: '20px', lineHeight: '1.5' },
    successPreview:{ width: '180px', height: '180px', borderRadius: '16px', objectFit: 'cover', marginBottom: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' },
    primaryBtn:    { padding: '14px 36px', background: '#01ff77', border: 'none', borderRadius: '25px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
};

export default AddNFTPage;