import { useMemo, useState, useEffect } from 'react';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';

const DEVNET_RPC = 'https://api.devnet.solana.com';

function getPhantom(): any {
    return (window as any).phantom?.solana ?? (window as any).solana ?? null;
}

/**
 * Returns a Umi instance connected to Solana Devnet.
 *
 * Auto-reconnects silently on mount if the user has previously authorized
 * the app. Listens to Phantom's connect/disconnect events so isReady
 * stays in sync without requiring a page reload.
 */
export function useUmi() {
    const phantomWallet = getPhantom();

    // Track publicKey as state so React re-renders when Phantom connects/disconnects.
    const [publicKeyStr, setPublicKeyStr] = useState<string>(
        () => phantomWallet?.publicKey?.toString() ?? ''
    );

    useEffect(() => {
        const wallet = getPhantom();
        if (!wallet) return;

        const onConnect = (pk: any) =>
            setPublicKeyStr(pk?.toString() ?? wallet.publicKey?.toString() ?? '');
        const onDisconnect = () => setPublicKeyStr('');

        wallet.on?.('connect', onConnect);
        wallet.on?.('disconnect', onDisconnect);

        // Silently reconnect if the user already authorized this site before.
        if (!wallet.publicKey) {
            wallet.connect?.({ onlyIfTrusted: true })
                .then((resp: any) => {
                    const pk = resp?.publicKey?.toString() ?? wallet.publicKey?.toString() ?? '';
                    if (pk) setPublicKeyStr(pk);
                })
                .catch(() => {/* not previously authorized — ignore */});
        } else {
            setPublicKeyStr(wallet.publicKey.toString());
        }

        return () => {
            wallet.off?.('connect', onConnect);
            wallet.off?.('disconnect', onDisconnect);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const umi = useMemo(() => {
        const instance = createUmi(DEVNET_RPC).use(mplTokenMetadata());
        if (phantomWallet && publicKeyStr) {
            instance.use(walletAdapterIdentity(phantomWallet));
        }
        return instance;
    }, [publicKeyStr]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * Trigger an explicit Phantom connect popup and resolve the publicKey.
     * Use this from a button click — `useEffect`'s silent reconnect only
     * succeeds for already-trusted sites, and Phantom doesn't always emit a
     * `'connect'` event on the first authorization, so we must read the
     * publicKey from the `connect()` promise itself.
     */
    const connect = async (): Promise<string> => {
        const wallet = getPhantom();
        if (!wallet) {
            throw new Error('Phantom wallet not found. Install the Phantom extension or open this app in the Phantom mobile browser.');
        }
        const resp = await wallet.connect();
        const pk = resp?.publicKey?.toString() ?? wallet.publicKey?.toString() ?? '';
        if (!pk) throw new Error('Phantom returned no public key.');
        setPublicKeyStr(pk);
        return pk;
    };

    const disconnect = async () => {
        const wallet = getPhantom();
        try { await wallet?.disconnect?.(); } catch { /* noop */ }
        setPublicKeyStr('');
    };

    // Trust any Solana provider that returned a publicKey — Phantom mobile's
    // in-app browser sometimes drops the `isPhantom` flag.
    const isReady = Boolean(phantomWallet && publicKeyStr);

    return { umi, isReady, phantomWallet, connect, disconnect, publicKey: publicKeyStr };
}
