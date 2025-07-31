import * as vscode from 'vscode';
import * as https from 'https';
import { BalanceResponse, Stats } from '../models/stats';

export class ApiService {
    private apiKey: string = '';
    private apiEndpoint: string = '';
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadConfig();
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('yescode-stats')) {
                this.loadConfig();
            }
        });
    }

    async loadConfig() {
        const config = vscode.workspace.getConfiguration('yescode-stats');
        // 从密钥库读取 API Token
        this.apiKey = await this.context.secrets.get('yescode-stats.apiKey') || '';
        this.apiEndpoint = config.get<string>('apiEndpoint', 'https://co.yes.vg/api/v1/claude/balance');
    }

    async setApiKey(apiKey: string): Promise<void> {
        await this.context.secrets.store('yescode-stats.apiKey', apiKey);
        this.apiKey = apiKey;
    }

    private makeHttpsRequest(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const jsonData = JSON.parse(data);
                            resolve(jsonData);
                        } catch (error) {
                            reject(new Error('解析响应数据失败'));
                        }
                    } else if (res.statusCode === 401) {
                        reject(new Error('无效的 API Token'));
                    } else if (res.statusCode === 404) {
                        reject(new Error('API 地址不存在'));
                    } else {
                        reject(new Error(`API 请求失败: 状态码 ${res.statusCode}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`网络请求失败: ${error.message}`));
            });

            req.end();
        });
    }

    async fetchBalance(): Promise<Stats | null> {
        if (!this.apiKey) {
            // 不显示警告，让初始设置流程处理
            return null;
        }

        try {
            const data = await this.makeHttpsRequest(this.apiEndpoint) as BalanceResponse;
            
            const config = vscode.workspace.getConfiguration('yescode-stats');
            const dailyLimit = config.get<number>('dailySubscriptionLimit', 100);
            const subscriptionUsed = dailyLimit - data.subscription_balance;
            const subscriptionUsagePercentage = (subscriptionUsed / dailyLimit) * 100;

            return {
                totalBalance: data.total_balance,
                subscriptionBalance: data.subscription_balance,
                payAsYouGoBalance: data.pay_as_you_go_balance,
                subscriptionUsagePercentage: Math.max(0, Math.min(100, subscriptionUsagePercentage)),
                lastUpdated: new Date()
            };
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('未知错误');
        }
    }
}