import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiCreateNFT, apiUpdateNFT, apiGetNFTs, apiCreatePost, apiDeletePost, apiBatchCreate, apiGetPosts, apiGetMintInfo } from '../services/apiClient';
import { useUmi } from '../hooks/useUmi';
import { generateSigner, percentAmount, lamports, publicKey as umiPublicKey } from '@metaplex-foundation/umi';
import { createNft } from '@metaplex-foundation/mpl-token-metadata';
import { transferSol } from '@metaplex-foundation/mpl-toolbox';

// ─── Platform treasury ────────────────────────────────────────────────────────
// TODO: replace with your real treasury wallet before going to mainnet.
const PLATFORM_TREASURY = umiPublicKey('2wZ2vKzRzY7ZxkRTRgTKVBDBVTqk1NfvGbQFgDxJAr9X');

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES  = ['Art', 'Music', 'Photography', 'Gaming', '3D', 'Collectible', 'Sports', 'Meme'];
const CURRENCIES  = ['SOL', 'UAH', 'USD'];
const BLOCKCHAINS = [
    { id: 'solana', name: 'Solana', icon: '◎', currency: 'SOL', fee: '~$0.01' },
];

type Step = 1 | 2 | 3;
type Mode = 'create' | 'wallet' | 'batch';

interface AddNFTPageProps {
    preselectedNFT?: any | null;
}

