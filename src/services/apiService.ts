import * as vscode from 'vscode';
import axios from 'axios';
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

    async fetchBalance(): Promise<Stats | null> {
        if (!this.apiKey) {
            // 不显示警告，让初始设置流程处理
            return null;
        }

        try {
            const response = await axios.get<BalanceResponse>(this.apiEndpoint, {
                headers: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'X-API-Key': this.apiKey
                }
            });

            const data = response.data;
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
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    throw new Error('无效的 API Token');
                } else if (error.response?.status === 404) {
                    throw new Error('API 地址不存在');
                } else {
                    throw new Error(`API 请求失败: ${error.message}`);
                }
            }
            throw error;
        }
    }
}