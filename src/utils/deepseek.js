import axios from 'axios';

const API_BASE_URL = 'http://localhost:9090/api';

/**
 * 发送聊天消息到 DeepSeek API
 * @param {Array} messages - 消息历史数组
 * @returns {Promise<string>} AI 回复
 */
export async function sendChatMessage(messages) {
    try {
        const response = await axios.post(`${API_BASE_URL}/deepseek/chat`, {
            messages: messages
        });
        return response.data.reply;
    } catch (error) {
        console.error('DeepSeek API 调用失败:', error);
        throw error;
    }
}
