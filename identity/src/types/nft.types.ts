export interface NFT {
    id: number;
    title: string;
    description: string;
    image: string;
    tags?: string[];
    userId: number;
    userName?: string;
    userAvatar?: string;
    likes: number;
    liked?: boolean;
    comments: Comment[];
    createdAt: string;
}

export interface Comment {
    id: number;
    userId: number;
    userName: string;
    userAvatar: string;
    text: string;
    createdAt: string;
}

export interface Alert {
    id: number;
    title: string;
    text: string;
    createdAt: string;
    read?: boolean;
}

export {};  // Пустой экспорт для isolatedModules