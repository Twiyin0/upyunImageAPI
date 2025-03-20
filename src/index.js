import upyun from 'upyun';
import { Writable } from 'stream';
import express from 'express';
import { Buffer } from 'buffer';
import axios from 'axios';
import config from '../config.json' assert { type: 'json' };

const app = express();
const port = config.port;

class UpyunService {
    constructor(serviceName, operator, password) {
        this.service = new upyun.Service(serviceName, operator, password);
        this.client = new upyun.Client(this.service);
    }

    /**
     * 获取指定目录下的文件列表
     * @param {string} dirPath - 目录路径
     * @returns {Promise<Array>} - 文件列表
     */
    async getFileList(dirPath) {
        try {
            const result = await this.client.listDir(dirPath);
            if (result.files && result.files.length > 0) {
                return result.files;
            } else {
                console.log('No files found in the directory.');
                return [];
            }
        } catch (error) {
            console.error('Error fetching file list:', error);
            throw error;
        }
    }

    /**
     * 下载文件并返回其 Base64 值
     * @param {string} filePath - 文件路径
     * @returns {Promise<string>} - Base64 编码的文件内容
     */
    async getFileBase64(filePath) {
        try {
            // 创建一个可写流来收集文件数据
            let chunks = [];
            const writableStream = new Writable({
                write(chunk, encoding, callback) {
                    chunks.push(chunk);
                    callback();
                }
            });

            // 使用 Promise 确保流完成
            const streamFinished = new Promise((resolve, reject) => {
                writableStream.on('finish', () => {
                    resolve();
                });
                writableStream.on('error', (err) => {
                    reject(err);
                });
            });

            // 下载文件并写入流
            await this.client.getFile(filePath, writableStream);

            // 等待流完成
            await streamFinished;

            // 将收集到的数据转换为 Buffer
            const buffer = Buffer.concat(chunks);
            // 将 Buffer 转换为 Base64 字符串
            const base64String = buffer.toString('base64');
            return base64String;
        } catch (error) {
            console.error('Error downloading file:', error);
            throw error;
        }
    }
}

const upyunDomain = config.upyunDomain;
const upyunService = new UpyunService(config.serviceName, config.operator, config.password);

function getRandomFileUrl(path, files) {
    return { "imgUrl": `${upyunDomain}${path}/${files[Math.floor((Math.random() * files.length * 2333) % files.length)].name}` };
}

async function downloadImage(url) {
    try {
        // 发送 GET 请求获取图片数据，指定 responseType 为 arraybuffer
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'arraybuffer' // 以二进制数组形式接收数据
        });

        // 将 ArrayBuffer 转换为 Buffer
        const imageBuffer = Buffer.from(response.data, 'binary');

        // 返回图片的 Buffer 数据
        return imageBuffer;

    } catch (error) {
        console.error('Error downloading image:', error);
        throw error; // 抛出错误以便调用者处理
    }
}

app.get('/acc', async (req, res) => {
    const type = req.query.type;
    const remotePath = '/img/acc'
    try {
        const fileList = await upyunService.getFileList(remotePath);
        if (fileList.length === 0) {
            return res.status(404).send('这个文件夹内没有文件');
        }
        const filePath = remotePath+ '/' + fileList[Math.floor((Math.random() * fileList.length * 2333) % fileList.length)].name;

        if (type === 'base64') {
            // 返回 Base64 编码的图片
            const base64String = await upyunService.getFileBase64(filePath);
            res.json({ "data": "data:image/png;base64," + base64String });
        } else if (type === 'json') {
            // 返回 JSON 格式的图片 URL
            const imgUrl = getRandomFileUrl(remotePath, fileList);
            res.json(imgUrl)
        } else {
            // 返回图片的原始数据
            const imageData = await downloadImage((getRandomFileUrl(remotePath, fileList).imgUrl)+(type==='webp'? '!/format/webp':''));

            // 根据文件扩展名设置 Content-Type
            const fileExtension = filePath.split('.').pop().toLowerCase();
            const mimeType = {
                png: 'image/png',
                jpg: 'image/jpeg',
                jpeg: 'image/jpeg',
                gif: 'image/gif',
                webp: 'image/webp',
            }[fileExtension] || 'application/octet-stream';

            res.set('Content-Type', mimeType); // 设置正确的 Content-Type
            res.send(imageData); // 发送二进制数据
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/ver', async (req, res) => {
    const type = req.query.type;
    const remotePath = '/img/ver'
    try {
        const fileList = await upyunService.getFileList(remotePath);
        if (fileList.length === 0) {
            return res.status(404).send('这个文件夹内没有文件');
        }
        const filePath = remotePath+ '/' + fileList[Math.floor((Math.random() * fileList.length * 2333) % fileList.length)].name;

        if (type === 'base64') {
            // 返回 Base64 编码的图片
            const base64String = await upyunService.getFileBase64(filePath);
            res.json({ "data": "data:image/png;base64," + base64String });
        } else if (type === 'json') {
            // 返回 JSON 格式的图片 URL
            const imgUrl = getRandomFileUrl(remotePath, fileList)
            res.json(imgUrl)
        } else {
            // 返回图片的原始数据
            const imageData = await downloadImage((getRandomFileUrl(remotePath, fileList).imgUrl)+(type==='webp'? '!/format/webp':''));

            // 根据文件扩展名设置 Content-Type
            const fileExtension = filePath.split('.').pop().toLowerCase();
            const mimeType = {
                png: 'image/png',
                jpg: 'image/jpeg',
                jpeg: 'image/jpeg',
                gif: 'image/gif',
                webp: 'image/webp',
            }[fileExtension] || 'application/octet-stream';

            res.set('Content-Type', mimeType); // 设置正确的 Content-Type
            res.send(imageData); // 发送二进制数据
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// 启动服务器
app.listen(port, config.host? config.host:'127.0.0.1', () => {
    console.log(`服务启动在 http://${config.host? config.host:'127.0.0.1'}:${port}`);
});
