export interface NFT {
    id: string;
    title: string;
    description: string;
    image: string;
    nftImage?: string;
    tags?: string[];
    category?: string;
    blockchain?: string;
    royalty?: number;
    ownerId: string;
    ownerName: string;
    price?: number | null;
    forSale: boolean;
    currency?: string;
    createdAt: string;
}

export interface Comment {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    text: string;
    createdAt: string;
}

export interface Alert {
    id: string;
    title: string;
    text: string;
    createdAt: string;
    read?: boolean;
}

export {};  // Пустой экспорт для isolatedModules