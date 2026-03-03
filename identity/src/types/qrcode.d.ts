// src/types/qrcode.d.ts
interface QRCode {
    new (element: HTMLElement | string, options: {
        text: string;
        width?: number;
        height?: number;
        colorDark?: string;
        colorLight?: string;
        correctLevel?: number;
    }): QRCode;

    clear(): void;
    makeCode(text: string): void;
}

interface QRCodeStatic {
    CorrectLevel: {
        L: number;
        M: number;
        Q: number;
        H: number;
    };
}

declare global {
    interface Window {
        QRCode: QRCode & QRCodeStatic;
    }
}

export {};