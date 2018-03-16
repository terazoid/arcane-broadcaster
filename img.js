const Jimp = require('jimp');
const fs = require('fs');

function imageContainerStream(image) {
    const size = image.bitmap.width*image.bitmap.height*4;
    let pointer = 0;
    let eof = () => (pointer>=size);
    let writeBit = (bit) => {
        if(eof()) {
            throw new Error();
        }
        const dir = image.bitmap.data[pointer]<=127?1:-1;
        if((bit&1)^(image.bitmap.data[pointer]&1)) {
            image.bitmap.data[pointer] += dir;
        }
        pointer++;
        //ignore alpha data
        if((pointer+1)%4 === 0) {
            pointer++;
        }
    };
    return {
        eof,
        write(byte) {
            for(let i=7; i>=0; i--) {
                writeBit((byte>>i)&1);
            }
        },
        fill0() {
            while(!eof()) {
                writeBit(0);
            }
        },
        read() {
            let result = new Buffer(Math.ceil(size/4*3/8));
            let resultPointer = 0;
            let pointer = 0;
            while(pointer<size) {
                let byte=0;
                for (let i=7; i >= 0; i--) {
                    byte |= ((image.bitmap.data[pointer]&1)<<i);
                    pointer++;
                    if((pointer+1)%4===0) {
                        pointer++;
                    }
                    if(pointer>=size) {
                        break;
                    }
                }
                result.writeUInt8(byte,resultPointer++);
            }
            return result;
        }
    };
}

if(1) {
    let data = new Buffer(fs.readFileSync('package.json', 'utf8'));
    Jimp.read("input.png").then(function (input) {
        fs.writeFileSync('input.bmp', input.bitmap.data);
        let containerStream = imageContainerStream(input);
        for (const value of data.values()) {
            containerStream.write(value);
        }
        containerStream.fill0();
        input.write('output.png');
        fs.writeFileSync('output.bmp', input.bitmap.data);
    }).catch(function (err) {
        console.error(err);
    });
    setTimeout(()=>{
        Jimp.read("output.png").then(function (input) {
            let containerStream = imageContainerStream(input);
            let result = containerStream.read();
            fs.writeFileSync('output.txt', result);
        }).catch(function (err) {
            console.error(err);
        });
    },1000);
}


