import { useMemo } from 'react';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';

const DEVNET_RPC = 'https://api.devnet.solana.com';

/**
 * Returns a Umi instance connected to Solana Devnet.
 *
 * The Phantom wallet's injected `window.solana` object satisfies the
 * WalletAdapter interface expected by `walletAdapterIdentity()`, so no
 * additional wallet-adapter packages are required.
 *
 * Returns `null` when Phantom is not installed or not connected.
 */
export function useUmi() {
    const phantomWallet = (window as any).solana ?? null;

    const umi = useMemo(() => {
        const instance = createUmi(DEVNET_RPC).use(mplTokenMetadata());

        if (phantomWallet?.isPhantom && phantomWallet?.publicKey) {
            instance.use(walletAdapterIdentity(phantomWallet));
        }

        return instance;
    }, [phantomWallet?.publicKey?.toString()]); // re-create when the connected account changes

    const isReady = Boolean(phantomWallet?.isPhantom && phantomWallet?.publicKey);

    return { umi, isReady, phantomWallet };
}
