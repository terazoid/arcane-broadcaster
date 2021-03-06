import Jimp from 'jimp';
import CRC32 from 'crc-32';
import Message from "./models/Message";
import Place from "./models/Place";

function getIndex(i) {
    return i+Math.floor(i/3);
}

export default class ImageContainer {
    static get BLOCK_TYPE_MESSAGE() {return 1;};

    static get SEEK_SET() { return 0;}
    static get SEEK_CUR() { return 1;}
    static get SEEK_END() { return 2;}

    constructor(image) {
        this.image = image;
        this.size = image.bitmap.width*image.bitmap.height*3;
        this.pointer = 0;
        this.aesCipher = null;
        this._forum = null;
    }
    
    set forum(v) {
      this._forum = v;
      this.aesCipher = v.aesCipher;
    }

    static fromFile(url) {
        return Jimp.read(url).then((image)=>{
            return new ImageContainer(image);
        });
    }

    static fromBuffer(buffer) {
        return Jimp.read(buffer).then((image)=>{
            return new ImageContainer(image);
        });
    }

    save(file) {
        return new Promise((resolve,reject)=>{
            this.image.write(file, (err)=>err?reject(err):resolve());
        });
    }

    getBase64(type) {
        return new Promise((resolve,reject)=>{
            this.image.getBase64(type, (err, image)=>err?reject(err):resolve(image));
        });
    }

    get freeSpace() {
        return this.size-this.pointer;
    }

    eof() {
        return this.freeSpace<=0;
    }



    writeBit(bit) {
        this._confirmSpace(1);
        const bmpIndex = getIndex(this.pointer);
        const dir = this.image.bitmap.data[bmpIndex]<=127?1:-1;
        if((bit&1)^(this.image.bitmap.data[bmpIndex]&1)) {
            this.image.bitmap.data[bmpIndex] += dir;
        }
        this.pointer++;
    }

    readBit() {
        this._confirmSpace(1);
        const bmpIndex = getIndex(this.pointer);
        const result = this.image.bitmap.data[bmpIndex]&1;
        this.pointer++;
        return result;
    }

    writeByte(byte) {
        this._confirmSpace(8);
        for(let i=7; i>=0; i--) {
            this.writeBit((byte>>i)&1);
        }
    }

    readByte() {
        this._confirmSpace(8);
        return (this.readBit()<<7)|
            (this.readBit()<<6)|
            (this.readBit()<<5)|
            (this.readBit()<<4)|
            (this.readBit()<<3)|
            (this.readBit()<<2)|
            (this.readBit()<<1)|
            (this.readBit());
    }

    writeInt(i) {
        this._confirmSpace(8*4);
        this.writeByte((i&(0xff000000))>>>24);
        this.writeByte((i&(0xff0000))>>>16);
        this.writeByte((i&(0xff00))>>>8);
        this.writeByte(i&(0xff));
    }

    readInt() {
        this._confirmSpace(8*4);
        return (this.readByte()<<24)|
            (this.readByte()<<16)|
            (this.readByte()<<8)|
            (this.readByte());
    }

    writeBlock(block) {
        if(block instanceof Message) {
            const msg = Buffer.from(block.toString(), 'utf-8');
            const bJsonEnc = Buffer.from(this.aesCipher.encrypt(msg));
            this._confirmSpace(8*(1+4+4+msg.length));
            this.writeByte(ImageContainer.BLOCK_TYPE_MESSAGE);
            this.writeInt(bJsonEnc.length);
            this.writeInt(CRC32.buf(msg));
            for(const b of bJsonEnc) {
                this.writeByte(b);
            }
        }
        else {
            throw new Error('Unknown block type');
        }
    }
    
    writeEom() {
        this.writeByte(0);
    }

    async readBlock() {
        this._confirmSpace(8*(1+4+4));
        const type = this.readByte();
        if(type === 0) {
          return null;
        }
        const len = this.readInt();
        const crc32 = this.readInt();
        this._confirmSpace(8*len);
        switch(type) {
            case ImageContainer.BLOCK_TYPE_MESSAGE: {
                const bJsonEnc = Buffer.alloc(len);
                for (let i = 0; i < len; i++) {
                    const b = this.readByte();
                    bJsonEnc.writeUInt8(b, i);
                }
                const msg = Buffer.from(this.aesCipher.decrypt(bJsonEnc));
                const realCrc32 = CRC32.buf(msg);
                if (realCrc32 !== crc32) {
                    throw new Error('Invalid checksum');
                }
                const {id: uniqueId, userId, date, message, parent, sign} = JSON.parse(msg);
                return await Message.process({uniqueId,forumId:this._forum._id, userId, date, message, parent, sign});
            }
            default:
                throw new Error(`Unknown block type ${type}`);
        }
    }

    seek(offset, whence = ImageContainer.SEEK_SET) {
        switch (whence) {
            case ImageContainer.SEEK_SET:
                this.pointer = offset;
                break;
            case ImageContainer.SEEK_CUR:
                this.pointer += offset;
                break;
            case ImageContainer.SEEK_END:
                this.pointer = this.size -1 - offset;
                break;
        }
    }

    _confirmSpace(bits) {
        if(this.freeSpace<bits) {
            throw new Error('eof');
        }
    }

    // read() {
    //     let result = new Buffer(Math.ceil(size/4*3/8));
    //     let resultPointer = 0;
    //     let pointer = 0;
    //     while(pointer<size) {
    //         let byte=0;
    //         for (let i=7; i >= 0; i--) {
    //             byte |= ((image.bitmap.data[pointer]&1)<<i);
    //             pointer++;
    //             if((pointer+1)%4===0) {
    //                 pointer++;
    //             }
    //             if(pointer>=size) {
    //                 break;
    //             }
    //         }
    //         result.writeUInt8(byte,resultPointer++);
    //     }
    //     return result;
    // }
}