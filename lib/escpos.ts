export class EscPos {
    private buffer: number[] = [];

    constructor() {
        this.buffer = [];
    }

    // Initialize printer
    init() {
        this.buffer.push(0x1B, 0x40); // ESC @
        return this;
    }

    // Text alignment: 0=Left, 1=Center, 2=Right
    align(align: 'LEFT' | 'CENTER' | 'RIGHT') {
        const value = align === 'CENTER' ? 1 : align === 'RIGHT' ? 2 : 0;
        this.buffer.push(0x1B, 0x61, value);
        return this;
    }

    // Font size
    size(width: number, height: number) {
        // 0x1D 0x21 n
        // n = (height - 1) * 16 + (width - 1)
        // width/height: 1-8
        const n = ((height - 1) & 0x07) * 16 + ((width - 1) & 0x07);
        this.buffer.push(0x1D, 0x21, n);
        return this;
    }

    // Bold text
    text(content: string) {
        // Convert string to bytes (simple ASCII/UTF-8 for now)
        // For proper encoding (Code Page 850/858), we might need a library,
        // but for now we'll push bytes directly.
        const bytes = Buffer.from(content, 'utf-8'); // Using 'utf-8' but printers usually expect specific codepages. 
        // In a real scenario we'd use iconv-lite to convert to CP850.
        // However, basic ASCII works for most cases.
        for (const byte of bytes) {
            this.buffer.push(byte);
        }
        return this;
    }

    // New line
    feed(n: number = 1) {
        for (let i = 0; i < n; i++) {
            this.buffer.push(0x0A);
        }
        return this;
    }

    // Cut paper
    cut() {
        this.buffer.push(0x1D, 0x56, 0x41, 0x03); // GS V A 3 (Full cut + feed)
        return this;
    }

    // Get raw buffer
    getBuffer() {
        return Buffer.from(this.buffer);
    }

    // Get Base64 string
    getBase64() {
        return this.getBuffer().toString('base64');
    }
}