const AddNFTPage: React.FC<AddNFTPageProps> = ({ preselectedNFT }) => {
    const { currentUser } = useAuth();
    const { umi, isReady: walletReady } = useUmi();
    const fileInputRef    = useRef<HTMLInputElement>(null);
    const batchInputRef   = useRef<HTMLInputElement>(null);

    // ── Mode ──────────────────────────────────────────────────────────────────
    const [mode, setMode] = useState<Mode>(preselectedNFT ? 'wallet' : 'create');

    // ── Wallet mode ───────────────────────────────────────────────────────────
    const [walletNFTs, setWalletNFTs]               = useState<any[]>([]);
    const [walletLoading, setWalletLoading]         = useState(false);
    const [selectedWalletNFT, setSelectedWalletNFT] = useState<any | null>(preselectedNFT || null);
    const [editTitle, setEditTitle]                 = useState('');
    const [editDescription, setEditDescription]     = useState('');
    const [editTags, setEditTags]                   = useState<string[]>([]);
    const [editTagInput, setEditTagInput]           = useState('');
    const [editCategory, setEditCategory]           = useState('Art');
    const [sellPrice, setSellPrice]                 = useState('');
    const [sellCurrency, setSellCurrency]           = useState('SOL');
    const [selling, setSelling]                     = useState(false);
    const [sellSuccess, setSellSuccess]             = useState(false);

    // ── Create mode ───────────────────────────────────────────────────────────
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
    const [currency, setCurrency]             = useState('SOL');
    const [blockchain, setBlockchain]         = useState('solana');
    const [royalty, setRoyalty]               = useState('10');
    // Collection creation
    const [isCollection, setIsCollection]     = useState(false);
    const [collectionName, setCollectionName] = useState('');
    const [collectionFiles, setCollectionFiles] = useState<File[]>([]);

    // ── Batch mode ────────────────────────────────────────────────────────────
    const [batchFiles, setBatchFiles]         = useState<File[]>([]);
    const [batchBlockchain, setBatchBlockchain] = useState('solana');
    const [batchCurrency, setBatchCurrency]   = useState('SOL');
    const [batchRoyalty, setBatchRoyalty]     = useState('10');
    const [batchForSale, setBatchForSale]     = useState(false);
    const [batchPrice, setBatchPrice]         = useState('');
    const [batchTags, setBatchTags]           = useState<string[]>([]);
    const [batchTagInput, setBatchTagInput]   = useState('');
    const [batchLoading, setBatchLoading]     = useState(false);
    const [batchResult, setBatchResult]       = useState<any | null>(null);

    // ── Load wallet NFTs ──────────────────────────────────────────────────────
    useEffect(() => {
        if (mode === 'wallet' && !preselectedNFT && !selectedWalletNFT) {
            setWalletLoading(true);
            apiGetNFTs()
                .then(nfts => setWalletNFTs((nfts || []).filter((n: any) => !n.forSale)))
                .catch(() => setWalletNFTs([]))
                .finally(() => setWalletLoading(false));
        }
    }, [mode]); // eslint-disable-line

    // ── Fill form from selected NFT ───────────────────────────────────────────
    useEffect(() => {
        if (selectedWalletNFT) {
            setEditTitle(selectedWalletNFT.title || '');
            setEditDescription(selectedWalletNFT.description || '');
            setEditTags(selectedWalletNFT.tags || []);
            setEditCategory(selectedWalletNFT.category || 'Art');
            setSellCurrency(selectedWalletNFT.currency || 'SOL');
        }
    }, [selectedWalletNFT]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const getNFTImage = (nft: any) => nft.image || nft.nftImage || '/img/default-nft.png';

    const processFile = (file: File) => {
        if (!file.type.startsWith('image/')) { alert('Please upload an image file'); return; }
        if (file.size > 10 * 1024 * 1024)   { alert('File too large. Max 10MB.'); return; }
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, []); // eslint-disable-line

    const addTag = (input: string, list: string[], setList: (t: string[]) => void, setInput: (s: string) => void) => {
        const t = input.trim().replace(/^#/, '');
        if (t && !list.includes(t) && list.length < 8) { setList([...list, t]); setInput(''); }
    };

    const canGoNext = () => {
        if (step === 1) {
            const hasFile = isCollection ? collectionFiles.length > 0 : !!selectedFile;
            return hasFile && !!title.trim() && !!description.trim();
        }
        if (step === 2) return !!blockchain;
        return true;
    };

    // ── Create submit ────────────────────────────────────────────────────────
    const handleCreateSubmit = async () => {
        if (!currentUser) return;

        // Pre-mint guard: Phantom must be connected before we can sign a Solana tx.
        if (!walletReady) {
            alert('Please connect your Phantom wallet first to mint on-chain.');
            return;
        }

        setLoading(true);
        try {
            if (isCollection) {
                // ── Collection / batch mode (off-chain only, no Umi mint) ──────────
                if (collectionFiles.length === 0) { alert('Please select images for your collection'); return; }
                setUploadProgress('Uploading collection...');
                const items = collectionFiles.map((f, i) => ({
                    title:       f.name.replace(/\.[^.]+$/, '') || `${collectionName.trim() || 'Collection'} #${i + 1}`,
                    description: description.trim(),
                    ...(forSale && price ? { price: parseFloat(price) } : {}),
                }));
                const form = new FormData();
                collectionFiles.forEach(f => form.append('images[]', f));
                form.append('metadata', JSON.stringify({
                    blockchain, currency,
                    royalty: parseFloat(royalty),
                    forSale, tags, items,
                }));
                const collectionResult = await apiBatchCreate(form);
                if (collectionResult?.failed > 0) {
                    console.warn('[AddNFT] Collection batch failures:', collectionResult);
                }
            } else {
                // ── Single NFT — three-step on-chain mint ─────────────────────────
                if (!selectedFile) { alert('Please select an image'); return; }

                // Step 1 — Upload image + metadata JSON to backend / Firebase Storage.
                // Backend returns the NFT record including the off-chain metadataUri.
                setUploadProgress('Step 1/4 — Uploading image & metadata…');
                const metadata: any = {
                    title:       title.trim(),
                    description: description.trim(),
                    tags,
                    category,
                    blockchain,
                    royalty:     parseFloat(royalty),
                    forSale,
                    currency,
                };
                if (forSale && price) metadata.price = parseFloat(price);
                const form = new FormData();
                form.append('image',    selectedFile);
                form.append('metadata', JSON.stringify(metadata));
                const result = await apiCreateNFT(form);

                const nftId       = result?.id;
                const metadataUri = result?.metadataUri;
                if (!nftId || !metadataUri) {
                    throw new Error('Backend did not return id / metadataUri — check Rust handler.');
                }

                // Step 2 — Mint on Solana Devnet via Umi (freemium model).
                // Check mint count first so the user sees accurate messaging before
                // Phantom opens. Blockhash is fetched right after to maximise TTL.
                setUploadProgress('Step 2/4 — Checking mint fee…');
                const mintInfo = await apiGetMintInfo();

                setUploadProgress(
                    mintInfo.isFree
                        ? 'Step 2/4 — Minting (free tier) — approve in Phantom…'
                        : 'Step 2/4 — Minting (+ platform fee) — approve in Phantom…'
                );

                const mint              = generateSigner(umi);
                const latestBlockhash   = await umi.rpc.getLatestBlockhash();

                // Build the base NFT mint instruction.
                let txBuilder = createNft(umi, {
                    mint,
                    name:                 title.trim(),
                    uri:                  metadataUri,
                    sellerFeeBasisPoints: percentAmount(parseFloat(royalty)),
                });

                // Append platform commission from the 4th mint onward.
                // The listing price is NEVER charged here — it is metadata only.
                if (!mintInfo.isFree && mintInfo.commissionLamports > 0) {
                    txBuilder = txBuilder.add(
                        transferSol(umi, {
                            destination: PLATFORM_TREASURY,
                            amount:      lamports(mintInfo.commissionLamports),
                        })
                    );
                }

                await txBuilder
                    .setBlockhash(latestBlockhash)
                    .sendAndConfirm(umi, {
                        confirm: { strategy: { type: 'blockhash', ...latestBlockhash } },
                    });

                const mintAddress = mint.publicKey; // PublicKey is a base-58 string in Umi v1

                // Step 3 — Persist the on-chain mint address back to Firestore.
                setUploadProgress('Step 3/4 — Recording on-chain identity…');
                await apiUpdateNFT(nftId, { mintAddress });

                // Step 4 — Create a feed post so the NFT appears on the home page.
                setUploadProgress('Step 4/4 — Publishing to feed…');
                await apiCreatePost({
                    nftImage:    result.image,
                    title:       title.trim(),
                    description: description.trim(),
                    tags,
                    forSale,
                    price:       forSale && price ? parseFloat(price) : null,
                    currency,
                    walletNftId: nftId,
                });
            }
            setUploadProgress('');
            setSuccess(true);
        } catch (err: any) {
            console.error('[AddNFT] create error:', err);
            alert(`❌ Error: ${err.message}`);
        } finally {
            setLoading(false);
            setUploadProgress('');
        }
    };

    // ── Sell from wallet submit ───────────────────────────────────────────────
    const handleSellFromWallet = async () => {
        if (!currentUser || !selectedWalletNFT || !sellPrice || !editTitle.trim()) return;
        const numPrice = parseFloat(sellPrice);
        if (isNaN(numPrice) || numPrice <= 0) { alert('Enter valid price'); return; }

        setSelling(true);
        try {
            await apiUpdateNFT(selectedWalletNFT.id, {
                title:       editTitle.trim(),
                description: editDescription.trim(),
                tags:        editTags,
                category:    editCategory,
                price:       numPrice,
                forSale:     true,
                currency:    sellCurrency,
            });

            // Delete old post for this NFT, then create new one
            try {
                const posts = await apiGetPosts();
                const oldPost = posts.find((p: any) => p.walletNftId === selectedWalletNFT.id && p.userId === currentUser.uid);
                if (oldPost?.id) await apiDeletePost(oldPost.id).catch(() => null);
            } catch { /* non-critical */ }

            await apiCreatePost({
                nftImage:    getNFTImage(selectedWalletNFT),
                title:       editTitle.trim(),
                description: editDescription.trim(),
                tags:        editTags,
                forSale:     true,
                price:       numPrice,
                currency:    sellCurrency,
                walletNftId: selectedWalletNFT.id,
            });

            setSellSuccess(true);
        } catch (err: any) {
            alert(`❌ Error: ${err.message}`);
        } finally {
            setSelling(false);
        }
    };

    // ── Batch submit ─────────────────────────────────────────────────────────
    const handleBatchSubmit = async () => {
        if (!currentUser || batchFiles.length === 0) { alert('Please select files'); return; }
        setBatchLoading(true);
        try {
            const items = batchFiles.map((f, i) => ({
                title:       f.name.replace(/\.[^.]+$/, '') || `Batch NFT #${i + 1}`,
                description: `Batch upload item ${i + 1}`,
                price:       batchForSale && batchPrice ? parseFloat(batchPrice) : undefined,
            }));
            const metadata = {
                blockchain: batchBlockchain,
                currency:   batchCurrency,
                royalty:    parseFloat(batchRoyalty),
                forSale:    batchForSale,
                tags:       batchTags,
                items,
            };
            const form = new FormData();
            batchFiles.forEach(f => form.append('images[]', f));
            form.append('metadata', JSON.stringify(metadata));

            const result = await apiBatchCreate(form);
            if (result?.failed > 0) {
                console.warn('[AddNFT] Batch failures:', result);
            }
            setBatchResult(result);
        } catch (err: any) {
            console.error('[AddNFT] batch error:', err);
            alert(`❌ Batch error: ${err.message}`);
        } finally {
            setBatchLoading(false);
        }
    };

    const handleReset = () => {
        setStep(1); setSelectedFile(null); setPreviewUrl(''); setTitle('');
        setDescription(''); setTags([]); setTagInput(''); setCategory('Art');
        setForSale(false); setPrice(''); setCurrency('SOL');
        setBlockchain('solana'); setRoyalty('10'); setSuccess(false);
        setIsCollection(false); setCollectionName(''); setCollectionFiles([]);
    };

    // ── Mode tabs (3 buttons) ─────────────────────────────────────────────────
    const ModeTabs = () => (
        <div style={s.modeTabs}>
            <button
                style={{ ...s.modeTab, background: mode === 'create' ? '#01ff77' : '#f0f0f0', color: mode === 'create' ? 'black' : '#666' }}
                onClick={() => { setMode('create'); setSelectedWalletNFT(null); }}
            >🎨 Create New</button>
            <button
                style={{ ...s.modeTab, background: mode === 'wallet' ? '#01ff77' : '#f0f0f0', color: mode === 'wallet' ? 'black' : '#666' }}
                onClick={() => setMode('wallet')}
            >💼 Sell</button>
            <button
                style={{ ...s.modeTab, background: mode === 'batch' ? '#01ff77' : '#f0f0f0', color: mode === 'batch' ? 'black' : '#666', position: 'relative' }}
                onClick={() => setMode('batch')}
            >
                📦 Batch
                <span style={{ position: 'absolute', top: '-6px', right: '-2px', background: '#ff6b35', color: 'white', fontSize: '9px', padding: '1px 5px', borderRadius: '8px', fontWeight: 'bold' }}>BIZ</span>
            </button>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════════════
    // BATCH UPLOAD MODE
    // ══════════════════════════════════════════════════════════════════════════
    if (mode === 'batch') {
        if (batchResult) {
            return (
                <div className="page active" style={s.page}>
                    <ModeTabs />
                    <div style={s.successBox}>
                        <div style={s.successCircle}>📦</div>
                        <h2 style={s.successTitle}>Batch Upload Complete!</h2>
                        <p style={s.successText}>
                            ✅ Created: <strong>{batchResult.created}</strong> &nbsp;
                            {batchResult.failed > 0 && <>❌ Failed: <strong>{batchResult.failed}</strong></>}
                        </p>
                        {batchResult.failed > 0 && batchResult.results?.filter((r: any) => r.status === 'error').map((r: any) => (
                            <div key={r.index} style={{ background: '#fff5f5', border: '1px solid #ffc0c0', borderRadius: '8px', padding: '8px 12px', marginBottom: '6px', fontSize: '12px', color: '#cc2222', textAlign: 'left', width: '100%' }}>
                                Item #{r.index + 1}: {r.message || 'Unknown error'}
                            </div>
                        ))}
                        <button style={s.primaryBtn} onClick={() => { setBatchResult(null); setBatchFiles([]); }}>
                            Upload Another Batch
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="page active" style={s.page}>
                <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
                <ModeTabs />
                <div style={{ ...s.stepContent, marginTop: '16px' }}>
                    <h2 style={s.stepTitle}>📦 Batch Upload</h2>
                    <p style={s.stepSub}>Upload multiple NFTs at once — designed for company use</p>

                    {/* Company notice */}
                    <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px', fontSize: '13px', color: '#856404' }}>
                        ⚠️ <strong>Note:</strong> Publishing each NFT in the batch will incur a <strong>1% platform fee</strong> on sales.
                    </div>

                    {/* File picker */}
                    <div style={s.field}>
                        <label style={s.fieldLabel}>Select Images *</label>
                        <input
                            ref={batchInputRef}
                            type="file" accept="image/*" multiple style={{ display: 'none' }}
                            onChange={e => {
                                const files = Array.from(e.target.files || []);
                                setBatchFiles(files);
                            }}
                        />
                        <button style={{ width: '100%', padding: '14px', background: '#f0f0f0', border: '2px dashed #01ff77', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', color: '#444' }}
                                onClick={() => batchInputRef.current?.click()}>
                            📁 {batchFiles.length > 0 ? `${batchFiles.length} file(s) selected` : 'Click to select multiple images'}
                        </button>
                        {batchFiles.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                                {batchFiles.slice(0, 8).map((f, i) => (
                                    <div key={i} style={{ background: '#f0fff4', border: '1px solid #b2f0c8', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', color: '#00aa44' }}>
                                        {f.name.slice(0, 15)}{f.name.length > 15 ? '...' : ''}
                                    </div>
                                ))}
                                {batchFiles.length > 8 && <div style={{ fontSize: '11px', color: '#888', padding: '4px' }}>+{batchFiles.length - 8} more</div>}
                            </div>
                        )}
                    </div>

                    {/* Blockchain */}
                    <div style={s.field}>
                        <label style={s.fieldLabel}>Blockchain</label>
                        <div style={s.chipRow}>
                            {BLOCKCHAINS.map(b => (
                                <button key={b.id} style={{ ...s.chip, background: batchBlockchain === b.id ? '#01ff77' : '#f0f0f0', color: batchBlockchain === b.id ? 'black' : '#555', fontWeight: batchBlockchain === b.id ? 'bold' : 'normal' }}
                                        onClick={() => { setBatchBlockchain(b.id); setBatchCurrency(b.currency); }}>
                                    {b.icon} {b.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Currency */}
                    <div style={s.field}>
                        <label style={s.fieldLabel}>Currency</label>
                        <div style={s.chipRow}>
                            {CURRENCIES.map(c => (
                                <button key={c} style={{ ...s.chip, background: batchCurrency === c ? '#01ff77' : '#f0f0f0', color: batchCurrency === c ? 'black' : '#555' }}
                                        onClick={() => setBatchCurrency(c)}>{c}</button>
                            ))}
                        </div>
                    </div>

                    {/* Royalty */}
                    <div style={s.field}>
                        <label style={s.fieldLabel}>Royalty: <strong style={{ color: '#01ff77' }}>{batchRoyalty}%</strong></label>
                        <input type="range" min="0" max="30" step="1" value={batchRoyalty}
                               onChange={e => setBatchRoyalty(e.target.value)} style={s.slider} />
                    </div>

                    {/* Tags */}
                    <div style={s.field}>
                        <label style={s.fieldLabel}>Tags (applied to all)</label>
                        <div style={s.tagInputRow}>
                            <input style={{ ...s.input, flex: 1, margin: 0 }} placeholder="#tag" value={batchTagInput}
                                   onChange={e => setBatchTagInput(e.target.value)}
                                   onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(batchTagInput, batchTags, setBatchTags, setBatchTagInput); }}} />
                            <button style={s.addTagBtn} onClick={() => addTag(batchTagInput, batchTags, setBatchTags, setBatchTagInput)}>Add</button>
                        </div>
                        {batchTags.length > 0 && (
                            <div style={s.tagsRow}>
                                {batchTags.map(tag => (
                                    <span key={tag} style={s.tagBadge}>
                                        #{tag}
                                        <button style={s.tagRemove} onClick={() => setBatchTags(batchTags.filter(t => t !== tag))}>✕</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* For sale toggle */}
                    <div style={s.toggleRow}>
                        <div>
                            <div style={{ fontWeight: 'bold', color: '#222' }}>List all for Sale</div>
                            <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>Set a price for all NFTs in batch</div>
                        </div>
                        <div style={{ ...s.toggle, background: batchForSale ? '#01ff77' : '#ccc' }} onClick={() => setBatchForSale(!batchForSale)}>
                            <div style={{ ...s.toggleThumb, left: batchForSale ? '26px' : '4px' }} />
                        </div>
                    </div>
                    {batchForSale && (
                        <div style={s.field}>
                            <label style={s.fieldLabel}>Price per NFT ({batchCurrency})</label>
                            <input type="number" style={s.input} placeholder="0.00" min="0" step="0.001"
                                   value={batchPrice} onChange={e => setBatchPrice(e.target.value)} />
                        </div>
                    )}

                    <button
                        style={{ ...s.nextBtn, width: '100%', opacity: (batchFiles.length === 0 || batchLoading) ? 0.5 : 1 }}
                        onClick={handleBatchSubmit}
                        disabled={batchFiles.length === 0 || batchLoading}
                    >
                        {batchLoading
                            ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><span style={s.btnSpinner} /> Uploading {batchFiles.length} files...</span>
                            : `🚀 Upload ${batchFiles.length || 0} NFTs`
                        }
                    </button>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // WALLET SELL MODE
    // ══════════════════════════════════════════════════════════════════════════
    if (mode === 'wallet') {
        if (sellSuccess) {
            return (
                <div className="page active" style={s.page}>
                    <div style={s.successBox}>
                        <div style={s.successCircle}>💰</div>
                        <h2 style={s.successTitle}>NFT Listed!</h2>
                        <p style={s.successText}>
                            <strong>"{editTitle}"</strong> listed for <strong>{sellPrice} {sellCurrency}</strong>
                        </p>
                        {selectedWalletNFT && (
                            <img src={getNFTImage(selectedWalletNFT)} alt={editTitle} style={s.successPreview}
                                 onError={e => { e.currentTarget.src = '/img/default-nft.png'; }} />
                        )}
                        <button style={s.primaryBtn} onClick={() => { setSellSuccess(false); setSelectedWalletNFT(null); setSellPrice(''); setMode('create'); }}>+ Create New NFT</button>
                        <button style={{ ...s.primaryBtn, background: '#f0f0f0', marginTop: '10px', color: '#333' }}
                                onClick={() => {
                                    setSellSuccess(false); setSelectedWalletNFT(null);
                                    setSellPrice(''); setEditTitle(''); setEditDescription(''); setEditTags([]);
                                    setWalletLoading(true);
                                    apiGetNFTs().then(nfts => { setWalletNFTs((nfts || []).filter((n: any) => !n.forSale)); setWalletLoading(false); });
                                }}>Sell Another</button>
                    </div>
                </div>
            );
        }

        return (
            <div className="page active" style={s.page}>
                <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
                <ModeTabs />

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
                                <button style={{ ...s.primaryBtn, marginTop: '14px' }} onClick={() => setMode('create')}>Create New NFT</button>
                            </div>
                        ) : (
                            <div style={s.nftPickGrid}>
                                {walletNFTs.map((nft: any) => (
                                    <div key={nft.id} style={s.nftPickCard} onClick={() => setSelectedWalletNFT(nft)}>
                                        <img src={getNFTImage(nft)} alt={nft.title} style={s.nftPickImg}
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
                    <div style={{ ...s.stepContent, marginTop: '16px' }}>
                        <h2 style={s.stepTitle}>Edit & List for Sale</h2>
                        <p style={s.stepSub}>Set price and details before listing</p>

                        {/* Fee notice */}
                        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#856404' }}>
                            💡 Listing is free. A <strong>1% platform fee</strong> is applied when your NFT sells.
                        </div>

                        <div style={s.sellPreviewRow}>
                            <img src={getNFTImage(selectedWalletNFT)} alt={selectedWalletNFT.title} style={s.sellPreviewImg}
                                 onError={e => { e.currentTarget.src = '/img/default-nft.png'; }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '12px', color: '#888' }}>Selected NFT</div>
                                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{selectedWalletNFT.title}</div>
                            </div>
                            <button style={s.changeBtn} onClick={() => setSelectedWalletNFT(null)}>✕ Change</button>
                        </div>

                        {/* Title */}
                        <div style={s.field}>
                            <label style={s.fieldLabel}>Title</label>
                            <input style={s.input} value={editTitle} maxLength={60} onChange={e => setEditTitle(e.target.value)} />
                            <span style={s.charCount}>{editTitle.length}/60</span>
                        </div>

                        {/* Description */}
                        <div style={s.field}>
                            <label style={s.fieldLabel}>Description</label>
                            <textarea style={{ ...s.input, height: '80px', resize: 'none' } as any}
                                      value={editDescription} maxLength={300} onChange={e => setEditDescription(e.target.value)} />
                            <span style={s.charCount}>{editDescription.length}/300</span>
                        </div>

                        {/* Category */}
                        <div style={s.field}>
                            <label style={s.fieldLabel}>Category</label>
                            <div style={s.chipRow}>
                                {CATEGORIES.map(cat => (
                                    <button key={cat} style={{ ...s.chip, background: editCategory === cat ? '#01ff77' : '#f0f0f0', color: editCategory === cat ? 'black' : '#555', fontWeight: editCategory === cat ? 'bold' : 'normal' }}
                                            onClick={() => setEditCategory(cat)}>{cat}</button>
                                ))}
                            </div>
                        </div>

                        {/* Tags */}
                        <div style={s.field}>
                            <label style={s.fieldLabel}>Tags (up to 8)</label>
                            <div style={s.tagInputRow}>
                                <input style={{ ...s.input, flex: 1, margin: 0 }} placeholder="#tag" value={editTagInput}
                                       onChange={e => setEditTagInput(e.target.value)}
                                       onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(editTagInput, editTags, setEditTags, setEditTagInput); }}} />
                                <button style={s.addTagBtn} onClick={() => addTag(editTagInput, editTags, setEditTags, setEditTagInput)}>Add</button>
                            </div>
                            {editTags.length > 0 && (
                                <div style={s.tagsRow}>
                                    {editTags.map(tag => (
                                        <span key={tag} style={s.tagBadge}>#{tag}<button style={s.tagRemove} onClick={() => setEditTags(editTags.filter(t => t !== tag))}>✕</button></span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ borderTop: '1px solid #f0f0f0', margin: '4px 0 18px' }} />

                        {/* Currency */}
                        <div style={s.field}>
                            <label style={s.fieldLabel}>Currency</label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as any }}>
                                {CURRENCIES.map(c => (
                                    <button key={c} style={{ ...s.chip, background: sellCurrency === c ? '#01ff77' : '#f0f0f0', color: sellCurrency === c ? 'black' : '#555', fontWeight: sellCurrency === c ? 'bold' : 'normal' }}
                                            onClick={() => setSellCurrency(c)}>{c}</button>
                                ))}
                            </div>
                        </div>

                        {/* Price */}
                        <div style={s.field}>
                            <label style={s.fieldLabel}>Listing Price ({sellCurrency})</label>
                            <input type="number" min="0" step="0.001" placeholder="e.g. 0.5"
                                   value={sellPrice} onChange={e => setSellPrice(e.target.value)} style={s.input} />
                            {sellPrice && !isNaN(parseFloat(sellPrice)) && parseFloat(sellPrice) > 0 && (
                                <div style={s.priceNote}>
                                    You receive <strong style={{ color: '#01ff77' }}>{parseFloat(sellPrice)} {sellCurrency}</strong> — buyer pays +1% platform fee
                                </div>
                            )}
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                            <button style={s.backBtn} onClick={() => setSelectedWalletNFT(null)} disabled={selling}>← Back</button>
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
    // CREATE NEW MODE
    // ══════════════════════════════════════════════════════════════════════════
    if (success) {
        return (
            <div className="page active" style={s.page}>
                <div style={s.successBox}>
                    <div style={s.successCircle}>🎨</div>
                    <h2 style={s.successTitle}>{isCollection ? 'Collection Created!' : 'NFT Created!'}</h2>
                    <p style={s.successText}>
                        <strong>"{title}"</strong> added to your Marki Wallet!
                        {forSale && price && ` Listed for ${price} ${currency}.`}
                    </p>
                    {previewUrl && <img src={previewUrl} alt={title} style={s.successPreview} />}
                    <button style={s.primaryBtn} onClick={handleReset}>+ Create Another</button>
                </div>
            </div>
        );
    }

    return (
        <div className="page active" style={s.page}>
            <style>{`
                @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
                @media(min-width:600px){
                    .nft-add-page-inner{max-width:560px;margin:0 auto;}
                    .nft-chip-row{flex-wrap:nowrap!important;overflow-x:auto;}
                    .nft-method-tabs{max-width:560px;margin:0 auto 16px;}
                }
                @media(max-width:400px){
                    .nft-step-content{padding:14px!important;}
                    .nft-chip-row button{font-size:11px!important;padding:5px 10px!important;}
                }
            `}</style>

            <ModeTabs />

            {/* Progress */}
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

            {/* Step 1 */}
            {step === 1 && (
                <div style={s.stepContent}>
                    <h2 style={s.stepTitle}>Upload your NFT</h2>

                    {/* Collection toggle */}
                    <div style={{ ...s.toggleRow, marginBottom: '16px' }}>
                        <div>
                            <div style={{ fontWeight: 'bold', color: '#222' }}>Create as Collection</div>
                            <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>Group related NFTs into a collection</div>
                        </div>
                        <div style={{ ...s.toggle, background: isCollection ? '#01ff77' : '#ccc' }} onClick={() => setIsCollection(!isCollection)}>
                            <div style={{ ...s.toggleThumb, left: isCollection ? '26px' : '4px' }} />
                        </div>
                    </div>

                    {isCollection && (
                        <div style={s.field}>
                            <label style={s.fieldLabel}>Collection Name</label>
                            <input style={s.input} placeholder="e.g. Cosmic Dreams Series"
                                   value={collectionName} maxLength={60}
                                   onChange={e => setCollectionName(e.target.value)} />
                            <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '8px 12px', marginTop: '8px', fontSize: '12px', color: '#856404' }}>
                                ⚠️ Publishing this collection will apply a <strong>1% platform fee</strong> on all sales within the collection.
                            </div>
                        </div>
                    )}

                    {isCollection ? (
                        /* ── Collection multi-file picker ── */
                        <div>
                            <div
                                style={{ ...s.dropZone, borderColor: collectionFiles.length > 0 ? '#01ff77' : '#ddd', background: collectionFiles.length > 0 ? '#f9fff9' : 'white', cursor: 'pointer' }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {collectionFiles.length > 0 ? (
                                    <div style={{ width: '100%', padding: '12px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
                                            {collectionFiles.slice(0, 8).map((f, i) => (
                                                <div key={i} style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', background: '#f0f0f0' }}>
                                                    <img src={URL.createObjectURL(f)} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#00aa44', textAlign: 'center' }}>
                                            {collectionFiles.length} image{collectionFiles.length !== 1 ? 's' : ''} selected — click to change
                                        </div>
                                    </div>
                                ) : (
                                    <div style={s.dropContent}>
                                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>🖼</div>
                                        <p style={{ fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>Select multiple images</p>
                                        <p style={{ color: '#888', fontSize: '13px', marginBottom: '4px' }}>Hold Ctrl / ⌘ to select many at once</p>
                                        <p style={{ color: '#bbb', fontSize: '11px' }}>JPG, PNG, GIF, WebP · Max 10MB each</p>
                                    </div>
                                )}
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                                   onChange={e => {
                                       const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024);
                                       if (files.length > 0) setCollectionFiles(files);
                                   }} />
                        </div>
                    ) : (
                        /* ── Single-file picker ── */
                        <div>
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
                                        <button style={s.removeImgBtn} onClick={e => { e.stopPropagation(); setPreviewUrl(''); setSelectedFile(null); }}>✕ Change</button>
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
                        </div>
                    )}

                    <div style={s.field}>
                        <label style={s.fieldLabel}>NFT Title *</label>
                        <input style={s.input} placeholder="e.g. Cosmic Dream #1" value={title} maxLength={60} onChange={e => setTitle(e.target.value)} />
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
                            <input style={{ ...s.input, flex: 1, margin: 0 }} placeholder="#tag" value={tagInput}
                                   onChange={e => setTagInput(e.target.value)}
                                   onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput, tags, setTags, setTagInput); }}} />
                            <button style={s.addTagBtn} onClick={() => addTag(tagInput, tags, setTags, setTagInput)}>Add</button>
                        </div>
                        {tags.length > 0 && (
                            <div style={s.tagsRow}>
                                {tags.map(tag => (
                                    <span key={tag} style={s.tagBadge}>#{tag}<button style={s.tagRemove} onClick={() => setTags(tags.filter(t => t !== tag))}>✕</button></span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Step 2 */}
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
                        <input type="range" min="0" max="30" step="1" value={royalty} onChange={e => setRoyalty(e.target.value)} style={s.slider} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#bbb' }}>
                            <span>0%</span><span>15%</span><span>30%</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3 */}
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
                                {isCollection && collectionName && (
                                    <div style={{ fontSize: '12px', color: '#7c5bdc', marginTop: '4px' }}>📚 Collection: {collectionName}</div>
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
                        <>
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

                            {/* Fee notice for collections */}
                            {isCollection && (
                                <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px', fontSize: '12px', color: '#856404' }}>
                                    📚 <strong>Collection fee:</strong> Publishing this collection applies a <strong>1% platform fee</strong> on all sales.
                                </div>
                            )}
                        </>
                    )}

                </div>
            )}

            {/* Navigation */}
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
                    !walletReady ? (
                        <button style={{ ...s.nextBtn, flex: 1, background: '#9945FF' }}
                                onClick={async () => {
                                    try { await (window as any).solana.connect(); }
                                    catch { /* user rejected */ }
                                }}>
                            👻 Connect Phantom Wallet
                        </button>
                    ) : (
                        <button style={{ ...s.nextBtn, flex: 1, opacity: loading ? 0.7 : 1 }}
                                onClick={handleCreateSubmit} disabled={loading}>
                            {loading
                                ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><span style={s.btnSpinner} />{uploadProgress || 'Creating...'}</span>
                                : <span>🚀 {forSale ? `Create & List ${isCollection ? 'Collection' : 'NFT'}` : `Save to Wallet`}</span>
                            }
                        </button>
                    )
                )}
            </div>
        </div>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s: any = {
    page:          { background: '#f5f5f5', minHeight: '100vh', paddingBottom: '100px' },
    modeTabs:      { display: 'flex', margin: '16px 15px 0', background: '#f0f0f0', borderRadius: '25px', padding: '4px', gap: '2px' },
    modeTab:       { flex: 1, padding: '10px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', transition: 'all 0.25s', position: 'relative' },
    progressWrap:  { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 30px 8px', gap: 0 },
    progressStep:  { width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', transition: 'all 0.3s', flexShrink: 0 },
    progressLine:  { flex: 1, height: '3px', transition: 'background 0.3s' },
    stepLabels:    { display: 'flex', justifyContent: 'space-between', padding: '0 20px', marginBottom: '16px' },
    label:         { fontSize: '11px', color: '#aaa', flex: 1, textAlign: 'center' },
    labelActive:   { fontSize: '11px', color: '#01ff77', fontWeight: 'bold', flex: 1, textAlign: 'center' },
    stepContent:   { background: 'white', margin: '0 15px', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
    stepTitle:     { fontSize: '20px', fontWeight: 'bold', color: '#222', marginBottom: '4px' },
    stepSub:       { fontSize: '13px', color: '#888', marginBottom: '20px' },
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
    dropZone:      { border: '2px dashed', borderRadius: '12px', minHeight: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: '20px', transition: 'all 0.2s', overflow: 'hidden' },
    dropContent:   { textAlign: 'center', padding: '20px' },
    previewWrap:   { position: 'relative', width: '100%' },
    previewImg:    { width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' },
    removeImgBtn:  { position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '20px', padding: '4px 12px', cursor: 'pointer', fontSize: '12px' },
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
