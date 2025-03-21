/**
 * Author: Twiyin0(https://github.com/Twiyin0)
 * Version: v0.1.0
 * Generate Time: 2025-03-21
 * License: MIT
 */

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

if (config.https) {
    // 添加信任代理设置
    app.set('trust proxy', true);

    // 添加中间件来处理 X-Forwarded-Proto 头
    app.use((req, res, next) => {
        if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
            // 请求是通过 HTTPS 发起的
            next();
        } else {
            // 重定向到 HTTPS
            res.redirect(`https://${req.headers.host}${req.url}`);
        }
    });
}

const upyunDomain = config.upyunDomain;
const upyunService = new UpyunService(config.serviceName, config.operator, config.password);

/**
 * 获取随机文件的 URL
 * @param {string} path - 文件路径
 * @param {Array} files - 文件列表
 * @returns {Object} - 包含图片 URL 的对象
 */
function getRandomFileUrl(path, files) {
    return { "imgUrl": `${upyunDomain}${path}/${files[Math.floor((Math.random() * files.length * 2333) % files.length)].name}` };
}

/**
 * 下载图片并返回其 Buffer 数据
 * @param {string} url - 图片 URL
 * @returns {Promise<Buffer>} - 图片的 Buffer 数据
 */
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

/**
 * 处理图片请求的通用逻辑
 * @param {string} remotePath - Upyun 存储路径
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function handleImageRequest(remotePath, req, res) {
    const type = req.query.type;
    const webp = req.query.type;
    try {
        const fileList = await upyunService.getFileList(remotePath);
        if (fileList.length === 0) {
            return res.status(404).send('这个文件夹内没有文件');
        }
        const filePath = remotePath.endsWith('/')? remotePath.slice(0, -1):remotePath + '/' + fileList[Math.floor((Math.random() * fileList.length * 2333) % fileList.length)].name;

        if (type === 'base64') {
            // 返回 Base64 编码的图片
            const base64String = await upyunService.getFileBase64(filePath);
            res.json({ "data": "data:image/png;base64," + base64String });
        } else if (type === 'json') {
            // 返回 JSON 格式的图片 URL
            const imgUrl = getRandomFileUrl(remotePath, fileList);
            res.json(imgUrl);
        } else if (type === 'org') {
            // 返回图片的原始数据
            const imageData = await downloadImage((getRandomFileUrl(remotePath, fileList).imgUrl) + (webp === true ? '!/format/webp' : ''));

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
        } else {
            res.redirect(getRandomFileUrl(remotePath, fileList).imgUrl + (type === 'webp' ? '!/format/webp' : ''));
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
}

// 动态路由处理
app.get('/:path', async (req, res) => {
    const path = req.params.path; // 获取动态路径
    config.remotePath = config.remotePath.startsWith('/')? config.remotePath:('/'+config.remotePath);
    const basePath = config.remotePath.endsWith('/')? config.remotePath.slice(0, -1):config.remotePath;
    const remotePath = `${basePath}/${path}`; // 映射到 Upyun 存储路径
    await handleImageRequest(remotePath, req, res);
});

// 启动服务器
app.listen(port, config.host ? config.host : '127.0.0.1', () => {
    console.log(`服务启动在 ${config.https? 'https':'http'}://${config.host ? config.host : '127.0.0.1'}:${port}`);
});
