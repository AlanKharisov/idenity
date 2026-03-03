export interface User {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    avatar: string;
    location?: string;
    bio?: string;
    password?: string;
    wallet?: Wallet;
}

export interface Wallet {
    email: string;
    address: string;
    recoveryPhrase?: string;
    password?: string;
    createdAt: string;
}

// Добавьте это в конец файла:
export {};  // Пустой экспорт для isolatedModules